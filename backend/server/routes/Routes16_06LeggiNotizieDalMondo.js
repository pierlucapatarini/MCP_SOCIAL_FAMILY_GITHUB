// ==================================================================================
// 🟢 INIZIO ROTTA "Routes16_06LeggiNotizieDalMondo"
// ==================================================================================
import { Router } from "express";
import axios from "axios";
import * as cheerio from "cheerio";
// Assumo che l'oggetto gemini sia importato qui, come nel tuo esempio
import { supabase, gemini } from "../config.js"; 
// Importa il prompt
import { ALFRED_NEWS_PROMPT } from "../prompts/Prompts16_06AlfredNewsSummary.js"; 

const router = Router();

// Add your API keys from environment variables
const NEWSDATA_API_KEY = process.env.NEWSDATA_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'audio-files';


// Funzione di utility per il logging (dal tuo esempio)
const createLogFunction = (logs) => (step, message) => {
    const fullMessage = `[STEP ${step}] ${message}`;
    logs.push(fullMessage);
    console.log(fullMessage);
};

// Funzione helper per estrarre il testo dal wrapper (dal tuo esempio)
const extractTextFromResponse = (response) => {
    if (!response) return null;
    
    // 1. Tenta la scorciatoia .text dell'SDK (soluzione ideale)
    if (response.text) return response.text;

    // 2. Se fallisce, naviga la struttura cruda (soluzione robusta)
    if (response.response && response.response.candidates && response.response.candidates.length > 0) {
        return response.response.candidates[0].content.parts[0].text;
    }

    return null;
};


// 💡 FUNZIONE AGGIORNATA PER UTILIZZARE GEMINI (CON CORREZIONE generationConfig)
/**
 * Chiama Gemini per generare un riassunto con la personalità di Alfred.
 * @param {string} prompt Il prompt completo.
 * @param {object[]} articleData L'array di oggetti notizia da riassumere.
 * @returns {Promise<string>} Il riassunto generato in Markdown/Testo.
 */
async function generateAlfredSummary(prompt, articleData, timeRange) {
    if (!gemini) {
        // Fallback per test senza chiave Gemini
        console.warn("⚠️ Oggetto Gemini non disponibile. Uso placeholder per test.");
        return `Buongiorno, sono Alfred. Non sono riuscito a contattare i miei servizi avanzati, ma le ultime ${timeRange} ore sono state intense. Per favore, verificate la configurazione di Gemini.`;
    }

    const articlePayload = articleData.map(a => ({
        source: a.source,
        category: a.category,
        title: a.title,
        content_snippet: a.content.substring(0, 300) + '...',
        pubDate: a.pubDate
    }));

    // Costruisce il messaggio finale da inviare all'AI
    const fullPromptForAI = `${prompt}\n\nARTICOLI DA RIASSUMERE (JSON):\n${JSON.stringify(articlePayload, null, 2)}`;
    
    // Si usa il modello Flash per velocità, coerente con il tuo esempio
    const summaryModel = gemini.getGenerativeModel({ model: "gemini-2.5-flash" });

    try {
        const response = await summaryModel.generateContent({
            contents: [{ parts: [{ text: fullPromptForAI }] }],
            // 🚨 CORREZIONE: Sostituito 'config' con 'generationConfig' per Gemini SDK
            generationConfig: { 
                temperature: 0.6 // Per un tono bilanciato, non troppo creativo
            }
        });
        
        const rawText = extractTextFromResponse(response);

        if (!rawText) {
            console.error('❌ LOG: Risposta Gemini vuota o mancante.');
            throw new Error('Risposta vuota o non valida dalla generazione del summary.');
        }

        return rawText;

    } catch (error) {
        console.error("❌ Errore durante la chiamata Gemini per il summary:", error.message);
        throw new Error(`Errore AI: Impossibile generare il riassunto. Dettagli: ${error.message}`);
    }
}


// A) Funzione per fetch notizie italiane da RSS
async function fetchItalianNews(timeRange, detailedMode = false) {
    const italianRssUrls = [
        { url: 'https://www.corriere.it/rss/homepage.xml', source: 'Corriere della Sera' },
        { url: 'https://www.repubblica.it/rss/homepage/rss2.0.xml', source: 'La Repubblica' },
        { url: 'https://www.lastampa.it/rss/homepage.xml', source: 'La Stampa' },
        { url: 'https://www.ilsole24ore.com/rss/italia--attualita.xml', source: 'Il Sole 24 Ore' }
    ];

    if (detailedMode) {
        italianRssUrls.push(
            { url: 'https://www.gazzetta.it/rss/home.xml', source: 'Gazzetta dello Sport' },
            { url: 'https://www.corriere.it/rss/politica.xml', source: 'Corriere - Politica' },
            { url: 'https://www.repubblica.it/rss/economia/rss2.0.xml', source: 'Repubblica - Economia' }
        );
    }

    let italianArticles = [];
    const minTime = new Date(Date.now() - timeRange * 3600 * 1000);

    for (const rssSource of italianRssUrls) {
        try {
            const response = await axios.get(rssSource.url, { timeout: 5000 });
            const $ = cheerio.load(response.data, { xmlMode: true });
            
            $('item').each((i, el) => {
                const title = $(el).find('title').text().trim();
                const description = $(el).find('description').text().trim();
                const pubDateText = $(el).find('pubDate').text();
                const link = $(el).find('link').text().trim();
                
                let pubDate = new Date();
                if (pubDateText) {
                    pubDate = new Date(pubDateText);
                }

                if (pubDate > minTime && title && title.length > 10) {
                    italianArticles.push({ 
                        source: rssSource.source,
                        title, 
                        content: description.length > 20 ? description : title, 
                        category: 'Italia',
                        link: link,
                        pubDate: pubDate.toISOString()
                    });
                }
            });
        } catch (err) {
            // console.warn(`⚠️ RSS fetch failed per ${rssSource.source}:`, err.message);
        }
    }

    return italianArticles
        .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
        .slice(0, detailedMode ? 30 : 15);
}

// Funzione per fetch notizie internazionali
async function fetchWorldNews(categories, timeRange) {
    const worldCategoriesMap = {
        'Mondo Occidentale': ['us', 'ca', 'gb', 'de', 'fr', 'es', 'au'],
        'Mondo Arabo': ['sa', 'eg', 'ae', 'iq', 'sy', 'jo', 'lb'], 
        'Mondo Orientale': ['cn', 'jp', 'kr', 'in', 'tw', 'th', 'sg'], 
    };

    let worldArticles = [];
    const fromDate = new Date(Date.now() - timeRange * 3600 * 1000).toISOString().split('T')[0];

    for (const category of categories.filter(c => c !== 'Italia')) {
        const countries = worldCategoriesMap[category];
        if (!countries) continue;

        const newsDataUrl = `https://newsdata.io/api/1/news?apikey=${NEWSDATA_API_KEY}&country=${countries.join(',')}&language=en&from_date=${fromDate}&size=8`;

        try {
            const response = await axios.get(newsDataUrl, { timeout: 8000 });
            if (response.data.results) {
                const articles = response.data.results.map(article => ({
                    source: article.source_id || 'Unknown',
                    title: article.title,
                    content: article.content || article.description || article.title,
                    category: category,
                    link: article.link,
                    pubDate: article.pubDate || new Date().toISOString()
                }));
                
                worldArticles = worldArticles.concat(
                    articles.filter(a => a.title && a.title.length > 10)
                );
            }
        } catch (err) {
            // console.warn(`⚠️ NewsData.io failed for ${category}:`, err.message);
        }
    }

    return worldArticles;
}

// Funzione per generare e caricare TTS con ElevenLabs e Supabase Storage
async function generateAndUploadTTS(text, categories, timeRange, italyDetailed = false) {
    if (!ELEVENLABS_API_KEY) {
        console.warn("⚠️ ElevenLabs API Key non configurata. Uso placeholder.");
        return `http://localhost:3001/audio/news_placeholder.mp3`; 
    }
    
    try {
        // Prepara il testo per TTS (pulizia HTML e Markdown)
        const cleanText = text
            .replace(/<[^>]*>/g, '') // Rimuove HTML
            .replace(/#{1,6}\s/g, '') // Rimuove header markdown
            .replace(/\*\*(.*?)\*\*/g, '$1') // Rimuove grassetto
            .replace(/\*(.*?)\*/g, '$1') // Rimuove corsivo
            .replace(/`(.*?)`/g, '$1') // Rimuove code
            .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Rimuove link markdown
            .replace(/\\n/g, '\n')
            .replace(/\s+/g, ' ') 
            .trim()
            .substring(0, 2500); 

        if (cleanText.length < 50) {
            console.warn("⚠️ Testo per TTS troppo corto dopo la pulizia. Uso placeholder.");
            return `http://localhost:3001/audio/news_placeholder.mp3`;
        }

        // Chiamata a ElevenLabs
        const elevenLabsResponse = await axios.post(
            'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', // Rachel voice
            {
                text: cleanText,
                model_id: "eleven_multilingual_v2",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                    style: 0.5
                }
            },
            {
                headers: {
                    'Accept': 'audio/mpeg',
                    'xi-api-key': ELEVENLABS_API_KEY,
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer',
                timeout: 30000
            }
        );

        // Upload a Supabase Storage
        const timestamp = Date.now();
        const categoriesSlug = categories.sort().join('_').toLowerCase().replace(/\s+/g, '_');
        const fileName = `alfred_news_${categoriesSlug}_${timeRange}h${italyDetailed ? '_detailed' : ''}_${timestamp}.mp3`;

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(SUPABASE_STORAGE_BUCKET)
            .upload(fileName, elevenLabsResponse.data, {
                contentType: 'audio/mpeg'
            });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
            .from(SUPABASE_STORAGE_BUCKET)
            .getPublicUrl(fileName);

        return publicUrlData.publicUrl;

    } catch (error) {
        console.error("❌ Errore TTS/Upload:", error.message);
        return `http://localhost:3001/audio/news_placeholder.mp3`;
    }
}

// ===================================
// 🔥 ROUTE HANDLER PRINCIPALE
// ===================================
router.post('/', async (req, res) => {
    // Inizializza il logging
    const logs = [];
    const logStep = createLogFunction(logs);
    
    let timer;
    const TIMEOUT_MS_GLOBAL = 120000;
    
    // Configura il timeout globale
    const timeoutPromiseGlobal = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Timeout complessivo della richiesta.')), TIMEOUT_MS_GLOBAL);
    });
    
    try {
        const { categories = ['Italia'], timeRange = 24, italyDetailed = false, mode = 'classic' } = req.body;
        const TIMEOUT_MS_AI_CALL = 90000; 

        logStep("0", `Avvio Alfred News Request: categorie=${categories.join(',')}, timeRange=${timeRange}h, detailed=${italyDetailed}`);

        // 1. Fetch notizie
        let allArticles = [];
        logStep("1", "Inizio fetching notizie...");
        
        const fetchPromises = [];
        if (categories.includes('Italia')) {
            fetchPromises.push(fetchItalianNews(timeRange, italyDetailed).then(news => {
                logStep("1", `🇮🇹 Trovati ${news.length} articoli italiani.`);
                return news;
            }));
        }

        const worldCategories = categories.filter(c => c !== 'Italia');
        if (worldCategories.length > 0) {
            fetchPromises.push(fetchWorldNews(worldCategories, timeRange).then(news => {
                logStep("1", `🌍 Trovati ${news.length} articoli internazionali.`);
                return news;
            }));
        }

        // 💡 NUOVA LOGICA: Uso Promise.allSettled per robustezza nel fetching (Fase 1)
        const fetchedNews = await Promise.allSettled(fetchPromises);
        
        allArticles = fetchedNews
            .filter(result => result.status === 'fulfilled')
            .flatMap(result => result.value); // Usa flatMap per appiattire e assegnare

        if (allArticles.length === 0) {
            logStep("1", "⚠️ Nessuna notizia trovata.");
            clearTimeout(timer);
            return res.status(404).json({ 
                error: 'Nessuna notizia trovata per i criteri selezionati.',
                logs
            });
        }
        
        logStep("1", `✅ Totale articoli per l'AI: ${allArticles.length}.`);

        // 2. Genera Prompt completo
        logStep("2", "Preparazione prompt per il modello AI (Alfred)...");
        const fullPrompt = ALFRED_NEWS_PROMPT
            .replace('{timeRange}', timeRange)
            .replace('{requestedCategories}', categories.join(', '));


        // 3. Genera summary con Gemini (Chiamata AI Reale)
        logStep("3", "Invocazione del modello AI Gemini per il riassunto...");
        
        const summaryPromise = generateAlfredSummary(fullPrompt, allArticles, timeRange);

        const summaryText = await Promise.race([
            summaryPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout nella generazione del summary (Fase 3).')), TIMEOUT_MS_AI_CALL))
        ]);
        
        logStep("3", '✅ Summary AI generato.');

        // 4. Genera audio TTS
        logStep("4", "Generazione e upload dell'audio TTS (ElevenLabs / Supabase)...");
        
        const ttsPromise = generateAndUploadTTS(summaryText, categories, timeRange, italyDetailed);
        
        const audioUrl = await Promise.race([
            ttsPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout nella generazione TTS (Fase 4).')), TIMEOUT_MS_AI_CALL))
        ]);
        
        logStep("4", `🔊 Audio URL pronto: ${audioUrl}`);

        // 5. Risposta finale
        logStep("5", "Risposta finale inviata al client.");
        clearTimeout(timer);
        res.json({
            summaryText,
            audioUrl,
            articlesCount: allArticles.length,
            categories,
            timeRange,
            cached: false,
            timestamp: new Date().toISOString(),
            logs: logs
        });

    } catch (error) {
        clearTimeout(timer);
        logStep("X", `ERRORE FATALE NELLA ROUTE: ${error.message}`);
        console.error('❌ Errore nella route /api/alfred/news:', error);
        res.status(500).json({ 
            status: "error",
            error: 'Errore interno del server. Riprova più tardi.',
            details: error.message,
            logs: logs
        });
    }
});

// ==================================================================================
// 🟢 FINE ROTTA "Routes16_06LeggiNotizieDalMondo"
// ==================================================================================
export default router;