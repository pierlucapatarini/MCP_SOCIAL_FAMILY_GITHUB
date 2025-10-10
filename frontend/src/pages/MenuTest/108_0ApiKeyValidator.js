import React, { useState } from 'react';
import '../../styles/ApiKeyValidator.css';

const ExportApiKeyValidator = () => {
    const [apiKey, setApiKey] = useState('');
    const [service, setService] = useState('openai');
    const [description, setDescription] = useState(''); 
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);
    const [additionalConfig, setAdditionalConfig] = useState({});

    // Lista dei servizi supportati
    const services = [
        { id: 'openai', name: 'OpenAI', icon: '🤖' },
        { id: 'gemini', name: 'Google Gemini', icon: '🔮' },
        { id: 'anthropic', name: 'Anthropic Claude', icon: '🧠' },
        { id: 'groq', name: 'Groq', icon: '⚡' },
        { id: 'cohere', name: 'Cohere', icon: '🌀' },
        { id: 'huggingface', name: 'Hugging Face', icon: '🤗' },
        { id: 'azure', name: 'Azure OpenAI', icon: '☁️' },
        { id: 'elevenlabs', name: 'Eleven Labs', icon: '🎙️' },
        { id: 'supabase', name: 'Supabase', icon: '🗄️' }
    ];

    // Configurazioni aggiuntive per servizi specifici
    const serviceConfigs = {
        azure: {
            fields: [
                { 
                    key: 'endpoint', 
                    label: 'Endpoint Azure', 
                    placeholder: 'https://your-resource.openai.azure.com/',
                    required: true 
                },
                { 
                    key: 'apiVersion', 
                    label: 'API Version', 
                    placeholder: '2023-12-01-preview',
                    required: true 
                }
            ]
        },
        supabase: {
            fields: [
                { 
                    key: 'projectUrl', 
                    label: 'URL Progetto', 
                    placeholder: 'https://your-project.supabase.co',
                    required: true 
                }
            ]
        }
    };

    const handleConfigChange = (key, value) => {
        setAdditionalConfig(prev => ({
            ...prev,
            [key]: value
        }));
    };

    // Funzione per rimuovere dallo storico
    const removeFromHistory = (indexToRemove) => {
        setHistory(prevHistory => 
            prevHistory.filter((_, index) => index !== indexToRemove)
        );
    };

    // Funzione per l'export CSV
    const exportHistoryToCSV = () => {
        if (history.length === 0) return;

        // Intestazione CSV
        const headers = ["Servizio", "Descrizione", "Chiave_Anteprima", "Stato_Validita", "Messaggio", "Data_Verifica"];
        
        // Mappa i dati dello storico
        const csvRows = history.map(item => {
            const serviceName = services.find(s => s.id === item.service)?.name || item.service;
            const validStatus = item.valid ? "Valida" : "Non Valida";
            
            return [
                `"${serviceName}"`,
                `"${item.description.replace(/"/g, '""')}"`, // Gestisce virgolette doppie
                `"${item.key}"`,
                `"${validStatus}"`,
                `"${item.message.replace(/"/g, '""')}"`,
                `"${item.timestamp}"`
            ].join(',');
        });

        const csvContent = [
            headers.join(','), // Aggiunge l'intestazione
            ...csvRows 
        ].join('\n');

        // Crea un Blob (Binary Large Object)
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        // Crea e simula il click su un link di download
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'api_key_verification_history.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url); // Libera la memoria
    };

    // Funzione per testare l'API key
    const verifyApiKey = async () => {
        if (!apiKey.trim()) {
            setResult({ valid: false, message: 'Inserisci una API key' });
            return;
        }

        // Validazione configurazioni aggiuntive
        const config = serviceConfigs[service];
        if (config) {
            for (const field of config.fields) {
                if (field.required && !additionalConfig[field.key]) {
                    setResult({ valid: false, message: `Il campo "${field.label}" è richiesto` });
                    return;
                }
            }
        }

        setLoading(true);
        setResult(null);

        try {
            let isValid = false;
            let message = '';

            // Test specifico per ogni servizio
            switch (service) {
                case 'openai':
                    ({ isValid, message } = await testOpenAIKey(apiKey));
                    break;
                case 'gemini':
                    ({ isValid, message } = await testGeminiKey(apiKey));
                    break;
                case 'anthropic':
                    ({ isValid, message } = await testAnthropicKey(apiKey));
                    break;
                case 'groq':
                    ({ isValid, message } = await testGroqKey(apiKey));
                    break;
                case 'cohere':
                    ({ isValid, message } = await testCohereKey(apiKey));
                    break;
                case 'huggingface':
                    ({ isValid, message } = await testHuggingFaceKey(apiKey));
                    break;
                case 'azure':
                    ({ isValid, message } = await testAzureKey(apiKey, additionalConfig));
                    break;
                case 'elevenlabs':
                    ({ isValid, message } = await testElevenLabsKey(apiKey));
                    break;
                case 'supabase':
                    ({ isValid, message } = await testSupabaseKey(apiKey, additionalConfig));
                    break;
                default:
                    message = 'Servizio non supportato';
            }

            const testResult = {
                service,
                description: description || 'Nessuna descrizione', 
                key: apiKey.substring(0, 20) + '...', 
                valid: isValid,
                message,
                timestamp: new Date().toLocaleString()
            };

            setResult(testResult);
            // Mantiene solo gli ultimi 20 test
            setHistory(prev => [testResult, ...prev.slice(0, 19)]); 
        } catch (error) {
            setResult({ 
                valid: false, 
                message: `Errore durante la verifica: ${error.message}` 
            });
        } finally {
            setLoading(false);
        }
    };

    // --- FUNZIONI DI TEST ---

    const testOpenAIKey = async (key) => {
        try {
            const response = await fetch('https://api.openai.com/v1/models', {
                headers: {
                    'Authorization': `Bearer ${key}`
                }
            });
            
            if (response.status === 401) {
                return { isValid: false, message: 'API Key non valida o scaduta' };
            } else if (response.status === 429) {
                return { isValid: true, message: 'API Key valida (rate limit raggiunto)' };
            } else if (response.ok) {
                return { isValid: true, message: 'API Key valida' };
            } else {
                return { isValid: false, message: `Errore: ${response.status}` };
            }
        } catch (error) {
            return { isValid: false, message: 'Errore di connessione' };
        }
    };

    const testGeminiKey = async (key) => {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${key}`);
            
            if (response.status === 400) {
                const errorData = await response.json();
                if (errorData.error?.message?.includes('API key')) {
                    return { isValid: false, message: 'API Key non valida' };
                }
            } else if (response.ok) {
                return { isValid: true, message: 'API Key valida' };
            }
            
            return { isValid: false, message: `Errore: ${response.status}` };
        } catch (error) {
            return { isValid: false, message: 'Errore di connessione' };
        }
    };

    const testAnthropicKey = async (key) => {
        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': key,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'claude-3-haiku-20240307',
                    max_tokens: 5,
                    messages: [{ role: 'user', content: 'Hi' }]
                })
            });
            
            if (response.status === 401) {
                return { isValid: false, message: 'API Key non valida' };
            } else if (response.status === 400) {
                // Spesso un 400 indica che la chiave è passata (valida) ma la richiesta è sbagliata
                return { isValid: true, message: 'API Key valida (richiesta malformata, ma chiave accettata)' };
            } else if (response.ok) {
                return { isValid: true, message: 'API Key valida' };
            } else {
                return { isValid: false, message: `Errore: ${response.status}` };
            }
        } catch (error) {
            return { isValid: false, message: 'Errore di connessione' };
        }
    };

    const testGroqKey = async (key) => {
        try {
            const response = await fetch('https://api.groq.com/openai/v1/models', {
                headers: {
                    'Authorization': `Bearer ${key}`
                }
            });
            
            if (response.status === 401) {
                return { isValid: false, message: 'API Key non valida' };
            } else if (response.ok) {
                return { isValid: true, message: 'API Key valida' };
            } else {
                return { isValid: false, message: `Errore: ${response.status}` };
            }
        } catch (error) {
            return { isValid: false, message: 'Errore di connessione' };
        }
    };

    // FUNZIONE ELEVEN LABS AGGIORNATA
    const testElevenLabsKey = async (key) => {
        try {
            const response = await fetch('https://api.elevenlabs.io/v1/user', {
                headers: {
                    'xi-api-key': key 
                }
            });

            if (response.ok) {
                const userData = await response.json();
                return { 
                    isValid: true, 
                    message: `API Key valida - Subscription: ${userData.subscription?.tier || 'Unknown'}` 
                };
            }
            
            // Se lo stato non è OK (es. 401, 403, 404, 429...)
            if (response.status === 401) {
                return { isValid: false, message: 'API Key non valida o scaduta (Status 401)' };
            }
            
            // Tentativo di estrarre il messaggio di errore dal corpo della risposta JSON
            try {
                const errorData = await response.json();
                const detail = errorData.detail || `Errore HTTP: ${response.status}`; 
                
                // Un errore 403 (Forbidden) potrebbe significare chiave valida ma account limitato/richiesta non consentita
                if (response.status === 403) {
                     return { isValid: true, message: `API Key potenzialmente valida ma account limitato o richiesta non autorizzata (Errore: ${detail})` };
                }
                
                return { isValid: false, message: `Verifica fallita (Status ${response.status}): ${detail}` };

            } catch (jsonError) {
                // Non è un JSON, restituisce l'errore HTTP grezzo
                return { isValid: false, message: `Verifica fallita - Errore HTTP: ${response.status}` };
            }

        } catch (error) {
            // Errore di rete (es. CORS o connessione)
            return { isValid: false, message: `Errore di connessione alla rete (Eleven Labs): ${error.message}. Verifica le restrizioni CORS.` };
        }
    };

    const testSupabaseKey = async (key, config) => {
        try {
            const projectUrl = config.projectUrl;
            if (!projectUrl) {
                return { isValid: false, message: 'URL progetto richiesto' };
            }

            // Normalizza l'URL
            const baseUrl = projectUrl.replace(/\/$/, '');
            const response = await fetch(`${baseUrl}/rest/v1/`, {
                headers: {
                    'apikey': key,
                    'Authorization': `Bearer ${key}`
                }
            });
            
            if (response.status === 401) {
                return { isValid: false, message: 'API Key non valida' };
            } else if (response.status === 200) {
                return { isValid: true, message: 'API Key valida - Connessione a Supabase riuscita' };
            } else {
                return { isValid: false, message: `Errore: ${response.status}` };
            }
        } catch (error) {
            return { isValid: false, message: 'Errore di connessione al progetto Supabase' };
        }
    };

    const testAzureKey = async (key, config) => {
        try {
            const endpoint = config.endpoint;
            const apiVersion = config.apiVersion;
            
            if (!endpoint || !apiVersion) {
                return { isValid: false, message: 'Endpoint e API version richiesti per Azure' };
            }

            const url = `${endpoint.replace(/\/$/, '')}/openai/models?api-version=${apiVersion}`;
            const response = await fetch(url, {
                headers: {
                    'api-key': key
                }
            });
            
            if (response.status === 401) {
                return { isValid: false, message: 'API Key non valida' };
            } else if (response.ok) {
                return { isValid: true, message: 'API Key valida per Azure OpenAI' };
            } else {
                return { isValid: false, message: `Errore: ${response.status}` };
            }
        } catch (error) {
            return { isValid: false, message: 'Errore di connessione a Azure OpenAI' };
        }
    };

    const testCohereKey = async (key) => {
        return { isValid: false, message: 'Verifica Cohere non ancora implementata' };
    };

    const testHuggingFaceKey = async (key) => {
        return { isValid: false, message: 'Verifica Hugging Face non ancora implementata' };
    };

    // Reset del form
    const resetForm = () => {
        setApiKey('');
        setService('openai');
        setDescription(''); 
        setResult(null);
        setAdditionalConfig({});
    };

    // Ottieni configurazioni per il servizio corrente
    const currentServiceConfig = serviceConfigs[service];

    return (
        <div className="api-key-validator">
            <header className="validator-header">
                <h1>🔑 Validatore API Keys</h1>
                <p>Verifica la validità delle tue API keys per vari servizi AI e piattaforme</p>
            </header>

            <div className="validator-container">
                <div className="input-section">
                    <div className="form-group">
                        <label htmlFor="service">Servizio:</label>
                        <select 
                            id="service"
                            value={service} 
                            onChange={(e) => {
                                setService(e.target.value);
                                setAdditionalConfig({}); 
                            }}
                            className="service-select"
                        >
                            {services.map(svc => (
                                <option key={svc.id} value={svc.id}>
                                    {svc.icon} {svc.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {currentServiceConfig && (
                        <div className="config-section">
                            <h4>Configurazione {services.find(s => s.id === service)?.name}:</h4>
                            {currentServiceConfig.fields.map(field => (
                                <div key={field.key} className="form-group">
                                    <label htmlFor={field.key}>{field.label}:</label>
                                    <input
                                        id={field.key}
                                        type="text"
                                        value={additionalConfig[field.key] || ''}
                                        onChange={(e) => handleConfigChange(field.key, e.target.value)}
                                        placeholder={field.placeholder}
                                        className="config-input"
                                        required={field.required}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="description">Descrizione/Uso:</label>
                        <input
                            id="description"
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Es. 'Mia key personale', 'Key per Alfred RAG'"
                            className="config-input"
                            autoComplete="off" 
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="apiKey">API Key:</label>
                        <input
                            id="apiKey"
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Incolla la tua API key qui"
                            className="api-key-input"
                            autoComplete="new-password" 
                        />
                    </div>

                    <div className="button-group">
                        <button 
                            onClick={verifyApiKey} 
                            disabled={loading}
                            className="verify-button"
                        >
                            {loading ? 'Verifica in corso...' : 'Verifica API Key'}
                        </button>
                        <button onClick={resetForm} className="reset-button">
                            Reset
                        </button>
                    </div>
                </div>

                {result && (
                    <div className={`result-section ${result.valid ? 'valid' : 'invalid'}`}>
                        <h3>Risultato della verifica:</h3>
                        <div className="result-details">
                            <p><strong>Servizio:</strong> {services.find(s => s.id === result.service)?.name}</p>
                            <p><strong>Uso:</strong> {result.description}</p>
                            <p><strong>Key:</strong> {result.key}</p>
                            <p><strong>Stato:</strong> 
                                <span className={`status ${result.valid ? 'valid' : 'invalid'}`}>
                                    {result.valid ? ' Valida' : ' Non valida'}
                                </span>
                            </p>
                            <p><strong>Messaggio:</strong> {result.message}</p>
                            <p><strong>Data/Ora:</strong> {result.timestamp}</p>
                        </div>
                    </div>
                )}

                {history.length > 0 && (
                    <div className="history-section">
                        <div className="history-header">
                            <h3>Cronologia verifiche (ultime 20)</h3>
                            <button onClick={exportHistoryToCSV} className="export-button">
                                💾 Esporta Lista
                            </button>
                        </div>
                        <div className="history-list">
                            {history.map((item, index) => (
                                <div key={index} className={`history-item ${item.valid ? 'valid' : 'invalid'}`}>
                                    <span className="history-details-group">
                                        <span className="service-icon">
                                            {services.find(s => s.id === item.service)?.icon}
                                        </span>
                                        <span className="service-name">
                                            {item.description} ({services.find(s => s.id === item.service)?.name})
                                        </span>
                                        <span className="key-preview">{item.key}</span>
                                        <span className={`status ${item.valid ? 'valid' : 'invalid'}`}>
                                            {item.valid ? '✓' : '✗'}
                                        </span>
                                        <span className="timestamp">{item.timestamp}</span>
                                    </span>
                                    {/* PULSANTE ELIMINA */}
                                    <button 
                                        className="delete-button" 
                                        onClick={() => removeFromHistory(index)}
                                        title="Elimina riga"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <footer className="validator-footer">
                <p>
                    <strong>Sicurezza:</strong> Le API keys vengono verificate direttamente 
                    tramite chiamate API ai rispettivi servizi e non vengono memorizzate.
                </p>
                <div className="service-info">
                    <h4>Servizi supportati:</h4>
                    <ul>
                        <li><strong>OpenAI:</strong> Verifica tramite endpoint /models</li>
                        <li><strong>Google Gemini:</strong> Verifica tramite lista modelli</li>
                        <li><strong>Anthropic Claude:</strong> Test con richiesta semplice</li>
                        <li><strong>Groq:</strong> Verifica endpoint modelli OpenAI-compatible</li>
                        <li><strong>Eleven Labs:</strong> Verifica informazioni utente</li>
                        <li><strong>Supabase:</strong> Richiede URL progetto + test connessione REST API</li>
                        <li><strong>Azure OpenAI:</strong> Richiede endpoint e API version specifici</li>
                    </ul>
                </div>
            </footer>
        </div>
    );
};

export default ExportApiKeyValidator;