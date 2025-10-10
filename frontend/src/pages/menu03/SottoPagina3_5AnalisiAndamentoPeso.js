import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import moment from 'moment';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import '../../styles/StileSottoPagina3_4.css';

const API_URL = process.env.REACT_APP_API_URL; 

function FunAnalisiAndamentoPeso() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [selectedPeriod, setSelectedPeriod] = useState('week');
    const [analysisData, setAnalysisData] = useState(null);
    const [weightData, setWeightData] = useState([]);
    const [calorieData, setCalorieData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [audioPlaying, setAudioPlaying] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newWeight, setNewWeight] = useState('');
    const [newDate, setNewDate] = useState(moment().format('YYYY-MM-DD'));

    // Caricamento utente, profilo e reindirizzamento
    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/');
                return;
            }
            setUser(user);
        };
        fetchUser();
    }, [navigate]);

    const fetchUserProfile = useCallback(async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('gender, age, height, activity_level, target_weight, family_group')
                .eq('id', userId)
                .single();

            if (error) throw error;
            
            const profileData = {
                gender: data.gender || 'maschio',
                age: data.age || 35,
                height: data.height || 175,
                activity_level: data.activity_level || 'moderato',
                target_weight: data.target_weight || 75,
                family_group: data.family_group || 'default'
            };
            setUserProfile(profileData);
        } catch (error) {
            console.error('Errore nel caricamento del profilo:', error);
            setUserProfile({
                gender: 'maschio', age: 35, height: 175, activity_level: 'moderato', target_weight: 75, family_group: 'default'
            });
        }
    }, []);
    
    useEffect(() => {
        if (user) {
            fetchUserProfile(user.id);
        }
    }, [user, fetchUserProfile]);


    // Funzioni di fetch dati
    const fetchCalorieData = useCallback(async (days) => {
        try {
            const startDate = moment().subtract(days, 'days').format('YYYY-MM-DD');
            
            const { data, error } = await supabase
                .from('analisi_pasti')
                .select('data_pasto, tipo_pasto, totale_calorie, macro_totali')
                .eq('user_id', user.id)
                .gte('data_pasto', startDate)
                .order('data_pasto', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Errore nel caricamento dati calorici:', error);
            return [];
        }
    }, [user]);

    // Genera dati di esempio se non ci sono dati reali
    const generateSampleWeightData = (days) => {
        const sampleData = [];
        const baseWeight = 78;
        for (let i = days; i >= 0; i--) {
            const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
            const variation = (Math.random() - 0.5) * 2;
            const weight = baseWeight + variation + (i * 0.01);
            sampleData.push({ date: date, weight: Math.round(weight * 10) / 10 });
        }
        return sampleData;
    };

    const fetchWeightData = useCallback(async (days) => {
        try {
            const startDateHistory = moment().subtract(365, 'days').format('YYYY-MM-DD');
            
            const { data, error } = await supabase
                .from('user_weights')
                .select('date, weight')
                .eq('user_id', user.id)
                .gte('date', startDateHistory) 
                .order('date', { ascending: false });

            if (error) throw error;
            
            if (!data || data.length === 0) {
                return generateSampleWeightData(days);
            }
            return data;
        } catch (error) {
            console.error('Errore nel caricamento dati peso:', error);
            return generateSampleWeightData(days);
        }
    }, [user]);


    // Gestione salvataggio peso
    const handleSaveWeight = async () => {
        if (!user || !userProfile || !newWeight || !newDate) {
            setError('Devi inserire peso e data.');
            return;
        }

        const weightValue = parseFloat(newWeight);
        if (isNaN(weightValue) || weightValue <= 0) {
            setError('Peso non valido.');
            return;
        }

        setError(null);
        setLoading(true);

        try {
            const { error: insertError } = await supabase
                .from('user_weights')
                .insert({
                    user_id: user.id,
                    weight: weightValue,
                    date: newDate,
                    family_group: userProfile.family_group 
                });

            if (insertError) throw insertError;

            setIsModalOpen(false);
            setNewWeight('');
            setNewDate(moment().format('YYYY-MM-DD'));
            
            const days = selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 180;
            const updatedWeightData = await fetchWeightData(days);
            setWeightData(updatedWeightData);

        } catch (err) {
            console.error('Errore nel salvataggio del peso:', err);
            setError(`Errore nel salvataggio del peso: ${err.message}`); 
        } finally {
            setLoading(false);
        }
    };


    // Generazione analisi AI
    const generateAnalysis = async () => {
        if (!user || !userProfile) return;
        
        setLoading(true);
        setError(null);

        try {
            const days = selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 180;
            
            const [calorieResults, allWeightResults] = await Promise.all([
                fetchCalorieData(days),
                fetchWeightData(days)
            ]);

            const startDateAnalysis = moment().subtract(days, 'days').format('YYYY-MM-DD');
            const weightResults = allWeightResults.filter(item => moment(item.date).isSameOrAfter(startDateAnalysis))
                                                 .sort((a, b) => new Date(a.date) - new Date(b.date));
                                                 
            setCalorieData(calorieResults);
            setWeightData(allWeightResults);

            const userGender = userProfile.gender.toLowerCase() === 'uomo' ? 'maschio' : 
                               userProfile.gender.toLowerCase() === 'donna' ? 'femmina' : 
                               userProfile.gender.toLowerCase();

            const response = await fetch('api/nutrition/summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    period: selectedPeriod,
                    userContext: {
                        gender: userGender,
                        age: userProfile.age,
                        height: userProfile.height
                    },
                    calorieData: calorieResults.map(d => ({
                        data_pasto: d.data_pasto,
                        tipo_pasto: d.tipo_pasto,
                        totale_calorie_pasto: d.totale_calorie
                    })),
                    weightData: weightResults
                })
            });

            if (!response.ok) {
                throw new Error(`Errore del server: ${response.status}`);
            }

            const result = await response.json();
            setAnalysisData(result);

        } catch (error) {
            console.error('Errore nell\'analisi:', error);
            setError('Errore durante l\'analisi. Riprova più tardi.');
        } finally {
            setLoading(false);
        }
    };

    // Calcolo statistiche
    const calculateStats = () => {
        if (!userProfile) return null;

        const days = selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 180;
        const startDateStats = moment().subtract(days, 'days').format('YYYY-MM-DD');
        const statsWeightData = weightData.filter(item => moment(item.date).isSameOrAfter(startDateStats))
                                         .sort((a, b) => new Date(a.date) - new Date(b.date));

        if (!calorieData.length || !statsWeightData.length) return null;

        const totalCalories = calorieData.reduce((sum, day) => sum + (day.totale_calorie || 0), 0);
        const avgCaloriesPerDay = Math.round(totalCalories / calorieData.length);
        
        const startWeight = statsWeightData[0]?.weight || 0;
        const endWeight = statsWeightData[statsWeightData.length - 1]?.weight || 0;
        const weightChange = Math.round((endWeight - startWeight) * 10) / 10;

        const bmr = userProfile.gender === 'maschio' 
            ? Math.round(88.362 + (13.397 * endWeight) + (4.799 * userProfile.height) - (5.677 * userProfile.age))
            : Math.round(447.593 + (9.247 * endWeight) + (3.098 * userProfile.height) - (4.330 * userProfile.age));

        return {
            avgCaloriesPerDay, totalCalories, startWeight, endWeight, weightChange, bmr, daysAnalyzed: days
        };
    };

    // Preparazione dati grafico Line/Bar
    const prepareChartData = () => {
        const days = selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 180;
        const startDateChart = moment().subtract(days, 'days').format('YYYY-MM-DD');
        const chartWeightData = weightData.filter(item => moment(item.date).isSameOrAfter(startDateChart));

        if (!calorieData.length && !chartWeightData.length) return [];
        
        const combinedData = {};
        
        calorieData.forEach(item => {
            const date = item.data_pasto;
            if (!combinedData[date]) combinedData[date] = { date };
            combinedData[date].calories = (combinedData[date].calories || 0) + item.totale_calorie;
        });

        chartWeightData.forEach(item => {
            const date = item.date;
            if (!combinedData[date]) combinedData[date] = { date };
            combinedData[date].weight = item.weight;
        });

        return Object.values(combinedData).sort((a, b) => new Date(a.date) - new Date(b.date));
    };

    // Preparazione dati grafico a torta Macronutrienti
    const getMacroData = () => {
        if (!calorieData.length) return [];

        const totals = calorieData.reduce((acc, meal) => {
            if (meal.macro_totali && typeof meal.macro_totali === 'object') {
                acc.grassi += meal.macro_totali.grassi || 0;
                acc.proteine += meal.macro_totali.proteine || 0;
                acc.carboidrati += meal.macro_totali.carboidrati || 0;
            }
            return acc;
        }, { grassi: 0, proteine: 0, carboidrati: 0 });

        if (totals.grassi === 0 && totals.proteine === 0 && totals.carboidrati === 0) return [];

        return [
            { name: 'Grassi', value: totals.grassi, fill: '#ff6b6b' },
            { name: 'Proteine', value: totals.proteine, fill: '#4ecdc4' },
            { name: 'Carboidrati', value: totals.carboidrati, fill: '#45b7d1' }
        ];
    };

    // Sintesi vocale
    useEffect(() => {
        // Carica le voci quando il componente si monta
        const loadVoices = () => {
            console.log('Voci disponibili caricate.');
        };
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
        loadVoices();
    }, []);

    const playAudio = () => {
        if (!analysisData?.summaryText) {
            setError('Nessun testo da riprodurre');
            return;
        }

        if (audioPlaying) {
            window.speechSynthesis.cancel();
            setAudioPlaying(false);
            return;
        }

        if (!('speechSynthesis' in window)) {
            setError('Il tuo browser non supporta la sintesi vocale');
            return;
        }

        try {
            const utterance = new SpeechSynthesisUtterance(analysisData.summaryText);
            
            const voices = window.speechSynthesis.getVoices();
            const italianVoice = voices.find(voice => voice.lang.includes('it') || voice.name.includes('Italian'));
            
            if (italianVoice) utterance.voice = italianVoice;
            
            utterance.lang = 'it-IT';
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            utterance.onstart = () => { setAudioPlaying(true); setError(null); };
            utterance.onend = () => { setAudioPlaying(false); };
            utterance.onerror = (event) => {
                setAudioPlaying(false);
                console.error('Errore sintesi vocale:', event.error);
                setError(`Errore nella riproduzione vocale: ${event.error}`);
            };

            window.speechSynthesis.speak(utterance);

        } catch (error) {
            console.error('Errore nell\'avvio della sintesi vocale:', error);
            setError(`Errore nella sintesi vocale: ${error.message}`);
            setAudioPlaying(false);
        }
    };

    // Calcolo dati per il render
    const stats = calculateStats();
    const chartData = prepareChartData();
    const macroData = getMacroData();

    // JSX di rendering
    return (
        <div className="analisi-peso-app">
            <div className="analisi-peso-header">
                <div className="analisi-peso-header-content">
                    <div className="analisi-peso-logo-section">
                        <div className="analisi-peso-logo-icon">📊</div>
                        <div className="analisi-peso-header-text">
                            <h1>Analisi Andamento Peso</h1>
                            <span className="analisi-peso-tagline">Il tuo percorso nutrizionale personalizzato</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => navigate('/main-menu')} 
                        className="analisi-peso-back-button"
                    >
                        ← Torna al Menu
                    </button>
                </div>
            </div>

            <div className="analisi-peso-container">
                {/* Sezione controlli */}
                <div className="analisi-peso-controls-section">
                    
                    {/* RIGA PERIODI E AGGIUNGI PESO */}
                    <div className="analisi-peso-controls-row">
                        <div className="analisi-peso-period-selector">
                            <h3>Seleziona periodo di analisi</h3>
                            <div className="analisi-peso-period-buttons">
                                {[
                                    { key: 'week', label: 'Ultimi 7 giorni', icon: '📅' },
                                    { key: 'month', label: 'Ultimo mese', icon: '🗓️' },
                                    { key: 'sixmonths', label: 'Ultimi 6 mesi', icon: '📆' }
                                ].map(period => (
                                    <button
                                        key={period.key}
                                        className={`analisi-peso-period-btn ${selectedPeriod === period.key ? 'active' : ''}`}
                                        onClick={() => setSelectedPeriod(period.key)}
                                    >
                                        <span className="analisi-peso-period-icon">{period.icon}</span>
                                        {period.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button 
                            className="analisi-peso-add-weight-btn"
                            onClick={() => {
                                setNewWeight('');
                                setNewDate(moment().format('YYYY-MM-DD'));
                                setIsModalOpen(true);
                                setError(null);
                            }}
                        >
                            + Aggiungi Peso
                        </button>
                    </div>

                    {/* PULSANTE ANALIZZA */}
                    <button 
                        className="analisi-peso-generate-btn full-width"
                        onClick={generateAnalysis}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <div className="analisi-peso-spinner"></div>
                                Analizzando...
                            </>
                        ) : (
                            <>
                                <span>🚀</span>
                                Genera Analisi AI
                            </>
                        )}
                    </button>
                </div>

                {error && (
                    <div className="analisi-peso-error-alert">
                        <span>⚠️</span>
                        {error}
                    </div>
                )}

                {/* Statistiche generali */}
                {stats && (
                    <div className="analisi-peso-stats-grid">
                        <div className="analisi-peso-stat-card calories">
                            <div className="analisi-peso-stat-icon">🔥</div>
                            <div className="analisi-peso-stat-content">
                                <span className="analisi-peso-stat-label">Calorie Medie/Giorno</span>
                                <span className="analisi-peso-stat-value">{stats.avgCaloriesPerDay}</span>
                                <span className="analisi-peso-stat-unit">kcal</span>
                            </div>
                        </div>
                        
                        <div className="analisi-peso-stat-card weight">
                            <div className="analisi-peso-stat-icon">⚖️</div>
                            <div className="analisi-peso-stat-content">
                                <span className="analisi-peso-stat-label">Variazione Peso</span>
                                <span className={`analisi-peso-stat-value ${stats.weightChange >= 0 ? 'positive' : 'negative'}`}>
                                    {stats.weightChange >= 0 ? '+' : ''}{stats.weightChange}
                                </span>
                                <span className="analisi-peso-stat-unit">kg</span>
                            </div>
                        </div>

                        <div className="analisi-peso-stat-card bmr">
                            <div className="analisi-peso-stat-icon">⚡</div>
                            <div className="analisi-peso-stat-content">
                                <span className="analisi-peso-stat-label">BMR Stimato</span>
                                <span className="analisi-peso-stat-value">{stats.bmr}</span>
                                <span className="analisi-peso-stat-unit">kcal</span>
                            </div>
                        </div>

                        <div className="analisi-peso-stat-card period">
                            <div className="analisi-peso-stat-icon">📊</div>
                            <div className="analisi-peso-stat-content">
                                <span className="analisi-peso-stat-label">Giorni Analizzati</span>
                                <span className="analisi-peso-stat-value">{stats.daysAnalyzed}</span>
                                <span className="analisi-peso-stat-unit">giorni</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Grafici */}
                {chartData.length > 0 && (
                    <div className="analisi-peso-charts-section">
                        <div className="analisi-peso-chart-container">
                            <h3 className="analisi-peso-chart-title">
                                <span>📈</span>
                                Andamento Calorie e Peso
                            </h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis 
                                        dataKey="date" 
                                        tickFormatter={(date) => moment(date).format('DD/MM')}
                                    />
                                    <YAxis yAxisId="calories" orientation="left" />
                                    <YAxis yAxisId="weight" orientation="right" />
                                    <Tooltip 
                                        labelFormatter={(date) => moment(date).format('DD/MM/YYYY')}
                                        formatter={(value, name) => [
                                            value, 
                                            name === 'calories' ? 'Calorie' : 'Peso (kg)'
                                        ]}
                                    />
                                    <Line 
                                        yAxisId="calories"
                                        type="monotone" 
                                        dataKey="calories" 
                                        stroke="#ff6b6b" 
                                        strokeWidth={2}
                                        name="calories"
                                    />
                                    <Line 
                                        yAxisId="weight"
                                        type="monotone" 
                                        dataKey="weight" 
                                        stroke="#4ecdc4" 
                                        strokeWidth={2}
                                        name="weight"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {macroData.length > 0 && (
                            <div className="analisi-peso-chart-container">
                                <h3 className="analisi-peso-chart-title">
                                    <span>🥗</span>
                                    Distribuzione Macronutrienti
                                </h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={macroData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={100}
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {macroData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                )}

                {/* Analisi AI */}
                {analysisData && (
                    <div className="analisi-peso-ai-section">
                        <div className="analisi-peso-analysis-header">
                            <h3 className="analisi-peso-section-title">
                                <span>🤖</span>
                                Analisi AI Personalizzata
                            </h3>
                            <div className="analisi-peso-audio-controls">
                                <button 
                                    className={`analisi-peso-audio-btn ${audioPlaying ? 'playing' : ''}`}
                                    onClick={playAudio}
                                    title={audioPlaying ? "Clicca per fermare" : "Clicca per ascoltare l'analisi"}
                                >
                                    {audioPlaying ? (
                                        <>
                                            <div className="analisi-peso-audio-icon">⏹️</div>
                                            Ferma audio
                                        </>
                                    ) : (
                                        <>
                                            <div className="analisi-peso-audio-icon">🔊</div>
                                            Ascolta l'analisi
                                        </>
                                    )}
                                </button>
                                
                                {audioPlaying && (
                                    <div className="analisi-peso-audio-status">
                                        <div className="analisi-peso-audio-wave">
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                        </div>
                                        <span>Riproduzione in corso...</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="analisi-peso-analysis-content">
                            <div className="analisi-peso-analysis-text">
                                {analysisData.summaryText.split('\n').map((paragraph, index) => (
                                    paragraph.trim() && (
                                        <p key={index} className="analisi-peso-analysis-paragraph">
                                            {paragraph}
                                        </p>
                                    )
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer con consigli */}
                <div className="analisi-peso-tips-section">
                    <h3 className="analisi-peso-tips-title">
                        <span>💡</span>
                        Consigli per il Benessere
                    </h3>
                    <div className="analisi-peso-tips-grid">
                        <div className="analisi-peso-tip-card">
                            <div className="analisi-peso-tip-icon">🥗</div>
                            <h4>Alimentazione Bilanciata</h4>
                            <p>Mantieni un equilibrio tra carboidrati, proteine e grassi sani</p>
                        </div>
                        <div className="analisi-peso-tip-card">
                            <div className="analisi-peso-tip-icon">💧</div>
                            <h4>Idratazione</h4>
                            <p>Bevi almeno 2 litri di acqua al giorno</p>
                        </div>
                        <div className="analisi-peso-tip-card">
                            <div className="analisi-peso-tip-icon">🏃‍♂️</div>
                            <h4>Attività Fisica</h4>
                            <p>30 minuti di movimento quotidiano migliorano il metabolismo</p>
                        </div>
                        <div className="analisi-peso-tip-card">
                            <div className="analisi-peso-tip-icon">😴</div>
                            <h4>Riposo</h4>
                            <p>7-8 ore di sonno qualitativo sono essenziali</p>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* MODALE AGGIUNGI PESO CON CRONOLOGIA */}
            {isModalOpen && (
                <div className="weight-modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="weight-modal-container" onClick={e => e.stopPropagation()}>
                        <div className="weight-modal-header">
                            <h3 className="weight-modal-title">Cronologia Peso e Aggiunta</h3>
                            <button 
                                className="weight-modal-close-btn"
                                onClick={() => { setIsModalOpen(false); setError(null); }}
                                disabled={loading}
                            >
                                &times;
                            </button>
                        </div>

                        <div className="weight-modal-content-grid">
                            
                            {/* SEZIONE INSERIMENTO NUOVO PESO */}
                            <div className="weight-modal-input-section">
                                <h4>Aggiungi Nuova Misurazione</h4>
                                
                                <div className="weight-modal-form">
                                    <label className="weight-modal-label">Peso (kg):</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={newWeight}
                                        onChange={(e) => setNewWeight(e.target.value)}
                                        placeholder="Es. 75.5"
                                        className="weight-modal-input"
                                    />

                                    <label className="weight-modal-label">Data:</label>
                                    <input
                                        type="date"
                                        value={newDate}
                                        onChange={(e) => setNewDate(e.target.value)}
                                        max={moment().format('YYYY-MM-DD')}
                                        className="weight-modal-input"
                                    />
                                </div>

                                <button 
                                    className="weight-modal-btn-confirm"
                                    onClick={handleSaveWeight}
                                    disabled={loading || !newWeight || !newDate}
                                >
                                    {loading ? 'Salvataggio...' : '➕ Aggiungi Peso'}
                                </button>
                                {error && isModalOpen && <p className="weight-modal-error-message">{error}</p>}
                            </div>
                            
                            {/* SEZIONE CRONOLOGIA DATI ESISTENTI */}
                            <div className="weight-modal-history-section">
                                <h4>Ultimi Pesi Registrati</h4>
                                <div className="weight-modal-list">
                                    {weightData.slice(0, 10).map((item, index) => (
                                        <div key={index} className="weight-modal-list-item">
                                            <span className="weight-modal-item-date">{moment(item.date).format('DD MMM YYYY')}</span>
                                            <span className="weight-modal-item-weight">{item.weight} kg</span>
                                        </div>
                                    ))}
                                    {weightData.length === 0 && (
                                        <p className="weight-modal-no-data">Nessun peso recente registrato.</p>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default FunAnalisiAndamentoPeso;