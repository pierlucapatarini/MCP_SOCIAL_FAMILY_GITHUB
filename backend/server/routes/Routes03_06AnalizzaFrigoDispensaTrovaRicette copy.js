// FILE: server/routes/Routes03_06AnalizzaFrigoDispensaTrovaRicette.js

import express from "express";
import multer from "multer";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import fetch from 'node-fetch'; // Necessaria per Hugging Face API
import { Buffer } from 'buffer'; // Necessaria per gestire la risposta binaria di HF

import { SYSTEM_INSTRUCTION_FRIDGE, RECIPE_SCHEMA } from "../prompts/Prompts03_06AnalizzaFrigoDispensaTrovaRicette.js";

dotenv.config();
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// CHIAVE API PER HUGGING FACE e MODELLO
// NOTA: Assicurati che HUGGINGFACE_API_KEY sia nel tuo .env
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY; 
const HF_TEST_MODEL = "stabilityai/stable-diffusion-xl-base-1.0";

if (!HUGGINGFACE_API_KEY) {
    console.warn("HUGGINGFACE_API_KEY non trovata. La generazione di immagini non funzionerà.");
}

// Funzione di utilità per simulare l'unione dei file (FFmpeg)
const mockFfmpegProcess = async (imageUrls) => {
    // Simula un'operazione che richiede tempo (come l'unione di un video)
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log(`Simulazione FFmpeg: creazione video da ${imageUrls.length} immagini completata.`);
    
    // URL fittizio per il frontend. Questo deve essere accessibile dalla rotta statica /audio in index.js
    const tempVideoUrl = `/audio/mock_recipe_video.mp4`; 
    return tempVideoUrl; 
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
        // 1. GESTIONE RICHIESTA RICETTE (FASE FINALE) - AGGIORNATO CON 'preferences'
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
            
            // Risultato: Le ricette
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

        // Loop per trovare gli ingredienti in ogni immagine
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

        // Ritorna solo gli ingredienti trovati dalle foto (NIENTE RICETTE)
        res.json({ success: true, ingredients: [...allIngredients], recipes: [] });
    } catch (err) {
        console.error("Errore analisi/ricerca ricette:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});


// ***************************************************************
// ROTTA 2: GENERAZIONE MEDIA (IMMAGINI E VIDEO) (POST /generate-media)
// ***************************************************************

// Nota: Essendo montato su /api/food/ricette-da-foto, l'URL sarà /api/food/ricette-da-foto/generate-media
router.post("/generate-media", express.json(), async (req, res) => {
    if (!HUGGINGFACE_API_KEY) {
        return res.status(500).json({ success: false, error: "Chiave HUGGINGFACE_API_KEY mancante nel .env." });
    }

    const { recipe, mediaType, existingImages } = req.body;
    
    if (!recipe || !recipe.istruzioni || recipe.istruzioni.length === 0) {
        return res.status(400).json({ success: false, error: "Dati ricetta non validi o istruzioni mancanti." });
    }
    
    try {
        switch (mediaType) {
            
            // =========================================================
            // GENERAZIONE IMMAGINI (SDXL - via Hugging Face)
            // =========================================================
            case 'images': {
                const generatedImages = [];
                
                for (const instruction of recipe.istruzioni) {
                    // Prompt avanzato per migliorare la qualità
                    const prompt = `Realistic food photography of the cooking step: "${instruction}" for a recipe titled "${recipe.titolo}". Focus on the main action, high quality, studio lighting, no cartoon elements.`;
                    
                    console.log(`Generazione Immagine Hugging Face per: ${instruction}`);
                    
                    const response = await fetch(
                        `https://api-inference.huggingface.co/models/${HF_TEST_MODEL}`,
                        {
                            headers: { 
                                Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
                                'Content-Type': 'application/json',
                            },
                            method: 'POST',
                            body: JSON.stringify({ 
                                inputs: prompt,
                                parameters: {
                                    height: 768, 
                                    width: 768,
                                    num_inference_steps: 40,
                                    guidance_scale: 9,
                                }
                            }),
                        }
                    );

                    if (!response.ok) {
                        const errorText = await response.text();
                        const truncatedError = errorText.substring(0, 150) + '...'; 
                        throw new Error(`HF Image Generation Failed: ${response.status} - ${truncatedError}`);
                    }
                    
                    // L'API HF restituisce un'immagine binaria
                    const imageBuffer = await response.buffer();
                    
                    // Convertiamo il buffer in Base64 Data URL (per il frontend)
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
            // GENERAZIONE VIDEO (FFmpeg - Simulata)
            // =========================================================
            case 'video_ffmpeg': {
                if (!existingImages || existingImages.length === 0) {
                    throw new Error("Devi prima generare le immagini per usare FFmpeg.");
                }
                // Chiama la funzione di simulazione. Qui andrebbe la logica vera di FFmpeg/API video.
                const videoUrl = await mockFfmpegProcess(existingImages);
                return res.json({ success: true, videoUrl: videoUrl });
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