// =============================================================
// FILE: backend/server/config.js (COMUNE A LOCALE E RENDER)
// =============================================================

import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
// Rimosse: path e fileURLToPath (non necessarie per Express su Render)

// SDK AI e Database
import Groq from "groq-sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

// Import DELLE ROTTE
// Assicurati che questi percorsi siano corretti rispetto alla posizione del file config.js
import recipesRouter03_01 from "./routes/Routes03_01RicetteAI_EstrazIngredienti+IstruzCottura.js";
import caloriesRouter03_04 from "./routes/Routes03_04AnalisiCaloriePasto.js";
import nutritionRouter03_05 from "./routes/Routes03_05AnalisiAndamentoPeso.js";
import alfredRouter20_23 from "./routes/Routes20_23AlfredRiepilogoSettimanaleImpegni.js";
import documentsRouter08_01 from "./routes/Routes08_01FunctionIngestioneDocumentsAlfred.js"; 
import newsRouter16_06 from "./routes/Routes16_06LeggiNotizieDalMondo.js";
import queriesRouter20_22 from "./routes/Routes20_22InfoDocumentiArchiviati.js";
import metadataRouter101_0 from "./routes/Routes101_0RecuperoMetadataTabelle.js";
import notebookRouter16_01 from "./routes/Routes16_01CopiaNotebookLLM.js";
import mailRouter16_02 from "./routes/Routes16_02LeggiScriviArchivia_Mail.js";
import notesRouter16_03 from "./routes/Routes16_03NoteScriviDettaArchivia.js";
import offerteVolantiniRouter01_03 from "./routes/Routes01_03OfferteVolantini.js";
import alfredChatbotRouter from "./routes/RoutesAlfredChatbot.js";
import ricetteDalFrigoRouter from "./routes/Routes03_06AnalizzaFrigoDispensaTrovaRicette.js";
import testMediaRouter104_0 from "./routes/TestRoutes104_0AudioVideoFoto.js";


// ---------------------------------------------------------------------
// CONFIGURAZIONE SERVER
// ---------------------------------------------------------------------
dotenv.config();

export const app = express();
// Render imposta la porta con la variabile d'ambiente PORT.
export const PORT = process.env.PORT || 3001; 

// 🎯 Modifica CORS: Accetta l'URL del tuo Frontend Vercel
app.use(cors({
  origin: [

    'http://localhost:3000',
    process.env.FRONTEND_URL || 'https://mcp-social-family-github.vercel.app', // ⬅️ Modifica qui
    'https://mcp-social-family-github.vercel.app', // ⬅️ Aggiungi l'URL Vercel fisso
    'https://*.vercel.app' 

  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json({ limit: "50mb" })); // Aumento il limite per i documenti
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));


// ---------------------------------------------------------------------
// STATIC FILES & INIZIALIZZAZIONE
// ---------------------------------------------------------------------
// Rimosso il codice per __filename/__dirname (non standard in un setup serverless/container come Render)

// ⚠️ I file statici come /audio e /temp/videos non funzioneranno
// facilmente su Render in modalità gratuita. Devono essere gestiti con S3/Cloudinary.
// Li commentiamo per evitare errori di path in produzione su Render.

/*
app.use("/audio", express.static(path.join(__dirname, "audio")));
app.use("/temp/videos", express.static(path.join(__dirname, "temp", "videos")));
*/

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ... inizializzazione Supabase come prima ...
export const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

export const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ---------------------------------------------------------------------
// FUNZIONE GLOBALE & HEALTH CHECK
// ---------------------------------------------------------------------

export const extractUserAndFamilyGroup = async (req) => {
    // Logica di estrazione utente...
    const user_id = "dcb5ef68-6b50-42b2-bd8e-c7a5eaa0b734"; // Dummy ID per testing
    return { user_id, family_group: 'dummy_group', logged_username: 'Alfred Butler' };
};

// 🎯 Aggiungiamo un endpoint per il controllo di stato (Health Check)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// ---------------------------------------------------------------------
// MONTAGGIO DELLE ROTTE API
// ---------------------------------------------------------------------
app.use("/api/recipe", recipesRouter03_01);
app.use("/api/contacalorie", caloriesRouter03_04);
app.use("/api/nutrition", nutritionRouter03_05);
app.use("/api/alfred-summary", alfredRouter20_23);
app.use("/api/process-document", documentsRouter08_01); 
app.use("/api/metadata", metadataRouter101_0);
app.use("/api/notebook", notebookRouter16_01);
app.use("/api/email", mailRouter16_02);
app.use("/api/notes", notesRouter16_03);
app.use("/api/offerte-volantini", offerteVolantiniRouter01_03);
app.use("/api/alfred-chat", alfredChatbotRouter);
app.use("/api/food/ricette-da-foto", ricetteDalFrigoRouter);
app.use("/api/test", testMediaRouter104_0); 

// Error handler globale (molto utile)
app.use((err, req, res, next) => {
  console.error('Global Error:', err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

// Esporta l'app (Express) per l'avvio nel server.js
// Vogliamo che questo file faccia SOLO la configurazione.
// L'avvio con app.listen(...) va in un file separato.
// Export default è comodo per l'uso con 'import app from...'
export default app;