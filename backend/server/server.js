// =============================================================
// FILE: backend/server/server.js (ENTRY POINT PER RENDER)
// =============================================================

// Importiamo l'app Express e la PORTA da config.js
import app, { PORT } from './config.js'; 
// NOTA: 'app' è l'export default di config.js; 'PORT' è un export nominato.

// ---------------------------------------------------------------------
// AVVIO SERVER SU RENDER
// ---------------------------------------------------------------------

// Render fornirà il valore corretto di process.env.PORT
app.listen(PORT, '0.0.0.0', () => { 
  // '0.0.0.0' è necessario per l'hosting containerizzato come Render
  console.log(`🚀 Backend Server avviato e in ascolto sulla porta ${PORT}`);
  console.log(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});