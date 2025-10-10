// Imports essenziali
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
// --- CONFIGURAZIONE VARIABILI D'AMBIENTE (Secrets) ---
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL") || "pierluca.patarini@yahoo.it";
const SENDGRID_ENDPOINT = "https://api.sendgrid.com/v3/mail/send";
// Helper per CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// ------------------------------------------------------------------------
// LOGICA PRINCIPALE
// ------------------------------------------------------------------------
serve(async (req)=>{
  // Gestione preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: "Method Not Allowed. Use POST."
    }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  // Validazione configurazione
  if (!SENDGRID_API_KEY) {
    console.error("❌ SENDGRID_API_KEY mancante.");
    return new Response(JSON.stringify({
      error: "Configurazione API mancante. Verifica i Secrets in Supabase."
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  try {
    // Leggi il destinatario dal body della richiesta (opzionale)
    let recipientEmail = "pierluca.patarini@icloud.com"; // Default
    try {
      const body = await req.json();
      if (body.recipient) {
        recipientEmail = body.recipient;
      }
    } catch (e) {
    // Se non c'è body JSON, usa il default
    }
    console.log(`📧 Tentativo di invio da ${SENDER_EMAIL} a ${recipientEmail}`);
    console.log(`🔑 API Key presente: ${SENDGRID_API_KEY.substring(0, 10)}...`);
    // Payload formato SendGrid v3
    const payload = {
      personalizations: [
        {
          to: [
            {
              email: recipientEmail
            }
          ],
          subject: "✅ Test SendGrid/Twilio Riuscito"
        }
      ],
      from: {
        email: SENDER_EMAIL,
        name: "Family App"
      },
      content: [
        {
          type: "text/html",
          value: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
                    line-height: 1.6; 
                    color: #333;
                    margin: 0;
                    padding: 0;
                    background-color: #f5f5f5;
                  }
                  .container { 
                    max-width: 600px; 
                    margin: 20px auto; 
                    background: white;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                  }
                  .header { 
                    background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); 
                    color: white; 
                    padding: 40px 30px; 
                    text-align: center;
                  }
                  .header h1 {
                    margin: 0;
                    font-size: 28px;
                  }
                  .content { 
                    padding: 30px; 
                  }
                  .success { 
                    color: #10b981; 
                    font-weight: bold; 
                    font-size: 18px;
                    margin-bottom: 20px;
                  }
                  code { 
                    background: #e5e7eb; 
                    padding: 3px 8px; 
                    border-radius: 4px;
                    font-family: 'Courier New', monospace;
                    font-size: 14px;
                  }
                  .info-box { 
                    background: #dbeafe; 
                    border-left: 4px solid #3b82f6; 
                    padding: 15px 20px; 
                    margin: 20px 0;
                    border-radius: 4px;
                  }
                  .footer { 
                    margin-top: 30px; 
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                    font-size: 12px; 
                    color: #666;
                    text-align: center;
                  }
                  ul { 
                    margin: 10px 0;
                    padding-left: 20px;
                  }
                  li { 
                    margin: 8px 0; 
                  }
                  hr {
                    border: none;
                    border-top: 1px solid #e5e7eb;
                    margin: 25px 0;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>🎉 Integrazione SendGrid Funzionante!</h1>
                  </div>
                  <div class="content">
                    <p class="success">✅ Email inviata con successo tramite SendGrid/Twilio!</p>
                    
                    <div class="info-box">
                      <strong>📊 Dettagli invio:</strong>
                      <ul>
                        <li>Mittente: <code>${SENDER_EMAIL}</code></li>
                        <li>Destinatario: <code>${recipientEmail}</code></li>
                        <li>Provider: SendGrid (Twilio)</li>
                        <li>Timestamp: ${new Date().toLocaleString('it-IT')}</li>
                      </ul>
                    </div>

                    <p>Questa email è stata inviata dalla Edge Function <code>test-email-sendgrid</code> 
                       di Supabase usando l'API di <strong>SendGrid</strong>.</p>

                    <hr>

                    <h3>✅ Vantaggi di SendGrid:</h3>
                    <ul>
                      <li>100 email al giorno gratuite</li>
                      <li>Single Sender Verification (no DNS necessario)</li>
                      <li>Dashboard con statistiche dettagliate</li>
                      <li>Affidabilità enterprise di Twilio</li>
                    </ul>

                    <p><strong>La tua configurazione funziona correttamente!</strong> 🚀</p>

                    <div class="footer">
                      <p>Inviato da Supabase Edge Functions + SendGrid API</p>
                      <p>Powered by Family App</p>
                    </div>
                  </div>
                </div>
              </body>
            </html>
          `
        }
      ]
    };
    console.log("📤 Invio richiesta a SendGrid...");
    const response = await fetch(SENDGRID_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SENDGRID_API_KEY}`
      },
      body: JSON.stringify(payload)
    });
    // SendGrid ritorna 202 per successo (non 200)
    if (response.status === 202) {
      console.log("✅ Email inviata con successo tramite SendGrid!");
      return new Response(JSON.stringify({
        success: true,
        message: `Email inviata a ${recipientEmail} tramite SendGrid!`,
        sender: SENDER_EMAIL,
        status: 202
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Gestione errori
    const responseText = await response.text();
    console.error("❌ Errore SendGrid:");
    console.error("Status:", response.status);
    console.error("Response:", responseText);
    let errorDetails = responseText;
    try {
      const errorJson = JSON.parse(responseText);
      errorDetails = errorJson.errors?.[0]?.message || responseText;
    } catch (e) {
    // Ignora errori di parsing
    }
    return new Response(JSON.stringify({
      error: `Errore SendGrid`,
      status: response.status,
      details: errorDetails,
      hint: response.status === 401 ? "API Key non valida. Controlla SENDGRID_API_KEY" : response.status === 403 ? "Email mittente non verificata. Verifica su SendGrid" : "Controlla i log di SendGrid per dettagli"
    }), {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error("❌ Errore Edge Function:", error);
    console.error("Stack trace:", error.stack);
    return new Response(JSON.stringify({
      error: "Errore interno del server",
      message: error.message,
      type: error.name
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
console.log("🚀 Edge Function avviata (SendGrid/Twilio)");
