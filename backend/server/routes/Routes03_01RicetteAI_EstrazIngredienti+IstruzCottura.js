// ==================================================================================
// 🟢 INIZIO ROTTA "Routes03_01RicetteAI_EstrazIngredienti+IstruzCottura"
// ==================================================================================
import { Router } from "express";
import { openai } from "../config.js";
import { RECIPE_PROMPTS1 } from "../prompts/03_01ricetteAI_estrazione_ingredienti.js";
import { RECIPE_PROMPTS2 } from "../prompts/03_01ricetteAI_estrazione_istruzioni_cottura.js";
const router = Router(); // L'oggetto router viene creato qui

// ---------- QUI INCOLLI IL CODICE ORIGINALE DELLE ROTTE ----------
// ====================================================
// 🟢 INIZIO ROTTA "Routes03_01RicetteAI_EstrazIngredienti+IstruzCottura": RICETTE AI
// ====================================================
// ====================================================
// 🟢 PARTE 1 : ( PARTE1) RICETTE - Estrazione Ingredienti
// Endpoint: /extract-ingredients (che diventa /api/recipe/extract-ingredients)
// ====================================================

router.post('/extract-ingredients', async (req, res) => {
    const startTime = Date.now();
    console.log("--- INIZIO CALL /extract-ingredients ---");
    console.log(`Ricevuto body: ${JSON.stringify(req.body)}`);

    try {
        const { recipeText } = req.body;
        if (!recipeText) {
            console.error("🚨 Errore 400: Manca il testo della ricetta.");
            return res.status(400).json({ error: 'Manca il testo della ricetta.' });
        }

        const messages = [
            { role: "system", content: RECIPE_PROMPTS1.INGREDIENTS_EXTRACTION }, 
            { role: "user", content: recipeText }
        ];

        const aiStartTime = Date.now();
        const chatCompletion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messages,
        });
        const aiEndTime = Date.now();
        console.log(`⏱️ Tempo di risposta OpenAI: ${aiEndTime - aiStartTime}ms`);


        const rawIngredients = chatCompletion.choices[0].message.content.trim();
        const extractedIngredients = rawIngredients.split(',').map(name => name.trim());

        const endTime = Date.now();
        console.log(`✅ Successo. Tempo totale: ${endTime - startTime}ms`);

        res.status(200).json({ ingredients: extractedIngredients });

    } catch (error) {
        const endTime = Date.now();
        console.error(`🚨 Errore Ricette (Ingredients) [Tempo: ${endTime - startTime}ms]:`, error);
        res.status(500).json({ error: `Errore OpenAI (Ingredients): ${error.message}` });
    }
});


//====================================================
// 🟢 PARTE 2 -  RICETTE AI - Istruzioni e Contenuti Aggiuntivi
// Endpoint: /generate-instructions (che diventa /api/recipe/generate-instructions)
// ====================================================

router.post('/generate-instructions', async (req, res) => {
    const startTime = Date.now();
    console.log("--- INIZIO CALL /generate-instructions ---");
    console.log(`Ricevuto body: ${JSON.stringify(req.body)}`);

    try {
        const { recipeText } = req.body;
        if (!recipeText) {
            console.error("🚨 Errore 400: Manca il testo della ricetta.");
            return res.status(400).json({ error: 'Manca il testo della ricetta.' });
        }

        const messages = [
            { role: "system", content: RECIPE_PROMPTS2.INSTRUCTIONS_AND_FUN }, 
            { role: "user", content: recipeText }
        ];

        const aiStartTime = Date.now();
        const chatCompletion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messages,
        });
        const aiEndTime = Date.now();
        console.log(`⏱️ Tempo di risposta OpenAI: ${aiEndTime - aiStartTime}ms`);


        const instructions = chatCompletion.choices[0].message.content.trim();
        
        const endTime = Date.now();
        console.log(`✅ Successo. Tempo totale: ${endTime - startTime}ms`);

        res.status(200).json({ instructions });

    } catch (error) {
        const endTime = Date.now();
        console.error(`🚨 Errore Ricette (Instructions) [Tempo: ${endTime - startTime}ms]:`, error);
        res.status(500).json({ error: `Errore OpenAI (Instructions): ${error.message}` });
    }
});

// ===================================
// FINE ROTTA "Routes03_01RicetteAI_EstrazIngredienti+IstruzCottura"
// ===================================


// ==================================================================================
// 🟢 FINE ROTTA "Routes03_01RicetteAI_EstrazIngredienti+IstruzCottura"
// ==================================================================================
export default router; 
