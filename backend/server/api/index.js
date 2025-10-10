// =============================================================
// FILE: api/index.js (SOLO PER VERSEL - SERVERLESS FUNCTION)
// =============================================================

// 🚨 IMPORTIAMO SOLO L'APP EXPRESS DALLA CONFIGURAZIONE COMUNE
import { app } from "../server/config.js";

// ---------------------------------------------------------------------
// ESPORTAZIONE PER VERSEL
// ---------------------------------------------------------------------
export default app;
