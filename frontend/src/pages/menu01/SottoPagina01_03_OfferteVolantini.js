import React, { useState } from "react";
import "../../styles/StilePagina01_03.css"; 

export default function SottoPagina01_03_OfferteVolantini() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState("chieri");
  const [currentStore, setCurrentStore] = useState(null);

  const addresses = {
    chieri: "Corso Torino, 10023 Chieri TO, Italia",
    cambiano: "Via Nazionale, 10020 Cambiano TO, Italia",
  };

  // === Test Scrape ===
  const testScrape = async (store, method) => {
    setLoading(true);
    setCurrentStore(store);
    setResult({ error: `Test scraping ${store} in corso...` }); 
    try {
      const res = await fetch(`api/offerte-volantini/test-${method}/${store}`);
      if (!res.ok) throw new Error(`Errore caricamento: ${res.status}`);
      const data = await res.json();
      setResult({ data: data.html }); 
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  // === Ricerca Offerte ===
  const cercaOfferte = async (store) => {
    setLoading(true);
    setResult(null); 
    setCurrentStore(store);

    const address = addresses[selectedAddress];
    let apiUrl = `api/offerte-volantini/${store}`;

    // 🔹 Invio dell’indirizzo anche a Lidl e Carrefour
    if (["carrefour", "lidl"].includes(store)) {
      apiUrl += `?address=${encodeURIComponent(address)}`;
    }

    try {
      const res = await fetch(apiUrl);
      const data = await res.json();

      if (data.status === "ok") {
        console.log(`--- LOG COMPLETI DAL BACKEND (${store}) ---`);
        data.logs?.forEach((log) => console.log(log));
        console.log("-------------------------------------------");
        setResult(data);
      } else {
        setResult({
          error: data.message || `Errore sconosciuto nel backend per ${store}.`,
          logs: data.logs || [],
        });
      }
    } catch (error) {
      setResult({
        error: `Errore di connessione al backend: ${error.message}`,
        logs: [],
      });
    } finally {
      setLoading(false);
    }
  };

  // === Render Risultati ===
  const renderResults = () => {
    if (!result) return null;

    const logSection =
      result.logs && result.logs.length > 0 ? (
        <div className="log-container">
          <h4>📜 Log di Esecuzione Backend:</h4>
          <pre className="log-output">{result.logs.join("\n")}</pre>
        </div>
      ) : null;

    // Errore fatale
    if (result.error) {
      return (
        <>
          <p className="risultato-errore">❌ ERRORE: {result.error}</p>
          {logSection}
        </>
      );
    }

    // Test HTML output
    if (result.data) {
      return (
        <div className="risultato-container">
          <h3>Risultato Test Scraping ({currentStore} - HTML)</h3>
          <pre className="risultato-scraping">{result.data}</pre>
        </div>
      );
    }

    // Risultati veri (Carrefour, Lidl, ecc.)
    const flyers = result.all_final_flyers || [];
    const storeUrl = result.store_chosen_url;

    const storeName = storeUrl
      ? storeUrl.split("/").slice(-3, -1).join(" / ")
      : "Non disponibile";

    return (
      <div className="risultato-container">
        {logSection}
        <h3>📦 Risultato Scraper {currentStore.toUpperCase()}</h3>

        <p>
          <strong>Indirizzo Ricercato:</strong>{" "}
          {result.search_address || addresses[selectedAddress]}
        </p>
        {storeUrl && (
          <p>
            <strong>Negozio Trovato:</strong>{" "}
            <a href={storeUrl} target="_blank" rel="noopener noreferrer">
              {storeName} 🔗
            </a>
          </p>
        )}

        {flyers.length > 0 ? (
          <>
            <h4>📰 Volantini disponibili ({flyers.length}):</h4>
            <ul>
              {flyers.map((flyer, i) => (
                <li key={i}>
                  🔗{" "}
                  <a
                    href={flyer.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={flyer.url}
                  >
                    {flyer.title || `Volantino senza titolo (${i + 1})`}
                  </a>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p style={{ color: storeUrl ? "orange" : "red" }}>
            ⚠️ Nessun volantino trovato. Controlla i log.
          </p>
        )}
      </div>
    );
  };

  // === JSX ===
  return (
    <div className="pagina01_03-volantini">
      <h1>🛒 Offerte Volantini Ricerca Scraper</h1>

      <div className="sezione-input-cap">
        <label htmlFor="address-select">
          Seleziona l'indirizzo per la ricerca:
        </label>
        <select
          id="address-select"
          value={selectedAddress}
          onChange={(e) => setSelectedAddress(e.target.value)}
          disabled={loading}
        >
          <option value="chieri">{addresses.chieri}</option>
          <option value="cambiano">{addresses.cambiano}</option>
        </select>
      </div>

      <div className="bottoni-ricerca">
        <button onClick={() => cercaOfferte("carrefour")} disabled={loading}>
          {loading && currentStore === "carrefour"
            ? "Caricamento Carrefour..."
            : "Cerca Carrefour"}
        </button>
        <button onClick={() => cercaOfferte("lidl")} disabled={loading}>
          {loading && currentStore === "lidl"
            ? "Caricamento Lidl..."
            : "Cerca Lidl"}
        </button>
        <button onClick={() => cercaOfferte("penny")} disabled={loading}>
          {loading && currentStore === "penny"
            ? "Caricamento Penny..."
            : "Cerca Penny"}
        </button>
        <button onClick={() => cercaOfferte("esselunga")} disabled={loading}>
          {loading && currentStore === "esselunga"
            ? "Caricamento Esselunga..."
            : "Cerca Esselunga"}
        </button>
      </div>

      <p className="note-test">
        *Nota: La ricerca è completa solo per Carrefour e Lidl.
      </p>

      <div className="bottoni-scraping">
        <button
          onClick={() => testScrape("coop", "puppeteer")}
          disabled={loading}
        >
          Test Puppeteer Coop
        </button>
        <button
          onClick={() => testScrape("coop", "playwright")}
          disabled={loading}
        >
          Test Playwright Coop
        </button>
        <button
          onClick={() => testScrape("conad", "puppeteer")}
          disabled={loading}
        >
          Test Puppeteer Conad
        </button>
        <button
          onClick={() => testScrape("conad", "playwright")}
          disabled={loading}
        >
          Test Playwright Conad
        </button>
      </div>

      {renderResults()}
    </div>
  );
}
