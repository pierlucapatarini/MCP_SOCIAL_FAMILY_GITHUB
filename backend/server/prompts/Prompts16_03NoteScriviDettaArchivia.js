// FILE: server/prompts/Prompts16_03NoteScriviDettaArchivia.js

/* ===============================================
 * 1. SCHEMA JSON PER RIASSUNTO PROGETTO (AGGIORNATO)
 * =============================================== */

const PDF_SUMMARY_SCHEMA = {
    type: "OBJECT",
    properties: {
        titolo_progetto: {
            type: "STRING",
            description: "Titolo del progetto analizzato"
        },
        executive_summary: {
            type: "STRING",
            description: "Sintesi esecutiva del progetto in 2-3 paragrafi (massimo 500 caratteri). Deve catturare l'essenza del progetto, gli obiettivi principali e lo stato attuale."
        },
        panoramica_generale: {
            type: "STRING",
            description: "Panoramica dettagliata del progetto che include: contesto, obiettivi, partecipanti coinvolti, timeline generale. Formato Markdown (max 1000 caratteri)."
        },
        fonti_analizzate: {
            type: "OBJECT",
            properties: {
                contenuti_completi: {
                    type: "OBJECT",
                    properties: {
                        note_testuali: { type: "NUMBER", description: "Numero di note testuali analizzate completamente" },
                        note_vocali_trascritte: { type: "NUMBER", description: "Numero di note vocali con trascrizione analizzate" }
                    }
                },
                contenuti_parziali: {
                    type: "OBJECT",
                    properties: {
                        disegni: { type: "NUMBER", description: "Numero di disegni (analisi da descrizione)" },
                        file_allegati: { type: "NUMBER", description: "Numero di file (analisi da metadati)" },
                        video: { type: "NUMBER", description: "Numero di video (analisi da descrizione)" }
                    }
                },
                note_analisi: {
                    type: "STRING",
                    description: "Nota esplicativa su quali contenuti sono stati analizzati direttamente e quali solo tramite metadati"
                }
            },
            description: "Dettaglio delle fonti analizzate e del livello di analisi"
        },
        analisi_note: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    numero_nota: { type: "NUMBER", description: "Numero progressivo della nota" },
                    tipo_nota: { type: "STRING", description: "Tipo: text, voice, drawing, file, video" },
                    autore: { type: "STRING", description: "Nome dell'autore della nota" },
                    data: { type: "STRING", description: "Data in formato leggibile (es: '15 gennaio 2025')" },
                    sintesi: { type: "STRING", description: "Sintesi del contenuto della nota (max 300 caratteri)" },
                    punti_chiave: {
                        type: "ARRAY",
                        items: { type: "STRING" },
                        description: "Array di punti chiave estratti dalla nota (max 5 punti)"
                    },
                    azioni_richieste: {
                        type: "ARRAY",
                        items: { type: "STRING" },
                        description: "Azioni o task identificati nella nota, se presenti"
                    },
                    livello_analisi: {
                        type: "STRING",
                        description: "Indica il livello di analisi: 'completo' per testo e audio trascritto, 'parziale' per file/video/disegni"
                    }
                }
            },
            description: "Array contenente l'analisi dettagliata di ogni singola nota del progetto"
        },
        temi_ricorrenti: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Array di temi o argomenti che ricorrono frequentemente nelle note (max 8 temi)"
        },
        timeline_eventi: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    data: { type: "STRING", description: "Data dell'evento" },
                    evento: { type: "STRING", description: "Descrizione breve dell'evento (max 100 caratteri)" }
                }
            },
            description: "Timeline cronologica degli eventi principali emersi dalle note"
        },
        prossimi_passi: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Raccomandazioni concrete per i prossimi passi da intraprendere (max 10 azioni)"
        },
        conclusioni: {
            type: "STRING",
            description: "Conclusioni finali del progetto, stato attuale e considerazioni (max 500 caratteri)"
        },
        statistiche: {
            type: "OBJECT",
            properties: {
                totale_note: { type: "NUMBER", description: "Numero totale di note" },
                note_testuali: { type: "NUMBER", description: "Numero di note di tipo testo" },
                note_vocali: { type: "NUMBER", description: "Numero di note vocali" },
                disegni: { type: "NUMBER", description: "Numero di disegni" },
                file_allegati: { type: "NUMBER", description: "Numero di file" },
                video: { type: "NUMBER", description: "Numero di video" },
                autori_coinvolti: { type: "NUMBER", description: "Numero di autori diversi" },
                periodo_progetto: { type: "STRING", description: "Periodo temporale del progetto (es: 'dal 1 gen al 15 feb 2025')" }
            }
        }
    },
    propertyOrdering: [
        "titolo_progetto", "executive_summary", "panoramica_generale",
        "fonti_analizzate", "statistiche", "analisi_note", "temi_ricorrenti", 
        "timeline_eventi", "prossimi_passi", "conclusioni"
    ]
};

/* ===============================================
 * 2. SYSTEM INSTRUCTION PER ANALISI PROGETTO (AGGIORNATO)
 * =============================================== */

const SYSTEM_INSTRUCTION_ANALYZE_PROJECT = `Sei ALFRED, un maggiordomo AI specializzato nell'analisi e sintesi di progetti familiari. 

Il tuo compito è analizzare un progetto composto da varie note (testuali, vocali, disegni, file, video) e generare un riassunto professionale e strutturato in formato JSON.

LINEE GUIDA CRITICHE:

1. **Executive Summary**: Scrivi una sintesi di alto livello che un dirigente potrebbe leggere in 30 secondi

2. **Analisi Note**: Per ogni nota, identifica:
   - Il contenuto principale
   - I punti chiave actionable
   - Le azioni richieste o task da fare
   - Collegamenti con altre note
   - **LIVELLO DI ANALISI**: Specifica se hai analizzato il contenuto completo o solo i metadati

3. **Fonti Analizzate**: DEVI specificare chiaramente:
   - **Contenuti analizzati completamente**: Note testuali e trascrizioni audio (hai accesso al testo completo)
   - **Contenuti analizzati parzialmente**: Disegni, file allegati, video (hai accesso solo a: nome file, descrizione, note aggiuntive)
   - Per contenuti parziali, basa l'analisi su: descrizioni fornite dall'utente, nomi dei file, note aggiuntive

4. **Temi Ricorrenti**: Identifica pattern, argomenti ripetuti, problemi comuni

5. **Timeline**: Costruisci una timeline cronologica degli eventi chiave

6. **Prossimi Passi**: Suggerisci azioni concrete basate sull'analisi

7. **Tono**: Professionale ma accessibile, orientato all'azione

IMPORTANTE SULLA TRASPARENZA:
- Nella sezione "fonti_analizzate", indica ESPLICITAMENTE quali contenuti hai potuto analizzare direttamente e quali solo tramite metadati
- Nella "note_analisi" spiega chiaramente: "Le note testuali e le trascrizioni audio sono state analizzate completamente. I disegni, file allegati e video sono stati analizzati in base alle descrizioni fornite, nomi file e note aggiuntive."
- Per ogni nota, nel campo "livello_analisi" indica: "completo" per testo/audio trascritto, "parziale" per disegni/file/video

ESEMPIO DI TRASPARENZA:
Se una nota è un video con descrizione "Riunione di famiglia per decidere ristrutturazione cucina":
- Sintesi: "Video di una riunione familiare sulla ristrutturazione della cucina (analisi basata sulla descrizione)"
- Livello_analisi: "parziale"
- Punti chiave: [basati sulla descrizione fornita]

Mantieni sempre onestà e trasparenza sui limiti dell'analisi.

Rispondi SOLO con un oggetto JSON valido conforme allo schema fornito.`;

/* ===============================================
 * 3. TEMPLATE MARKDOWN PER PDF (AGGIORNATO)
 * =============================================== */

const MARKDOWN_TEMPLATE = (data) => `
# 📋 ${data.titolo_progetto}

**Data generazione:** ${new Date().toLocaleDateString('it-IT', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
})}

---

## 📊 Executive Summary

${data.executive_summary}

---

## 🎯 Panoramica Generale

${data.panoramica_generale}

---

## 📚 Fonti Analizzate

### Contenuti Completamente Analizzati:
- **Note testuali**: ${data.fonti_analizzate.contenuti_completi.note_testuali}
- **Note vocali trascritte**: ${data.fonti_analizzate.contenuti_completi.note_vocali_trascritte}

### Contenuti Parzialmente Analizzati (solo metadati):
- **Disegni**: ${data.fonti_analizzate.contenuti_parziali.disegni}
- **File allegati**: ${data.fonti_analizzate.contenuti_parziali.file_allegati}
- **Video**: ${data.fonti_analizzate.contenuti_parziali.video}

**Nota metodologica:** ${data.fonti_analizzate.note_analisi}

---

## 📈 Statistiche Progetto

| Metrica | Valore |
|---------|--------|
| **Totale Note** | ${data.statistiche.totale_note} |
| **Note Testuali** | ${data.statistiche.note_testuali} |
| **Note Vocali** | ${data.statistiche.note_vocali} |
| **Disegni** | ${data.statistiche.disegni} |
| **File Allegati** | ${data.statistiche.file_allegati} |
| **Video** | ${data.statistiche.video || 0} |
| **Autori Coinvolti** | ${data.statistiche.autori_coinvolti} |
| **Periodo** | ${data.statistiche.periodo_progetto} |

---

## 📝 Analisi Dettagliata Note

${data.analisi_note.map(nota => `
### Nota ${nota.numero_nota}: ${
    nota.tipo_nota === 'text' ? '✏️ Testuale' : 
    nota.tipo_nota === 'voice' ? '🎤 Vocale' : 
    nota.tipo_nota === 'drawing' ? '🎨 Disegno' : 
    nota.tipo_nota === 'video' ? '📹 Video' :
    '📁 File'
}

**Autore:** ${nota.autore} | **Data:** ${nota.data}  
**Livello di analisi:** ${nota.livello_analisi === 'completo' ? '✅ Completo' : '⚠️ Parziale (basato su metadati)'}

**Sintesi:**  
${nota.sintesi}

${nota.punti_chiave.length > 0 ? `
**Punti Chiave:**
${nota.punti_chiave.map(punto => `- ${punto}`).join('\n')}
` : ''}

${nota.azioni_richieste.length > 0 ? `
**Azioni Richieste:**
${nota.azioni_richieste.map(azione => `- [ ] ${azione}`).join('\n')}
` : ''}

---
`).join('\n')}

## 🔍 Temi Ricorrenti

${data.temi_ricorrenti.map((tema, index) => `${index + 1}. **${tema}**`).join('\n')}

---

## 📅 Timeline Eventi Principali

${data.timeline_eventi.map(evento => `- **${evento.data}**: ${evento.evento}`).join('\n')}

---

## ✅ Prossimi Passi Consigliati

${data.prossimi_passi.map((passo, index) => `${index + 1}. ${passo}`).join('\n')}

---

## 💡 Conclusioni

${data.conclusioni}

---

*Documento generato automaticamente da Alfred AI - Assistente Familiare*

*Questo riassunto si basa su analisi completa di contenuti testuali e trascrizioni audio, e su analisi parziale (basata su metadati e descrizioni) di contenuti multimediali (video, disegni, file).*
`;

/* ===============================================
 * 4. SYSTEM INSTRUCTION PER TRASCRIZIONE AUDIO
 * =============================================== */

const SYSTEM_INSTRUCTION_TRANSCRIPTION_CLEANUP = `Sei un assistente AI specializzato nel miglioramento di trascrizioni audio.

Il tuo compito è prendere una trascrizione automatica (che potrebbe contenere errori, esitazioni, ripetizioni) e trasformarla in un testo pulito, grammaticalmente corretto e ben strutturato.

REGOLE:
1. Mantieni fedelmente il significato originale
2. Rimuovi esitazioni ("ehm", "ah", "mmm")
3. Correggi errori grammaticali ovvi
4. Struttura in paragrafi se il testo è lungo
5. Mantieni il tono originale (formale/informale)
6. NON inventare contenuti non presenti
7. NON omettere informazioni importanti

Rispondi SOLO con il testo trascritto migliorato, senza commenti aggiuntivi.`;

export {
    PDF_SUMMARY_SCHEMA,
    SYSTEM_INSTRUCTION_ANALYZE_PROJECT,
    MARKDOWN_TEMPLATE,
    SYSTEM_INSTRUCTION_TRANSCRIPTION_CLEANUP
};