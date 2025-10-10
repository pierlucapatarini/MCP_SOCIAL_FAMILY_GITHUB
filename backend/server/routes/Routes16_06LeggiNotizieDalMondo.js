// ==================================================================================
// 🟢 INIZIO ROTTA "Routes16_06LeggiNotizieDalMondo"
// ==================================================================================
import { Router } from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import { supabase } from "../config.js";

const router = Router();

// Add your API keys from environment variables
const NEWSDATA_API_KEY = process.env.NEWSDATA_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'audio-files';



// A) Funzione per fetch notizie italiane da RSS
async function fetchItalianNews(timeRange, detailedMode = false) {
    const italianRssUrls = [
        { url: 'https://www.corriere.it/rss/homepage.xml', source: 'Corriere della Sera' },
        { url: 'https://www.repubblica.it/rss/homepage/rss2.0.xml', source: 'La Repubblica' },
        { url: 'https://www.lastampa.it/rss/homepage.xml', source: 'La Stampa' },
        { url: 'https://www.ilsole24ore.com/rss/italia--attualita.xml', source: 'Il Sole 24 Ore' }
    ];

    // Se modalità dettagliata, aggiungi RSS specifici
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

                // Filtra per tempo e qualità
                if (pubDate > minTime && title && title.length > 10) {
                    italianArticles.push({ 
                        source: rssSource.source,
                        title, 
                        content: description || title, 
                        category: 'Italia',
                        link: link,
                        pubDate: pubDate.toISOString()
                    });
                }
            });
        } catch (err) {
            console.warn(`⚠️ RSS fetch failed per ${rssSource.source}:`, err.message);
        }
    }

    // Ordina per data e limita
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

        // LIMITIAMO IL NUMERO DI PAESI PER OGNI CHIAMATA PER ESSERE PIÙ EFFICIENTI
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
            console.warn(`⚠️ NewsData.io failed for ${category}:`, err.message);
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
        // Prepara il testo per TTS (rimuovi markdown)
        const cleanText = text
            .replace(/#{1,6}\s/g, '') // Rimuovi header markdown
            .replace(/\*\*(.*?)\*\*/g, '$1') // Rimuovi grassetto
            .replace(/\*(.*?)\*/g, '$1') // Rimuovi corsivo
            .replace(/`(.*?)`/g, '$1') // Rimuovi code
            .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Rimuovi link markdown
            .substring(0, 2500); // Limita lunghezza per ElevenLabs

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

        // Nome file unico
        const timestamp = Date.now();
        const categoriesSlug = categories.sort().join('_').toLowerCase().replace(/\s+/g, '_');
        const fileName = `alfred_news_${categoriesSlug}_${timeRange}h${italyDetailed ? '_detailed' : ''}_${timestamp}.mp3`;

        // Upload a Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(SUPABASE_STORAGE_BUCKET)
            .upload(fileName, elevenLabsResponse.data, {
                contentType: 'audio/mpeg'
            });

        if (uploadError) throw uploadError;

        // Genera URL pubblico
        const { data: publicUrlData } = supabase.storage
            .from(SUPABASE_STORAGE_BUCKET)
            .getPublicUrl(fileName);

        return publicUrlData.publicUrl;

    } catch (error) {
        console.error("❌ Errore TTS/Upload:", error.message);
        // Fallback in caso di errore
        return `http://localhost:3001/audio/news_placeholder.mp3`;
    }
}

// ===================================
// 🔥 ROUTE HANDLER PRINCIPALE - QUESTO MANCAVA!
// ===================================
router.post('/', async (req, res) => {
    try {
        const { categories = ['Italia'], timeRange = 24, italyDetailed = false, mode = 'classic' } = req.body;

        console.log(`📰 Alfred News Request: categories=${categories.join(',')}, timeRange=${timeRange}h, detailed=${italyDetailed}`);

        // 1. Fetch notizie italiane
        let allArticles = [];
        if (categories.includes('Italia')) {
            const italianNews = await fetchItalianNews(timeRange, italyDetailed);
            allArticles = allArticles.concat(italianNews);
            console.log(`🇮🇹 Fetched ${italianNews.length} Italian articles`);
        }

        // 2. Fetch notizie internazionali
        const worldCategories = categories.filter(c => c !== 'Italia');
        if (worldCategories.length > 0) {
            const worldNews = await fetchWorldNews(worldCategories, timeRange);
            allArticles = allArticles.concat(worldNews);
            console.log(`🌍 Fetched ${worldNews.length} world articles`);
        }

        if (allArticles.length === 0) {
            return res.status(404).json({ 
                error: 'Nessuna notizia trovata per i criteri selezionati.' 
            });
        }

        // 3. Genera summary con AI (simulato per ora )
        const summaryText = generateNewsSummary(allArticles, categories, timeRange);

        // 4. Genera audio TTS
        const audioUrl = await generateAndUploadTTS(summaryText, categories, timeRange, italyDetailed);

        // 5. Risposta finale
        res.json({
            summaryText,
            audioUrl,
            articlesCount: allArticles.length,
            categories,
            timeRange,
            cached: false,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Errore nella route /api/alfred/news:', error);
        res.status(500).json({ 
            error: 'Errore interno del server. Riprova più tardi.',
            details: error.message 
        });
    }
});

// Funzione helper per generare il summary (puoi sostituire con AI)
function generateNewsSummary(articles, categories, timeRange) {
    const articlesCount = articles.length;
    const categoriesText = categories.join(', ');
    
    let summary = `<h2>📰 Riepilogo Notizie - ${categoriesText}</h2>\n`;
    summary += `<p><strong>Periodo:</strong> Ultime ${timeRange} ore | <strong>Articoli analizzati:</strong> ${articlesCount}</p>\n\n`;

    // Raggruppa per categoria
    const articlesByCategory = articles.reduce((acc, article) => {
        if (!acc[article.category]) acc[article.category] = [];
        acc[article.category].push(article);
        return acc;
    }, {});

    for (const [category, categoryArticles] of Object.entries(articlesByCategory)) {
        summary += `<h3>${getCategoryEmoji(category)} ${category}</h3>\n`;
        
        // Mostra i primi 5 articoli per categoria
        categoryArticles.slice(0, 5).forEach((article, index) => {
            summary += `<div style="margin-bottom: 15px;">\n`;
            summary += `<strong>${index + 1}. ${article.title}</strong><br>\n`;
            summary += `<small><em>Fonte: ${article.source}</em></small><br>\n`;
            if (article.content && article.content !== article.title) {
                const shortContent = article.content.substring(0, 150) + '...';
                summary += `${shortContent}<br>\n`;
            }
            if (article.link) {
                summary += `<a href="${article.link}" target="_blank">Leggi articolo completo</a>\n`;
            }
            summary += `</div>\n`;
        });
    }

    summary += `<hr>\n<p><small>🤖 Riepilogo generato da Alfred alle ${new Date().toLocaleString('it-IT')}</small></p>`;
    
    return summary;
}

function getCategoryEmoji(category) {
    const emojiMap = {
        'Italia': '🇮🇹',
        'Mondo Occidentale': '🌍',
        'Mondo Arabo': '🕌',
        'Mondo Orientale': '🏯'
    };
    return emojiMap[category] || '📰';
}



// ==================================================================================
// 🟢 FINE ROTTA "Routes16 06LeggiNotizieDalMondo"
// ==================================================================================
export default router;