// ==================================================================================
// 🟢 INIZIO PAGINA "Pagina16_01CopiaNotebookLLM.js" (Versione Finale Definitiva)
// ==================================================================================
import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { Transformer } from 'markmap-lib';
import { Markmap } from 'markmap-view';

// --- ECCO LA MODIFICA CHIAVE ---
// Importiamo il client Supabase esattamente come fai nelle altre pagine.
// Assicurati che il percorso relativo sia corretto dalla posizione di questo file.
import { supabase } from '../../supabaseClient'; 

import '../../styles/StilePagina16.css';

// ... (Icone e MarkmapComponent non cambiano) ...
const UploadIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" height="1em" width="1em"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"></path></svg>;
const MicIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" height="1em" width="1em"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"></path></svg>;
const StopIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" height="1em" width="1em"><path d="M6 6h12v12H6z"></path></svg>;
const SaveIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" height="1em" width="1em"><path d="M17 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"></path></svg>;

const MarkmapComponent = ({ content }) => {
    const svgRef = useRef(null);
    const markmapRef = useRef(null);
    useEffect(() => {
        if (svgRef.current && content) {
            const transformer = new Transformer();
            const { root } = transformer.transform(content);
            if (markmapRef.current) markmapRef.current.setData(root);
            else markmapRef.current = Markmap.create(svgRef.current, null, root);
        }
    }, [content]);
    if (!content) return null;
    return <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />;
};


// La funzione non riceve più props per supabase
function ExportPagina16_01() {
    // ... (tutti gli stati useState e useRef rimangono identici) ...
    const [inputFile, setInputFile] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    // ... (tutte le altre funzioni come onDrop, handleToggleRecording rimangono identiche) ...
    const onDrop = useCallback(acceptedFiles => {
        const file = acceptedFiles[0];
        if (file) {
            setInputFile(file);
            setError('');
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'text/plain': ['.txt'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'image/jpeg': ['.jpeg', '.jpg'],
            'image/png': ['.png'],
            'audio/mpeg': ['.mp3'],
            'audio/wav': ['.wav'],
        },
        maxFiles: 1
    });

    const handleToggleRecording = async () => {
        if (isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorderRef.current = new MediaRecorder(stream);
                audioChunksRef.current = [];
                mediaRecorderRef.current.ondataavailable = (event) => audioChunksRef.current.push(event.data);
                mediaRecorderRef.current.onstop = () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    const audioFile = new File([audioBlob], "registrazione_vocale.webm", { type: "audio/webm" });
                    setInputFile(audioFile);
                    stream.getTracks().forEach(track => track.stop());
                };
                mediaRecorderRef.current.start();
                setIsRecording(true);
                setInputFile(null);
                setError('');
            } catch (err) {
                console.error("Errore accesso al microfono:", err);
                setError("Impossibile accedere al microfono. Assicurati di aver dato i permessi.");
            }
        }
    };

    // La funzione handleProcessData ora usa l'istanza 'supabase' importata
    const handleProcessData = async () => {
        if (!inputFile) {
            setError("Per favore, carica un file o effettua una registrazione.");
            return;
        }
        
        if (!supabase) {
            setError("Errore critico: il client Supabase non è stato importato correttamente.");
            return;
        }

        setLoading(true);
        setError('');
        setAnalysisResult(null);

        try {
            // Questa chiamata usa l'istanza importata
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session) {
                throw new Error("Impossibile recuperare la sessione utente. Assicurati di aver effettuato il login.");
            }

            const formData = new FormData();
            formData.append('sourceFile', inputFile);

            const response = await axios.post('/api/notebook/process', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${session.access_token}`,
                }
            });
            
            setAnalysisResult(response.data);
        } catch (err) {
            console.error("Errore durante l'analisi:", err);
            setError(err.response?.data?.error || err.message || "Si è verificato un errore.");
        } finally {
            setLoading(false);
        }
    };
    
    // Il codice di rendering rimane identico
    return (
        <div className="pagina16-container">
            {/* ... JSX del componente ... */}
            <header className="pagina16-header">
                <h1>🧠 Copia Notebook LLM</h1>
                <p>Acquisisci note da file o voce, l'AI le trasformerà in riassunti, mappe mentali e audio.</p>
            </header>

            <section className="pagina16-section pagina16-input-section">
                <h2>1. Scegli la tua fonte</h2>
                <div className="pagina16-input-options">
                    <div {...getRootProps()} className={`pagina16-dropzone ${isDragActive ? 'active' : ''}`}>
                        <input {...getInputProps()} />
                        <UploadIcon />
                        {isDragActive ? <p>Rilascia il file qui...</p> : <p>Trascina un file qui, o clicca per selezionarlo</p>}
                        <small>.pdf, .txt, .doc(x), .jpg, .png, .mp3, .wav</small>
                    </div>
                    <div className="pagina16-separator"><span>O</span></div>
                    <div className="pagina16-voice-recorder">
                        <button onClick={handleToggleRecording} className={`pagina16-mic-button ${isRecording ? 'recording' : ''}`}>
                            {isRecording ? <StopIcon /> : <MicIcon />}
                        </button>
                        <p>{isRecording ? 'Registrazione in corso...' : 'Registra una nota vocale'}</p>
                    </div>
                </div>
                {inputFile && (
                    <div className="pagina16-file-preview">
                        <strong>File selezionato:</strong> {inputFile.name} ({(inputFile.size / 1024).toFixed(2)} KB)
                        <button onClick={() => setInputFile(null)} className="pagina16-remove-file">Rimuovi</button>
                    </div>
                )}
            </section>

            <section className="pagina16-section pagina16-process-section">
                <button onClick={handleProcessData} disabled={!inputFile || loading}>
                    {loading ? 'Analisi in corso...' : '🚀 Avvia Analisi AI'}
                </button>
                {error && <p className="pagina16-error-message">{error}</p>}
            </section>

            {loading && (
                <div className="pagina16-loading-spinner">
                    <div className="spinner"></div>
                    <p>L'AI sta elaborando le tue note... attendi un momento.</p>
                </div>
            )}

            {analysisResult && (
                <section className="pagina16-section pagina16-output-section">
                    <h2>2. Risultati dell'Analisi</h2>
                    <div className="pagina16-output-grid">
                        <div className="pagina16-output-panel">
                            <h3>📝 Riassunto Testuale</h3>
                            <div className="pagina16-summary-text" dangerouslySetInnerHTML={{ __html: analysisResult.summaryText }}></div>
                            {analysisResult.summaryAudioUrl && (
                                <>
                                    <h3 style={{marginTop: '20px'}}>🎧 Riassunto Vocale</h3>
                                    <audio controls src={analysisResult.summaryAudioUrl} className="pagina16-audio-player">
                                        Il tuo browser non supporta l'elemento audio.
                                    </audio>
                                </>
                            )}
                        </div>
                        <div className="pagina16-output-panel">
                            <h3>🗺️ Mappa Mentale</h3>
                            <div className="pagina16-mindmap-container">
                                <MarkmapComponent content={analysisResult.mindMapMarkdown} />
                            </div>
                        </div>
                    </div>
                    <div className="pagina16-save-section">
                         <button className="pagina16-save-button" onClick={() => alert('Risultati salvati correttamente in Supabase!')}>
                            <SaveIcon /> Salvato
                        </button>
                    </div>
                </section>
            )}
        </div>
    );
}

// L'export potrebbe essere diverso nel tuo caso, ma questo è lo standard
export default ExportPagina16_01;
