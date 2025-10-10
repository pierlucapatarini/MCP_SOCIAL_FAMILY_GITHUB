// FILE: server/routes/TestRoutes104_0AudioVideoFoto.js

import express from "express";
import dotenv from "dotenv";
import fetch from 'node-fetch'; 
import { Buffer } from 'buffer';
import fs from 'fs/promises'; 
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const router = express.Router();

// --- CONFIGURAZIONE CHIAVI E PERCORSI ---
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY; 
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUDIO_TEST_DIR = path.join(__dirname, '..', 'audio', 'test'); 

// ---------------------------------------------------------------------
// FUNZIONI DI SUPPORTO PER I TEST AUDIO (TTS)
// ---------------------------------------------------------------------

// 1+2-Generazione Audio (TTS) con Hugging Face (Modello Generico)

const generateHFTTS = async (text, model) => {
    if (!HUGGINGFACE_API_KEY) throw new Error("Chiave HUGGINGFACE_API_KEY mancante.");
    
    const response = await fetch(
        `https://api-inference.huggingface.co/models/${model}`,
        {
            headers: { Authorization: `Bearer ${HUGGINGFACE_API_KEY}` },
            method: 'POST',
            body: JSON.stringify({ inputs: text }),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HF TTS Failed: ${response.status} - ${errorText.substring(0, 150)}...`);
    }

    const audioBuffer = await response.buffer();
    await fs.mkdir(AUDIO_TEST_DIR, { recursive: true }); 
    const audioFileName = `test_hf_tts_${Date.now()}.flac`;
    await fs.writeFile(path.join(AUDIO_TEST_DIR, audioFileName), audioBuffer);

    return `/audio/test/${audioFileName}`; 
};
//----------------------------------------------------------------------
// 3-Generazione Audio (TTS) con ElevenLabs (Richiede Chiave e Free Tier)


const generateElevenLabsTTS = async (text) => {
    if (!ELEVENLABS_API_KEY) throw new Error("Chiave ELEVENLABS_API_KEY mancante.");

    const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/kAzI34nYjizE0zON6rXv`, // Voice ID: Rachel
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': ELEVENLABS_API_KEY,
            },
            body: JSON.stringify({
                text: text,
                model_id: "eleven_multilingual_v2",
                voice_settings: { stability: 0.5, similarity_boost: 0.5 }
            })
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs Failed (Verifica Free Tier): ${response.status} - ${errorText.substring(0, 150)}...`);
    }

    const audioBuffer = await response.buffer();
    await fs.mkdir(AUDIO_TEST_DIR, { recursive: true }); 
    const audioFileName = `test_el_tts_${Date.now()}.mp3`;
    await fs.writeFile(path.join(AUDIO_TEST_DIR, audioFileName), audioBuffer);

    return `/audio/test/${audioFileName}`; 
};

// ---------------------------------------------------------------------
// FUNZIONI DI SUPPORTO PER I TEST IMMAGINI (T-to-I)
// ---------------------------------------------------------------------
//----------------------------------------------------------------------
// 5+6- Generazione Immagine con Hugging Face (Modello Generico)

const generateHFImage = async (prompt, model) => {
    if (!HUGGINGFACE_API_KEY) throw new Error("Chiave HUGGINGFACE_API_KEY mancante.");

    const response = await fetch(
        `https://api-inference.huggingface.co/models/${model}`,
        {
            headers: { Authorization: `Bearer ${HUGGINGFACE_API_KEY}`, 'Content-Type': 'application/json' },
            method: 'POST',
            body: JSON.stringify({ inputs: prompt, options: { wait_for_model: true } }),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HF Image Failed: ${response.status} - ${errorText.substring(0, 150)}...`);
    }

    const imageBuffer = await response.buffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    
    return `data:image/jpeg;base64,${base64Image}`;
};

// ---------------------------------------------------------------------
// FUNZIONI DI SUPPORTO PER I TEST VIDEO (T-to-V) - NESSUNA SIMULAZIONE
// ---------------------------------------------------------------------
//----------------------------------------------------------------------
// 7+8- Generazione video con Hugging Face (Modello Generico)

const generateHFVideo = async (prompt, model) => {
    if (!HUGGINGFACE_API_KEY) throw new Error("Chiave HUGGINGFACE_API_KEY mancante.");
    
    // Attenzione: La generazione video gratuita è LENTA e fallirà spesso per Timeout.
    const response = await fetch(
        `https://api-inference.huggingface.co/models/${model}`,
        {
            headers: { Authorization: `Bearer ${HUGGINGFACE_API_KEY}`, 'Content-Type': 'application/json' },
            method: 'POST',
            // Timeout di 60 secondi
            body: JSON.stringify({ inputs: prompt, options: { wait_for_model: true, timeout: 60000 } }), 
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        // L'errore sarà restituito al frontend.
        throw new Error(`HF Video Failed: ${response.status}. ${errorText.substring(0, 150)}. E' probabile un timeout o una coda troppo lunga (riprova).`);
    }
    
    // Se la risposta è OK, salviamo il file video binario.
    const videoBuffer = await response.buffer();
    const VIDEO_TEST_DIR = path.join(__dirname, '..', 'temp', 'videos', 'test');
    await fs.mkdir(VIDEO_TEST_DIR, { recursive: true }); 
    const videoFileName = `test_hf_video_${Date.now()}.mp4`; // Assumiamo mp4
    await fs.writeFile(path.join(VIDEO_TEST_DIR, videoFileName), videoBuffer);

    return `/temp/videos/test/${videoFileName}`; 
};


// ---------------------------------------------------------------------
// ROTTA UNIFICATA PER I TEST (POST /test-media)
// ---------------------------------------------------------------------

router.post("/test-media", express.json(), async (req, res) => {
    const { mediaType, prompt, subType } = req.body; 

    if (!prompt) {
        return res.status(400).json({ error: "Il prompt è obbligatorio." });
    }

    try {
        switch (mediaType) {
            
            // TTS
            case 'tts':
                let audioUrl;
                if (subType === 'hf_kan') {
                    audioUrl = await generateHFTTS(prompt, "espnet/kan-bayashi_ljspeech_tts");
                    return res.json({ success: true, audioUrl, message: "Audio generato (Hugging Face TTS - GRATUITO)" });
                } else if (subType === 'hf_fast') {
                    audioUrl = await generateHFTTS(prompt, "facebook/fastspeech2-en-ljspeech");
                    return res.json({ success: true, audioUrl, message: "Audio generato (Hugging Face TTS Veloce - GRATUITO)" });
                } else if (subType === 'elevenlabs') {
                    audioUrl = await generateElevenLabsTTS(prompt);
                    return res.json({ success: true, audioUrl, message: "Audio generato (ElevenLabs - Freemium/Free Tier)" });
                }
                break;

            // IMMAGINI
            case 'image':
                let imageUrl;
                if (subType === 'hf_sdxl') {
                    imageUrl = await generateHFImage(prompt, "stabilityai/stable-diffusion-xl-base-1.0");
                    return res.json({ success: true, imageUrl, message: "Immagine generata (Hugging Face - SDXL - GRATUITO)" });
                } else if (subType === 'hf_playground') {
                    imageUrl = await generateHFImage(prompt, "runwayml/stable-diffusion-v1-5");
                    return res.json({ success: true, imageUrl, message: "Immagine generata (Hugging Face - Stable Diffusion v1.5 - GRATUITO)" });
                } else if (subType === 'hf_kandinsky') {
                    imageUrl = await generateHFImage(prompt, "kandinsky-community/kandinsky-2-2-txt2img");
                    return res.json({ success: true, imageUrl, message: "Immagine generata (Hugging Face - Kandinsky 2.2 - GRATUITO)" });
                }
                break;

            // VIDEO (NESSUNA SIMULAZIONE)
            case 'video':
                let videoUrl;
                if (subType === 'hf_modelscope') {
                    videoUrl = await generateHFVideo(prompt, "cerspense/zeroscope_v2_576w");
                    return res.json({ success: true, videoUrl, message: "Video (ModelScope/Zeroscope) generato con successo (GRATUITO)" });
                } else if (subType === 'hf_animatediff') {
                    videoUrl = await generateHFVideo(prompt, "emilwallner/animatelcm");
                    return res.json({ success: true, videoUrl, message: "Video (AnimateDiff) generato con successo (GRATUITO)" });
                } else if (subType === 'zeroscope_repl') {
                    // Questa opzione ora fallisce per scelta, per non dover implementare la logica Replicate
                    throw new Error("Errore Replicate: La generazione Zeroscope su Replicate richiede la chiave API e una implementazione diversa da quella di Hugging Face (NON è GRATUITO). Usa le opzioni HF.");
                }
                break;
            
            default:
                return res.status(400).json({ error: "Tipo di test non supportato." });
        }
        
    } catch (err) {
        console.error(`❌ Errore test ${mediaType}/${subType}:`, err.message);
        // Ritorniamo l'errore al frontend
        res.status(500).json({ success: false, error: err.message });
    }
});


export default router;