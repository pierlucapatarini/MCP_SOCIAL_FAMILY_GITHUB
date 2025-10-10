// Pagina16_06LeggiNotizieMondo.js - VERSIONE CORRETTA

import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import '../../styles/StylesPages16_06.css'; 

function ExportPagina16_06() {
    // Stati per i filtri e il contenuto
    const [selectedCategories, setSelectedCategories] = useState(['Italia']);
    const [selectedTime, setSelectedTime] = useState(24);
    const [italyDetailedMode, setItalyDetailedMode] = useState(false); // NUOVO: Modalità Italia dettagliata
    const [summaryText, setSummaryText] = useState("");
    const [audioUrl, setAudioUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [cachedInfo, setCachedInfo] = useState(null); // NUOVO: Info cache
    // *** MODIFICA: audioRef ora punta all'elemento DOM <audio> ***
    const audioRef = useRef(null); 
    
    // Lista delle categorie disponibili
    const CATEGORIES = [
        { id: 'Italia', label: 'Italia', emoji: '🇮🇹' },
        { id: 'Mondo Occidentale', label: 'Mondo Occidentale', emoji: '🌍' },
        { id: 'Mondo Arabo', label: 'Mondo Arabo', emoji: '🕌' },
        { id: 'Mondo Orientale', label: 'Mondo Orientale', emoji: '🏯' }
    ];
    
    // Funzione toggle per le categorie
    const toggleCategory = (category) => {
        setSelectedCategories(prev => 
            prev.includes(category) 
                ? prev.filter(c => c !== category) 
                : [...prev, category]
        );
    };

    // FUNZIONE PRINCIPALE: Generazione Riepilogo
    const generateSummary = useCallback(async (customCategories = null, customTime = null) => {
        setLoading(true);
        setError(null);
        setSummaryText("");
        setAudioUrl(null);
        setCachedInfo(null);
        setIsListening(false);
        
        const finalCategories = customCategories || selectedCategories;
        const finalTime = customTime || selectedTime;
        
        if (finalCategories.length === 0) {
            setError("Seleziona almeno una categoria di notizie.");
            setLoading(false);
            return;
        }

        try {
            const response = await axios.post('/api/alfred/news', {
                categories: finalCategories,
                timeRange: finalTime,
                italyDetailed: italyDetailedMode && finalCategories.includes('Italia'),
                mode: 'classic'
            });

            const { summaryText, audioUrl, cached } = response.data;

            setSummaryText(summaryText);
            setAudioUrl(audioUrl); // *** Lo stato aggiorna il prop src dell'elemento <audio> ***
            setCachedInfo(cached ? 'Contenuto dalla cache' : 'Contenuto fresco dall\'AI');

            if (audioUrl && audioRef.current) {
                // Tenta di avviare la riproduzione. 
                // Il browser lo bloccherà con un NotAllowedError, ma il log sarà più pulito
                audioRef.current.load(); // Importante per caricare la nuova sorgente
                
                const playPromise = audioRef.current.play();
                
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        // Cattura l'errore (solitamente NotAllowedError per l'autoplay)
                        console.warn(`Riproduzione bloccata o errore: ${error.name}. L'utente può usare i controlli.`, error);
                    });
                }
            }

        } catch (err) {
            console.error("Errore nel fetch del riepilogo:", err);
            setError(err.response?.data?.error || "Si è verificato un errore nel recupero delle notizie. Riprova.");
        } finally {
            setLoading(false);
        }
    }, [selectedCategories, selectedTime, italyDetailedMode]);
    
    // GESTIONE VOCALE CON ALFRED
    const startVoiceInteraction = () => {
        setIsListening(true);
        setSummaryText("👋 Ciao! Sono Alfred, il tuo maggiordomo. Dimmi per quale area del mondo desideri il riassunto e per quante ore. Ad esempio: 'Solo Italia, 12 ore' oppure 'Tutto il mondo, 24 ore'.");
        
        // Audio di benvenuto: usa l'audioRef con la sua sintassi
        if (audioRef.current) {
            setAudioUrl("audio/alfred_intro_question.mp3"); 
            audioRef.current.load();
            audioRef.current.play().catch(err => console.warn("Errore riproduzione audio intro:", err));
        }

        // TODO: Implementare STT (Speech-to-Text) con Whisper
        // Per ora simuliamo con timeout
        setTimeout(() => {
            setIsListening(false);
            setSummaryText("🎤 Funzionalità vocale in sviluppo. Usa i filtri sottostanti per ora.");
        }, 3000);
    };

    // Cleanup audio
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = "";
            }
        };
    }, []);

    return (
        <div className="pagina20-container">
            <div className="pagina20-header">
                <h1>📰 Alfred - Notizie dal Mondo</h1>
                <p className="pagina20-subtitle">
                    Il tuo maggiordomo personale ti tiene aggiornato sugli eventi più importanti
                </p>
            </div>
            
            {/* SEZIONE INTERAZIONE VOCALE */}
            <div className="pagina20-voice-section">
                <button 
                    className={`pagina20-alfred-voice-button ${isListening ? 'listening' : ''}`}
                    onClick={startVoiceInteraction} 
                    disabled={loading}
                >
                    {isListening ? '🎤 Alfred in Ascolto...' : '🗣️ Parla con Alfred'}
                </button>
                
                <p className="pagina20-voice-hint">
                    💡 Puoi chiedere ad Alfred a voce oppure usare i filtri qui sotto
                </p>
            </div>
            
            <hr className="pagina20-divider" />

            {/* SEZIONE FILTRI MANUALI */}
            <div className="pagina20-filters-section">
                <h3>🌍 Seleziona le Aree Geografiche</h3>
                <div className="pagina20-category-filters">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            className={`pagina20-filter-button ${selectedCategories.includes(cat.id) ? 'active' : ''}`}
                            onClick={() => toggleCategory(cat.id)}
                            disabled={loading || isListening}
                        >
                            {cat.emoji} {cat.label}
                        </button>
                    ))}
                </div>

                {/* MODALITÀ ITALIA DETTAGLIATA */}
                {selectedCategories.includes('Italia') && (
                    <div className="pagina20-italy-detailed">
                        <label className="pagina20-checkbox-label">
                            <input
                                type="checkbox"
                                checked={italyDetailedMode}
                                onChange={(e) => setItalyDetailedMode(e.target.checked)}
                                disabled={loading || isListening}
                            />
                            📊 Modalità Italia Dettagliata (Politica, Economia, Cronaca, Sport)
                        </label>
                    </div>
                )}
                
                <h3>⏰ Limite Temporale</h3>
                <div className="pagina20-time-filters">
                    {[12, 24].map(hours => (
                        <button
                            key={hours}
                            className={`pagina20-filter-button ${selectedTime === hours ? 'active' : ''}`}
                            onClick={() => setSelectedTime(hours)}
                            disabled={loading || isListening}
                        >
                            ⏱️ Ultime {hours} ore
                        </button>
                    ))}
                </div>
                
                <div className="pagina20-generate-section">
                    <button 
                        className="pagina20-generate-button" 
                        onClick={() => generateSummary()}
                        disabled={loading || isListening || selectedCategories.length === 0}
                    >
                        {loading ? '🔄 Alfred sta preparando il riassunto...' : '📋 Genera Riepilogo'}
                    </button>

                    {cachedInfo && (
                        <p className="pagina20-cache-info">
                            ℹ️ {cachedInfo}
                        </p>
                    )}
                </div>
            </div>
            
            <hr className="pagina20-divider" />

            {/* SEZIONE OUTPUT */}
            <div className="pagina20-output-section">
                <h2>🎯 Il Riepilogo di Alfred</h2>
                
                {error && (
                    <div className="pagina20-error-message">
                        ❌ {error}
                    </div>
                )}
                
                {summaryText && !error && (
                    <div className="pagina20-summary-content">
                        {/* AUDIO PLAYER */}
                        {audioUrl && (
                            <div className="pagina20-audio-player-controls">
                                <div className="pagina20-audio-header">
                                    <span className="pagina20-listening-prompt">
                                        🎧 Ascolta la voce di Alfred:
                                    </span>
                                </div>
                                {/* *** MODIFICA: Utilizza l'audioUrl come prop src e rimuovi <source> interna *** */}
                                <audio 
                                    controls 
                                    ref={audioRef}
                                    src={audioUrl}
                                    className="pagina20-audio-player"
                                >
                                    Il tuo browser non supporta l'audio HTML5.
                                </audio>
                            </div>
                        )}
                        
                        {/* TESTO FORMATTATO */}
                        <div 
                            className="pagina20-text-output" 
                            dangerouslySetInnerHTML={{ __html: summaryText }} 
                        />

                        {/* INFO AGGIUNTIVE */}
                        <div className="pagina20-summary-footer">
                            <small>
                                📅 Ultimo aggiornamento: {new Date().toLocaleString('it-IT')} 
                                {cachedInfo && ` • ${cachedInfo}`}
                            </small>
                        </div>
                    </div>
                )}

                {/* STATO DI CARICAMENTO */}
                {loading && (
                    <div className="pagina20-loading-state">
                        <div className="pagina20-loading-spinner">🔄</div>
                        <p>Alfred sta raccogliendo le notizie più importanti...</p>
                        <small>Analizzando fonti da: {selectedCategories.join(', ')}</small>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ExportPagina16_06;