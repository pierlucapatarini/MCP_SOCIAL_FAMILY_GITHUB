import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import moment from 'moment';
import '../../styles/StilePagina3.css';

const API_URL = process.env.REACT_APP_API_URL; 

function FunContacalorie() {
    const navigate = useNavigate();
    const [inputText, setInputText] = useState('');
    const [analysisResult, setAnalysisResult] = useState(null);
    const [user, setUser] = useState(null);
    const [showMacros, setShowMacros] = useState(false);
    const [uiState, setUiState] = useState({ loading: false, error: null, saveSuccess: false });

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) navigate('/');
            setUser(user);
        };
        fetchUser();
    }, [navigate]);

    const getNumericValue = (value, fallback = 0) => {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? fallback : parsed;
    };

    const recalculateValues = (elements) => {
        const totals = {
            calorie_cibo: 0, calorie_bevande: 0, calorie_condimenti: 0,
            peso_cibo: 0, peso_bevande: 0, peso_condimenti: 0,
            grassi: 0, proteine: 0, carboidrati: 0,
            acqua: 0, alcool: 0, zuccheri: 0,
        };

        const updatedElements = elements.map(el => {
            const nr_dosi = getNumericValue(el.nr_dosi, 1);
            const peso_dose = getNumericValue(el.peso_dose, 0);
            const peso_totale = nr_dosi * peso_dose;
            const calorie = Math.round((peso_totale * getNumericValue(el.calorie_per_unita)) / 100);
            const updatedEl = { ...el, nr_dosi, peso_dose, peso_totale: Math.round(peso_totale), calorie };

            const calculateMacro = (macro_per_unita) => Math.round((peso_totale * getNumericValue(macro_per_unita)) / 100);

            if (el.tipo === 'Cibo') {
                updatedEl.grassi_totali_elemento = calculateMacro(el.grassi_per_unita);
                updatedEl.proteine_totali_elemento = calculateMacro(el.proteine_per_unita);
                updatedEl.carboidrati_totali_elemento = calculateMacro(el.carboidrati_per_unita);
                totals.grassi += updatedEl.grassi_totali_elemento;
                totals.proteine += updatedEl.proteine_totali_elemento;
                totals.carboidrati += updatedEl.carboidrati_totali_elemento;
                totals.calorie_cibo += calorie;
                totals.peso_cibo += peso_totale;
            } else if (el.tipo === 'Bevanda') {
                updatedEl.acqua_totali_elemento = calculateMacro(el.acqua_per_unita);
                updatedEl.alcool_totali_elemento = calculateMacro(el.alcool_per_unita);
                updatedEl.zuccheri_totali_elemento = calculateMacro(el.zuccheri_per_unita);
                totals.acqua += updatedEl.acqua_totali_elemento;
                totals.alcool += updatedEl.alcool_totali_elemento;
                totals.zuccheri += updatedEl.zuccheri_totali_elemento;
                totals.calorie_bevande += calorie;
                totals.peso_bevande += peso_totale;
            } else if (el.tipo === 'Condimento') {
                totals.calorie_condimenti += calorie;
                totals.peso_condimenti += peso_totale;
            }
            return updatedEl;
        });

        return {
            elementi: updatedElements,
            calorie_solo_cibo: totals.calorie_cibo,
            calorie_solo_bevande: totals.calorie_bevande,
            calorie_solo_condimenti: totals.calorie_condimenti,
            totale_calorie_pasto: totals.calorie_cibo + totals.calorie_bevande + totals.calorie_condimenti,
            total_peso_cibo: Math.round(totals.peso_cibo),
            total_peso_bevande: Math.round(totals.peso_bevande),
            total_peso_condimenti: Math.round(totals.peso_condimenti),
            totale_peso_pasto: Math.round(totals.peso_cibo + totals.peso_bevande + totals.peso_condimenti),
            total_grassi: totals.grassi,
            total_proteine: totals.proteine,
            total_carboidrati: totals.carboidrati,
            total_acqua: totals.acqua,
            total_alcool: totals.alcool,
            total_zuccheri: totals.zuccheri,
        };
    };

    const handleFieldChange = (id, field, value) => {
        setAnalysisResult(prev => {
            if (!prev) return prev;
            const updatedElements = prev.elementi.map(el =>
                el.id === id ? { ...el, [field]: getNumericValue(value) } : el
            );
            return { ...prev, ...recalculateValues(updatedElements) };
        });
    };
    
    const handleTotalWeightChange = (e, item) => {
        setAnalysisResult(prev => {
            if (!prev) return prev;
            const updatedElements = prev.elementi.map(el => {
                if (el.id === item.id) {
                    const nuovoPesoTotale = getNumericValue(e.target.value);
                    const nrDosi = getNumericValue(el.nr_dosi, 1);
                    return {
                        ...el,
                        peso_totale: nuovoPesoTotale,
                        peso_dose: Math.round((nuovoPesoTotale / nrDosi) * 10) / 10
                    };
                }
                return el;
            });
            return { ...prev, ...recalculateValues(updatedElements) };
        });
    };

    const analyzeText = async () => {
        if (!inputText.trim()) {
            setUiState({ ...uiState, error: "Inserisci la descrizione del tuo pasto" });
            return;
        }
        setUiState({ loading: true, error: null, saveSuccess: false });
        setAnalysisResult(null);
        setShowMacros(false);

        try {
            const response = await fetch('${API_URL}/api/contacalorie', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mealText: inputText } )
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: "Errore sconosciuto" }));
                throw new Error(`Errore del server: ${response.status}. ${errorData.message}`);
            }
            const data = await response.json();
            const elementsWithIds = data.elementi.map((el, index) => ({ ...el, id: el.id || `${el.nome}-${index}` }));
            setAnalysisResult({ ...data, ...recalculateValues(elementsWithIds) });
        } catch (error) {
            console.error("Errore nell'analisi:", error);
            setUiState(prev => ({ ...prev, error: "Errore durante l'analisi. Riprova." }));
        } finally {
            setUiState(prev => ({ ...prev, loading: false }));
        }
    };

    const saveAnalysis = async () => {
        if (!analysisResult || !user) return;
        try {
            const { id, ...rest } = analysisResult.elementi;
            const dataToSave = {
                user_id: user.id,
                data_pasto: analysisResult.data_pasto || moment().format('YYYY-MM-DD'),
                tipo_pasto: analysisResult.tipo_pasto,
                totale_calorie: analysisResult.totale_calorie_pasto,
                elementi: analysisResult.elementi.map(({ id, ...rest }) => rest),
                giudizio_critico: analysisResult.giudizio_critico,
                macro_totali: {
                    grassi: analysisResult.total_grassi || 0,
                    proteine: analysisResult.total_proteine || 0,
                    carboidrati: analysisResult.total_carboidrati || 0,
                    acqua: analysisResult.total_acqua || 0,
                    alcool: analysisResult.total_alcool || 0,
                    zuccheri: analysisResult.total_zuccheri || 0
                }
            };
            const { error } = await supabase.from('analisi_pasti').insert([dataToSave]);
            if (error) throw error;
            setUiState(prev => ({ ...prev, saveSuccess: true }));
            setTimeout(() => setUiState(prev => ({ ...prev, saveSuccess: false })), 3000);
        } catch (error) {
            console.error('Errore nel salvataggio:', error);
            setUiState(prev => ({ ...prev, error: "Errore nel salvataggio dei dati." }));
        }
    };

    const getTableHeaders = (tipo) => {
        const base = ["Tipo", "Nome", "Nr. Dosi", "Peso/Dose", "Peso Totale"];
        if (tipo === 'Cibo') return [...base, "Grassi/100u", "Proteine/100u", "Carboidrati/100u", "Altro/100u"];
        if (tipo === 'Bevanda') return [...base, "Acqua/100u", "Alcool/100u", "Zuccheri/100u", "Altro/100u"];
        return [...base, "Kcal/100u", "Calorie Totali"];
    };

    const renderMacroInputs = (fields, item) => (
        <>
            {fields.map(field => (
                <td key={field.key}>
                    <input type="number" value={item[field.key] || 0} onChange={(e) => handleFieldChange(item.id, field.key, e.target.value)} className="table-input" min="0" step="1" />
                </td>
            ))}
            <td>
                <input type="number" value={100 - (getNumericValue(item.grassi_per_unita) + getNumericValue(item.proteine_per_unita) + getNumericValue(item.carboidrati_per_unita) + getNumericValue(item.acqua_per_unita) + getNumericValue(item.alcool_per_unita) + getNumericValue(item.zuccheri_per_unita)).toFixed(1)} readOnly className="table-input" style={{ backgroundColor: '#e8f5e9', fontWeight: 'bold' }} />
            </td>
        </>
    );

    const renderTableBody = (elements, isMacroView) => (
        <tbody>
            {elements?.map(item => {
                let dynamicFields = [];
                if (isMacroView) {
                    if (item.tipo === 'Cibo') dynamicFields = [{ key: 'grassi_per_unita' }, { key: 'proteine_per_unita' }, { key: 'carboidrati_per_unita' }];
                    else if (item.tipo === 'Bevanda') dynamicFields = [{ key: 'acqua_per_unita' }, { key: 'alcool_per_unita' }, { key: 'zuccheri_per_unita' }];
                }

                return (
                    <tr key={item.id}>
                        <td><span className={`type-badge type-${item.tipo.toLowerCase()}`}>{item.tipo}</span></td>
                        <td className="food-name">{item.nome}</td>
                        <td><input type="number" value={item.nr_dosi} onChange={(e) => handleFieldChange(item.id, 'nr_dosi', e.target.value)} className="table-input" min="0" step="0.1" /></td>
                        <td><div className="input-with-unit"><input type="number" value={item.peso_dose} onChange={(e) => handleFieldChange(item.id, 'peso_dose', e.target.value)} className="table-input" min="0" step="1" /><span className="unit">{item.unita}</span></div></td>
                        <td><div className="input-with-unit"><input type="number" value={item.peso_totale} onChange={(e) => handleTotalWeightChange(e, item)} className="table-input" min="0" step="1" /><span className="unit">{item.unita}</span></div></td>
                        {isMacroView && (item.tipo === 'Cibo' || item.tipo === 'Bevanda') ? renderMacroInputs(dynamicFields, item) : (
                            <>
                                <td><input type="number" value={item.calorie_per_unita} onChange={(e) => handleFieldChange(item.id, 'calorie_per_unita', e.target.value)} className="table-input" min="0" step="1" /></td>
                                <td className="calories-cell"><span className="calories-value">{item.calorie}</span></td>
                            </>
                        )}
                    </tr>
                );
            })}
        </tbody>
    );

    const renderMacroTotalsFooter = (elements, tipo) => {
        if (!elements || elements.length === 0 || (tipo !== 'Cibo' && tipo !== 'Bevanda')) return null;

        const totals = elements.reduce((acc, el) => {
            acc.peso += el.peso_totale || 0;
            if (tipo === 'Cibo') {
                acc.macro1 += el.grassi_totali_elemento || 0;
                acc.macro2 += el.proteine_totali_elemento || 0;
                acc.macro3 += el.carboidrati_totali_elemento || 0;
            } else {
                acc.macro1 += el.acqua_totali_elemento || 0;
                acc.macro2 += el.alcool_totali_elemento || 0;
                acc.macro3 += el.zuccheri_totali_elemento || 0;
            }
            return acc;
        }, { peso: 0, macro1: 0, macro2: 0, macro3: 0 });

        const total_other_grams = Math.max(0, totals.peso - (totals.macro1 + totals.macro2 + totals.macro3));
        const calcPercent = (macro, weight) => (weight > 0 ? ((macro / weight) * 100).toFixed(1) : 0);

        return (
            <tfoot>
                <tr className="macro-totals-row">
                    <td colSpan={4} style={{ textAlign: 'right', fontWeight: 'bold', borderRight: '1px solid #ccc' }}>Totale {tipo}:</td>
                    <td style={{ fontWeight: 'bold', backgroundColor: '#fffbe5' }}>{Math.round(totals.peso)} g</td>
                    <td style={{ fontWeight: 'bold', backgroundColor: '#e8f5e9' }}>{Math.round(totals.macro1)} g ({calcPercent(totals.macro1, totals.peso)}%)</td>
                    <td style={{ fontWeight: 'bold', backgroundColor: '#e8f5e9' }}>{Math.round(totals.macro2)} g ({calcPercent(totals.macro2, totals.peso)}%)</td>
                    <td style={{ fontWeight: 'bold', backgroundColor: '#e8f5e9' }}>{Math.round(totals.macro3)} g ({calcPercent(totals.macro3, totals.peso)}%)</td>
                    <td style={{ fontWeight: 'bold', backgroundColor: '#e8f5e9' }}>{Math.round(total_other_grams)} g ({calcPercent(total_other_grams, totals.peso)}%)</td>
                </tr>
            </tfoot>
        );
    };

    const renderMacroTables = () => {
        if (!analysisResult || !showMacros) return null;
        const ciboElements = analysisResult.elementi.filter(el => el.tipo === 'Cibo' || el.tipo === 'Condimento');
        const bevandaElements = analysisResult.elementi.filter(el => el.tipo === 'Bevanda');

        const renderTable = (title, elements, tipo) => (
            elements.length > 0 && (
                <div className="macro-table-section">
                    <h3 className="section-title"><span>{tipo === 'Cibo' ? '🍽️' : '🥤'}</span> {title}</h3>
                    <div className="table-container">
                        <table className="modern-table">
                            <thead><tr>{getTableHeaders(tipo).map(h => <th key={h}>{h}</th>)}</tr></thead>
                            {renderTableBody(elements, true)}
                            {renderMacroTotalsFooter(elements, tipo)}
                        </table>
                    </div>
                </div>
            )
        );

        return (
            <>
                {renderTable("Dettaglio Cibi e Condimenti", ciboElements, 'Cibo')}
                {renderTable("Dettaglio Bevande", bevandaElements, 'Bevanda')}
            </>
        );
    };

    return (
        <div className="modern-calorie-app">
            <div className="modern-header">
                <div className="header-content">
                    <div className="logo-section">
                        <div className="logo-icon">🍎</div>
                        <h1>NutriAI</h1>
                        <span className="tagline">Analizza la tua Nutrizione</span>
                    </div>
                    <button onClick={() => navigate('/main-menu')} className="menu-button"><span>←</span> Torna al Menu</button>
                </div>
            </div>

            <div className="app-container">
                <div className="input-section">
                    <div className="input-card">
                        <h2 className="section-title"><span className="title-icon">🔍</span> Analizza il tuo Pasto</h2>
                        <div className="input-area">
                            <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Descrivi il tuo pasto..." className="modern-textarea" rows="4" />
                            <div className="suggestions">
                                <h4>💡 Suggerimenti per l'AI:</h4>
                                <ul>
                                    <li>Sii specifico con quantità e unità (es. "1 piatto")</li>
                                    <li>L'AI stimerà il peso e calcolerà il totale</li>
                                    <li>I campi sono modificabili per correzioni manuali</li>
                                </ul>
                            </div>
                            <button onClick={analyzeText} disabled={uiState.loading || !inputText.trim()} className="analyze-button">
                                {uiState.loading ? <><div className="spinner"></div>Analizzando...</> : <><span>🚀</span> Analizza</>}
                            </button>
                        </div>
                        {uiState.error && <div className="error-alert"><span>⚠️</span> {uiState.error}</div>}
                        {uiState.saveSuccess && <div className="success-alert"><span>✅</span> Analisi salvata con successo!</div>}
                    </div>
                </div>
                {analysisResult && (
                    <div className="results-section">
                        <h2 className="section-title"><span className="title-icon">📊</span> Risultati dell'Analisi</h2>
                        <div className="summary-grid">
                            <div className="summary-card"><div className="card-icon">📅</div><div className="card-content"><span className="card-label">Data</span><span className="card-value">{moment(analysisResult.data_pasto || moment().format('YYYY-MM-DD')).format('DD/MM/YYYY')}</span></div></div>
                            <div className="summary-card"><div className="card-icon">🍽️</div><div className="card-content"><span className="card-label">Tipo Pasto</span><span className="card-value">{analysisResult.tipo_pasto || 'N/A'}</span></div></div>
                            <div className="summary-card calories-card"><div className="card-icon">🔥</div><div className="card-content"><span className="card-label">Calorie Totali</span><span className="card-value">{analysisResult.totale_calorie_pasto} kcal</span></div></div>
                        </div>
                        <div className="judgment-card"><div className="judgment-icon">🎯</div><div className="judgment-content"><h4>Giudizio Nutrizionale</h4><p>{analysisResult.giudizio_critico}</p></div></div>
                        <div className="details-section">
                            <h3 className="details-title"><span>⚙️</span> Dettaglio Elementi (Campi editabili)</h3>
                            <button onClick={() => setShowMacros(prev => !prev)} className="analyze-macros-button" style={{ marginBottom: '15px', padding: '10px 15px', backgroundColor: showMacros ? '#ff5252' : '#2196f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '14px', transition: 'background-color 0.3s' }}>
                                <span>{showMacros ? '❌ Visualizza Calorie' : '📊 Visualizza macroingredienti'}</span>
                            </button>
                            {!showMacros && (
                                <div className="table-container">
                                    <table className="modern-table">
                                        <thead><tr>{getTableHeaders().map(h => <th key={h}>{h}</th>)}</tr></thead>
                                        {renderTableBody(analysisResult.elementi, false)}
                                        <tfoot>
                                            <tr className="macro-totals-row">
                                                <td colSpan={4} style={{ textAlign: 'right', fontWeight: 'bold', borderRight: '1px solid #ccc' }}>Totale Pasto:</td>
                                                <td style={{ fontWeight: 'bold', backgroundColor: '#fffbe5' }}>{analysisResult.totale_peso_pasto} g</td>
                                                <td colSpan={2} style={{ fontWeight: 'bold', backgroundColor: '#e8f5e9' }}>{analysisResult.totale_calorie_pasto} kcal</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                            {renderMacroTables()}
                            <div className="button-group">
                                <button onClick={saveAnalysis} className="save-button"><span>💾</span> Salva Analisi</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default FunContacalorie;
