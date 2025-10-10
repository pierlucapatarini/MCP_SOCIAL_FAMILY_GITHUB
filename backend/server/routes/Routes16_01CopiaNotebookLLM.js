// ==================================================================================
// 🟢 INIZIO ROTTA "Routes16_01CopiaNotebookLLM.js" (Versione 100% Groq)
// ==================================================================================
import { Router } from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import { createWorker } from 'tesseract.js';
// azzerato per problemi di spazio vercel 
//import PDFParser from "pdf-parse";

import { File } from '@web-std/file'; // Ci serve ancora per creare un oggetto file

// --- MODIFICA: Rimuoviamo 'openai' dagli import ---
import { groq, supabaseAdmin as supabase } from '../config.js';

const router = Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'audio-files';

// --- FUNZIONI HELPER ---

async function extractTextFromFile(file) {
    const { buffer, mimetype, originalname } = file;
    console.log(`[TEXT EXTRACTOR] Avvio estrazione per mimetype: ${mimetype}`);

    // ... (gli altri 'if' non cambiano) ...
    if (mimetype === 'text/plain') return buffer.toString('utf-8');
    if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const { value } = await mammoth.extractRawText({ buffer });
        return value;
    }
    if (mimetype === 'application/msword') {
        throw new Error("Il formato file .doc non è supportato. Per favore, salva il documento nel formato .docx e riprova.");
    }
    if (mimetype === 'application/pdf') {
        const data = await pdf(buffer);
        return data.text;
    }
    if (mimetype.startsWith('image/')) {
        const worker = await createWorker('ita');
        const { data: { text } } = await worker.recognize(buffer);
        await worker.terminate();
        return text;
    }

    // --- MODIFICA: Trascrizione audio con GROQ ---
    if (mimetype.startsWith('audio/')) {
        console.log(`[AUDIO] Trascrizione del file con Groq: ${originalname}`);
        
        // Creiamo un oggetto File standard, che la libreria di Groq sa come gestire.
        const audioFile = new File([buffer], originalname, { type: mimetype });

        const transcription = await groq.audio.transcriptions.create({
            file: audioFile,
            model: "whisper-large-v3", // Usiamo il modello Whisper ospitato da Groq
            response_format: "json", // Chiediamo un JSON semplice
        });
        
        console.log(`[AUDIO] Trascrizione completata.`);
        return transcription.text;
    }

    throw new Error(`Tipo di file non supportato: ${mimetype}`);
}

// ... (le funzioni generateAiContent e generateAndUploadTTS con Groq non cambiano) ...
async function generateAiContent(text) {
    console.log(`[AI CONTENT] Invio testo a Groq per analisi...`);
    const prompt = `Sei un assistente AI specializzato nell'analizzare e strutturare informazioni. Dato il seguente testo, esegui questi due compiti:
        1.  **RIASSUNTO**: Crea un riassunto conciso e ben formattato in HTML.
        2.  **MAPPA MENTALE**: Genera una mappa mentale del testo in formato Markdown gerarchico.
        Fornisci la tua risposta ESCLUSIVAMENTE in formato JSON, con questa struttura: { "summaryHTML": "...", "mindMapMarkdown": "..." }
        Testo da analizzare:
        ---
        ${text}
        ---`;
    const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        response_format: { type: "json_object" },
    });
    const result = JSON.parse(chatCompletion.choices[0].message.content);
    console.log(`[AI CONTENT] Risposta da Groq ricevuta e parsata.`);
    return result;
}

async function generateAndUploadTTS(text) {
    console.log(`[TTS] Generazione audio per il riassunto tramite Groq TTS...`);
    const cleanText = text.replace(/<[^>]*>?/gm, '');
    try {
        const wav = await groq.audio.speech.create({
            model: "playai-tts",
            voice: "Adelaide-PlayAI",
            input: cleanText.substring(0, 1000),
            response_format: "mp3",
            speed: 1.0
        });
        const audioBuffer = Buffer.from(await wav.arrayBuffer());
        const fileName = `notebook_summary_${Date.now()}.mp3`;
        console.log(`[TTS] Audio generato. Upload su Supabase con nome: ${fileName}`);
        const { error: uploadError } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).upload(fileName, audioBuffer, { contentType: 'audio/mpeg' });
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(fileName);
        console.log(`[TTS] Upload completato. URL: ${publicUrlData.publicUrl}`);
        return publicUrlData.publicUrl;
    } catch (error) {
        console.error("❌ Errore durante la generazione TTS con Groq:", error.message);
        return null; 
    }
}

// --- ROUTE HANDLER (non cambia) ---
router.post('/process', upload.single('sourceFile'), async (req, res) => {
    // ... (il codice di questa funzione rimane identico) ...
    if (!req.file) return res.status(400).json({ error: 'Nessun file caricato.' });
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Autenticazione richiesta.' });
        const token = authHeader.split(' ')[1];
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) return res.status(401).json({ error: 'Token non valido.' });
        const extractedText = await extractTextFromFile(req.file);
        if (!extractedText || extractedText.trim().length < 10) return res.status(400).json({ error: 'Impossibile estrarre testo significativo.' });
        const aiContent = await generateAiContent(extractedText);
        const audioUrl = await generateAndUploadTTS(aiContent.summaryHTML);
        const { error: dbError } = await supabase.from('notebook_entries').insert([{
            source_type: req.file.mimetype,
            original_content: extractedText,
            summary_text: aiContent.summaryHTML,
            mind_map_markdown: aiContent.mindMapMarkdown,
            summary_audio_url: audioUrl,
            user_id: user.id
        }]);
        if (dbError) throw dbError;
        res.json({
            summaryText: aiContent.summaryHTML,
            mindMapMarkdown: aiContent.mindMapMarkdown,
            summaryAudioUrl: audioUrl
        });
    } catch (error) {
        console.error("❌ Errore nel processo /api/notebook/process:", error);
        res.status(500).json({
            error: 'Errore interno del server.',
            details: error.message
        });
    }
});

export default router;
