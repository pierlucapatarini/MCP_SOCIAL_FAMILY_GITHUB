// FILE: server/routes/Routes16_03NoteScriviDettaArchivia.js

import express from "express";
import { marked } from "marked";
import PDFDocument from "pdfkit";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";

import { 
    gemini, 
    supabase, 
    supabaseAdmin, 
    extractUserAndFamilyGroup 
} from "../config.js";

import { 
    PDF_SUMMARY_SCHEMA,
    SYSTEM_INSTRUCTION_ANALYZE_PROJECT,
    MARKDOWN_TEMPLATE,
    SYSTEM_INSTRUCTION_TRANSCRIPTION_CLEANUP
} from "../prompts/Prompts16_03NoteScriviDettaArchivia.js";

dotenv.config();
const router = express.Router();

// ===== CONFIGURAZIONE MULTER =====
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }
});

// ===== FUNZIONI HELPER AI =====
const generateContent = async ({ prompt, systemInstruction, generationConfig = {} }) => {
    if (!gemini || typeof gemini.getGenerativeModel !== 'function') {
        throw new Error("GoogleGenerativeAI non inizializzata.");
    }
    
    const modelConfig = { model: "gemini-2.0-flash-exp" };
    if (systemInstruction) modelConfig.systemInstruction = systemInstruction;
    if (Object.keys(generationConfig).length > 0) modelConfig.generationConfig = generationConfig;
    
    const model = gemini.getGenerativeModel(modelConfig);
    
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        if (generationConfig.responseMimeType === "application/json") {
            try {
                let cleanJsonText = text.trim();
                if (cleanJsonText.startsWith('```json')) cleanJsonText = cleanJsonText.substring(7);
                if (cleanJsonText.startsWith('```')) cleanJsonText = cleanJsonText.substring(3);
                if (cleanJsonText.endsWith('```')) cleanJsonText = cleanJsonText.substring(0, cleanJsonText.length - 3);
                return JSON.parse(cleanJsonText.trim());
            } catch (jsonError) {
                console.error("[AI] Errore parsing JSON:", text);
                throw new Error("Risposta AI non in formato JSON valido: " + jsonError.message);
            }
        }
        return text;
    } catch (error) {
        console.error("[AI] Errore chiamata Gemini:", error.message || error);
        if (error.message?.includes("API key not valid")) throw new Error("Chiave API Gemini non valida");
        if (error.message?.includes("quota")) throw new Error("Quota API Gemini esaurita");
        throw error;
    }
};

// ===== CONVERSIONE MARKDOWN -> PDF =====
const convertMarkdownToPDF = async (markdown, projectName) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            
            doc.fontSize(24).font('Helvetica-Bold').text(projectName, { align: 'center' }).moveDown(2);
            const lines = markdown.split('\n');
            
            lines.forEach(line => {
                line = line.trim();
                if (!line) { doc.moveDown(0.5); return; }
                if (line.startsWith('# ')) doc.fontSize(20).font('Helvetica-Bold').text(line.substring(2)).moveDown(1);
                else if (line.startsWith('## ')) doc.fontSize(16).font('Helvetica-Bold').text(line.substring(3)).moveDown(0.8);
                else if (line.startsWith('### ')) doc.fontSize(14).font('Helvetica-Bold').text(line.substring(4)).moveDown(0.6);
                else if (line.startsWith('**') && line.endsWith('**')) doc.fontSize(12).font('Helvetica-Bold').text(line.replace(/\*\*/g, '')).moveDown(0.3);
                else if (line.startsWith('- ') || line.match(/^\d+\. /)) doc.fontSize(11).font('Helvetica').text(line, { indent: 20 }).moveDown(0.2);
                else if (line === '---') doc.moveDown(0.5).moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown(0.5);
                else doc.fontSize(11).font('Helvetica').text(line.replace(/\*\*/g, ''), { align: 'left' }).moveDown(0.4);
                if (doc.y > 700) doc.addPage();
            });
            
            doc.fontSize(9).font('Helvetica-Oblique').text(
                `Generato da Alfred AI - ${new Date().toLocaleDateString('it-IT')}`,
                50, 750, { align: 'center' }
            );
            doc.end();
        } catch (error) { reject(error); }
    });
};

// ===== ROTTA 0: CREATE NOTE =====
router.post("/create-note", upload.single('file'), async (req, res) => {
    const file = req.file;
    const { title_notes, summary_notes, note_type, family_group, username,
        description_notes, text_notes, inserted_by_user, drawing_data_url, audio_transcription } = req.body;
    
    if (!title_notes || !note_type || !family_group || !username) {
        return res.status(400).json({ success: false, error: "Campi obbligatori mancanti." });
    }

    let fileUrl = null;
    let fileName = null;

    try {
        if (file) {
            const originalFileName = file.originalname || `${note_type}_${Date.now()}`;
            const fileExtension = path.extname(originalFileName);
            const baseFileName = path.basename(originalFileName, fileExtension);
            fileName = `${baseFileName.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 30)}_${Date.now()}${fileExtension}`;
            const storagePath = `note_files/${family_group}/${title_notes.replace(/[^a-zA-Z0-9_]/g, '_')}/${fileName}`;
            const { error: uploadError } = await supabaseAdmin.storage.from('note16_03').upload(storagePath, file.buffer, {
                contentType: file.mimetype, upsert: true
            });
            if (uploadError) { console.error("Errore upload Supabase:", uploadError); return res.status(500).json({ success: false, error: "Errore upload file." }); }
            const { data: publicUrlData } = supabaseAdmin.storage.from('note16_03').getPublicUrl(storagePath);
            fileUrl = publicUrlData.publicUrl;
        }

        const insertPayload = {
            title_notes,
            summary_notes,
            description_notes,
            text_notes,
            note_type, family_group, username, inserted_by_user,
            file_url: fileUrl,
            file_name: fileName,
            drawing_data_url: drawing_data_url || null,
            audio_transcription: audio_transcription || null,
        };

        if ((note_type === "voice" || note_type === "audio") && fileUrl) {
            insertPayload.audio_url = fileUrl;
        }

        const { data, error: insertError } = await supabaseAdmin.from('note_vocali_appunti').insert(insertPayload).select().single();
        if (insertError) throw insertError;

        // aggiungo compatibilità frontend: duplico drawing_data_url
        if (data) data.drawing_data = data.drawing_data_url;

        res.json({ success: true, message: `Nota di tipo ${note_type} creata con successo.`, note: data });
    } catch (error) {
        console.error('Errore creazione nota:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== ROTTA 1: EDIT NOTE =====
router.put("/edit-note/:noteId", upload.single('file'), async (req, res) => {
    const { noteId } = req.params;
    const file = req.file;
    const updateData = req.body;
    
    try {
        let fileUrl = null;
        let fileName = null;

        if (file) {
            const originalFileName = file.originalname || `${updateData.note_type}_${Date.now()}`;
            const fileExtension = path.extname(originalFileName);
            const baseFileName = path.basename(originalFileName, fileExtension);
            fileName = `${baseFileName.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 30)}_${Date.now()}${fileExtension}`;
            const storagePath = `note_files/${updateData.family_group}/${updateData.title_notes.replace(/[^a-zA-Z0-9_]/g, '_')}/${fileName}`;
            const { error: uploadError } = await supabaseAdmin.storage.from('note16_03').upload(storagePath, file.buffer, {
                contentType: file.mimetype, upsert: true
            });
            if (uploadError) throw uploadError;
            const { data: publicUrlData } = supabaseAdmin.storage.from('note16_03').getPublicUrl(storagePath);
            fileUrl = publicUrlData.publicUrl;
            updateData.file_url = fileUrl;
            updateData.file_name = fileName;
            if ((updateData.note_type === "voice" || updateData.note_type === "audio") && fileUrl) {
                updateData.audio_url = fileUrl;
            }
        }
        
        updateData.last_modified_at = new Date().toISOString();
        
        const { data, error } = await supabaseAdmin.from('note_vocali_appunti').update(updateData).eq('id', noteId).select().single();
        if (error) throw error;

        if (data) data.drawing_data = data.drawing_data_url;
        
        res.json({ success: true, message: "Nota aggiornata", note: data });
    } catch (error) {
        console.error('Errore aggiornamento nota:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ... (le altre rotte PDF, transcribe, analyze, stats restano uguali)



// ===== ROTTA 2: GENERATE PDF SUMMARY (MIGLIORATA) =====
router.post("/generate-pdf-summary", async (req, res) => {
    const { projectName, familyGroup } = req.body;
    
    if (!projectName || !familyGroup) {
        return res.status(400).json({ 
            success: false, 
            error: "Nome progetto e family_group obbligatori" 
        });
    }
    
    console.log(`[PDF] Generazione per: ${projectName}, gruppo: ${familyGroup}`);
    
    try {
        const { data: notes, error: notesError } = await supabaseAdmin
            .from('note_vocali_appunti')
            .select('*')
            .eq('family_group', familyGroup)
            .eq('title_notes', projectName)
            .order('inserted_at', { ascending: true });
        
        if (notesError) throw new Error(`Errore database: ${notesError.message}`);
        if (!notes || notes.length === 0) {
            return res.status(404).json({ success: false, error: "Nessuna nota trovata" });
        }
        
        console.log(`[PDF] Trovate ${notes.length} note`);
        
        // PROMPT MIGLIORATO CON ANALISI COMPLETA
        let aiPrompt = `PROGETTO: "${projectName}"\nTOTALE NOTE: ${notes.length}\n\nCONTENUTO DELLE NOTE:\n\n`;
        
        notes.forEach((note, index) => {
            aiPrompt += `=== NOTA ${index + 1} ===\n`;
            aiPrompt += `Tipo: ${note.note_type}\n`;
            aiPrompt += `Autore: ${note.username}\n`;
            aiPrompt += `Data: ${new Date(note.inserted_at).toLocaleDateString('it-IT')}\n`;
            
            if (note.description_notes) aiPrompt += `Descrizione: ${note.description_notes}\n`;
            if (note.text_notes) aiPrompt += `Contenuto Testuale:\n${note.text_notes}\n`;
            if (note.audio_transcription) aiPrompt += `Trascrizione Audio:\n${note.audio_transcription}\n`;
            if (note.summary_notes) aiPrompt += `Note Aggiuntive: ${note.summary_notes}\n`;
            
            // ANALISI FILE/VIDEO/DISEGNI
            if (note.file_name) {
                aiPrompt += `File Allegato: ${note.file_name} (${note.file_type || 'tipo sconosciuto'})\n`;
                
                if (note.note_type === 'video') {
                    aiPrompt += `[NOTA VIDEO] - Contenuto multimediale non analizzabile direttamente. Considera il contesto dalla descrizione.\n`;
                } else if (note.note_type === 'drawing') {
                    aiPrompt += `[DISEGNO] - Contenuto visuale. Analizza in base alla descrizione.\n`;
                } else if (note.note_type === 'file') {
                    aiPrompt += `[FILE ALLEGATO] - Documento esterno. Considera il contesto dal nome file.\n`;
                }
            }
            aiPrompt += `\n`;
        });
        
        aiPrompt += `\n\nIMPORTANTE: Nel riassunto, specifica chiaramente quali tipi di note sei riuscito ad analizzare:
- Note testuali: analisi completa del contenuto
- Note vocali: analisi della trascrizione (se disponibile)
- Disegni: analisi limitata a descrizione e contesto
- File allegati: analisi limitata a nome file e metadati
- Video: analisi limitata a descrizione e contesto

Indica esplicitamente quando non hai potuto analizzare direttamente il contenuto di disegni, file o video.`;
        
        console.log("[PDF] Chiamata AI...");
        
        const aiAnalysis = await generateContent({
            prompt: aiPrompt,
            systemInstruction: SYSTEM_INSTRUCTION_ANALYZE_PROJECT,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: PDF_SUMMARY_SCHEMA
            }
        });
        
        console.log("[PDF] Analisi completata");
        
        const markdownContent = MARKDOWN_TEMPLATE(aiAnalysis);
        
        console.log("[PDF] Conversione in PDF...");
        const pdfBuffer = await convertMarkdownToPDF(markdownContent, projectName);
        
        const fileName = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
        const filePath = `${familyGroup}/summaries/${fileName}`;
        
        console.log(`[PDF] Upload su Storage: ${filePath}`);
        
        const { error: uploadError } = await supabaseAdmin.storage
            .from('note16_03')
            .upload(filePath, pdfBuffer, {
                contentType: 'application/pdf',
                upsert: false
            });
        
        if (uploadError) throw new Error(`Errore upload: ${uploadError.message}`);
        
        const { data: urlData } = supabaseAdmin.storage
            .from('note16_03')
            .getPublicUrl(filePath);
        
        const pdfUrl = urlData.publicUrl;
        
        await supabaseAdmin
            .from('note_vocali_appunti')
            .update({ 
                pdf_summary_url: pdfUrl,
                last_modified_at: new Date().toISOString()
            })
            .eq('family_group', familyGroup)
            .eq('title_notes', projectName);
        
        console.log("[PDF] PDF generato con successo");
        
        // INVIA IL PDF COME BLOB PER IL DOWNLOAD
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(pdfBuffer);
        
    } catch (error) {
        console.error("[PDF] Errore:", error);
        res.status(500).json({
            success: false,
            error: `Errore generazione PDF: ${error.message}`
        });
    }
});

// ===== ROTTA 3: TRANSCRIBE AUDIO FILE (NUOVA) =====
router.post("/transcribe-audio-file", async (req, res) => {
    const { audioBase64 } = req.body;
    
    if (!audioBase64) {
        return res.status(400).json({ success: false, error: "Audio base64 richiesto" });
    }
    
    console.log("[TRANSCRIBE] Trascrizione audio in corso...");
    
    try {
        // Converti base64 in buffer
        const audioBuffer = Buffer.from(audioBase64, 'base64');
        
        // Usa Gemini per trascrizione
        const model = gemini.getGenerativeModel({ 
            model: "gemini-2.0-flash-exp" 
        });
        
        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: "audio/webm",
                    data: audioBase64
                }
            },
            "Trascrivi questo audio in italiano. Fornisci SOLO il testo trascritto, senza commenti aggiuntivi."
        ]);
        
        const response = await result.response;
        const transcription = response.text();
        
        console.log("[TRANSCRIBE] Trascrizione completata");
        
        res.json({
            success: true,
            transcription: transcription
        });
        
    } catch (error) {
        console.error("[TRANSCRIBE] Errore:", error);
        res.status(500).json({
            success: false,
            error: `Errore trascrizione: ${error.message}`
        });
    }
});

// ===== ROTTA 4: TRANSCRIBE CLEANUP (ESISTENTE) =====
router.post("/transcribe-audio", async (req, res) => {
    const { rawTranscription } = req.body;
    
    if (!rawTranscription) {
        return res.status(400).json({ success: false, error: "Trascrizione richiesta" });
    }
    
    console.log("[CLEANUP] Pulizia trascrizione...");
    
    try {
        const prompt = `Trascrizione grezza:\n\n${rawTranscription}`;
        
        const cleanedText = await generateContent({
            prompt: prompt,
            systemInstruction: SYSTEM_INSTRUCTION_TRANSCRIPTION_CLEANUP
        });
        
        console.log("[CLEANUP] Trascrizione pulita");
        
        res.json({
            success: true,
            cleanedTranscription: cleanedText
        });
        
    } catch (error) {
        console.error("[CLEANUP] Errore:", error);
        res.status(500).json({
            success: false,
            error: `Errore pulizia: ${error.message}`
        });
    }
});

// ===== ROTTA 5: ANALYZE NOTE =====
router.post("/analyze-note", async (req, res) => {
    const { noteContent, noteType } = req.body;
    
    if (!noteContent) {
        return res.status(400).json({ success: false, error: "Contenuto nota richiesto" });
    }
    
    console.log(`[ANALYZE] Analisi nota tipo: ${noteType}`);
    
    try {
        const prompt = `Analizza la seguente nota di tipo "${noteType}" ed estrai:
1. Un riassunto conciso (max 2 frasi)
2. I punti chiave (max 5 punti)
3. Eventuali azioni da intraprendere
4. Tags/keywords pertinenti (max 5)

Contenuto nota:
${noteContent}

Rispondi in formato JSON con le chiavi: summary, keyPoints (array), actions (array), tags (array).`;
        
        const analysis = await generateContent({
            prompt: prompt,
            systemInstruction: "Sei un assistente AI che analizza note. Rispondi SOLO con JSON valido.",
            generationConfig: {
                responseMimeType: "application/json"
            }
        });
        
        console.log("[ANALYZE] Analisi completata");
        
        res.json({ success: true, analysis: analysis });
        
    } catch (error) {
        console.error("[ANALYZE] Errore:", error);
        res.status(500).json({ success: false, error: `Errore analisi: ${error.message}` });
    }
});

// ===== ROTTA 6: PROJECT STATS =====
router.get("/project-stats/:projectName/:familyGroup", async (req, res) => {
    const { projectName, familyGroup } = req.params;
    
    console.log(`[STATS] Recupero stats: ${projectName}`);
    
    try {
        const { data: notes, error } = await supabaseAdmin
            .from('note_vocali_appunti')
            .select('note_type, username, inserted_at')
            .eq('family_group', familyGroup)
            .eq('title_notes', projectName);
        
        if (error) throw error;
        
        const stats = {
            totalNotes: notes.length,
            byType: notes.reduce((acc, note) => {
                acc[note.note_type] = (acc[note.note_type] || 0) + 1;
                return acc;
            }, {}),
            byAuthor: notes.reduce((acc, note) => {
                acc[note.username] = (acc[note.username] || 0) + 1;
                return acc;
            }, {}),
            dateRange: {
                first: notes[notes.length - 1]?.inserted_at,
                last: notes[0]?.inserted_at
            }
        };
        
        res.json({ success: true, stats: stats });
        
    } catch (error) {
        console.error("[STATS] Errore:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;