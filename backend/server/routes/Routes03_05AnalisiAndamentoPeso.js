// ==================================================================================
// 🟢 INIZIO ROTTA "Routes03_05AnalisiAndamentoPeso"
// Rotta interna: /summary
// Endpoint completo (montato in index.js): /api/nutrition/summary
// ==================================================================================
import { Router } from "express";
import { gemini } from "../config.js";
import { NUTRITION_SUMMARY_PROMPT_NEW } from "../prompts/03_05analisi_peso_andamento_calorico.js";

const router = Router();

/**
 * Funzione per eseguire tutte le analisi statistiche sui dati di calorie e peso.
 * Prepara tutte le variabili per la sostituzione del prompt.
 * @param {object[]} calorieData - Dati calorici
 * @param {object[]} weightData - Dati sul peso
 * @param {object} userContext - Contesto utente (età, altezza, sesso)
 * @returns {object} Contiene tutti i dati analizzati pronti per il prompt.
 */
function analyzeData(calorieData, weightData, userContext) {
    // 1. Analisi Calorica Base
    const dailyCalories = calorieData.reduce((acc, entry) => {
        acc[entry.date] = entry.calories;
        return acc;
    }, {});

    const totalCalories = calorieData.reduce((sum, entry) => sum + entry.calories, 0);
    const avgDailyCalories = calorieData.length > 0 ? totalCalories / calorieData.length : 0;

    const sortedCalorieEntries = calorieData.sort((a, b) => new Date(a.date) - new Date(b.date));
    const peakCalorieEntry = sortedCalorieEntries.reduce((max, entry) => (entry.calories > max.calories ? entry : max), { calories: -Infinity });
    const lowestCalorieEntry = sortedCalorieEntries.reduce((min, entry) => (entry.calories < min.calories ? entry : min), { calories: Infinity });


    // 2. Analisi del Peso
    const sortedWeight = weightData.sort((a, b) => new Date(a.date) - new Date(b.date));
    const initialWeightEntry = sortedWeight[0] || null;
    const finalWeightEntry = sortedWeight[sortedWeight.length - 1] || null;
    
    let weightTrend = 'stabile';
    let absWeightChange = 0;

    if (initialWeightEntry && finalWeightEntry) {
        const change = finalWeightEntry.weight - initialWeightEntry.weight;
        absWeightChange = Math.abs(change);
        if (change > 0.1) {
            weightTrend = 'aumentato';
        } else if (change < -0.1) {
            weightTrend = 'diminuito';
        }
    }

    // 3. Calcolo TDEE Stimato (molto semplificato, solo per il prompt)
    // TDEE = Basal Metabolic Rate (BMR) * Activity Factor (Sedentario = 1.2)
    // Usiamo la formula Mifflin-St Jeor (la più comune)
    let bmr = 0;
    if (userContext.gender === 'male') {
        bmr = (10 * userContext.weight) + (6.25 * userContext.height) - (5 * userContext.age) + 5;
    } else if (userContext.gender === 'female') {
        bmr = (10 * userContext.weight) + (6.25 * userContext.height) - (5 * userContext.age) - 161;
    }
    const estimatedTdee = bmr * 1.2; // Sedentario

    // 4. Correlazione Calorie vs TDEE
    let comparisonText = 'in linea';
    if (avgDailyCalories > estimatedTdee + 100) {
        comparisonText = 'superiore';
    } else if (avgDailyCalories < estimatedTdee - 100) {
        comparisonText = 'inferiore';
    }


    // 5. Raccolta di tutti i risultati in un unico oggetto per la sostituzione
    return {
        startDate: initialWeightEntry?.date || 'N/D',
        endDate: finalWeightEntry?.date || 'N/D',
        avgDailyCalories: avgDailyCalories.toFixed(0),
        estimatedTdee: estimatedTdee.toFixed(0),
        comparisonText: comparisonText,
        peakCalorieDay: peakCalorieEntry.date || 'N/D',
        peakCalorieValue: peakCalorieEntry.calories || 0,
        lowestCalorieDay: lowestCalorieEntry.date || 'N/D',
        lowestCalorieValue: lowestCalorieEntry.calories || 0,
        initialWeight: initialWeightEntry?.weight?.toFixed(1) || 'N/D',
        finalWeight: finalWeightEntry?.weight?.toFixed(1) || 'N/D',
        weightTrend: weightTrend,
        absWeightChange: absWeightChange.toFixed(1),
        // Passiamo i dati grezzi per l'analisi complessa del prompt
        dailyCalories: dailyCalories, 
        gender: userContext.gender || 'non specificato',
        age: userContext.age || 'N/D',
        height: userContext.height || 'N/D',
    };
}


router.post('/summary', async (req, res) => {
    let audioUrl = null; 
    try {
        const { period, userContext, calorieData, weightData } = req.body;
        const periodName = period === 'week' ? 'ultima settimana' : period === 'month' ? 'ultimo mese' : 'ultimi sei mesi';
        
        if (!calorieData || !weightData || calorieData.length === 0 || weightData.length === 0) {
            return res.status(400).json({ error: 'Mancano dati sufficienti per l\'analisi nutrizionale.' });
        }

        // 1. Esegui l'analisi statistica e preparare le variabili
        const analysis = analyzeData(calorieData, weightData, userContext);

        // 2. Preparazione del prompt: Sostituzione di TUTTI i segnaposto
        let formattedPrompt = NUTRITION_SUMMARY_PROMPT_NEW;
        
        // Sostituzioni basate sui dati analizzati e contesto utente
        formattedPrompt = formattedPrompt
            // Dati iniziali
            .replace('{period}', periodName)
            .replace('{userContext}', JSON.stringify(userContext, null, 2))
            .replace('{calorieData}', JSON.stringify(calorieData, null, 2)) // Dati grezzi per analisi approfondita AI
            .replace('{weightData}', JSON.stringify(weightData, null, 2))   // Dati grezzi per analisi approfondita AI

            // Sostituzioni dei risultati dell'analisi (NUOVE)
            .replace('{start_date}', analysis.startDate)
            .replace('{end_date}', analysis.endDate)
            .replace('{avg_daily_calories}', analysis.avgDailyCalories)
            .replace('{estimated_tdee}', analysis.estimatedTdee)
            .replace('{comparison_text}', analysis.comparisonText)
            .replace('{peak_calorie_day}', analysis.peakCalorieDay)
            .replace('{peak_calorie_value}', analysis.peakCalorieValue)
            .replace('{lowest_calorie_day}', analysis.lowestCalorieDay)
            .replace('{lowest_calorie_value}', analysis.lowestCalorieValue)
            .replace('{initial_weight_date}', analysis.startDate)
            .replace('{initial_weight}', analysis.initialWeight)
            .replace('{final_weight_date}', analysis.endDate)
            .replace('{final_weight}', analysis.finalWeight)
            .replace('{weight_trend}', analysis.weightTrend)
            .replace('{abs_weight_change}', analysis.absWeightChange)
            .replace('{gender}', analysis.gender)
            .replace('{age}', analysis.age)
            .replace('{height}', analysis.height)
            .replace('{daily_calories}', JSON.stringify(analysis.dailyCalories));


        // 3. Chiamata a Gemini per l'analisi e il riassunto
        const model = gemini.getGenerativeModel({ model: "gemini-2.5-flash" });

        const result = await model.generateContent({
            contents: [{ 
                role: "user",
                parts: [{ text: formattedPrompt }]
            }]
        });
        
        // 🟢 MODIFICA CHIAVE: Aggiunge un fallback per estrarre il testo se result.text non è definito
        let responseText = result.text;
        if (!responseText && result.response && result.response.candidates && result.response.candidates[0]) {
            responseText = result.response.candidates[0].content.parts[0].text;
        }

        if (!responseText) {
            console.error("❌ LOG: Risposta Gemini vuota o bloccata:", JSON.stringify(result, null, 2));
            throw new Error("Il modello AI non ha generato una risposta testuale. Riprova con dati validi.");
        }
        
        responseText = responseText.trim(); // Eseguiamo il trim sul testo estratto
        
        // 4. Gestione Audio (Rimosso ElevenLabs non definito e usato un placeholder sicuro)
        // Se non usi il servizio TTS di Groq (come nell'errore precedente), usa un placeholder locale.
        audioUrl = `http://localhost:3001/audio/nutrizione_placeholder.mp3`; 

        res.status(200).json({ summary: responseText, audioUrl });

    } catch (error) {
        console.error("🚨 Errore Riepilogo Nutrizione (Gemini):", error);
        res.status(500).json({ error: `Errore del server durante l'analisi AI: ${error.message}` });
    }
});
// ===================================
// FINE  ROTTA "Routes03_05AnalisiAndamentoPeso"
// ===================================
export default router;
