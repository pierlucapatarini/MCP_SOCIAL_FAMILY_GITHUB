// supabaseClient.js

import { createClient } from '@supabase/supabase-js'

// --- ASSUNZIONI CHIAVE ---
// Il backend (index.js) deve aver caricato le variabili d'ambiente (dotenv.config())
// La chiave SERVICE_ROLE_KEY è utilizzata solo nel backend per motivi di sicurezza
// --------------------------

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY 

// 1. ISTANZA PUBBLICA (usata da Front-end con la Anon Key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 2. ISTANZA AMMINISTRATIVA (usata SOLO dal Back-end con la Service Role Key)
export const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY 
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            // Disattiva la persistenza della sessione per la chiave amministrativa
            persistSession: false 
        }
    })
    : null; // Fallback per l'ambiente frontend