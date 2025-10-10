// ==================================================================================
// 🟢 INIZIO ROTTA "Routes08_01FunctionIngestioneDocumentsAlfred"
// ==================================================================================
import { Router } from "express";
import axios from "axios";
import fs from "fs";
// azzerato per problemi di spazio vercel 
//import PDFParser from "pdf-parse";

import mammoth from "mammoth";
import { read, utils } from "xlsx";
import { createWorker } from "tesseract.js";
// 🛠️ CORREZIONE Aggiunto 'gemini' all'importazione
import { supabase, gemini } from "../config.js"; 
// 🛠️ ASSUNZIONE: Aggiunto l'importazione del Prompt (necessario per la funzione)
import { ALFRED_INGESTION_PROMPT } from "../prompts/08_01_AlfredIngestioneDocumento.js"; 



const router = Router();

// ---------- QUI INCOLLI IL CODICE ORIGINALE DELLA ROTTA ----------
// ===================================
// INIZIO ROTTA "Routes08_01FunctionIngestioneDocumentsAlfred"  :  ESTRAZIONE TESTO DA FILE , EMBEDDING ED ARCHIVIAZIONE
// /api/process-document
// ===================================

async function extractTextFromFile(buffer, fileName) {
    const fileExtension = fileName.toLowerCase().split('.').pop()?.trim();
    console.log(`🔍 Estensione file rilevata: "${fileExtension}"`);

    try {
        switch (fileExtension) {
            // ✅ FORMATI DI TESTO SEMPLICE
            case 'txt':
            case 'csv':
                return buffer.toString('utf8');

            // ✅ PDF
            case 'pdf':
                try {
                    const pdfData = await PDFParser(buffer);
                    return pdfData.text;
                } catch (error) {
                    console.error('Errore estrazione PDF:', error);
                    return 'Errore nella lettura del PDF.';
                }

            // ✅ MICROSOFT WORD
            case 'docx':
            case 'doc':
                try {
                    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
                    return result.value;
                } catch (error) {
                    console.error('Errore estrazione Word:', error);
                    return 'Errore nella lettura del documento Word.';
                }

            // ✅ EXCEL
            case 'xlsx':
            case 'xls':
                try {
                    const workbook = read(buffer, { type: 'buffer' });
                    let text = '';
                    workbook.SheetNames.forEach(sheetName => {
                        const sheet = workbook.Sheets[sheetName];
                        text += `\n--- Foglio: ${sheetName} ---\n`;
                        text += utils.sheet_to_csv(sheet);
                    });
                    return text;
                } catch (error) {
                    console.error('Errore estrazione Excel:', error);
                    return 'Errore nella lettura del foglio Excel.';
                }

            // ✅ POWERPOINT - SOLUZIONE SEMPLIFICATA
            case 'pptx':
            case 'ppt':
                return 'Formato PowerPoint non supportato al momento. Convertire in PDF per l\'analisi.';

            // ✅ IMMAGINI con OCR
            case 'jpg':
            case 'jpeg':
            case 'png':
                try {
                    const worker = await createWorker('ita+eng');
                    const { data: { text } } = await worker.recognize(buffer);
                    await worker.terminate();
                    return text;
                } catch (error) {
                    console.error('Errore OCR:', error);
                    return 'Errore nella lettura OCR dell\'immagine.';
                }

            // ✅ ARCHIVI ZIP
            case 'zip':
                try {
                    const AdmZip = await import('adm-zip');
                    const zip = new AdmZip.default(buffer);
                    const zipEntries = zip.getEntries();
                    
                    let text = `Archivio ZIP contenente ${zipEntries.length} file:\n`;
                    zipEntries.forEach(entry => {
                        text += `- ${entry.entryName} (${entry.header.size} bytes)\n`;
                    });
                    return text;
                } catch (error) {
                    console.error('Errore estrazione ZIP:', error);
                    return 'Errore nella lettura dell\'archivio ZIP.';
                }

            // ✅ ALTRI FORMATI DI TESTO
            case 'json':
                try {
                    return JSON.stringify(JSON.parse(buffer.toString()), null, 2);
                } catch (error) {
                    return buffer.toString('utf8');
                }

            case 'xml':
                try {
                    const xmlText = buffer.toString();
                    return xmlText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                } catch (error) {
                    return buffer.toString('utf8');
                }

            // 🔄 FALLBACK - Prova a leggere come testo semplice
            default:
                try {
                    const text = buffer.toString('utf8');
                    // Se sembra testo valido, restituiscilo
                    if (text.length > 10 && /[a-zA-ZÀ-ÿ]/.test(text)) {
                        return text;
                    }
                    return `Formato non supportato: .${fileExtension}`;
                } catch {
                    return `Formato non supportato: .${fileExtension}`;
                }
        }
    } catch (error) {
        console.error(`❌ Errore generale estrazione per ${fileExtension}:`, error);
        return `Errore nell'estrazione: ${error.message}`;
    }
}

// ===================================
// FUNZIONI SPECIFICHE PER OGNI FORMATO ( sono le specifiche dei formati dell'elenco precedente richiamate tramite variabili)
// ===================================

// 📄 PDF con estrazione testo
async function extractFromPDF(buffer) {
    try {
        // 1. Estrazione testo normale
        const pdfData = await PDFParser(buffer);
        let text = pdfData.text;
        
        // 2. Se poco testo, prova OCR (implementazione semplificata)
        if (text.trim().length < 50) {
            console.log('📸 Tentativo OCR per PDF scansionato...');
            text += await extractTextFromScannedPDF(buffer);
        }
        
        return text;
    } catch (error) {
        throw new Error(`PDF extraction failed: ${error.message}`);
    }
}

// 🔍 OCR semplificato per PDF
async function extractTextFromScannedPDF(buffer) {
    const worker = await createWorker('ita+eng');
    try {
        // Salva buffer temporaneamente e riconosci
        const tempFile = `./temp_${Date.now()}.pdf`;
        fs.writeFileSync(tempFile, buffer);
        
        const { data: { text } } = await worker.recognize(tempFile);
        
        // Pulizia file temporaneo
        fs.unlinkSync(tempFile);
        
        return text || '';
    } catch (error) {
        console.warn('OCR PDF fallito:', error.message);
        return '';
    } finally {
        await worker.terminate();
    }
}

// 📝 WORD Documents
async function extractFromWord(buffer) {
    try {
        const result = await mammoth.extractRawText({ arrayBuffer: buffer });
        return result.value;
    } catch (error) {
        throw new Error(`Word extraction failed: ${error.message}`);
    }
}

// 📊 EXCEL Files
async function extractFromExcel(buffer) {
    try {
        const workbook = read(buffer, { type: 'buffer' });
        let text = '';
        
        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            text += `\n--- Foglio: ${sheetName} ---\n`;
            text += utils.sheet_to_csv(sheet);
        });
        
        return text;
    } catch (error) {
        throw new Error(`Excel extraction failed: ${error.message}`);
    }
}

// 🎤 POWERPOINT Presentations (CORRETTO)
async function extractFromPowerPoint(buffer) {
    try {
        // Salva buffer temporaneamente
        const tempFile = `./temp_${Date.now()}.pptx`;
        fs.writeFileSync(tempFile, buffer);
        
        // Estrai testo con libreria corretta
        const text = await extractRawText(tempFile);
        
        // Pulizia file temporaneo
        fs.unlinkSync(tempFile);
        
        return text.join('\n') || 'Nessun testo estratto dalla presentazione.';
    } catch (error) {
        throw new Error(`PowerPoint extraction failed: ${error.message}`);
    }
}

// 📧 EMAIL Messages
async function extractFromEmail(buffer) {
    try {
        const parsed = await simpleParser(buffer);
        let text = '';
        
        if (parsed.subject) text += `Oggetto: ${parsed.subject}\n`;
        if (parsed.from) text += `Da: ${parsed.from.text}\n`;
        if (parsed.to) text += `A: ${parsed.to.text}\n`;
        if (parsed.date) text += `Data: ${parsed.date}\n`;
        if (parsed.text) text += `\n${parsed.text}`;
        
        return text;
    } catch (error) {
        throw new Error(`Email extraction failed: ${error.message}`);
    }
}

// 📄 RTF Documents
async function extractFromRTF(buffer) {
    try {
        return new Promise((resolve, reject) => {
            rtfToText(buffer.toString(), (err, text) => {
                if (err) reject(err);
                else resolve(text);
            });
        });
    } catch (error) {
        throw new Error(`RTF extraction failed: ${error.message}`);
    }
}

// 🖼️ IMAGE OCR
async function extractFromImageOCR(buffer) {
    const worker = await createWorker('ita+eng');
    try {
        const { data: { text } } = await worker.recognize(buffer);
        return text;
    } catch (error) {
        throw new Error(`OCR failed: ${error.message}`);
    } finally {
        await worker.terminate();
    }
}

// 📦 ZIP Archives
async function extractFromZip(buffer) {
    try {
        const zip = new AdmZip(buffer);
        const zipEntries = zip.getEntries();
        
        let text = `Archivio ZIP contenente ${zipEntries.length} file:\n`;
        
        zipEntries.forEach(entry => {
            text += `- ${entry.entryName} (${entry.header.size} bytes)\n`;
        });
        
        return text;
    } catch (error) {
        throw new Error(`ZIP extraction failed: ${error.message}`);
    }
}

// 📊 JSON Files
async function extractFromJSON(buffer) {
    try {
        const jsonData = JSON.parse(buffer.toString());
        return JSON.stringify(jsonData, null, 2);
    } catch (error) {
        throw new Error(`JSON extraction failed: ${error.message}`);
    }
}

// 📋 XML Files
async function extractFromXML(buffer) {
    try {
        const xmlText = buffer.toString();
        return xmlText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    } catch (error) {
        throw new Error(`XML extraction failed: ${error.message}`);
    }
}


// ==================================================================================
// FUNZIONE ESTRAZIONE DEL CONTENUTO e trasformazione in txt ( PASSATO SUCCESIVAMENTE ALLA FUNZIONE2 X RIASSUNTO E PER EMBEDDING CONTENUTO)
// /api/process-document
// ==================================================================================

router.post('/', async (req, res) => {
    const { familyGroup, fileName, fileUrl, uploadedBy, uploadedByName, documentId, fileType } = req.body;
    
    // Validate required fields
    if (!documentId || !fileName || !fileUrl) {
        return res.status(400).json({ 
            error: 'Missing required fields: documentId, fileName, or fileUrl' 
        });
    }
    
    try {
        // 1. Download document from Supabase Storage URL
        console.log(`📥 Downloading file: ${fileName} from ${fileUrl}`);
        const response = await axios.get(fileUrl, { 
            responseType: 'arraybuffer',
            timeout: 30000 // 30 second timeout
        });
        const buffer = Buffer.from(response.data);
        
        // 2. Extract file extension and validate
        const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
        if (!fileExtension) {
            throw new Error('Unable to determine file extension');
        }
        
        console.log(`📄 Processing file: ${fileName} (${fileExtension}, ${buffer.length} bytes)`);
        
        // 3. Extract text from document
        const extractedText = await extractTextFromFile(buffer, fileName);

        // Enhanced logging for debugging
        console.log(`📊 Extraction result:
            - File: ${fileName}
            - Extension: ${fileExtension}
            - Buffer size: ${buffer.length} bytes
            - Extracted text length: ${extractedText ? extractedText.length : 0}
            - First 200 chars: ${extractedText ? extractedText.substring(0, 200) : 'NULL'}...`);
        
        let summary = 'N/A';
        let embedding = null;
        let finalExtractedText = extractedText;
        
        // 4. Determine if extraction was successful
        const extractionSucceeded = extractedText && 
                                  typeof extractedText === 'string' &&
                                  extractedText.length > 10 && // Minimum meaningful length
                                  !extractedText.includes('Formato file non supportato') &&
                                  !extractedText.includes('Impossibile') && 
                                  !extractedText.includes('Errore nell\'estrazione');

        if (extractionSucceeded) {
            console.log('✅ Text extraction successful. Generating summary and embedding...');
            
            try {
                // Generate summary with AI
                summary = await getAlfredDocumentSummary(extractedText);
                console.log(`📝 Summary generated: ${summary ? summary.substring(0, 100) : 'N/A'}...`); 
            } catch (summaryError) {
                console.warn('⚠️ Summary generation failed:', summaryError.message);
                summary = 'Riassunto non disponibile a causa di un errore AI.';
            }
            
            try {
                // Generate embedding
                embedding = await generateVectorEmbedding(extractedText);
                console.log(`🔢 Embedding generated: ${embedding ? embedding.length : 0} dimensions`);
            } catch (embeddingError) {
                console.warn('⚠️ Embedding generation failed:', embeddingError.message);
                embedding = null;
            }
        } else {
            console.log('❌ Text extraction failed. Storing metadata only.');
            finalExtractedText = extractedText || `Formato file non supportato: .${fileExtension}`;
            summary = `Documento archiviato ma testo non estratto. Motivo: ${finalExtractedText}`;
            embedding = null;
        }

        // Final logging before database save
        console.log(`💾 Saving to database:

            - extracted_text: ${finalExtractedText ? finalExtractedText.substring(0, 100) : 'N/A'}...
            - summary: ${summary ? summary.substring(0, 100) : 'N/A'}...
            - embedding: ${embedding ? 'Generated' : 'NULL'}
            - extraction_success: ${extractionSucceeded}`);
        
        // 5. Save to Supabase database
        const { data, error } = await supabase
            .from('documents-alfred')
            .upsert({ 
                id: documentId,
                family_group: familyGroup,
                file_name: fileName,
                extracted_text: finalExtractedText,
                file_url: fileUrl, 
                summary: summary,
                embedding: embedding,
                file_type: fileType || fileExtension, 
                uploaded_by: uploadedBy,
                username: uploadedByName,
                
            }, { onConflict: 'id' });
            
        if (error) {
            console.error('❌ Database save error:', error);
            throw new Error(`Database error: ${error.message}`);
        }

        console.log('✅ Document successfully processed and archived.');
        res.status(200).json({ 
            message: 'Documento processato e archiviato con successo!', 
            data,
            extraction_success: extractionSucceeded,
            text_length: finalExtractedText.length,
            has_embedding: !!embedding
        });




// cancella da qui Nel backend, aggiungi questo logging per verificare:
console.log(`🔍 DEBUG - Dati ricevuti:
- fileName: ${fileName}
- fileUrl: ${fileUrl}
- fileType: ${fileType}`);

// Estrai il nome file dall'URL per confronto
const urlFileName = fileUrl.split('/').pop();
console.log(`🔍 DEBUG - Nome file dall'URL: ${urlFileName}`);


    } catch (error) {
        console.error('❌ Document processing error:', error);
        res.status(500).json({ 
            error: 'Errore nel processo di ingestione: ' + error.message,
            file_name: fileName,
            document_id: documentId
        });
    }
});


// ==================================================================================
// FUNZIONI2 -   - 
// A) ANALIZZA IL TESTO ESTRATTO DA FUNZIONE1 E GENERA : 1 )RIASSUNTO
// B) ANALIZZA IL TESTO ESTRATTO DA FUNZIONE1 E GENERA : 2 )EMBEDDING (contenuto)
// LA FUNZIONE ANALISI E RISUSSUNTO VIENE FATTA DA MODELLO gemini LA FUNZIONE EMBEDDING DA EMBEDING-3SMALL:
// =============================================================================

// =============================================================================
// A) Funzione per generare un riassunto
// =============================================================================
// Funzione per generare un riassunto
export async function getAlfredDocumentSummary(documentText) {
    console.log('Chiamata AI per generare il riassunto (Gemini)...');
    try {
        // Usa gemini direttamente
        const model = gemini.getGenerativeModel({ model: "gemini-2.5-flash" }); 
        
        const finalPrompt = ALFRED_INGESTION_PROMPT.replace('{documentText}', documentText);

        const response = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: finalPrompt }] }]
        });

        const summary = response.text 
            ? response.text.trim() 
            : 'Riassunto non disponibile: la risposta AI era vuota o bloccata.';
            
        return summary;
    } catch (error) {
        // Questo è il punto critico: assicurati che il log sia corretto.
        console.error("Errore nella generazione del riassunto (Gemini):", error.message);
        // Restituisce un errore gestito, che viene poi loggato.
        return 'Riassunto non disponibile a causa di un errore AI.'; 
    }
}


 // =============================================================================
// B) Funzione per generare un embedding
// =============================================================================
// Funzione per generare un embedding
export async function generateVectorEmbedding(text) {
    console.log('Chiamata AI per generare gli embeddings (Gemini)...');
    try {
        // Non usare 'client', usa gemini direttamente
        const embeddingService = gemini.getEmbeddings(); 

        const result = await embeddingService.embedContent({
            model: "text-embedding-004", 
            content: text, 
            taskType: 'RETRIEVAL_DOCUMENT'
        });

        // ⚠️ Assicurati che l'accesso ai valori sia corretto
        const embeddingValues = result.embedding?.values || null; 
        
        if (!embeddingValues || embeddingValues.length === 0) {
             console.error("ERRORE EMBEDDING: L'API ha restituito un embedding nullo o vuoto.");
             return null;
        }

        console.log(`Embedding generato con successo. Dimensioni: ${embeddingValues.length}`);
        return embeddingValues;
        
    } catch (error) {
        // Questo catch è la ragione del tuo '0 dimensions' e 'NULL'
        console.error("Errore nella generazione dell'embedding (Gemini):", error.message);
        return null;
    }
}
// ==================================================================================
// 🟢 FINE ROTTA "Routes08_01FunctionIngestioneDocumentsAlfred"
// ==================================================================================
export default router;
