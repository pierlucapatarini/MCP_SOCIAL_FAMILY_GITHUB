// FILE: server/routes/Prompts16_02LeggiScriviArchivia_Mail.js

/* ===============================================
 * 1. CONFIGURAZIONE SCHEMA JSON PER ARCHIVIAZIONE E DATI
 * =============================================== */

const ARCHIVIAZIONE_SCHEMA = {
    type: "OBJECT",
    properties: {
        categoria_archiviazione: { 
            type: "STRING", 
            description: "Una delle seguenti categorie: 'Promozionale_Newsletter'( tutto quello che e' pubblicita' e newletter), 'Banche'( documenti in arrivo dalle varie banche), 'Bollette_scadenze_assicurazioni'( tutte le bollette o altre cose con date di scadenza pagamento ), 'SocialMedia'( tutte notizie o posta in arrivo dai social , instagram, facebook ..etc), 'Importante_urgente' ( se trovi termini o argomenti che sembrano urgenti o molto importanti ). Se la categoria più precisa non è identificabile o l'email è dubbia, utilizza 'DaVerificare_CategoriaDubbia'."  
        },
        motivo_archiviazione: { 
            type: "STRING", 
            description: "Breve motivazione (1-2 frasi) della classificazione e dell'azione proposta." 
        },
        scadenza_calendario_data: {
            type: "STRING",
            description: "Se l'email contiene una data precisa (es. 'scadenza 15/12/2025', 'appuntamento lunedì prossimo'), estrai la data in formato YYYY-MM-DD. Altrimenti, lascia NULL."
        },
        scadenza_calendario_descrizione: {
            type: "STRING",
            description: "Breve descrizione dell'evento o della scadenza (max 10 parole). Lascia NULL se la data non è specificata."
        },
        azione_todo: {
            type: "STRING",
            description: "Se l'email richiede un'azione specifica da parte tua (es. 'pagare la bolletta', 'rispondere alla mail', 'firmare il contratto'), scrivi qui il compito da aggiungere alla lista TO-DO. Altrimenti, lascia NULL."
        },
        documento_rilevante: {
            type: "BOOLEAN",
            description: "Imposta a TRUE se l'email ha allegati o se il corpo del testo è un documento importante che merita l'archiviazione digitale (documents-family/documents-alfred). Altrimenti, FALSE."
        }
    },
    propertyOrdering: [
        "categoria_archiviazione", "motivo_archiviazione", 
        "scadenza_calendario_data", "scadenza_calendario_descrizione", 
        "azione_todo", "documento_rilevante"
    ]
};

/* ===============================================
 * 2. ISTRUZIONI AI (SYSTEM INSTRUCTIONS)
 * =============================================== */

const SYSTEM_INSTRUCTION_ARCHIVIA = `Sei ALFRED, un maggiordomo AI per la gestione familiare, il cui unico compito è estrarre dati critici dalle email e classificarle. DEVI rigorosamente rispettare lo SCHEMA JSON fornito e compilarlo con i seguenti criteri: 
1. Scadenza: Se trovi una data (anche approssimativa o nel futuro), convertila nel formato YYYY-MM-DD e compila i campi 'scadenza_calendario_data' e 'scadenza_calendario_descrizione'. Se non c'è, usa NULL.
2. Azione: Se l'email richiede un'azione (risposta, pagamento, acquisto), compila 'azione_todo'. Altrimenti, usa NULL.
3. Documento Rilevante: Imposta 'documento_rilevante' a TRUE solo se ci sono allegati o se il testo è un contratto/fattura importante per l'archivio.
4. Archiviazione: Classifica sempre l'email in una delle categorie fornite. Rispondi SOLO in formato JSON.`;

const SYSTEM_INSTRUCTION_DRAFT = `Sei un assistente AI che genera bozze di risposta email. Il tuo tono deve essere professionale, conciso e orientato all'azione. Rispondi solo con il testo della bozza, senza saluti o firme extra, usando l'italiano.`;


export {
    ARCHIVIAZIONE_SCHEMA,
    SYSTEM_INSTRUCTION_ARCHIVIA,
    SYSTEM_INSTRUCTION_DRAFT
};