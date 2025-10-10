// FILE: server/routes/Routes03_06AnalizzaFrigoDispensaTrovaRicette.js

import express from "express";
import multer from "multer";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import fetch from 'node-fetch'; 
import { Buffer } from 'buffer';
import fs from 'fs/promises'; 
import path from 'path';
import { fileURLToPath } from 'url';

// Importa le dipendenze globali (Devi assicurarti che il tuo index.js le esporti)
import { groq, openai } from "../config.js"; 

import { SYSTEM_INSTRUCTION_FRIDGE, RECIPE_SCHEMA } from "../prompts/Prompts03_06AnalizzaFrigoDispensaTrovaRicette.js";

dotenv.config();
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ---------------------------------------------------------------------
// CONFIGURAZIONE MEDIA (Hugging Face e File)
// ---------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUDIO_DIR = path.join(__dirname, '..', 'audio');

// CHIAVE API PER HUGGING FACE e MODELLO
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY; 
const HF_TEST_MODEL = "stabilityai/stable-diffusion-xl-base-1.0"; 

// ---------------------------------------------------------------------
// FUNZIONI DI SUPPORTO PER NARRAZIONE E VIDEO
// ---------------------------------------------------------------------

// Funzione: Generazione Testo Narrativo con OpenAI (Costo Basso)
const generateNarrationTextWithOpenAI = async (recipe) => {
    
    const narrationPrompt = `
        Sei un narratore di video di cucina professionista. Crea un testo narrato, scorrevole e coinvolgente per un video di ricetta basato sui seguenti ingredienti e istruzioni.
        Non includere titoli o intestazioni, solo il testo continuo. Mantienilo conciso e fluido, come se fosse uno script per una voce fuori campo.

        Ricetta: ${recipe.titolo}
        Istruzioni: ${recipe.istruzioni.join(' ')}

        Inizia sempre con "Ciao a tutti e benvenuti! Oggi prepariamo ${recipe.titolo}."
    `;

    try {
        const chatCompletion = await openai.chat.completions.create({
            model: "gpt-4o-mini", 
            temperature: 0.8,
            max_tokens: 2048,
            messages: [
                { role: "system", content: "Sei un narratore di video di cucina professionista." },
                { role: "user", content: narrationPrompt }
            ]
        });

        return chatCompletion.choices?.[0]?.message?.content || "Narrazione non disponibile.";

    } catch (error) {
        console.error("❌ Errore nella generazione del testo narrato con OpenAI:", error);
        return `❌ ERRORE: La generazione del testo è fallita. ${error.message}`; 
    }
};

// Funzione 2: Simulazione Montaggio Foto/Video (ora usa solo il testo narrato)
const mockFfmpegProcess = async (existingImages, recipe) => {
    // Simula l'operazione di montaggio che richiede tempo (5 secondi)
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log(`Simulazione Montaggio: unione immagini completata.`);
    
    // Genera il testo narrato
    const narrationText = await generateNarrationTextWithOpenAI(recipe);

    // Ritorna il testo narrato
    return narrationText;
};


// Middleware per gestire sia form-data (immagini) che json (richiesta ricette/media)
const handlePostRequest = (req, res, next) => {
    // Se la richiesta è JSON (ricette o media), usa il parser JSON
    if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
        express.json()(req, res, next);
    } else {
        // Altrimenti usa multer per le immagini del frigo
        upload.array("fridgeImages", 10)(req, res, next);
    }
};

// ***************************************************************
// ROTTA 1: ANALISI INGREDIENTI / RICERCA RICETTE (POST /)
// ***************************************************************
router.post("/", handlePostRequest, async (req, res) => {
    try {
        const modelName = "meta-llama/llama-4-scout-17b-16e-instruct";
        const allIngredients = new Set();
        
        // ====================================================================
        // 1. GESTIONE RICHIESTA RICETTE (FASE FINALE) 
        // ====================================================================
        if (req.body.ingredients && Array.isArray(req.body.ingredients) && req.body.preferences) {
            
            const { ingredients, preferences } = req.body;
            
            const finalIngredientsList = ingredients.join(', ');
            
            const recipesPrompt = `Sulla base dei seguenti ingredienti disponibili: ${finalIngredientsList}, suggerisci da 2 a 4 ricette che soddisfino le seguenti preferenze dell'utente: "${preferences}". Rispondi nel formato JSON conforme a questo schema: ${JSON.stringify(RECIPE_SCHEMA)}`;

            const finalChatCompletion = await groq.chat.completions.create({
                model: modelName,
                temperature: 0.7,
                max_tokens: 2048,
                response_format: { type: "json_object" },
                messages: [
                    { role: "system", content: SYSTEM_INSTRUCTION_FRIDGE },
                    { role: "user", content: recipesPrompt }
                ]
            });
            
            const finalRaw = finalChatCompletion.choices?.[0]?.message?.content || "{}";
            const finalJson = JSON.parse(finalRaw);
            
            return res.json({ 
                success: true, 
                ingredients: finalJson.ingredienti_trovati || ingredients, 
                recipes: finalJson.ricette || [] 
            });
        }

        // ====================================================================
        // 2. ANALISI IMMAGINI (FASE INIZIALE)
        // ====================================================================
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, error: "Nessuna immagine o lista ingredienti fornita." });
        }

        for (const file of req.files) {
            const imageBase64 = file.buffer.toString("base64");
            
            const analysisInstruction = `Analizza QUESTA singola immagine e identifica solo gli ingredienti commestibili visibili. Rispondi nel formato JSON conforme a questo schema: ${JSON.stringify({ ingredienti_trovati: RECIPE_SCHEMA.properties.ingredienti_trovati })}`;

            const chatCompletion = await groq.chat.completions.create({
                model: modelName,
                temperature: 0.2,
                max_tokens: 1024,
                response_format: { type: "json_object" },
                messages: [
                    { role: "system", content: SYSTEM_INSTRUCTION_FRIDGE },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: analysisInstruction },
                            { type: "image_url", image_url: { url: `data:${file.mimetype};base64,${imageBase64}` } }
                        ]
                    }
                ]
            });

            const raw = chatCompletion.choices?.[0]?.message?.content || "{}";
            const json = JSON.parse(raw);

            if (Array.isArray(json.ingredienti_trovati))
                json.ingredienti_trovati.forEach((i) => allIngredients.add(i));
        }

        res.json({ success: true, ingredients: [...allIngredients], recipes: [] });
    } catch (err) {
        console.error("Errore analisi/ricerca ricette:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});


// ***************************************************************
// ROTTA 2: GENERAZIONE MEDIA (POST /generate-media)
// ***************************************************************

router.post("/generate-media", express.json(), async (req, res) => {
    const { recipe, mediaType, existingImages } = req.body;
    
    if (!recipe || !recipe.istruzioni || recipe.istruzioni.length === 0) {
        return res.status(400).json({ success: false, error: "Dati ricetta non validi o istruzioni mancanti." });
    }
    
    try {
        switch (mediaType) {
            
            // =========================================================
            // CASE 1: GENERAZIONE IMMAGINI (SDXL - via Hugging Face)
            // =========================================================
            case 'images': {
                if (!HUGGINGFACE_API_KEY) {
                    throw new Error("Chiave HUGGINGFACE_API_KEY mancante. Impossibile generare immagini.");
                }
                const generatedImages = [];
                
                for (const instruction of recipe.istruzioni) {
                    const prompt = `Realistic food photography of the cooking step: "${instruction}" for a recipe titled "${recipe.titolo}". Focus on the main action, high quality, studio lighting, no cartoon elements.`;
                    
                    const response = await fetch(
                        `https://api-inference.huggingface.co/models/${HF_TEST_MODEL}`,
                        {
                            headers: { 
                                Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
                                'Content-Type': 'application/json',
                            },
                            method: 'POST',
                            body: JSON.stringify({ inputs: prompt }),
                        }
                    );

                    if (!response.ok) {
                        const errorText = await response.text();
                        const truncatedError = errorText.substring(0, 150) + '...'; 
                        throw new Error(`HF Image Generation Failed: ${response.status} - ${truncatedError}`);
                    }
                    
                    const imageBuffer = await response.buffer();
                    const base64Image = Buffer.from(imageBuffer).toString('base64');
                    const dataUrl = `data:image/jpeg;base64,${base64Image}`;
                    
                    generatedImages.push({
                        stepText: instruction,
                        dataUrl: dataUrl
                    });
                }
                
                return res.json({ success: true, images: generatedImages });
            }
            
            // =========================================================
            // CASE 2: Opzione 1 - Montaggio Foto + Testo Narrato (Simulato)
            // =========================================================
            case 'video_photo_montage': { 
                if (!existingImages || existingImages.length === 0) {
                    throw new Error("Devi prima generare le immagini per il montaggio.");
                }
                // Simula l'unione e usa OpenAI per generare il testo narrato
                const narrationText = await mockFfmpegProcess(existingImages, recipe); 
                
                return res.json({ 
                    success: true, 
                    narrationText: narrationText, // Restituisce il testo
                    isAudioOnly: true, 
                    isTextOnly: true 
                }); 
            }

            // =========================================================
            // CASE 3: Opzione 2 - Video dal Testo (Solo Testo Narrato)
            // =========================================================
            case 'video_text_only': { 
                
                // Genera il testo narrato con OpenAI
                const narrationText = await generateNarrationTextWithOpenAI(recipe); 

                return res.json({ 
                    success: true, 
                    narrationText: narrationText, // Restituisce il testo
                    isAudioOnly: true, 
                    isTextOnly: true 
                });
            }
            
            default:
                return res.status(400).json({ error: "Tipo media non supportato." });
        }
        
    } catch (err) {
        console.error("Errore durante la generazione media:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});


export default router;