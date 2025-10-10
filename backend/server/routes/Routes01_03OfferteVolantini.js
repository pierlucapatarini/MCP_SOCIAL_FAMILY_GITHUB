import { Router } from "express";
import { chromium } from "playwright";

const router = Router();

// Funzione di utility per il logging
const createLogFunction = (logs) => (step, message) => {
  const fullMessage = `[STEP ${step}] ${message}`;
  logs.push(fullMessage);
  console.log(fullMessage);
};

// =================================================================
// ROTTA /CARREFOUR
// =================================================================
router.get("/carrefour", async (req, res) => {
  const searchAddress = "10023, Chieri, Torino"; 
  const logs = []; 
  
  const logStep = (step, message) => {
    const fullMessage = `[STEP ${step}] ${message}`;
    logs.push(fullMessage);
    console.log(fullMessage);
  };

  logStep("0", `Avvio scraping Carrefour per indirizzo fisso: ${searchAddress}`);

  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext({
    permissions: ["geolocation"],
    geolocation: { latitude: 45.03, longitude: 7.73 }, 
    locale: "it-IT",
  });
  const page = await context.newPage();

  page.on("console", msg => console.log(`🌐 [Browser Log]:`, msg.text()));

  try {
    // STEP 1 - Apertura
    logStep("1", "Apertura pagina principale...");
    await page.goto("https://www.carrefour.it/volantino", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500); 
    logStep("1", "Pagina caricata.");

    // STEP 2 - Geolocalizzazione simulata
    logStep("2", "Geolocalizzazione simulata.");

    // STEP 3 - Cookie
    logStep("3", "Tentativo di click automatico sui cookie...");
    try {
      const accettaButton = await page.waitForSelector(
        '#onetrust-accept-btn-handler, button:has-text("Accetta tutto"), button:has-text("Accetto")',
        { timeout: 15000 } 
      );
      await accettaButton.click({ force: true }); 
      logStep("3", "✅ Cookie accettati automaticamente.");
    } catch (e) {
      logStep("3", `⚠️ Fallito click cookie automatico. Proseguo.`);
    }
    await page.waitForTimeout(3000); 

    // STEP 4 - Ricerca con Indirizzo Fisso
    logStep("4", `Eseguo la ricerca per l'indirizzo fisso: ${searchAddress}`);
    
    const input = await page.waitForSelector(
      'input[placeholder*="CAP"], input[name*="cap"], input[type="search"]', 
      { timeout: 20000 }
    );
    await input.fill(searchAddress); 
    await page.waitForTimeout(2000);
    
    logStep("4", "Simulazione Enter per confermare l'indirizzo.");
    await page.keyboard.press("Enter");
    
    // Attesa per i risultati
    await page.waitForTimeout(8000); 
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(2000); 
    logStep("4", "✅ Ricerca indirizzo completata e risultati attesi.");

    // STEP 5 - Trova e clicca il primo negozio
    const storeLinkSelector = 'a[href*="/volantino/"]'; 
    logStep("5", `Attesa e click sul primo link negozio trovato: ${storeLinkSelector}`);
    
    await page.waitForSelector(storeLinkSelector, { timeout: 25000 });

    const storeLink = page.locator(storeLinkSelector).first();
    const storeUrl = await storeLink.getAttribute('href');
    
    await storeLink.click();
    await page.waitForLoadState('domcontentloaded');

    logStep("5", `✅ Negozio scelto e navigazione completata a: ${storeUrl}`);

    // ***************************************************************
    // STEP 6 - Estrazione volantini (LOGICA RIATTIVATA)
    // ***************************************************************
    logStep("6", "Pagina negozio caricata. Inizio estrazione volantini.");

    // Scroll completo per caricare tutti i volantini
    await page.waitForTimeout(4000);
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(3000);
    
    // Torna su
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);

    logStep("6", "Estrazione link volantini con metodo JavaScript...");
    
    // ESTRAZIONE CON page.evaluate() - più affidabile
    const final_flyers = await page.evaluate(() => {
      // Cerca tutti i link che contengono il pattern dei volantini
      const links = Array.from(document.querySelectorAll('a[href*="/volantino/"]'));
      
      const flyerLinks = links
        .filter(link => {
          const href = link.href;
          // Filtro rigoroso: deve contenere il negozio specifico (4999) E un pattern di volantino
          return href.includes('/4999/') && 
                 (href.includes('-volantino-') || href.includes('-catalogo-')) &&
                 href.match(/\/\d+$/); // Deve terminare con ID
        })
        .map(link => {
          // Estrai titolo pulito
          let title = link.textContent.trim();
          if (!title || title.length < 3) {
            title = link.getAttribute('title') || 
                    link.getAttribute('aria-label') || 
                    'Volantino';
          }
          
          title = title.replace(/\s+/g, ' ').trim();
          
          return {
            title: title.substring(0, 100),
            url: link.href
          };
        });
      
      // Rimuovi duplicati basati sull'URL
      const uniqueFlyers = [];
      const seenUrls = new Set();
      
      for (const flyer of flyerLinks) {
        if (!seenUrls.has(flyer.url)) {
          seenUrls.add(flyer.url);
          uniqueFlyers.push(flyer);
        }
      }
      
      return uniqueFlyers;
    });

    logStep("6", `✅ Trovati ${final_flyers.length} volantini unici!`);
    
    // Log dettagliato di ogni volantino trovato
    if (final_flyers.length > 0) {
      final_flyers.forEach((flyer, idx) => {
        logStep("6", `  📄 [${idx + 1}] ${flyer.title}`);
      });
    } else {
      logStep("6", "⚠️ ATTENZIONE: Nessun volantino trovato! Verificare i selettori.");
    }

    await browser.close();
    
    res.json({ 
      status: "ok", 
      search_address: searchAddress,
      store_chosen_url: storeUrl, 
      all_final_flyers: final_flyers,
      logs: logs 
    }); 

  } catch (error) {
    logStep("X", `ERRORE FATALE: ${error.message}`);
    console.error("❌ Errore scraping Carrefour:", error.message);
    
    if (browser) {
        await browser.close();
    }
    
    res.status(500).json({ 
      status: "error", 
      message: `Errore: ${error.message}`, 
      logs 
    });
  }
});


// =================================================================
// ROTTA /LIDL (ESTRAZIONE LINK VISUALIZZATORE VOLANTINI)
// =================================================================
router.get("/lidl", async (req, res) => {
  const searchAddress = req.query.address || "10023, Chieri, Torino"; 
  const logs = []; 
  const logStep = createLogFunction(logs);

  logStep("0", `Avvio scraping Lidl per indirizzo: ${searchAddress}`);

  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext({
    permissions: ["geolocation"],
    geolocation: { latitude: 45.03, longitude: 7.73 }, 
    locale: "it-IT",
  });
  const page = await context.newPage();

  page.on("console", msg => console.log(`🌐 [Browser Log]:`, msg.text()));

  let storeUrl = "Non trovato";
  
  try {
    // STEP 1 - Apertura Pagina Volantini
    logStep("1", "Apertura pagina volantini...");
    await page.goto("https://www.lidl.it/c/volantino-lidl/s10018048", { waitUntil: "domcontentloaded" });
    logStep("1", "✅ Pagina caricata.");
    await page.waitForTimeout(2000); 

    // STEP 2 - Gestione Cookie
    logStep("2", "Tentativo di click automatico sui cookie...");
    try {
      const accettaButton = await page.waitForSelector(
        'button#onetrust-accept-btn-handler',
        { timeout: 10000 } 
      );
      await accettaButton.click({ force: true }); 
      logStep("2", "✅ Cookie accettati automaticamente.");
    } catch (e) {
      logStep("2", "⚠️ Fallito click cookie automatico. Proseguo.");
    }
    await page.waitForTimeout(4000); 

    // STEP 3 - Click sul pulsante 'Seleziona Negozio'
    logStep("3", "Click sul pulsante per aprire la selezione negozio...");
    
    const storeSelectButtonSelector = '.overlay__store-select-button';
    
    await page.waitForSelector(storeSelectButtonSelector, { 
        state: 'visible', 
        timeout: 20000 
    });
    
    const storeSelectButton = page.locator(storeSelectButtonSelector).first();
    await storeSelectButton.click();
    
    logStep("3", "✅ Modulo di ricerca aperto.");
    await page.waitForTimeout(1000);

    // STEP 4 - Ricerca con Indirizzo (CON AUTOCOMPLETE)
    logStep("4", `Inserimento indirizzo: ${searchAddress}`);
    
    const searchInput = page.locator('input.search-field__input');
    await searchInput.waitFor({ state: 'visible', timeout: 15000 });
    
    await searchInput.click();
    await page.waitForTimeout(500);
    
    await searchInput.type(searchAddress, { delay: 100 });
    await page.waitForTimeout(2000);
    
    logStep("4", "Indirizzo digitato, attesa suggerimenti autocomplete...");
    
    try {
      await page.waitForSelector('[role="listbox"], ul[id^="v-"], .autocomplete-results', { 
        timeout: 5000, 
        state: 'visible' 
      });
      logStep("4", "Dropdown suggerimenti apparso!");
      
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(500);
      
      await page.keyboard.press('Enter');
      logStep("4", "✅ Primo suggerimento selezionato con Enter.");
      
    } catch (e) {
      logStep("4", "Nessun dropdown trovato. Provo invio diretto...");
      await page.keyboard.press('Enter');
    }

    await page.waitForTimeout(6000);
    logStep("4", "✅ Attesa completata per caricamento risultati.");

    // STEP 5 - Chiudi popup e rimani sulla pagina
    logStep("5", "Chiusura popup e preparazione per estrazione volantini...");
    
    try {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    } catch (e) {
      // Ignora
    }
    
    await page.waitForTimeout(3000);
    
    storeUrl = page.url();
    logStep("5", `✅ Pagina corrente: ${storeUrl}`);

    // STEP 6 - ESTRAZIONE LINK VISUALIZZATORE VOLANTINI
    logStep("6", "Inizio estrazione link volantini dal visualizzatore...");

    // Scroll per caricare tutto il contenuto
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 1000));
      await page.waitForTimeout(1200);
    }
    
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(2000);
    
    logStep("6", "Scroll completo. Estrazione link con pattern /l/it/volantini/...");
    
    const final_flyers = await page.evaluate(() => {
      // PATTERN CORRETTO: /l/it/volantini/NOME/view/flyer
      const allLinks = Array.from(document.querySelectorAll('a[href*="/l/it/volantini/"]'));
      
      console.log(`[DEBUG] Totale link /l/it/volantini/ trovati: ${allLinks.length}`);
      
      const flyerLinks = allLinks
        .filter(link => {
          const href = link.href;
          // Deve contenere il pattern completo del visualizzatore
          const isValidFlyer = href.includes('/l/it/volantini/') && 
                              href.includes('/view/flyer');
          
          if (isValidFlyer) {
            console.log(`[DEBUG] ✅ Link volantino valido: ${href}`);
          } else {
            console.log(`[DEBUG] ❌ Link scartato: ${href}`);
          }
          
          return isValidFlyer;
        })
        .map(link => {
          // Estrazione titolo avanzata
          let title = '';
          
          // 1. Cerca nel parent più vicino
          const parent = link.closest('article') || 
                        link.closest('[class*="leaflet"]') ||
                        link.closest('[class*="flyer"]') ||
                        link.closest('[class*="card"]') ||
                        link.closest('[class*="item"]') ||
                        link.closest('li') ||
                        link.closest('div');
          
          if (parent) {
            // Cerca heading
            const heading = parent.querySelector('h1, h2, h3, h4, h5, h6');
            
            // Cerca elementi con classe title/name
            const titleEl = parent.querySelector('[class*="title"], [class*="name"], [class*="heading"], [class*="label"]');
            
            // Cerca span/div con testo
            const textEl = parent.querySelector('span, p, div');
            
            // Cerca immagine con alt
            const img = link.querySelector('img') || parent.querySelector('img');
            const altText = img?.alt;
            
            // Cerca data-attributes
            const dataTitle = link.getAttribute('data-title') || 
                            link.getAttribute('title') ||
                            parent.getAttribute('data-title');
            
            title = (heading?.textContent || 
                    titleEl?.textContent || 
                    dataTitle ||
                    altText || 
                    textEl?.textContent ||
                    link.textContent).trim();
          } else {
            title = link.textContent.trim();
          }
          
          // Se ancora vuoto, estrai dal URL
          if (!title || title.length < 3) {
            const urlParts = link.href.split('/');
            // Cerca la parte tra /volantini/ e /view/
            const nameIndex = urlParts.indexOf('volantini') + 1;
            if (nameIndex > 0 && urlParts[nameIndex]) {
              title = urlParts[nameIndex]
                .replace(/-/g, ' ')
                .replace(/\b\w/g, c => c.toUpperCase());
            }
          }
          
          // Pulizia finale
          title = title
            .replace(/\s+/g, ' ')
            .replace(/[\n\r\t]/g, ' ')
            .replace(/^(Vai a|Apri|Visualizza|Scopri|Vedi)\s+/gi, '')
            .trim();
          
          // Normalizza URL a page/1
          let normalizedUrl = link.href;
          if (!normalizedUrl.includes('/page/')) {
            normalizedUrl = normalizedUrl.replace('/view/flyer', '/view/flyer/page/1');
          } else {
            normalizedUrl = normalizedUrl.replace(/\/page\/\d+/, '/page/1');
          }
          
          console.log(`[DEBUG] Titolo estratto: "${title}" | URL: ${normalizedUrl}`);
          
          return {
            title: title.substring(0, 150) || 'Volantino Lidl',
            url: normalizedUrl
          };
        });
      
      console.log(`[DEBUG] Volantini dopo filtro: ${flyerLinks.length}`);
      
      // Rimuovi duplicati basati sull'URL normalizzato
      const uniqueFlyers = [];
      const seenUrls = new Set();
      
      for (const flyer of flyerLinks) {
        if (!seenUrls.has(flyer.url)) {
          seenUrls.add(flyer.url);
          uniqueFlyers.push(flyer);
        }
      }
      
      console.log(`[DEBUG] ✅ Volantini unici finali: ${uniqueFlyers.length}`);
      
      return uniqueFlyers;
    });

    logStep("6", `✅ Trovati ${final_flyers.length} volantini unici!`);
    
    if (final_flyers.length > 0) {
      final_flyers.forEach((flyer, idx) => {
        logStep("6", `  📄 [${idx + 1}] ${flyer.title}`);
        logStep("6", `      🔗 ${flyer.url}`);
      });
    } else {
      logStep("6", "⚠️ ATTENZIONE: Nessun volantino trovato! Verificare i selettori.");
      
      // Debug: stampa tutti i link presenti
      const allLinksDebug = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .map(a => a.href)
          .filter(href => href.includes('volantini') || href.includes('flyer'))
          .slice(0, 20);
      });
      logStep("6", `[DEBUG] Link trovati con 'volantini/flyer': ${JSON.stringify(allLinksDebug, null, 2)}`);
    }

    await browser.close();
    
    res.json({ 
      status: "ok", 
      search_address: searchAddress,
      store_chosen_url: storeUrl, 
      all_final_flyers: final_flyers,
      logs: logs 
    }); 

  } catch (error) {
    logStep("X", `ERRORE FATALE: ${error.message}`);
    console.error("❌ Errore scraping Lidl:", error.message);
    
    if (browser) {
        await browser.close();
    }
    
    res.status(500).json({ 
      status: "error", 
      message: `Errore: ${error.message}`, 
      logs 
    });
  }
});

// =================================================================
// ROTTE PLACEHOLDER
// =================================================================
router.get("/penny", async (req, res) => {
    res.status(501).json({ status: "error", message: "Scraper Penny non implementato.", logs: ["Funzionalità non ancora disponibile (Errore 501: Not Implemented)."] });
});
router.get("/esselunga", async (req, res) => {
    res.status(501).json({ status: "error", message: "Scraper Esselunga non implementato.", logs: ["Funzionalità non ancora disponibile (Errore 501: Not Implemented)."] });
});

export default router;