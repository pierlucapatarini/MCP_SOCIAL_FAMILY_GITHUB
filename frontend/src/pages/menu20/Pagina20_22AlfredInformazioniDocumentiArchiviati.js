// ==================================================================================
// FILE: src/components/Pagina20_22AlfredInformazioniDocumentiArchiviati.js
// VERSIONE OTTIMIZZATA
// ==================================================================================

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../styles/StylesPagina20_22.css';

function ExportPagina20_22() {
    const [question, setQuestion] = useState("");
    const [summaryText, setSummaryText] = useState("");
    const [sources, setSources] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [metrics, setMetrics] = useState(null);

    const alfredDetails = {
        id: 'alfred-doc-ai-id',
        username: 'Alfred',
        familyId: 'PATARINI'
    };

    const handleAskAlfred = async () => {
        if (!question.trim()) {
            setError("Per favore, inserisci una domanda.");
            return;
        }

        setLoading(true);
        setSummaryText("");
        setSources([]);
        setMetrics(null);
        setError(null);

        try {
            const response = await axios.post('api/alfred/query', {
                question: question,
                alfredId: alfredDetails.id,
                familyId: alfredDetails.familyId
            }, {
                timeout: 45000 // Timeout aumentato per elaborazioni complesse
            });

            if (response.data.text) {
                setSummaryText(response.data.text);
                setSources(response.data.sources || []);
                setMetrics(response.data.metrics || null);
            } else {
                setSummaryText("Mi dispiace, non è stato possibile ricevere una risposta.");
            }

        } catch (err) {
            console.error("Errore:", err);
            const errorMessage = err.response?.data?.error || err.message || "Errore di connessione";
            setError(`Errore: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    // Supporto per Invio con Enter
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAskAlfred();
        }
    };

    return (
        <div className="pagina20-container">
            <h1 className="text-3xl font-bold mb-4">Chiedi ad Alfred dei tuoi documenti</h1>
            <p className="pagina20-description-text">
                Alfred analizza intelligentemente i documenti archiviati. Le risposte sono ora più veloci e precise!
            </p>

            {/* SEZIONE INPUT */}
            <div className="pagina20-filters-section">
                <textarea
                    className="pagina20-text-input mb-4"
                    rows="4"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Esempio: 'Quali sono le scadenze importanti di questo mese?'"
                    disabled={loading}
                ></textarea>
                
                <button
                    className="pagina20-button"
                    onClick={handleAskAlfred}
                    disabled={loading || !question.trim()}
                >
                    {loading ? '🔄 Alfred sta pensando...' : '🤔 Chiedi ad Alfred'}
                </button>
            </div>

            {/* METRICHE PERFORMANCE */}
            {metrics && (
                <div className="pagina20-metrics-box">
                    <p className="text-xs text-gray-500">
        📊 Performance: {metrics.documentsUsed} doc, {metrics.structuredItemsUsed} dati, {metrics.totalChars} chars
                    </p>
                </div>
            )}

            {/* SEZIONE RISPOSTA */}
            <div className="pagina20-output-section mt-8">
                {error && (
                    <div className="pagina20-error-message">
                        ⚠️ {error}
                    </div>
                )}
                
                {loading && (
                    <div className="pagina20-loading-state">
                        <div className="pagina20-loading-spinner">🔍</div>
                        <p>Alfred sta cercando nelle tue informazioni...</p>
                    </div>
                )}

                {!loading && summaryText && (
                    <div className="pagina20-summary-box">
                        <div className="pagina20-text-output">
                            {summaryText}
                        </div>
                        
                        {sources.length > 0 && (
                            <div className="pagina20-sources-box mt-4">
                                <p className="font-semibold text-sm mb-2">📚 Fonti utilizzate:</p>
                                <ul className="list-disc list-inside text-sm text-gray-600">
                                    {sources.map((source, index) => (
                                        <li key={index} className="truncate">{source}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ExportPagina20_22;