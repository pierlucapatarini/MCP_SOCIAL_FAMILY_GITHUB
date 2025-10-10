/// <reference types="https://deno.land/types/v1.39.4/deno.ns.d.ts" />

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

// Recupero delle Variabili d'Ambiente 
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY")!;

// Inizializza Supabase con la Service Role Key per operazioni di Storage (upload)
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
});

// ID Voce ElevenLabs (Questa è una voce standard, puoi cambiarla se ne hai una preferita)
const ELEVENLABS_VOICE_ID = "21m00Tcm4wOz8ixeHozw"; 

/**
 * Chiama l'API di ElevenLabs per convertire il testo in audio MP3.
 * @param text - Il testo da convertire.
 * @returns Un ArrayBuffer contenente i dati audio MP3.
 */
const generateTTSAudio = async (text: string) => {
    if (!ELEVENLABS_API_KEY) {
        throw new Error("ELEVENLABS_API_KEY non è configurata. Controlla le variabili d'ambiente di Supabase.");
    }
    
    console.log(`Generazione audio per: "${text.substring(0, 50)}..."`);
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
            text: text,
            model_id: "eleven_multilingual_v2", // Modello che supporta l'italiano
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.5,
            },
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Errore ElevenLabs:", errorText);
        throw new Error(`ElevenLabs TTS API error: ${response.status} - ${errorText}`);
    }

    // Restituisce l'audio come ArrayBuffer
    return response.arrayBuffer();
};


// Funzione principale della Edge Function: gestisce la chiamata dal frontend
serve(async (req) => {
    try {
        const { message_text, family_group } = await req.json();

        if (!message_text || !family_group) {
            return new Response(JSON.stringify({ error: "Dati mancanti: message_text o family_group." }), { status: 400 });
        }

        // 1. Genera l'audio MP3
        const audioBuffer = await generateTTSAudio(message_text);

        // 2. Carica l'audio su Supabase Storage (Bucket 'audio')
        // Il percorso è unico per gruppo e timestamp per evitare collisioni.
        const audioPath = `notifications/${family_group}/${Date.now()}.mp3`;
        const { error: uploadError } = await supabase.storage
            .from('audio') // Assicurati che questo bucket esista
            .upload(audioPath, audioBuffer, {
                contentType: 'audio/mp3',
                upsert: true,
            });

        if (uploadError) {
            console.error("Errore upload Storage:", uploadError);
            throw new Error(`Errore nel caricamento del file audio: ${uploadError.message}`);
        }

        // 3. Ottieni l'URL pubblico dell'audio
        // Questo URL viene restituito al frontend per la riproduzione immediata
        const { data: publicUrlData } = supabase.storage
            .from('audio')
            .getPublicUrl(audioPath);
            
        const audioUrl = publicUrlData.publicUrl;

        return new Response(JSON.stringify({ 
            message: "Audio TTS generato e caricato", 
            audioUrl: audioUrl,
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Errore Edge Function vocale:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
