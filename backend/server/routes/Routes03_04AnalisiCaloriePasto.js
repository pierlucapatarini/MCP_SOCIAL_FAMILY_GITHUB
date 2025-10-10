// ==================================================================================
// 🟢 INIZIO ROTTA "Routes03_04AnalisiCaloriePasto"
// Endpoint completo: /api/contacalorie
// ==================================================================================
import { Router } from "express";
import { groq } from "../config.js";
import { CALORIE_SYSTEM_PROMPT1 } from "../prompts/03_04calcolo_calorie_pasto.js";

const router = Router();



// ==================================================================================

router.post('/', async (req, res) => {
    try {
        const { mealText } = req.body;
        if (!mealText) return res.status(400).json({ error: 'Manca il testo del pasto da analizzare.' });

        const messages = [
            { role: "system", content: CALORIE_SYSTEM_PROMPT1 }, 
            { role: "user", content: `Analizza questo pasto: ${mealText}` }
        ];

        const chatCompletion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile", 
            messages: messages,
            response_format: { type: "json_object" } 
        });

        const rawJson = chatCompletion.choices[0].message.content.trim();
        let finalData = JSON.parse(rawJson);

        res.status(200).json(finalData);

    } catch (error) {
        console.error("🚨 Errore Contacalorie (Groq):", error);
        res.status(500).json({ 
            error: `Errore Groq: ${error.message}`,
            fallback: true
        });
    }
});

// ==================================================================================
// 🟢 FINE ROTTA "Routes03_04AnalisiCaloriePasto"
// ==================================================================================
export default router;