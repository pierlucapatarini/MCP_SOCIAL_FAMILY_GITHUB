import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// Importa gli stili
import "../../styles/Pagina102.css"; 

// --- CONFIGURAZIONE SUPABASE CENTRALIZZATA ---
import { supabase } from '../../supabaseClient'; 
// ----------------------------------------------------


// 🚨 CONFIGURAZIONE ESTERNA NECESSARIA 🚨
// URL Edge Functions Supabase. Deve essere REACT_APP_SUPABASE_FUNCTIONS_URL nel tuo .env
const BASE_FUNCTION_URL_PROJECT = process.env.REACT_APP_SUPABASE_FUNCTIONS_URL || 'https://YOUR_FUNCTIONS_URL.supabase.co/functions/v1'; 

// ID OneSignal (o altro servizio Push)
const ONE_SIGNAL_APP_ID = process.env.ONE_SIGNAL_APP_ID || 'YOUR_ONE_SIGNAL_APP_ID'; 
// ------------------------------------

// Funzione di utility per simulare un ritardo con exponential backoff in caso di errori API
const fetchWithRetry = async (url, options, maxRetries = 3) => {
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                // Se la risposta non è OK (es. 4xx, 5xx), rilancia l'errore per il retry
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }
            return response;
        } catch (error) {
            attempt++;
            if (attempt >= maxRetries) {
                // Se tutti i tentativi falliscono, restituisci l'errore
                throw error;
            }
            // Logica di Exponential Backoff
            const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};


export default function Pagina102TestInvioNotificheDirette() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [familyGroup, setFamilyGroup] = useState(null);
    const [log, setLog] = useState([]);
    const [loading, setLoading] = useState(true);
    // Dati per i test diretti
    const [testData] = useState({
        // Dati per le Push Notifications (messaggio generico per il gruppo)
        pushTitle: "Test Notifica Diretta",
        pushBody: "Questa è una notifica di prova inviata senza trigger DB.",
        // Dati per Email (Destinatario fisso per il test)
        recipientEmail: "pierluca.patarini@icloud.com", 
        emailSubject: "Test Email Diretta FamilyHub",
        emailBody: "L'invio diretto tramite Edge Function funziona!",
        // Dati per SMS (Destinatario fisso per il test)
        recipientPhone: "+393356449599", 
        smsMessage: "Test SMS Diretto da FamilyHub tramite Twilio.",
    });


    // --- UTILITY PER L'INTERFACCIA ---
    const addLog = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        setLog(prevLog => [...prevLog, { timestamp, message, type }]);
    };

    // --- CARICAMENTO DATI INIZIALI ---
    useEffect(() => {
        const fetchUserData = async () => {
            setLoading(true);
            
            const { data: userData, error: userError } = await supabase.auth.getUser();
            
            if (userError || !userData.user) {
                addLog('Utente non autenticato. Riprova il login.', 'error');
                setLoading(false);
                return;
            }
            
            const activeUser = userData.user;
            setUser(activeUser);

            try {
                // Caricamento Gruppo Famiglia (Campo: family_group)
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('family_group')
                    .eq('id', activeUser.id)
                    .single();

                if (profile && profile.family_group) {
                    const group = profile.family_group;
                    setFamilyGroup(group);
                    addLog(`Dati utente caricati. Gruppo Famiglia: ${group}`, 'success');
                } else {
                    addLog('Utente loggato ma gruppo famiglia non trovato.', 'warning');
                    setFamilyGroup('GRUPO_NON_TROVATO'); 
                }
            } catch (e) {
                addLog(`Errore generico durante l'inizializzazione: ${e.message}`, 'error');
            }
            
            setLoading(false);
        };
        fetchUserData();
    }, [navigate]); 
    
    
    
    // --- FUNZIONE DI UTILITY PER CHIAMATE DIRETTE ---
    const callEdgeFunction = async (functionName, payload, successMessage) => {
        
        if (!familyGroup || familyGroup === 'GRUPO_NON_TROVATO') {
            addLog("Errore: Dati utente o gruppo famiglia mancanti. Controlla il caricamento iniziale.", 'error');
            return;
        }

        if (!BASE_FUNCTION_URL_PROJECT || BASE_FUNCTION_URL_PROJECT.includes('YOUR_FUNCTIONS_URL')) {
            addLog("❌ Errore CONFIG: URL Edge Functions non valido.", 'error');
            return;
        }

        const FUNCTION_URL = `${BASE_FUNCTION_URL_PROJECT}/${functionName}`;
        addLog(`Innesco: Chiamata diretta a: ${FUNCTION_URL}`, 'info');

        try {
            const session = await supabase.auth.getSession();
            const sessionToken = session.data?.session?.access_token;
            if (!sessionToken) {
                addLog("❌ Errore: Token di sessione mancante.", 'error');
                return;
            }
            
            const finalPayload = { family_group: familyGroup, ...payload };
            
            const response = await fetchWithRetry(FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionToken}`,
                },
                body: JSON.stringify(finalPayload),
            });

            const responseText = await response.text();
            let data = { message: responseText };
            try { 
                data = JSON.parse(responseText); 
            } catch (e) { /* non è JSON */ }

            if (response.ok) {
                addLog(`✅ ${successMessage} inviata con successo!`, 'success');
                if (data.message) addLog(`📬 Risposta: ${data.message}`, 'info');
                return true;
            } else {
                const errorMsg = data.error || data.details || responseText || response.statusText;
                addLog(`❌ Errore Edge Function (${response.status}): ${errorMsg}`, 'error');
                if (response.status === 401) {
                    addLog("💡 Verifica che la chiave API (es. per FCM/Twilio) sia configurata nelle variabili di ambiente di Supabase.", 'warning');
                }
                return false;
            }
        } catch (error) {
            addLog(`❌ Errore di rete: ${error.message}. Controlla i log URL sopra e le regole CORS di Supabase.`, 'error');
            return false;
        }
    };
    
    
//========================================================================
//  // --- NUOVE FUNZIONI DI TEST DIRETTE ---
//========================================================================

// 1. Notifica Web Push Diretta (send-push-webpush)
const testWebPushNotification = () => {
    const payload = { 
        title: testData.pushTitle + " (Web)",
        body: testData.pushBody,
        // Altri dati push necessari per il target (es. subscription_id, user_id)
        // Se la funzione gestisce l'invio a tutto il gruppo, i campi sopra bastano.
    };
    callEdgeFunction('send-push-webpush', payload, 'Richiesta Web Push');
};


// 2. Notifica Push FCM Diretta (send-push-fcm)
const testFCMPushNotification = () => {
    const payload = { 
        title: testData.pushTitle + " (FCM)",
        body: testData.pushBody,
        // Dati aggiuntivi per FCM, es. token dispositivo o tema.
    };
    callEdgeFunction('send-push-fcm', payload, 'Richiesta Push FCM');
};


// 3. Test Email Yahoo/iCloud Diretta (send-email-direct-yahoo-icloud)
const testDirectEmail = () => {
    const payload = { 
        recipient: testData.recipientEmail, 
        subject: testData.emailSubject + " (Yahoo/iCloud)",
        body: testData.emailBody + " (Inviata da provider diretto)",
        // Aggiungere il campo 'sender_email' se richiesto dalla funzione
    };
    callEdgeFunction('send-email-direct-yahoo-icloud', payload, 'Email Yahoo/iCloud');
};


// 4. Test Email SendGrid Diretta (send-email-sendgrid)
const testSendGridEmail = () => {
    const payload = { 
        recipient: testData.recipientEmail, 
        subject: testData.emailSubject + " (SendGrid)",
        body: testData.emailBody + " (Inviata da SendGrid)",
    };
    callEdgeFunction('send-email-sendgrid', payload, 'Email SendGrid');
};


// 5. Test Twilio SMS Diretta (send-sms-twilio)
const testTwilioSMS = () => {
    const payload = { 
        phoneNumber: testData.recipientPhone, 
        message: testData.smsMessage,
    };
    callEdgeFunction('send-sms-twilio', payload, 'SMS Twilio');
};


//========================================================================
//  // --- UI / GRAFICA (JSX) ---
//========================================================================

    if (loading) {
        return <div className="loading-screen text-center p-8 text-lg font-semibold bg-gray-50 rounded-lg">Caricamento dati utente e configurazione test...</div>;
    }


    return (
        <div className="app-layout"> 
            
            <div className="header-mobile-compact">
                <button onClick={() => navigate('/main-menu')} className="btn-secondary flex items-center">
                    ☰ Menu
                </button>
                <div>
                    <h1 className="font-bold text-gray-800">🚀 Test Diretti Edge Functions</h1>
                    <p className="text-right">Gruppo: <strong>{familyGroup || 'N/A'}</strong></p>
                </div>
            </div>

            <div className="scrollable-content md:p-8">
                <p className="subtitle mb-8 text-center text-gray-700 text-lg">Chiama direttamente le Edge Functions per verificare la configurazione API Key e l'esecuzione.</p>

                <div className="grid-container"> 
                    
                    {/* SCENARIO 1: Web Push Notification (send-push-webpush) */}
                    <div className="card">
                        <h2 className="card-title chat">🌐 1. Notifica Web Push</h2>
                        <p className="text-center mb-4 text-sm text-gray-600">Chiama **`send-push-webpush`** (testa le PUSH API standard/VAPID).</p>
                        <p className="test-data-info">Gruppo: **{familyGroup}**</p>
                        <button className="btn-base btn-primary" onClick={testWebPushNotification}>
                            Invia Web Push
                        </button>
                    </div>

                    {/* SCENARIO 2: FCM Push Notification (send-push-fcm) */}
                    <div className="card">
                        <h2 className="card-title chat">📱 2. Notifica FCM Push</h2>
                        <p className="text-center mb-4 text-sm text-gray-600">Chiama **`send-push-fcm`** (testa l'integrazione Firebase/Android).</p>
                        <p className="test-data-info">Gruppo: **{familyGroup}**</p>
                        <button className="btn-base btn-primary" onClick={testFCMPushNotification}>
                            Invia FCM Push
                        </button>
                    </div>

                    {/* SCENARIO 3: Email Diretta (send-email-direct-yahoo-icloud) */}
                    <div className="card">
                        <h2 className="card-title event">📧 3. Email Yahoo/iCloud</h2>
                        <p className="text-center mb-4 text-sm text-gray-600">Chiama **`send-email-direct-yahoo-icloud`** (testa provider diretto/SMTP).</p>
                        <p className="test-data-info">Destinatario: **{testData.recipientEmail}**</p>
                        <button className="btn-base btn-primary green-scenario" onClick={testDirectEmail}>
                            Invia Email Diretta
                        </button>
                    </div>

                    {/* SCENARIO 4: Email SendGrid Diretta (send-email-sendgrid) */}
                    <div className="card">
                        <h2 className="card-title event">✉️ 4. Email SendGrid</h2>
                        <p className="text-center mb-4 text-sm text-gray-600">Chiama **`send-email-sendgrid`** (testa l'integrazione API SendGrid).</p>
                        <p className="test-data-info">Destinatario: **{testData.recipientEmail}**</p>
                        <button className="btn-base btn-primary green-scenario" onClick={testSendGridEmail}>
                            Invia Email SendGrid
                        </button>
                    </div>

                    {/* SCENARIO 5: SMS Twilio Diretta (send-sms-twilio) */}
                    <div className="card">
                        <h2 className="card-title voice">💬 5. SMS Twilio</h2>
                        <p className="text-center mb-4 text-sm text-gray-600">Chiama **`send-sms-twilio`** (testa l'integrazione API Twilio).</p>
                        <p className="test-data-info">Destinatario: **{testData.recipientPhone}**</p>
                        <button className="btn-base btn-action" onClick={testTwilioSMS}>
                            📲 Invia SMS Twilio
                        </button>
                    </div>
                </div>


                {/* LOG DI TEST */}
                <section className="log-container mt-8 shadow-inner">
                    <h2 className="text-xl font-bold mb-3 border-b border-gray-300 pb-2 text-gray-800">Registro Attività ({log.length} Voci)</h2>
                    <div className="log-content"> 
                        {log.slice().reverse().map((entry, index) => (
                            <p key={index} className={`log-entry ${entry.type === 'error' ? 'log-error' : entry.type === 'success' ? 'log-success' : entry.type === 'warning' ? 'log-warning' : 'text-gray-700'}`}>
                                <span className="log-timestamp">[{entry.timestamp}]</span> {entry.message}
                            </p>
                        ))}
                        {log.length === 0 && <p className="text-center text-gray-500 italic p-4">Nessuna attività registrata.</p>}
                    </div>
                </section>
            </div>
        </div>
    );
}