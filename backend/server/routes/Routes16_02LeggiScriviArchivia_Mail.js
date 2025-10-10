import express from "express";
import nodemailer from "nodemailer";
import imaps from "imap-simple";
import { simpleParser } from "mailparser";
import dotenv from "dotenv";  
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from '@supabase/supabase-js'; // NUOVA: Importazione client Supabase

// Importazione costanti prompts
import { 
    ARCHIVIAZIONE_SCHEMA, 
    SYSTEM_INSTRUCTION_ARCHIVIA, 
    SYSTEM_INSTRUCTION_DRAFT 
} from "../prompts/Prompts16_02LeggiScriviArchivia_Mail.js"; 

dotenv.config();
const router = express.Router();


/* ===============================================
 * 1. CONFIGURAZIONE ACCOUNT YAHOO (Usa dotenv)
 * =============================================== */

const YAHOO_CONFIG = {
    imap: {
        user: process.env.YAHOO_EMAIL,
        password: process.env.YAHOO_PASSWORD,
        host: "imap.mail.yahoo.com",
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 30000 
    },
    smtp: nodemailer.createTransport({
        host: "smtp.mail.yahoo.com",
        port: 465, 
        secure: true, 
        auth: { user: process.env.YAHOO_EMAIL, pass: process.env.YAHOO_PASSWORD },
        tls: { rejectUnauthorized: false } 
    })
};

/* ===============================================
 * 1.5. INIZIALIZZAZIONE CLIENT SUPABASE (NUOVO)
 * =============================================== */

const SUPABASE_URL = process.env.SUPABASE_URL; // Variabili d'ambiente per Supabase
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Chiave CRITICA per il backend

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        persistSession: false // Server-side
    }
}); 
console.log(`[SUPABASE] Client inizializzato con Service Role Key.`);


/* ===============================================
 * 2. INIZIALIZZAZIONE CLIENT GEMINI
 * =============================================== */

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* ===============================================
 * 3. FUNZIONI HELPER IMAP/SMTP E SUPABASE
 * =============================================== */

const buildSearchCriteria = (filter) => {
    // CRITICO: imap-simple richiede un ARRAY DI ARRAY!
    const searchCriteria = [["UNSEEN"]]; 

    // Ottieni la data SINCE nel formato corretto per IMAP
    const getFormattedDate = (daysAgo) => {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        
        // Formato IMAP: "DD-Mon-YYYY" (es: "30-Sep-2025")
        const day = String(date.getDate()).padStart(2, '0');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear();
        
        return `${day}-${month}-${year}`;
    };

    switch (filter) {
        case 'day':
            searchCriteria.push(["SINCE", getFormattedDate(1)]);
            break;
        case 'week':
            searchCriteria.push(["SINCE", getFormattedDate(7)]);
            break;
        case 'month':
            searchCriteria.push(["SINCE", getFormattedDate(30)]);
            break;
        case 'latest':
            // Non aggiungere SINCE, il limite verrà gestito in fetchOptions
            break;
        case 'all':
        default:
            // Per vedere TUTTE le email (anche lette)
            searchCriteria.length = 0;
            searchCriteria.push(["ALL"]);
            break;
    }
    
    console.log(`[IMAP DEBUG] Criteri di ricerca IMAP FINALI:`, searchCriteria);
    return searchCriteria;
};

const readYahooEmails = async (filter) => {
    let connection;
    try {
        console.log(`[IMAP DEBUG] Tentativo di connessione a ${YAHOO_CONFIG.imap.host}:${YAHOO_CONFIG.imap.port}...`);
        connection = await imaps.connect({ imap: YAHOO_CONFIG.imap });
        
        if (!connection) {
            throw new Error("IMAP connection object is null. Authentication failed.");
        }
        
        await connection.openBox("INBOX");
        console.log(`[IMAP DEBUG] INBOX aperto con successo`);
        
        const searchCriteria = buildSearchCriteria(filter);
        
        // FIX CRITICO: Usa la sintassi corretta per Yahoo
        const fetchOptions = { 
            bodies: ['HEADER', 'TEXT', ''],
            struct: true, 
            markSeen: false
        };

        if (filter === 'latest') { 
            fetchOptions.limit = 1; 
        }

        console.log(`[IMAP DEBUG] Esecuzione ricerca con fetchOptions:`, fetchOptions);
        const messages = await connection.search(searchCriteria, fetchOptions); 
        console.log(`[IMAP DEBUG] Trovati ${messages.length} messaggi`);

        if (messages.length === 0) {
            return [];
        }

        return Promise.all(messages.map(async (msg) => {
            const id = msg.attributes.uid;
            
            try {
                // Cerca il body completo del messaggio
                let messagePart = msg.parts.find(part => part.which === '');
                
                // Se non trovato, prova a combinare HEADER + TEXT
                if (!messagePart) {
                    const headerPart = msg.parts.find(part => part.which === 'HEADER');
                    const textPart = msg.parts.find(part => part.which === 'TEXT');
                    
                    if (headerPart && textPart) {
                        const combinedBuffer = Buffer.concat([
                            Buffer.from(headerPart.body),
                            Buffer.from('\r\n\r\n'),
                            Buffer.from(textPart.body)
                        ]);
                        messagePart = { body: combinedBuffer };
                    }
                }

                if (!messagePart || !messagePart.body) {
                    console.error(`[IMAP] Impossibile recuperare il body per UID ${id}`);
                    return {
                        UID: id, 
                        FROM: "Errore nel recupero", 
                        FROM_EMAIL: "", 
                        SUBJECT: "(Errore nel parsing)",
                        DATE: new Date().toISOString(), 
                        BODY_TEXT: "Impossibile recuperare il contenuto", 
                        BODY_HTML: null,
                        HAS_ATTACHMENTS: false, 
                        ATTACHMENTS_COUNT: 0, 
                        PREVIEW: "Impossibile visualizzare anteprima"
                    };
                }

                // Parse del messaggio con mailparser
                const parsed = await simpleParser(messagePart.body);
                
                // Estrazione FROM
                let fromText = "Mittente Sconosciuto";
                let fromEmail = "";
                
                if (parsed.from) {
                    if (parsed.from.value && Array.isArray(parsed.from.value) && parsed.from.value.length > 0) {
                        const firstFrom = parsed.from.value[0];
                        fromText = firstFrom.name || firstFrom.address || "Sconosciuto";
                        fromEmail = firstFrom.address || "";
                    } else if (parsed.from.text) {
                        fromText = parsed.from.text;
                        const emailMatch = parsed.from.text.match(/<([^>]+)>/);
                        fromEmail = emailMatch ? emailMatch[1] : parsed.from.text;
                    }
                }
                
                const subjectText = parsed.subject || "(senza oggetto)";
                const dateText = parsed.date || new Date();
                
                // Estrazione body (text o fallback su HTML)
                let bodyText = parsed.text || "";
                if (!bodyText && parsed.html) {
                    bodyText = parsed.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                }
                if (!bodyText) {
                    bodyText = "Nessun contenuto testuale disponibile";
                }

                return {
                    UID: id, 
                    FROM: fromText, 
                    FROM_EMAIL: fromEmail, 
                    SUBJECT: subjectText, 
                    DATE: dateText, 
                    BODY_TEXT: bodyText.trim().substring(0, 5000), 
                    BODY_HTML: parsed.html ? parsed.html.substring(0, 10000) : null,
                    HAS_ATTACHMENTS: parsed.attachments && parsed.attachments.length > 0,
                    ATTACHMENTS_COUNT: parsed.attachments ? parsed.attachments.length : 0,
                    PREVIEW: bodyText.trim().substring(0, 150) + (bodyText.length > 150 ? '...' : '')
                };

            } catch (parseError) {
                console.error(`[IMAP] Errore parsing email UID ${id}:`, parseError);
                return {
                    UID: id, 
                    FROM: "Errore nel parsing", 
                    FROM_EMAIL: "", 
                    SUBJECT: "(Errore)", 
                    DATE: new Date().toISOString(),
                    BODY_TEXT: `Errore nel parsing: ${parseError.message}`, 
                    BODY_HTML: null, 
                    HAS_ATTACHMENTS: false, 
                    ATTACHMENTS_COUNT: 0,
                    PREVIEW: "Impossibile visualizzare anteprima"
                };
            }
        }));
    } catch (error) {
        console.error(`[IMAP FALLITO] Errore critico:`, error.message);
        throw error; 
    } finally {
        if (connection) { 
            connection.end(); 
            console.log(`[IMAP DEBUG] Connessione chiusa`);
        }
    }
};

const sendEmail = async (to, subject, body) => {
    try {
        const info = await YAHOO_CONFIG.smtp.sendMail({
            from: process.env.YAHOO_EMAIL, 
            to: to, 
            subject: subject, 
            text: body 
        });
        console.log("Messaggio inviato: %s", info.messageId);
        return { message: "Email inviata con successo!", messageId: info.messageId };
    } catch (error) {
        console.error("Errore nell'invio dell'email:", error);
        throw new Error("Errore nell'invio dell'email: " + error.message);
    }
};

const listYahooFolders = async () => {
    let connection;
    try {
        console.log(`[IMAP DEBUG] Recupero lista cartelle Yahoo...`);
        connection = await imaps.connect({ imap: YAHOO_CONFIG.imap });

        // Ottieni tutte le cartelle
        const boxes = await connection.getBoxes();
        console.log(`[IMAP DEBUG] Struttura cartelle trovata:`, JSON.stringify(boxes, null, 2));

        // Funzione ricorsiva per estrarre i percorsi completi
        const extractFolders = (box, prefix = '') => {
            let folders = [];
            for (const [name, details] of Object.entries(box)) {
                const fullPath = prefix ? `${prefix}.${name}` : name;
                folders.push(fullPath);
                if (details.children) {
                    folders = folders.concat(extractFolders(details.children, fullPath));
                }
            }
            return folders;
        };

        const allFolders = extractFolders(boxes);
        console.log(`[IMAP DEBUG] Tutte le cartelle disponibili:`, allFolders);

        return allFolders;
    } catch (error) {
        console.error(`[IMAP DEBUG] Errore nel recupero cartelle:`, error);
        throw new Error("Impossibile recuperare la lista delle cartelle IMAP.");
    } finally {
        if (connection) connection.end();
    }
};


const moveYahooEmail = async (uid, folderName) => {
    let connection;
    try {
        console.log(`[IMAP DEBUG] ========== INIZIO SPOSTAMENTO ==========`);

        connection = await imaps.connect({ imap: YAHOO_CONFIG.imap });
        await connection.openBox("INBOX");
        console.log(`[IMAP DEBUG] INBOX aperto per UID ${uid}`);

        const imapClient = connection.imap;
        console.log(`[IMAP DEBUG] Cartella di destinazione: ${folderName}`);

        // 1. Copia nella cartella di destinazione
        await new Promise((resolve, reject) => {
            imapClient.copy([uid], folderName, (err) => {
                if (err) {
                    console.error(`[IMAP DEBUG] Errore durante la copia:`, err);
                    return reject(new Error(`Errore nella copia in ${folderName}: ${err.message}`));
                }
                console.log(`[IMAP DEBUG] ✓ Email copiata in ${folderName}`);
                resolve();
            });
        });

        // 2. Marca come eliminata l'email originale
        await connection.addFlags(uid, ["\\Deleted"]);
        console.log(`[IMAP DEBUG] ✓ Email originale contrassegnata come \\Deleted`);

        // 3. Chiudi la casella con expunge (elimina definitivamente i messaggi \Deleted)
        await connection.closeBox(true);
        console.log(`[IMAP DEBUG] ✓ INBOX chiuso con expunge`);

        console.log(`[IMAP DEBUG] ========== SPOSTAMENTO COMPLETATO ==========`);

        return {
            success: true,
            message: `Email UID ${uid} spostata con successo in ${folderName}.`
        };
    } catch (error) {
        console.error(`[IMAP MOVE] Errore nello spostamento dell'email UID ${uid}:`, error);
        throw new Error(`Errore nello spostamento: ${error.message}`);
    } finally {
        if (connection) {
            connection.end();
            console.log(`[IMAP DEBUG] Connessione chiusa`);
        }
    }
};

// NUOVA FUNZIONE HELPER: Inserimento evento nel DB (NUOVO)
const insertEventToSupabase = async (eventData) => {
    try {
        // La tabella è 'events' come richiesto dall'utente
        const { data, error } = await supabase
            .from('events') 
            .insert([eventData])
            .select();

        if (error) {
            console.error("[SUPABASE EVENT] Errore inserimento evento:", error);
            throw new Error(`Errore DB: ${error.message}`);
        }
        
        console.log("[SUPABASE EVENT] Evento inserito con successo:", data[0].id);
        return data[0]; // Restituisce l'evento inserito
    } catch (error) {
        throw error;
    }
}


/* ===============================================
 * 4. LOGICA AI (GEMINI) - FUNZIONE GENERALE
 * =============================================== */

const generateContent = async ({ prompt, systemInstruction, generationConfig = {} }) => {
    
    // Check essenziale
    if (!gemini || typeof gemini.getGenerativeModel !== 'function') {
        throw new Error("L'istanza di GoogleGenerativeAI (gemini) non è stata inizializzata correttamente. Controlla GEMINI_API_KEY.");
    }
    
    // Configurazione del modello
    const modelConfig = {
        model: "gemini-2.0-flash-exp",
    };
    
    // Aggiungi systemInstruction se fornito
    if (systemInstruction) {
        modelConfig.systemInstruction = systemInstruction;
    }
    
    // Aggiungi generationConfig se ha proprietà valide
    if (Object.keys(generationConfig).length > 0) {
        modelConfig.generationConfig = generationConfig;
    }
    
    const model = gemini.getGenerativeModel(modelConfig);
    
    try { 
        // Chiamata API corretta per @google/generative-ai
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Gestione della risposta JSON (se richiesto)
        if (generationConfig.responseMimeType === "application/json") {
            try {
                // Pulizia del testo JSON (rimozione di ```json ... ```)
                let cleanJsonText = text.trim();
                
                if (cleanJsonText.startsWith('```json')) {
                    cleanJsonText = cleanJsonText.substring(7);
                }
                if (cleanJsonText.startsWith('```')) {
                    cleanJsonText = cleanJsonText.substring(3);
                }
                if (cleanJsonText.endsWith('```')) {
                    cleanJsonText = cleanJsonText.substring(0, cleanJsonText.length - 3);
                }
                
                cleanJsonText = cleanJsonText.trim();

                return JSON.parse(cleanJsonText);
            } catch (jsonError) {
                console.error("ERRORE PARSING JSON (AI): Testo non JSON valido ricevuto.", text);
                throw new Error("Risposta AI non in formato JSON valido: " + jsonError.message);
            }
        }
        
        return text; 

    } catch (e) {
        // Logga l'errore dell'SDK Gemini (CRITICO)
        console.error("ERRORE CRITICO SDK GEMINI:", e.message || e);
        
        // Gestione errori specifici
        if (e.message && e.message.includes("API key not valid")) {
            throw new Error("Chiave API Gemini non valida. Controlla il file .env");
        }
        if (e.message && e.message.includes("quota")) {
            throw new Error("Quota API Gemini esaurita. Riprova più tardi.");
        }
        
        throw e; 
    }
};


/* ===============================================
 * 5. ROTTE API
 * =============================================== */




// ROTTA 1: GET - LEGGI EMAIL



router.get("/", async (req, res) => {
    const { timeFilter } = req.query; 
    
    try {
        const emails = await readYahooEmails(timeFilter);
        res.json({ success: true, emails: emails });
    } catch (error) {
        console.error("[YAHOO ROUTER] Errore lettura email:", error);
        res.status(500).json({ success: false, error: `Fallimento nella lettura IMAP: ${error.message}` });
    }
});




// ROTTA 2: POST - INVIA EMAIL



router.post("/send", async (req, res) => {
    const { to, subject, body } = req.body;
    
    if (!to || !subject || !body) {
        return res.status(400).json({ success: false, error: "Destinatario, oggetto e corpo sono obbligatori." });
    }
    
    try {
        const result = await sendEmail(to, subject, body);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// ROTTA 3: POST - GENERAZIONE AI (POST /api/email/ai-response)


router.post("/ai-response", async (req, res) => {
    const { userAction, emailContent, customInstruction } = req.body;
    
    if (!emailContent) {
        return res.status(400).json({ success: false, error: "Contenuto email mancante per l'azione AI." });
    }
    
    const emailBody = emailContent.BODY_TEXT || "";
    
    if (userAction === 'Rispondi') {
        const prompt = `Genera una bozza di risposta professionale e concisa a questa email. Il tono deve essere orientato all'azione e non superare le 4-5 frasi.
        Mittente: ${emailContent.FROM}
        Oggetto: ${emailContent.SUBJECT}
        Corpo Email: ${emailBody.substring(0, 3000)}
        Istruzione Aggiuntiva: ${customInstruction || 'Nessuna istruzione aggiuntiva.'}`;

        try {
            const aiDraft = await generateContent({
                prompt: prompt,
                systemInstruction: SYSTEM_INSTRUCTION_DRAFT,
            });
            
            res.json({ success: true, draft: aiDraft });
        } catch (error) {
            res.status(500).json({ success: false, error: `Fallimento nella generazione AI (Bozza): ${error.message}` });
        }
        
    } else if (userAction === 'Archivia') {
        const prompt = `Classifica la seguente email e compila lo schema JSON.
        Mittente: ${emailContent.FROM}
        Oggetto: ${emailContent.SUBJECT}
        Allegati Presenti: ${emailContent.HAS_ATTACHMENTS ? 'SÌ' : 'NO'}
        Corpo: ${emailBody.substring(0, 3000)}`;

        try {
            const classification = await generateContent({
                prompt: prompt,
                systemInstruction: SYSTEM_INSTRUCTION_ARCHIVIA,
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: ARCHIVIAZIONE_SCHEMA 
                }
            });
            
            res.json({ success: true, classification: classification });
        } catch (error) {
            res.status(500).json({ success: false, error: `Fallimento nella classificazione AI: ${error.message}` });
        }
        
    } else {
        res.status(400).json({ success: false, error: "Azione utente non supportata." });
    }
});

// ROTTA 4: POST - SPOSTA EMAIL
router.post("/move", async (req, res) => {
    const { uid, folderName } = req.body;
    
    if (!uid || !folderName) {
        return res.status(400).json({ success: false, error: "UID e nome cartella sono obbligatori per lo spostamento." });
    }
    
    try {
        const result = await moveYahooEmail(uid, folderName);
        res.json({ success: true, ...result });
    } catch (err) {
        console.error(`[YAHOO ROUTER MOVE] ERRORE SPOSTAMENTO:`, err);
        res.status(500).json({ 
            success: false, 
            error: err.message
        });
    }
});


// ROTTA 8: POST - AGGIUNGI EVENTO E SPOSTA EMAIL (NUOVO)
router.post("/archive-event", async (req, res) => {
    // I dati necessari inviati dal frontend
    const { 
        uid, 
        folderName, 
        eventData, // Dati dell'evento da inserire: { title, start, end, description, family_group, created_by }
        emailSubject 
    } = req.body; 
    
    // Verifica dei dati minimi
    if (!uid || !folderName || !eventData || !eventData.title || !eventData.start) {
        return res.status(400).json({ 
            success: false, 
            error: "UID, folderName, eventData, title e start dell'evento sono obbligatori." 
        });
    }
    
    try {
        // 1. Inserimento dell'Evento nel Calendario (tabella 'events')
        const insertedEvent = await insertEventToSupabase(eventData);

        // 2. Archiviazione/Spostamento dell'Email
        const moveResult = await moveYahooEmail(uid, folderName);
        
        res.json({ 
            success: true, 
            message: `Evento '${insertedEvent.title || emailSubject}' aggiunto. Email archiviata in ${folderName}.`,
            event: insertedEvent,
            moveStatus: moveResult
        });
        
    } catch (err) {
        console.error(`[YAHOO ROUTER EVENT] ERRORE ARCHIVIAZIONE EVENTO:`, err);
        res.status(500).json({ 
            success: false, 
            error: `Fallimento nell'aggiunta dell'evento o nell'archiviazione: ${err.message}` 
        });
    }
});


// ROTTA 5: GET - LISTA CARTELLE


router.get("/folders", async (req, res) => {
    try {
        const folders = await listYahooFolders();
        res.json({ success: true, folders: folders });
    } catch (error) {
        console.error("[YAHOO ROUTER] Errore lista cartelle:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// ROTTA 6: POST - RISCRITTURA BOZZA


router.post("/ai-draft-rewrite", async (req, res) => {
    const { recipient, subject, draft } = req.body;

    if (!recipient || !subject || !draft) {
        return res.status(400).json({ success: false, error: "Destinatario, oggetto e bozza sono obbligatori." });
    }

    try {
        const prompt = `Il destinatario è: ${recipient}. L'oggetto richiesto è: ${subject}. Il testo informale da riscrivere e formalizzare in una email completa è: ${draft}`;

        const aiDraft = await generateContent({
            prompt: prompt,
            systemInstruction: SYSTEM_INSTRUCTION_DRAFT,
        });

        res.json({ success: true, draft: aiDraft });

    } catch (error) {
        console.error("[Yahoo Router AI] Errore riscrittura bozza AI:", error);
        res.status(500).json({ success: false, error: `Fallimento nella riscrittura AI: ${error.message}` });
    }
});

// ROTTA 7: POST - SINTESI VOCALE (TTS)


router.post("/tts", async (req, res) => {
    const { text } = req.body;
    
    if (!text) {
        return res.status(400).json({ success: false, error: "Testo per la sintesi vocale mancante." });
    }

    console.log(`[TTS] Richiesta per il testo: "${text.substring(0, 50)}..."`);

    try {
        res.json({ 
            success: true, 
            message: "Sintesi vocale simulata. Implementazione TTS reale necessaria.", 
            audioUrl: "simulato/audio.mp3" 
        });
        
    } catch (error) {
        console.error("[TTS] Errore TTS:", error);
        res.status(500).json({ success: false, error: `Fallimento nella sintesi vocale: ${error.message}` });
    }
});


// ===============================================
//  funzione per rotta 12 - INSTRUZIONE DI SISTEMA PER LA GENERAZIONE AI
// ===============================================


const SYSTEM_INSTRUCTION_EVENT = `Sei un assistente AI chiamato Alfred Maggiordomo. Il tuo compito è generare un titolo e un breve riassunto (descrizione) per un evento di calendario basato sul contesto di un'email. Rispondi SOLO con un oggetto JSON valido.

Regole per la risposta:
1. 'title': Massimo 15 caratteri. Deve essere conciso e riflettere lo scopo principale dell'evento.
2. 'description': Massimo 30 caratteri. Deve essere un riassunto semplice del contesto dell'evento.

Esempio di risposta: 
{ "title": "Riunione Zoom", "description": "Discussione su progetto Q3." }`;


// ===============================================
// ROTTA 12: POST - CREAZIONE EVENTO CALENDARIO (Risolve l'errore 404)
// ===============================================
router.post("/create-calendar-event", async (req, res) => {
    // Dati attesi dal frontend
    const { 
        emailUID, 
        emailSubject,
        emailContent, // Contenuto completo dell'email
        userId,       // ID dell'utente loggato (DINAMICO)
        calendarData, // Contiene: scadenza_calendario_data, scadenza_calendario_descrizione
    } = req.body; 

    // 1. Verifica input essenziali
    if (!emailUID || !calendarData || !calendarData.scadenza_calendario_data || !emailContent || !userId) {
        console.error("[Calendar] Errore 400: Dati evento incompleti.", req.body);
        return res.status(400).json({ 
            success: false, 
            error: "Dati evento incompleti. Richiesti: emailUID, data evento, contenuto email, userId." 
        });
    }

    try {
        // ===========================================
        // 2. RECUPERO DATI PROFILI (Utente e Alfred AI)
        // ===========================================

        // 2a. Recupero family_group e email dell'utente loggato
        const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('family_group, email')
            .eq('id', userId)
            .single();

        if (userError || !userData) {
            console.error("[Supabase] Utente loggato non trovato o errore:", userError?.message);
            return res.status(404).json({ success: false, error: "Utente loggato non trovato o errore database." });
        }
        
        // 2b. Recupero ID Alfred AI (verificando 'is_ai'=TRUE nello stesso gruppo)
        const { data: alfredData, error: alfredError } = await supabase
            .from('profiles')
            .select('id')
            .eq('family_group', userData.family_group) 
            .eq('is_ai', true)
            .single();

        if (alfredError || !alfredData) {
            console.error("[Supabase] Alfred AI non trovato per questo gruppo:", alfredError?.message);
            return res.status(404).json({ success: false, error: "Alfred AI non configurato per il gruppo famigliare." });
        }

        const alfredId = alfredData.id;
        const familyGroupId = userData.family_group;
        const userEmail = userData.email;


        // ===========================================
        // 3. GENERAZIONE CONTENUTO CON AI (Titolo e Descrizione)
        // ===========================================
        
        const prompt = `Email Oggetto: ${emailSubject || 'Nessun Oggetto'}\nContenuto/Contesto: ${emailContent}\n\nGenera il Titolo e la Descrizione per l'evento.`;

         let aiTitle = (calendarData.scadenza_calendario_descrizione || emailSubject || 'Nuovo Evento').substring(0, 15);
        let aiDescription = "Evento generato da email.";

        try {
            // *** CORREZIONE: CHIAMATA ALLA FUNZIONE AI CON OPZIONE JSON ***
            const aiDetails = await generateContent({ // Ora aiDetails sarà un oggetto JS se ha successo
                prompt: prompt,
                systemInstruction: SYSTEM_INSTRUCTION_EVENT,
                generationConfig: {
                    responseMimeType: "application/json" // Chiediamo alla funzione di restituire un oggetto
                }
            });
            
            // Non serve più fare il parsing manuale con regex
            if (typeof aiDetails === 'object' && aiDetails !== null) {
                aiTitle = (aiDetails.title || aiTitle).substring(0, 15);
                aiDescription = (aiDetails.description || aiDescription).substring(0, 30);
            }
        } catch (aiError) {
            // Se l'AI fallisce (e lancia un errore), qui usiamo il fallback
            console.error("Errore generazione AI dettagli evento. Usando fallback.", aiError);
        }


        // ===========================================
        // 4. CALCOLO DATE E ORA
        // ===========================================
        const startDate = new Date(calendarData.scadenza_calendario_data);
        
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 ora dopo
        const notifyDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000); // 24 ore prima


        // ===========================================
        // 5. INSERIMENTO IN TABELLA 'events'
        // ===========================================
        const { error: insertError } = await supabase
            .from('events')
            .insert({
                title: aiTitle,
                description: aiDescription,
                family_group: familyGroupId,
                inserted_at: new Date().toISOString(),
                start: startDate.toISOString(),
                end: endDate.toISOString(),
                created_by: alfredId,
                notify_at: notifyDate.toISOString(),
                notify_emails: [userEmail],
               
            });

        if (insertError) {
            console.error("[Supabase] Errore inserimento evento in 'events':", insertError.message);
            return res.status(500).json({ success: false, error: `Errore database Supabase: ${insertError.message}` });
        }

        res.json({ success: true, message: "Evento calendario creato con successo.", eventTitle: aiTitle });

    } catch (error) {
        console.error("[Calendar] Fallimento API creazione evento (Generale):", error);
        res.status(500).json({ success: false, error: `Fallimento interno server: ${error.message}` });
    }
});
//-------------------------------------------------------------
// NUOVA FUNZIONE HELPER per rotta 13: Inserimento attività nella To-Do List
//**-------------------------------------------------------------
const insertTodoToSupabase = async (todoData) => {
    try {
        // La tabella è 'todos'
        const { data, error } = await supabase
            .from('todos') 
            .insert([todoData])
            .select(); // Richiediamo l'oggetto inserito

        if (error) {
            console.error("[SUPABASE TODO] Errore inserimento attività:", error);
            throw new Error(`Errore DB To-Do: ${error.message}`);
        }
        
        console.log("[SUPABASE TODO] Attività To-Do inserita con successo:", data[0].id);
        return data[0]; // Restituisce l'attività inserita
    } catch (error) {
        throw error;
    }
}
// ===============================================
// ROTTA 13: POST - CREAZIONE ATTIVITÀ TO-DO
// Endpoint: /api/email/create-todo
// ===============================================
router.post("/create-todo", async (req, res) => {
    const { 
        userId, 
        task, 
        emailReference // Usato per il contesto
    } = req.body; 

    // Verifica dei dati minimi
    if (!userId || !task) {
        return res.status(400).json({ 
            success: false, 
            error: "ID Utente e Compito (task) sono obbligatori per il To-Do." 
        });
    }

    try {
        // 1. Recupero family_group dell'utente loggato (Necessario per la politica RLS)
        const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('family_group')
            .eq('id', userId)
            .single();

        if (userError || !userData) {
            console.error("[Supabase] Utente To-Do non trovato o errore:", userError?.message);
            return res.status(404).json({ success: false, error: "Impossibile trovare il gruppo famigliare dell'utente." });
        }
        
        const familyGroupId = userData.family_group;

        // 2. Costruzione del payload per l'inserimento
        const todoPayload = {
            task: task,
            family_group: familyGroupId,
            inserted_by: userId,
            is_completed: 'FALSE', 
            notes: `Riferimento Email: ${emailReference || 'N/A'}`,
        };

        // 3. Inserimento dell'attività nel DB (Usando la funzione helper insertTodoToSupabase che devi avere altrove)
        // NOTA: Assumo che tu abbia una funzione 'insertTodoToSupabase' importata o definita in questo file.
        // Se non ce l'hai, sostituisci con l'inserimento diretto con Supabase:
        /*
        const { data: insertedTodo, error: insertError } = await supabase
            .from('todos')
            .insert([todoPayload])
            .select()
            .single();
        */
        // Userò l'inserimento diretto per non dipendere da un'ulteriore funzione esterna non mostrata.
        
        const { data: insertedTodo, error: insertError } = await supabase
            .from('todos')
            .insert([todoPayload])
            .select()
            .single();


        if (insertError) {
             console.error("[Supabase] Errore inserimento To-Do:", insertError);
             throw new Error(insertError.message);
        }

        res.json({ 
            success: true, 
            message: `Compito To-Do '${insertedTodo.task_description}' aggiunto con successo.`,
            todo: insertedTodo
        });
        
    } catch (err) {
        console.error(`[YAHOO ROUTER TODO] ERRORE CREAZIONE TO-DO:`, err);
        res.status(500).json({ 
            success: false, 
            error: `Fallimento nella creazione del To-Do: ${err.message}` 
        });
    }
});




export default router;