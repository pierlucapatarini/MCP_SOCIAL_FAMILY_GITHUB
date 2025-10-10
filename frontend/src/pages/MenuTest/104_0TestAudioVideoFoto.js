// FILE: client/src/pages/104_0TestAudioVideoFoto.js

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader, Music, Image, Film, ArrowLeft, Server, Zap, TrendingUp } from 'lucide-react';
import '../../styles/Pagina104Stile.css'; 

export default function ExportTestAudioVideo() {
    const navigate = useNavigate();
    const [testKey, setTestKey] = useState('hf_kan'); 
    const [prompt, setPrompt] = useState('Il Sole tramonta sul mare mentre una voce narrante spiega come preparare il ragù classico italiano.');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const mediaOptions = [
        // TTS (Text-to-Speech)
        { value: 'hf_kan', label: '1. Audio (TTS) - Hugging Face (Gratuito)', mediaType: 'tts', icon: Music, note: 'Backend - kan-bayashi' },
        { value: 'hf_fast', label: '2. Audio (TTS) - Hugging Face (Veloce/Gratuito)', mediaType: 'tts', icon: Music, note: 'Backend - fastspeech2' },
        { value: 'elevenlabs', label: '3. Audio (TTS) - ElevenLabs (Freemium/Prova)', mediaType: 'tts', icon: Zap, note: 'Backend - ElevenLabs' },
        { value: 'web_speech', label: '4. Audio (TTS) - Browser (Gratuito)', mediaType: 'tts', icon: Server, note: 'Frontend - Voce Sistema' },
        
        // IMAGES (Text-to-Image)
        { value: 'hf_sdxl', label: '5. Immagine (T-to-I) - Stable Diffusion XL (Gratuito)', mediaType: 'image', icon: Image, note: 'Backend - SDXL' },
        { value: 'hf_playground', label: '6. Immagine (T-to-I) - Stable Diffusion (Gratuito)', mediaType: 'image', icon: Image, note: 'Backend - Stable Diffusion v1.5' },
        { value: 'hf_kandinsky', label: '7. Immagine (T-to-I) - Kandinsky (Gratuito/Alternativa)', mediaType: 'image', icon: TrendingUp, note: 'Backend - Kandinsky 2.2' },
        
        // VIDEO (Text-to-Video) - Uscita reale o Errore
        { value: 'hf_modelscope', label: '8. Video (T-to-V) - ModelScope/Zeroscope (GRATUITO/Lento)', mediaType: 'video', icon: Film, note: 'Backend - ModelScope V2 (Lento)' },
        { value: 'hf_animatediff', label: '9. Video (T-to-V) - AnimateDiff (GRATUITO/Lento)', mediaType: 'video', icon: Film, note: 'Backend - AnimateDiff' },
        { value: 'zeroscope_repl', label: '10. Video (T-to-V) - Zeroscope (Freemium/Errore Selez.)', mediaType: 'video', icon: Film, note: 'Backend - Replicate (Richiede Setup Extra)' },
    ];

    const currentOption = mediaOptions.find(opt => opt.value === testKey) || mediaOptions[0];

    // Funzione specifica per Web Speech API (Frontend)
    const handleWebSpeechTest = () => {
        if (!('speechSynthesis' in window)) {
            setError("Il tuo browser non supporta l'API Web Speech.");
            return;
        }

        const utterance = new SpeechSynthesisUtterance(prompt);
        window.speechSynthesis.speak(utterance);
        
        setResult({
            success: true,
            message: "Sintesi vocale avviata nel browser (Web Speech API)."
        });
    };

    const handleRunTest = async () => {
        setLoading(true);
        setError('');
        setResult(null);

        if (testKey === 'web_speech') {
            handleWebSpeechTest();
            setLoading(false);
            return;
        }

        const payload = {
            mediaType: currentOption.mediaType,
            subType: testKey, 
            prompt,
        };

        try {
            const response = await fetch('/api/test/test-media', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                let errorMessage = data.error || `Errore del server durante il test ${currentOption.note}.`;
                
                // Migliora l'identificazione degli errori specifici
                if (errorMessage.includes('Timeout') || errorMessage.includes('504')) {
                     errorMessage = `⏳ ERRORE TIMEOUT: ${errorMessage}. La generazione video gratuita è MOLTO lenta e spesso scade. Riprova in un momento di minor carico.`;
                } else if (errorMessage.includes('429') || errorMessage.includes('quota')) {
                    errorMessage = `🛑 ERRORE QUOTA/CREDITI: ${errorMessage} (Verifica il Free Tier).`;
                } else if (errorMessage.includes('Chiave') || errorMessage.includes('401')) {
                    errorMessage = `🔑 ERRORE CHIAVE MANCANTE/NON VALIDA: ${errorMessage}`;
                } else if (errorMessage.includes('Errore Replicate')) {
                     errorMessage = `💥 ERRORE DI SETUP: ${errorMessage}`;
                }
                
                throw new Error(errorMessage);
            }

            setResult(data);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const ResultDisplay = () => {
        if (!result) return null;

        if (currentOption.mediaType === 'tts') {
            return (
                <div className="test-result-box audio-result">
                    <h4>✅ Risultato Audio ({currentOption.note})</h4>
                    <p>{result.message}</p>
                    {result.audioUrl && (
                        <>
                            <audio controls src={result.audioUrl} style={{ width: '100%', marginTop: '10px' }}></audio>
                            <p className="debug-info">URL: {result.audioUrl}</p>
                        </>
                    )}
                </div>
            );
        }

        if (currentOption.mediaType === 'image' && result.imageUrl) {
            return (
                <div className="test-result-box image-result">
                    <h4>✅ Risultato Immagine ({currentOption.note})</h4>
                    <p>{result.message}</p>
                    <img src={result.imageUrl} alt="AI Generated" style={{ maxWidth: '100%', height: 'auto', marginTop: '10px', borderRadius: '8px' }} />
                </div>
            );
        }

        if (currentOption.mediaType === 'video' && result.videoUrl) {
            return (
                <div className="test-result-box video-result">
                    <h4>✅ Risultato Video ({currentOption.note})</h4>
                    <p>{result.message}</p>
                    {/* Se l'URL è un percorso locale, assumiamo che sia il file generato. */}
                    {result.videoUrl.includes('/temp/videos') ? (
                        <video controls src={result.videoUrl} style={{ maxWidth: '100%', height: 'auto', marginTop: '10px', borderRadius: '8px' }}></video>
                    ) : (
                         <p className="debug-info">URL non riconosciuto come locale/statico. Risultato URL: {result.videoUrl}</p>
                    )}
                    
                </div>
            );
        }
        
        return (
             <div className="test-result-box generic-success">
                <h4>✅ Successo Generico</h4>
                <p>{result.message}</p>
            </div>
        );
    };

    return (
        <div className="page-container">
            <button onClick={() => navigate(-1)} className="back-button"><ArrowLeft size={20} /> Torna Indietro</button>

            <header className="page-header">
                <h1>104.0 Test Media AI (10 Opzioni Gratuite/Freemium)</h1>
                <p className="intro-text">
                    Testa le API che userai per creare l'audio e le immagini del video, concentrandoti sulle soluzioni **gratuite**. 
                    I test Video ora falliranno se l'API non genera un file reale (è molto probabile un errore di **Timeout** a causa delle code lunghe).
                </p>
            </header>

            <div className="test-controls-section">
                <h2>Seleziona Test</h2>
                <div className="media-selector-grid">
                    {mediaOptions.map(option => {
                        const Icon = option.icon;
                        return (
                            <button
                                key={option.value}
                                className={`selector-btn ${testKey === option.value ? 'active' : ''}`}
                                onClick={() => {
                                    setTestKey(option.value);
                                    setResult(null);
                                    setError('');
                                }}
                            >
                                <Icon size={20} />
                                <span>{option.label}</span>
                                <p className="note">{option.note}</p>
                            </button>
                        );
                    })}
                </div>

                <h2>Prompt per l'AI ({currentOption.note})</h2>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows="4"
                    placeholder="Inserisci il prompt..."
                    className="prompt-input"
                ></textarea>

                <button 
                    onClick={handleRunTest} 
                    disabled={loading || !prompt.trim()} 
                    className="run-test-btn"
                >
                    {loading ? <Loader className="spinner" /> : `Esegui Test: ${currentOption.label.split(' - ')[0]}`}
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}
            
            <ResultDisplay />

        </div>
    );
}