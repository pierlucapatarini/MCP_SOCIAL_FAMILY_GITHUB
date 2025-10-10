// ==================================================================================
// 🟢 INIZIO ROTTA "Routes20_22InfoDocumentiArchiviati"
// ==================================================================================
import { Router } from "express";
import { supabase, gemini } from "../config.js";
import { ALFRED_DOCS_PROMPT, ALFRED_QUERY_ANALYSIS_PROMPT } from "../prompts/20_22_AlfredRicInfoDoc.js";

const router = Router();

// ---------- QUI INCOLLI IL CODICE ORIGINALE DELLA ROTTA ----------

// ==================================================================================
// 🟢 INIZIO ROtta "Routes20_22InfoDocumentiArchiviati" - RICHIESTE DI INFORMAZIONI AD ALFRED SU DATI CONTENUTI IN TABELLE E DOCUMENTI 
// /api/alfred/query
// ==================================================================================
router.post('/', async (req, res) => {
    let timer;
    const TIMEOUT_MS_GLOBAL = 120000;
    
    const timeoutPromiseGlobal = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Timeout complessivo della richiesta.')), TIMEOUT_MS_GLOBAL);
    });

    // Funzione helper per estrarre il testo dal wrapper o dalla struttura cruda
    const extractTextFromResponse = (response) => {
        if (!response) return null;
        
        // 1. Tenta la scorciatoia .text dell'SDK (soluzione ideale)
        if (response.text) return response.text;

        // 2. Se fallisce, naviga la struttura cruda (soluzione robusta)
        if (response.response && response.response.candidates && response.response.candidates.length > 0) {
            return response.response.candidates[0].content.parts[0].text;
        }

        return null;
    };

    try {
        const { question, familyId, userId } = req.body;
        const TIMEOUT_MS_AI_CALL = 90000; 
        
        console.log('================================================================');
        console.log('➡️ LOG INIZIALE: Avvio flusso Alfred');
        console.log(`Domanda: "${question}" | Family ID: ${familyId} | User ID: ${userId}`);
        console.log('================================================================');

        if (!question.trim() || !familyId) {
            clearTimeout(timer);
            console.error('❌ LOG: Dati di input mancanti.');
            return res.status(400).json({ error: 'La domanda e l\'ID della famiglia sono obbligatori.' });
        }
        
        // FASE 0: Caricamento Metadati SQL
        // NOTA: Assicurati che 'getSqlMetadataString' non stia limitando i metadati, se pertinente.
        const sqlMetadataString = await getSqlMetadataString(familyId, supabase); 
        console.log('✅ LOG: FASE 0: Metadati SQL caricati.');

        // FASE 1: ANALISI DELL'INTENTO DELL'UTENTE (prompt semplificato)
        console.log('--- LOG: FASE 1.0: Avvio Analisi AI (Rilevamento Intento) ---');
        let intent = 'both'; // Fallback predefinito
        let sql_query_hints = {}; // Placeholder per gli hints
        
        try {
            const intentModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const analysisPrompt = ALFRED_QUERY_ANALYSIS_PROMPT(sqlMetadataString, question); 

            const analysisPromise = intentModel.generateContent({ 
                contents: [{ parts: [{ text: analysisPrompt }] }] 
            });
            
            const analysisResponse = await Promise.race([
                analysisPromise,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout nell\'analisi (Fase 1).')), TIMEOUT_MS_AI_CALL))
            ]);

            const analysisRawText = extractTextFromResponse(analysisResponse);
            
            if (!analysisRawText) {
                console.error('❌ LOG: Risposta dall\'AI vuota o mancante. Risposta AI cruda:', JSON.stringify(analysisResponse, null, 2)); 
                throw new Error('Risposta vuota o non valida dalla Fase 1.');
            }
            
            // Parsing e estrazione dell'intento/hints
            const analysisText = analysisRawText.trim().replace(/```json|```/g, '');
            const analysisResult = JSON.parse(analysisText);
            
            intent = analysisResult.source_scope === 'null' ? 'both' : analysisResult.source_scope;
            sql_query_hints = analysisResult.sql_query_hints || {};
            
            console.log('✅ LOG: FASE 1.1: Analisi AI completata.');
            console.log('🔍 LOG: Risultato Analisi AI:', JSON.stringify(analysisResult, null, 2));

        } catch (e) {
            console.error('❌ LOG: Errore nell\'analisi AI (Fase 1). Fallback a "both".', e.message);
        }

        let structuredResults = [];
        let documentResults = [];
        let structuredSources = [];
        let documentSources = [];

        // FASE 2: RICERCA IN BASE ALL'INTENTO RILEVATO
        console.log('--- LOG: FASE 2.0: Avvio ricerca (scope:', intent, ') ---');
        const searchPromises = [];

        if (intent === 'structured' || intent === 'both') {
            if (sql_query_hints && sql_query_hints.target_table) {
                console.log('... LOG: Aggiunta promise per la ricerca Dati Strutturati (SQL).');
                searchPromises.push((async () => {
                    const data = await executeIntelligentStructuredQuery(familyId, sql_query_hints, supabase);
                    return data;
                })());
            } else {
                 console.log('⚠️ LOG: Scope è strutturato/both ma target_table è mancante. Ricerca SQL saltata.');
            }
        }
        
        if (intent === 'documents' || intent === 'both') {
            console.log('... LOG: Aggiunta promise per la ricerca Documenti (vettoriale).');
            searchPromises.push((async () => {
                try {
                    const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
                    const { embedding: embeddingResult } = await embeddingModel.embedContent(question);
                    const embeddingValues = embeddingResult.values;

                    // 💡 CORREZIONE: Abbassiamo la soglia di corrispondenza per i documenti
                    const MATCH_THRESHOLD = 0.65; 

                    const { data: docs, error: docsError } = await supabase.rpc('search_documents', {
                        p_family_group: familyId,
                        query_embedding: embeddingValues, 
                        match_threshold: MATCH_THRESHOLD, // Soglia abbassata
                        match_count: 5
                    });
                    if (docsError) throw docsError;
                    console.log(`✅ LOG: Ricerca vettoriale completata. Trovati ${docs.length} documenti.`);
                    return docs;
                } catch (e) {
                    console.error('❌ LOG: Errore nella ricerca vettoriale (Fase 2):', e.message);
                    return [];
                }
            })());
        }

        const results = await Promise.race([
            Promise.all(searchPromises),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout nella ricerca parallela (Fase 2).')), TIMEOUT_MS_AI_CALL))
        ]);
        
        console.log('✅ LOG: FASE 2.3: Ricerca parallela completata.');
        
        results.forEach(resArray => {
            if (!Array.isArray(resArray)) return;
            resArray.forEach(item => {
                if (item && item.file_name) {
                    documentResults.push(item);
                    documentSources.push(item.file_name);
                } else if (item) {
                    structuredResults.push(item);
                    structuredSources.push(item.title);
                }
            });
        });

        // FASE 3: PREPARAZIONE DEI DATI PER LA GENERAZIONE FINALE
        console.log('--- LOG: FASE 3.0: Preparazione Dati per Alfred ---');

        const combinedStructuredText = structuredResults.length > 0
            ? structuredResults.map(item => `Tipo: ${item.type}\nTitolo: ${item.title}\nDati: ${JSON.stringify(item.data, null, 2)}`).join('\n---\n')
            : 'Nessun dato strutturato rilevante.';

        const combinedDocumentText = documentResults.length > 0
            ? documentResults.map(doc => `Titolo: ${doc.file_name}\nContenuto: ${doc.extracted_text}`).join('\n---\n')
            : 'Nessun documento rilevante.';
            
        console.log(`📝 LOG: Dati Strutturati inviati ad Alfred (primi 200 caratteri): ${combinedStructuredText.substring(0, 200)}...`);
        console.log(`📝 LOG: Testo Documenti inviato ad Alfred (primi 200 caratteri): ${combinedDocumentText.substring(0, 200)}...`);
            
        // FASE 4: GENERAZIONE RISPOSTA CON AI (con fonti)
        console.log('--- LOG: FASE 4.0: Avvio Generazione Risposta Finale (Alfred) ---');
        const finalPrompt = ALFRED_DOCS_PROMPT
            .replace('{question}', question)
            .replace('{structuredData}', combinedStructuredText)
            .replace('{documentData}', combinedDocumentText);
            
        const finalModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const finalPromise = finalModel.generateContent({
            contents: [{ parts: [{ text: finalPrompt }] }],
        });
        
        const finalResponse = await Promise.race([
            finalPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout nella generazione della risposta finale (Fase 4).')), TIMEOUT_MS_AI_CALL))
        ]);

        const finalRawText = extractTextFromResponse(finalResponse);

        if (!finalRawText) { 
            console.error('❌ LOG: Risposta finale dall\'AI vuota o mancante. Risposta AI cruda:', JSON.stringify(finalResponse, null, 2));
            throw new Error('Risposta finale dall\'AI vuota o non valida.');
        }

        const finalFullText = finalRawText;
        const finalJsonMatch = finalFullText.match(/```json\n([\s\S]*?)\n```/);
        const finalJsonString = finalJsonMatch ? finalJsonMatch[1] : finalFullText;
        
        let finalResult = JSON.parse(finalJsonString.trim());
        
        // 🟢 LOGICA: Normalizzazione della risposta (MAPPATURA CHIAVI)
        if (finalResult.risposta && !finalResult.text) {
            finalResult.text = finalResult.risposta;
            delete finalResult.risposta;
        } else if (finalResult.response && !finalResult.text) {
             finalResult.text = finalResult.response;
             delete finalResult.response;
        } else if (finalResult.answer && !finalResult.text) {
             finalResult.text = finalResult.answer;
             delete finalResult.answer;
        }

        // Mappa i campi fonti alternativi ("fonti") a "sources" per coerenza
        if (finalResult.fonti && !finalResult.sources) {
            finalResult.sources = finalResult.fonti;
            delete finalResult.fonti;
        }
        
        if (!finalResult.text) {
             console.error('❌ LOG: Impossibile trovare il testo della risposta nell\'oggetto JSON finale.');
             finalResult.text = finalFullText; 
        }

        // 🟢 CORREZIONE PRECEDENTE: Usiamo solo le fonti esplicite dell'AI per evitare inquinamento
        const allSources = [...new Set(finalResult.sources || [])];
        
        console.log('✅ LOG: FASE 4.1: Risposta finale AI ricevuta.');
        console.log(`🎉 LOG FLUSSO COMPLETATO: Risposta: ${finalResult.text.substring(0, 100)}... | Fonti Totali: ${allSources.join(', ')}`);
        
        clearTimeout(timer);
        res.status(200).json({ text: finalResult.text, sources: allSources });

    } catch (error) {
        clearTimeout(timer);
        console.error("🚨 LOG ERRORE CRITICO: Errore nel flusso Alfred:", error.message);
        console.log('================================================================');
        res.status(500).json({ error: `Errore nel flusso Alfred: ${error.message}` });
    }
});
// ==================================================================================
// FINE ROTTA "Routes20_22InfoDocumentiArchiviati" 
// ==================================================================================


// ==================================================================================
// 🟢 FINE ROTTA "Routes20_22InfoDocumentiArchiviati"
// ==================================================================================
export default router;
