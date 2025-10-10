// FILE: src/pages/menu16/Pagina16_02LeggiScriviArchivia_Mail.js

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Mail, MessageCircle, Zap, X, Calendar, CheckCircle, FileText, Loader, Send, Volume2, Mic, ChevronLeft } from 'lucide-react'; 
import '../../styles/StilePagina16_02.css'; 
import { supabase } from '../../supabaseClient'; 

const API_URL = process.env.REACT_APP_API_URL; 


// Helper per classi CSS
const getCategoryClass = (category) => {
    if (!category) return '';
    const safeCategory = category.toLowerCase().replace(/[\/_\s]/g, '_');
    if (safeCategory.includes('commerciale') || safeCategory.includes('vendite')) return 'commerciale';
    if (safeCategory.includes('tecnico') || safeCategory.includes('supporto')) return 'tecnico';
    if (safeCategory.includes('finanza') || safeCategory.includes('fatture')) return 'finanza';
    if (safeCategory.includes('promozioni') || safeCategory.includes('newsletter')) return 'promozioni';
    if (safeCategory.includes('personale') || safeCategory.includes('privato')) return 'personale';
    return 'dubbia'; 
};

/* ===============================================
 * COMPONENTE 1: SCRIVI EMAIL (Manuale)
 * =============================================== */
const WriteMailComponent = ({ sendData, setSendData, handleSendEmail, loading }) => (
    <div className="write-email-section module-card">
        <h3 className="section-title"><Send size={20} /> Scrivi Email Manuale</h3>
        <input 
            type="email" 
            placeholder="A (Destinatario)" 
            value={sendData.to} 
            onChange={(e) => setSendData(prev => ({...prev, to: e.target.value}))} 
            required
        />
        <input 
            type="text" 
            placeholder="Oggetto" 
            value={sendData.subject} 
            onChange={(e) => setSendData(prev => ({...prev, subject: e.target.value}))} 
            required
        />
        <textarea 
            placeholder="Corpo del messaggio" 
            rows={10} 
            value={sendData.body} 
            onChange={(e) => setSendData(prev => ({...prev, body: e.target.value}))} 
            required
        />
        <button onClick={() => handleSendEmail()} disabled={loading}>
            {loading ? <Loader size={18} className="spinner" /> : <Send size={18} />} Invia Email
        </button>
    </div>
);

/* ===============================================
 * COMPONENTE 2: SCRIVI EMAIL (AI Alfred)
 * =============================================== */
const AIWriteMailComponent = ({ sendData, setSendData, handleSendEmail, loading, aiDraft, setAiDraft, setStatus, isAiLoading, setIsAiLoading }) => {
    const [draftRequest, setDraftRequest] = useState('');

    const handleAIWrite = async () => {
        if (!draftRequest.trim() || !sendData.to.trim() || !sendData.subject.trim()) {
            setStatus("ERRORE: Destinatario, Oggetto e bozza sono obbligatori.");
            return;
        }

        setIsAiLoading(true);
        setStatus("Richiesta di riscrittura formale ad Alfred in corso...");
        
        try {
            const response = await fetch(`${API_URL}/api/email/ai-draft-rewrite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    recipient: sendData.to,
                    subject: sendData.subject,
                    draft: draftRequest
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setAiDraft(data.draft);
                setSendData(prev => ({...prev, body: data.draft})); 
                setStatus(`✅ Bozza AI generata e formalizzata con successo!`);
            } else {
                setStatus(`❌ ERRORE AI: ${data.error}`);
            }
        } catch (error) {
            setStatus('❌ ERRORE: Fallimento API AI per la riscrittura. Controlla il log del server.');
        } finally {
            setIsAiLoading(false);
        }
    };
    
    useEffect(() => {
        setDraftRequest('');
        setAiDraft(null);
    }, [setAiDraft]);

    return (
        <div className="ai-write-email-section module-card">
            <h3 className="section-title"><Zap size={20} /> Scrivi Email con Alfred (AI)</h3>
            <input 
                type="email" 
                placeholder="A (Destinatario)" 
                value={sendData.to} 
                onChange={(e) => setSendData(prev => ({...prev, to: e.target.value}))} 
                required
            />
            <input 
                type="text" 
                placeholder="Oggetto (Bozza iniziale)" 
                value={sendData.subject} 
                onChange={(e) => setSendData(prev => ({...prev, subject: e.target.value}))} 
                required
            />
            <textarea 
                placeholder="Il tuo testo veloce/vocale (scrivi qui in modo informale e veloce la richiesta)" 
                rows={4} 
                value={draftRequest} 
                onChange={(e) => setDraftRequest(e.target.value)} 
                required
            />
            <button onClick={handleAIWrite} disabled={loading || isAiLoading || !draftRequest || !sendData.to || !sendData.subject}>
                {isAiLoading ? <Loader size={18} className="spinner" /> : <Mic size={18} />} Formalizza Bozza con Alfred
            </button>
            {aiDraft && (
                <div className="ai-draft-output">
                    <div className="ai-draft-notice">
                        <strong>Bozza AI Formalizzata:</strong> Controlla e modifica il testo qui sotto prima dell'invio.
                    </div>
                    <textarea 
                        placeholder="Corpo del messaggio finale (modificabile)" 
                        rows={10} 
                        value={sendData.body} 
                        onChange={(e) => setSendData(prev => ({...prev, body: e.target.value}))} 
                        required
                    />
                    <button onClick={() => handleSendEmail()} disabled={loading}>
                        {loading ? <Loader size={18} className="spinner" /> : <Send size={18} />} Invia Email Formalizzata
                    </button>
                </div>
            )}
        </div>
    );
};

/* ===============================================
 * COMPONENTE 3: LEGGI NUOVE MAIL
 * =============================================== */
const ReadMailComponent = ({ 
    unreadEmails, handleReadEmail, timeFilter, setTimeFilter, 
    loading, isAiLoading, selectedEmail, setSelectedEmail, aiDraft, setAiDraft, 
    aiClassification, setAiClassification, handleAICall, confirmMove, setStatus,
    setSendData, handleSendEmail, setCurrentMode,
    aiActionFlags, setAiActionFlags
}) => {
    const [isEmailDetailOpen, setIsEmailDetailOpen] = useState(false);

    const handleReadListVocally = async () => {
        if (!unreadEmails || unreadEmails.length === 0) {
            setStatus("Nessuna email da leggere.");
            return;
        }
        
        setStatus("Generazione sintesi vocale (TTS) in corso...");
        const summaryText = unreadEmails.slice(0, 5).map((email, index) => 
            `${index + 1}. Da ${email.FROM}. Oggetto: ${email.SUBJECT}. Inviata il ${new Date(email.DATE).toLocaleDateString()}.`
        ).join(" ");
        
        try {
            const response = await fetch(`${API_URL}/api/email/tts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: `Hai ${unreadEmails.length} email non lette. Le prime ${Math.min(5, unreadEmails.length)} sono: ${summaryText}` })
            });
            if (response.ok) {
                const blob = await response.blob();
                const audioUrl = URL.createObjectURL(blob);
                const audio = new Audio(audioUrl);
                audio.play();
                setStatus("✅ Audio riprodotto con successo.");
            } else {
                const errorText = await response.text();
                setStatus(`❌ ERRORE TTS: ${response.status} - Dettaglio: ${errorText}`);
            }
        } catch (error) {
            setStatus('❌ ERRORE: Impossibile connettersi per la riproduzione audio.');
        }
    };

    const handleEmailClick = (email) => {
        setSelectedEmail(email);
        setAiClassification(null);
        setAiDraft(null);
        setAiActionFlags({ moveImap: false, createEvent: false, createTodo: false, archiveDoc: false });
        setIsEmailDetailOpen(true);
    };

    const closeEmailView = () => {
        setSelectedEmail(null);
        setAiDraft(null);
        setAiClassification(null);
        setAiActionFlags({ moveImap: false, createEvent: false, createTodo: false, archiveDoc: false });
        setIsEmailDetailOpen(false);
    };

    return (
        <div className="read-email-section module-card">
            {!isEmailDetailOpen && (
                <>
                    <h3 className="section-title"><Mail size={20} /> Leggi Nuove Mail</h3>
                    <div className="filter-controls">
                        <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} disabled={loading}> 
                            <option value="day">Giorno precedente ed attuale</option>
                            <option value="week">Ultima Settimana</option>
                            <option value="month">Ultimo Mese</option>
                        </select>
                        <button onClick={handleReadEmail} disabled={loading} className="action-button primary">
                            {(loading && !isAiLoading) ? <Loader size={18} className="spinner" /> : <Mail size={18} />} Scarica Nuove Mail
                        </button>
                        <button onClick={handleReadListVocally} disabled={loading || !unreadEmails || unreadEmails.length === 0} className="action-button secondary">
                            <Volume2 size={18} /> Elenca Vocalmente ({unreadEmails ? unreadEmails.length : 0})
                        </button>
                    </div>
                </>
            )}
            
            <div className="email-content-area">
                <div className={`email-list ${isEmailDetailOpen ? 'hidden-on-mobile' : ''}`}>
                    {unreadEmails === null && <p>Premi "Scarica Nuove Mail" per iniziare.</p>}
                    {unreadEmails && unreadEmails.length === 0 && <p>Nessuna email non letta trovata.</p>}
                    {unreadEmails && unreadEmails.map((email, index) => (
                        <div 
                            key={email.UID || index} 
                            className={`email-item ${selectedEmail && selectedEmail.UID === email.UID ? 'selected' : ''}`}
                            onClick={() => handleEmailClick(email)}
                        >
                            <span className="email-from">{email.FROM}</span>
                            <span className="email-subject">{email.SUBJECT}</span>
                            <span className="email-date">{new Date(email.DATE).toLocaleDateString()}</span>
                            <p className="email-preview">{email.PREVIEW}</p>
                        </div>
                    ))}
                </div>

                {selectedEmail && (
                    <div className="email-detail selected-email-view">
                        <button className="back-button" onClick={closeEmailView}>
                            <ChevronLeft size={20} /> Torna alla lista
                        </button>

                        <div className="email-header-detail">
                            <h4>{selectedEmail.SUBJECT}</h4>
                            <p>Da: <strong>{selectedEmail.FROM}</strong> &lt;{selectedEmail.FROM_EMAIL}&gt;</p>
                            <p>Data: {new Date(selectedEmail.DATE).toLocaleString()}</p>
                            <p className="attachments-info">Allegati: {selectedEmail.HAS_ATTACHMENTS ? 'Sì' : 'NO'}</p>
                        </div>

                        {aiClassification && (
                            <div className="ai-classification-box">
                                <h4>Analisi Alfred: Riassunto e Proposte</h4>
                                
                                <div className="ai-summary-box ai-draft-notice">
                                    <h5 style={{margin: '0 0 5px 0'}}>Riassunto / Rilevanza (Motivazione Alfred):</h5>
                                    <p style={{fontStyle: 'italic', margin: 0}}>{aiClassification.motivo_archiviazione}</p>
                                </div>
                                
                                <p className="ai-draft-notice" style={{marginTop: '15px'}}>**Seleziona le azioni che desideri vengano eseguite da Alfred:**</p>
                                <hr className="divider" />

                                <label className={`ai-action-checkbox ${aiActionFlags.moveImap ? 'checked-action' : ''}`}>
                                    <input 
                                        type="checkbox" 
                                        checked={aiActionFlags.moveImap} 
                                        onChange={(e) => setAiActionFlags(prev => ({...prev, moveImap: e.target.checked}))}
                                        disabled={!aiClassification.categoria_archiviazione}
                                    />
                                    **1) Archiviazione Cartella Mail:** <span className={`ai-category ${getCategoryClass(aiClassification.categoria_archiviazione)}`}>
                                        {aiClassification.categoria_archiviazione || "N/D"}
                                    </span>
                                </label>
                                <hr className="divider" />
                                
                                {(aiClassification.scadenza_calendario_data !== "NULL" && aiClassification.scadenza_calendario_data) ? (
                                    <>
                                        <label className={`ai-action-checkbox ${aiActionFlags.createEvent ? 'checked-action' : ''}`}>
                                            <input 
                                                type="checkbox" 
                                                checked={aiActionFlags.createEvent} 
                                                onChange={(e) => setAiActionFlags(prev => ({...prev, createEvent: e.target.checked}))}
                                            />
                                            **2) Creazione Evento Con Data Proposta:** <Calendar size={18} />
                                        </label>
                                        <p className="ai-suggestion-detail ai-highlight success">
                                            **Data:** {aiClassification.scadenza_calendario_data} | **Descrizione:** {aiClassification.scadenza_calendario_descrizione}
                                        </p>
                                        <hr className="divider" />
                                    </>
                                ) : (
                                    <p className="ai-highlight info">2) Nessuna scadenza/evento rilevante trovato dall'AI.</p>
                                )}
                                
                                {(aiClassification.azione_todo !== "NULL" && aiClassification.azione_todo) ? (
                                    <>
                                        <label className={`ai-action-checkbox ${aiActionFlags.createTodo ? 'checked-action' : ''}`}>
                                            <input 
                                                type="checkbox" 
                                                checked={aiActionFlags.createTodo} 
                                                onChange={(e) => setAiActionFlags(prev => ({...prev, createTodo: e.target.checked}))}
                                            />
                                            **3) Inserimento nota in TODO-List (lista cose da fare):** <CheckCircle size={18} />
                                        </label>
                                        <p className="ai-suggestion-detail ai-highlight warning">
                                            **Compito:** {aiClassification.azione_todo}
                                        </p>
                                        <hr className="divider" />
                                    </>
                                ) : (
                                    <p className="ai-highlight info">3) Nessun compito immediato richiesto dall'AI.</p>
                                )}

                                {aiClassification.documento_rilevante ? (
                                    <>
                                        <label className={`ai-action-checkbox ${aiActionFlags.archiveDoc ? 'checked-action' : ''}`}>
                                            <input 
                                                type="checkbox" 
                                                checked={aiActionFlags.archiveDoc} 
                                                onChange={(e) => setAiActionFlags(prev => ({...prev, archiveDoc: e.target.checked}))}
                                            />
                                            **4) Archiviazione Documento Allegato:** <FileText size={18} />
                                        </label>
                                        <p className="ai-suggestion-detail ai-highlight info">
                                            **IMPORTANTE:** Contenuto o allegato da salvare nell'archivio documenti (Modulo 8).
                                        </p>
                                        <hr className="divider" />
                                    </>
                                ) : (
                                    <p className="ai-highlight info">4) Contenuto non classificato come documento rilevante.</p>
                                )}

                                <button 
                                    className="action-button confirm-move-button" 
                                    onClick={confirmMove}
                                    disabled={loading || isAiLoading || !(aiActionFlags.moveImap || aiActionFlags.createEvent || aiActionFlags.createTodo || aiActionFlags.archiveDoc)}
                                >
                                    {isAiLoading ? <Loader size={18} className="spinner" /> : <Zap size={18} />} CONFERMA Azioni Selezionate
                                </button>
                            </div>
                        )}
                        <div className="email-body-content" dangerouslySetInnerHTML={{ __html: selectedEmail.BODY_HTML || `<pre>${selectedEmail.BODY_TEXT}</pre>` }} />
                        
                        <div className="email-actions">
                            <button 
                                className="action-button secondary" 
                                onClick={() => {
                                    setSendData({ 
                                        to: selectedEmail.FROM_EMAIL, 
                                        subject: `Re: ${selectedEmail.SUBJECT}`, 
                                        body: `\n\n---\nIl ${new Date(selectedEmail.DATE).toLocaleDateString()}, ${selectedEmail.FROM} ha scritto:\n> ${selectedEmail.PREVIEW.split('\n').join('\n> ')}` 
                                    });
                                    closeEmailView();
                                    document.getElementById('email-main-menu').scrollIntoView({ behavior: 'smooth' });
                                    setCurrentMode('write'); 
                                }}
                                disabled={loading || isAiLoading}
                            >
                                <MessageCircle size={18} /> Rispondi Manualmente
                            </button>
                            <button 
                                className="action-button primary" 
                                onClick={() => handleAICall('Rispondi', selectedEmail)}
                                disabled={loading || isAiLoading}
                            >
                                <MessageCircle size={18} /> Bozza Risposta (Alfred)
                            </button>
                            <button 
                                className="action-button success" 
                                onClick={() => handleAICall('Archivia', selectedEmail)}
                                disabled={loading || isAiLoading || !!aiClassification}
                            >
                                <Mail size={18} /> Classifica + Estrai Dati (Alfred)
                            </button>
                        </div>
                        
                        {aiDraft && (
                            <div className="ai-draft-notice response-draft">
                                <h4>Bozza di Risposta Generata da Alfred</h4>
                                <textarea 
                                    rows={8} 
                                    value={aiDraft} 
                                    onChange={(e) => setAiDraft(e.target.value)} 
                                />
                                <div className="response-actions">
                                    <button 
                                        className="action-button primary" 
                                        onClick={() => handleSendEmail({ 
                                            to: selectedEmail.FROM_EMAIL, 
                                            subject: `Re: ${selectedEmail.SUBJECT}`, 
                                            body: aiDraft
                                        })}
                                        disabled={loading}
                                    >
                                        <Send size={18} /> Invia Bozza
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

/* ===============================================
 * COMPONENTE PRINCIPALE
 * =============================================== */
const Pagina16_02LeggiScriviArchivia_Mail = () => {
    const [userId, setUserId] = useState(null); 
    const [currentMode, setCurrentMode] = useState('menu'); 
    const [status, setStatus] = useState('Pronto');
    const [loading, setLoading] = useState(false); 
    const [isAiLoading, setIsAiLoading] = useState(false); 
    const [sendData, setSendData] = useState({ to: 'pierluca.patarini@icloud.com', subject: '', body: '' });
    const [unreadEmails, setUnreadEmails] = useState(null); 
    const [timeFilter, setTimeFilter] = useState('day'); 
    const [selectedEmail, setSelectedEmail] = useState(null); 
    const [aiDraft, setAiDraft] = useState(null); 
    const [aiClassification, setAiClassification] = useState(null); 
    const [aiActionFlags, setAiActionFlags] = useState({ 
        moveImap: false, 
        createEvent: false, 
        createTodo: false, 
        archiveDoc: false 
    }); 

    useEffect(() => {
        const fetchUserId = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setUserId(user.id);
                    console.log(`ID Utente Dinamico recuperato: ${user.id}`);
                } else {
                    console.error("Nessun utente loggato trovato.");
                }
            } catch (error) {
                console.error("Errore nel recupero dell'ID utente da Supabase:", error);
            }
        };

        fetchUserId();
    }, []);

    // FUNZIONE INVIO EMAIL
    const handleSendEmail = useCallback(async (overrideData = {}) => {
        setLoading(true);
        setStatus('Invio email in corso...');
        try {
            const toFinal = overrideData.to || sendData.to;
            const subjectFinal = overrideData.subject || sendData.subject;
            const bodyFinal = overrideData.body || sendData.body;

            if (!toFinal || !subjectFinal || !bodyFinal) {
                setStatus("❌ ERRORE: Destinatario, oggetto e corpo sono obbligatori.");
                return;
            }

            const response = await fetch(`${API_URL}/api/email/send`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ to: toFinal, subject: subjectFinal, body: bodyFinal })
            });

            const result = await response.json();

            if (!result.success) {
                setStatus("❌ ERRORE invio email: " + result.error);
            } else {
                setStatus("✅ Email inviata con successo!");
                
                if (Object.keys(overrideData).length > 0) {
                    setSelectedEmail(null);
                    setAiDraft(null);
                    setAiClassification(null);
                    setAiActionFlags({ moveImap: false, createEvent: false, createTodo: false, archiveDoc: false });
                } else {
                    setSendData(prev => ({ ...prev, subject: '', body: '' }));
                    setAiDraft(null);
                }
            }
        } catch (err) {
            console.error("DEBUG Errore handleSendEmail:", err);
            setStatus("❌ ERRORE CRITICO invio email. Controlla console.");
        } finally {
            setLoading(false);
        }
    }, [sendData]);

    const handleReadEmail = useCallback(async () => {
        setLoading(true);
        setStatus('Recupero email Yahoo in corso...');
        setUnreadEmails(null); 
        setSelectedEmail(null); 
        setAiDraft(null);
        setAiClassification(null);
        setAiActionFlags({ moveImap: false, createEvent: false, createTodo: false, archiveDoc: false });
        
        try {
            const response = await fetch(`${API_URL}/api/email?timeFilter=${timeFilter}`, { method: 'GET' });
            const data = await response.json();
            
            if (response.ok && data.success) {
                const sortedEmails = data.emails.sort((a, b) => new Date(b.DATE) - new Date(a.DATE));
                setUnreadEmails(sortedEmails);
                setStatus(`✅ Recupero Successo: Trovate ${data.emails.length} email non lette.`);
            } else {
                setStatus(`❌ Recupero Fallito: ${data.error || 'Errore sconosciuto.'}`);
                setUnreadEmails([]);
            }
        } catch (error) {
            setStatus('❌ Errore di connessione al server backend (Lettura).');
            setUnreadEmails([]);
        } finally {
            setLoading(false);
        }
    }, [timeFilter]);

    const handleAICall = useCallback(async (action, email) => {
        setIsAiLoading(true);
        setAiDraft(null);
        setAiClassification(null);
        setAiActionFlags({ moveImap: false, createEvent: false, createTodo: false, archiveDoc: false });
        setStatus(`Richiesta ${action} AI in corso...`);
        
        try {
            const response = await fetch(`${API_URL}/api/email/ai-response`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emailContent: email, userAction: action })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                if (action === 'Archivia' && data.classification) {
                    setAiClassification(data.classification);
                    const classification = data.classification;
                    
                    setAiActionFlags({
                        moveImap: true,
                        createEvent: classification.scadenza_calendario_data !== "NULL" && !!classification.scadenza_calendario_data,
                        createTodo: classification.azione_todo !== "NULL" && !!classification.azione_todo,
                        archiveDoc: !!classification.documento_rilevante
                    });

                    setStatus(`✅ Classificazione AI potenziata completata. Controlla e conferma le proposte di Alfred.`);
                } else if (action === 'Rispondi' && data.draft) {
                    setAiDraft(data.draft);
                    setStatus(`✅ Bozza AI generata con successo. Pronta per l'invio manuale.`);
                }
            } else {
                setStatus(`❌ ERRORE AI: ${data.error}`);
            }
        } catch (error) {
            setStatus('❌ ERRORE: Fallimento API AI. Controlla il server.');
        } finally {
            setIsAiLoading(false);
        }
    }, []);

    // FUNZIONE CONFIRM MOVE
    const confirmMove = async () => {
        if (!selectedEmail || !aiClassification || !userId) { 
            setStatus("❌ Errore: Dati di archiviazione o ID utente mancanti.");
            return;
        }

        const uid = selectedEmail.UID;
        setLoading(true);
        setStatus(`📦 Esecuzione azioni Alfred Butler in corso...`);

        const alfredActions = [];
        let success = true;

        // 1. ARCHIVIAZIONE IMAP
        if (aiActionFlags.moveImap && aiClassification.categoria_archiviazione) {
            const folderName = aiClassification.categoria_archiviazione; 
            setStatus(`📦 1. Spostamento IMAP in "${folderName}" in corso...`);
            try {
                const response = await fetch(`${API_URL}/api/email/move`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ uid: Number(uid), folderName: folderName.trim() }),
                });

                const data = await response.json();

                if (data.success) {
                    alfredActions.push(`1. Email spostata in "${folderName}" (IMAP)`);
                    setUnreadEmails(prev => prev.filter(email => email.UID !== selectedEmail.UID));
                } else {
                    success = false;
                    setStatus(`❌ IMAP FALLITO: ${data.error}. Le altre azioni non saranno eseguite.`);
                    setLoading(false);
                    return;
                }
            } catch (error) {
                success = false;
                setStatus('❌ Errore di connessione al server backend (Spostamento IMAP).');
                setLoading(false);
                return;
            }
        } else {
            alfredActions.push(`1. Archiviazione IMAP in "${aiClassification.categoria_archiviazione || 'N/D'}" saltata.`);
        }

        // 2. CREAZIONE EVENTO CALENDARIO
        if (aiActionFlags.createEvent && aiClassification.scadenza_calendario_data !== "NULL" && aiClassification.scadenza_calendario_data) {
            const eventData = {
                scadenza_calendario_data: aiClassification.scadenza_calendario_data,
                scadenza_calendario_descrizione: aiClassification.scadenza_calendario_descrizione,
            };

            const requestBody = {
                emailUID: selectedEmail.UID,
                emailSubject: selectedEmail.SUBJECT, 
                emailContent: selectedEmail.BODY_TEXT || selectedEmail.BODY_HTML || selectedEmail.PREVIEW, 
                userId: userId, 
                calendarData: eventData
            };

            setStatus(`📅 2. Creazione Evento Calendario per "${aiClassification.scadenza_calendario_descrizione}" in corso...`);

            try {
                const response = await fetch(`${API_URL}/api/email/create-calendar-event`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                });

                const data = await response.json();

                if (data.success) {
                    const finalTitle = data.eventTitle || aiClassification.scadenza_calendario_descrizione; 
                    alfredActions.push(`2. Evento Calendario creato: ${finalTitle}`);
                } else {
                    alfredActions.push(`❌ Calendario FALLITO: ${data.error}`);
                }
            } catch (error) {
                alfredActions.push('❌ Errore di connessione al server backend (Calendario).');
            }
        } else {
            alfredActions.push(`2. Creazione Evento in Calendario saltata.`);
        }

        // 3. INSERIMENTO IN TODO-LIST
        if (aiActionFlags.createTodo && aiClassification.azione_todo !== "NULL" && aiClassification.azione_todo) {
            const todoTask = aiClassification.azione_todo;

            setStatus(`📝 3. Inserimento Compito ToDo: "${todoTask}" in corso...`);
            
            try {
                const response = await fetch(`${API_URL}/api/email/create-todo`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: userId, 
                        task: todoTask, 
                        emailReference: selectedEmail.SUBJECT,
                    }),
                });

                const data = await response.json();

                if (data.success) {
                    alfredActions.push(`3. ✅ Compito ToDo creato: "${todoTask}"`);
                } else {
                    alfredActions.push(`❌ ToDo FALLITO: ${data.error || 'Errore sconosciuto.'}`);
                }
            } catch (error) {
                alfredActions.push('❌ Errore di connessione al server backend (ToDo List).');
            }
        } else {
            alfredActions.push(`3. Inserimento in ToDo List saltato.`);
        }

        // 4. ARCHIVIAZIONE DOCUMENTO ALLEGATO
        if (aiActionFlags.archiveDoc && aiClassification.documento_rilevante) {
            alfredActions.push(`4. [TO DO] Archiviazione Documento/Allegato Rilevante (Modulo 8).`);
        } else {
            alfredActions.push(`4. Archiviazione Documento/Allegato saltata.`);
        }

        // Finalizzazione
        if (success) {
            setStatus(`✅ SUCCESSO: Azioni Alfred completate. Riepilogo: ${alfredActions.join(' | ')}`);
        } else {
            setStatus(`❌ FALLIMENTO: L'archiviazione IMAP non è riuscita. Riepilogo: ${alfredActions.join(' | ')}`);
        }

        setSelectedEmail(null);
        setAiClassification(null);
        setAiActionFlags({ moveImap: false, createEvent: false, createTodo: false, archiveDoc: false });
        setLoading(false);
    };

    const renderContent = useMemo(() => {
        switch(currentMode) {
            case 'write':
                return <WriteMailComponent sendData={sendData} setSendData={setSendData} handleSendEmail={handleSendEmail} loading={loading} />;
            case 'ai-write':
                return <AIWriteMailComponent sendData={sendData} setSendData={setSendData} handleSendEmail={handleSendEmail} loading={loading} aiDraft={aiDraft} setAiDraft={setAiDraft} setStatus={setStatus} isAiLoading={isAiLoading} setIsAiLoading={setIsAiLoading} />;
            case 'read':
                return <ReadMailComponent 
                    unreadEmails={unreadEmails} 
                    handleReadEmail={handleReadEmail} 
                    timeFilter={timeFilter} 
                    setTimeFilter={setTimeFilter} 
                    loading={loading} 
                    isAiLoading={isAiLoading} 
                    selectedEmail={selectedEmail} 
                    setSelectedEmail={setSelectedEmail} 
                    aiDraft={aiDraft} 
                    setAiDraft={setAiDraft} 
                    aiClassification={aiClassification} 
                    setAiClassification={setAiClassification} 
                    handleAICall={handleAICall} 
                    confirmMove={confirmMove} 
                    setStatus={setStatus} 
                    setSendData={setSendData} 
                    handleSendEmail={handleSendEmail} 
                    setCurrentMode={setCurrentMode} 
                    aiActionFlags={aiActionFlags}
                    setAiActionFlags={setAiActionFlags}
                />;
            case 'menu':
            default:
                return (
                    <div className="email-main-menu" id="email-main-menu">
                        <h3 className="section-title">Menu Principale Gestione Mail (Alfred Butler)</h3>
                        <p>Seleziona l'azione desiderata.</p>
                        <div className="action-buttons-group">
                            <button onClick={() => setCurrentMode('read')}><Mail size={24} /> Leggi / Archivia Mail</button>
                            <button onClick={() => setCurrentMode('write')}><Send size={24} /> Scrivi Email Manuale</button>
                            <button onClick={() => setCurrentMode('ai-write')}><Zap size={24} /> Scrivi Email con Alfred (AI)</button>
                        </div>
                    </div>
                );
        }
    }, [currentMode, sendData, loading, isAiLoading, unreadEmails, timeFilter, selectedEmail, aiDraft, aiClassification, aiActionFlags, handleSendEmail, handleReadEmail, handleAICall, confirmMove]);

    return (
        <div className="module-container email-module">
            <h2>Modulo 16.02: Leggi, Scrivi e Archivia Mail (Alfred Butler)</h2>
            
            {currentMode !== 'menu' && (
                <button className="back-to-menu-button" onClick={() => {
                    setCurrentMode('menu'); 
                    setSelectedEmail(null); 
                    setAiClassification(null);
                    setAiDraft(null);
                    setAiActionFlags({ moveImap: false, createEvent: false, createTodo: false, archiveDoc: false });
                    setLoading(false);
                    setIsAiLoading(false);
                    setStatus('Pronto');
                }}>
                    <ChevronLeft size={16} /> Torna al Menu Iniziale
                </button>
            )}
            
            <div className={`status-bar ${loading || isAiLoading ? 'loading' : ''}`}>
                Stato: {status} 
                {(loading || isAiLoading) && <Loader size={16} className="spinner" />}
            </div>
            
            {renderContent}
            
            <p className="note">Backend URL: {API_URL}</p>
        </div>
    );
};

export default Pagina16_02LeggiScriviArchivia_Mail;
export { Pagina16_02LeggiScriviArchivia_Mail as ExportPagina16_02 };