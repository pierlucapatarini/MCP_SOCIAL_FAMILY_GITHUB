// ==================================================================================
// 🟢 INIZIO ROTTA "Routes20_02AlfredRiepilogoSettimanaleImpegni"
// ==================================================================================
import { Router } from "express";
import { gemini } from "../config.js";
import { ALFRED_SYSTEM_PROMPT1 } from "../prompts/20_23_alfred_riepilogo_appuntamenti_famiglia.js";

const router = Router();



// **CORREZIONE: Sostituito app.post con router.post e /api/alfred-summary con '/'**
router.post('/', async (req, res) => {
    try {
        // Usa una destrutturazione sicura
        const { messages = [], events = [], todos = [], documents = [] } = req.body;
        
        const userPrompt = `
            Riepiloga le seguenti informazioni per la famiglia.
            
            ---
            MESSAGGI RECENTI:
            ${messages.length > 0 ? messages.map(m => 
                `- [${m.created_at ? m.created_at.split('T')[0] : 'Data Ignota'}] Utente Sconosciuto: ${m.content || 'Contenuto Mancante'}`
            ).join('\n') : 'Nessun messaggio recente.'}
            
            ---
            EVENTI IN CALENDARIO:
            ${events.length > 0 ? events.map(e => 
                `- [${e.start_time ? e.start_time.split('T')[0] : 'Data Ignota'}] ${e.title || 'Titolo Mancante'}: ${e.description || 'Descrizione Mancante'}`
            ).join('\n') : 'Nessun evento in calendario.'}
            
            ---
            COSE DA FARE:
            ${todos.length > 0 ? todos.map(t => 
                `- [${t.created_at ? t.created_at.split('T')[0] : 'Data Ignota'}] ${t.title || 'Titolo Mancante'} (Priorità: ${t.priority || 'Sconosciuta'})`
            ).join('\n') : 'Nessuna cosa da fare.'}

            ---
            DOCUMENTI RILEVANTI (testo estratto):
            ${documents.length > 0 ? documents.map(d => 
                `- Titolo: ${d.name || 'Nome Mancante'}\n${d.content || 'Contenuto del documento mancante.'}`
            ).join('\n\n') : 'Nessun documento rilevante.'}
            ---
            
            Genera un riassunto conciso e utile in base a questi dati.
            Non includere i dettagli esatti, ma una visione d'insieme delle attività e impegni principali.
            Rispondi come se fossi il maggiordomo di famiglia.
        `;
        
        const result = await gemini.models.generateContent({
            model: "gemini-1.5-flash", 
            contents: [{
                role: "user",
                parts: [{ text: userPrompt }]
            }],
            config: {
                systemInstruction: ALFRED_SYSTEM_PROMPT1
            }
        });

        const responseText = result.text.trim(); 
        
        res.status(200).json({ summary: responseText });

    } catch (error) {
        console.error("🚨 Errore nell'API Alfred Gemini:", error.message);
        res.status(500).json({
            error: `Errore del server durante l'analisi AI: ${error.message}`
        });
    }
});
// ===================================
// FINE  ROTTA "Routes20_23AlfredRiepilogoSettimanaleImpegni"
// ===================================

export default router;