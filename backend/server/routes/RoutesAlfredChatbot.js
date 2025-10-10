// FILE: server/routes/RoutesAlfredChatbot.js (CON IL MODELLO CHE GIÀ USI E FUNZIONA)

import express from "express";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SYSTEM_INSTRUCTION, APP_DOCUMENTATION } from "../prompts/PromptsAlfredChatbot.js"; 

dotenv.config();
const router = express.Router();

let gemini;
try {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("La variabile d'ambiente GEMINI_API_KEY non è definita nel file .env");
    }
    gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log("🤖 (Rotta Chatbot) Istanza di Gemini creata con successo.");
} catch (error) {
    console.error("ERRORE FATALE (Rotta Chatbot): Impossibile inizializzare Gemini.", error.message);
}

router.post("/", async (req, res) => {

    if (!gemini) {
        return res.status(500).json({
            success: false,
            error: "Errore di configurazione del server: l'assistente AI non è disponibile."
        });
    }

    const userMessage = req.body.message;

    if (!userMessage || typeof userMessage !== 'string' || userMessage.trim() === '') {
        return res.status(400).json({ 
            success: false, 
            error: "Il messaggio dell'utente è obbligatorio." 
        });
    }

    const fullPrompt = `L'utente ha chiesto: "${userMessage}"\n\nUtilizza la seguente documentazione per formulare la tua risposta.\n---\nDOCUMENTAZIONE INTERNA DELL'APP:\n${APP_DOCUMENTATION}\n---`;

    try {
        // =====================================================================
        // LA VERA CORREZIONE FINALE: Usiamo lo stesso modello che funziona già
        // =====================================================================
        const model = gemini.getGenerativeModel({ 
            model: "gemini-2.0-flash-exp", // <-- NOME PRESO DALLA TUA ROTTA FUNZIONANTE
        // =====================================================================
            systemInstruction: {
                parts: [{ text: SYSTEM_INSTRUCTION }],
                role: "model"
            }
        });

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const generatedText = response.text();

        res.json({ 
            success: true, 
            reply: generatedText 
        });

    } catch (error) {
        console.error("Errore durante la chiamata all'API di Gemini nella rotta Chatbot:", error);
        res.status(500).json({ 
            success: false, 
            error: "Si è verificato un errore interno durante la comunicazione con l'assistente AI." 
        });
    }
});

export default router;
