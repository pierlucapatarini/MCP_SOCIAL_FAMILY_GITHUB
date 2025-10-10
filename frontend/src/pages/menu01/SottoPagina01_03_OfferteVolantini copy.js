import React, { useState } from "react";
import "../../styles/StilePagina01_03.css"; // Assumi che questo file CSS definisca gli stili necessari

export default function SottoPagina01_03_OfferteVolantini() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cap, setCap] = useState("10023 chieri to"); // Aggiornato con l'indirizzo di Chieri

  // FUNZIONE testScrape (Invariata)
  const testScrape = async (store, method) => {
    setLoading(true);
    setResult({ error: "Test scraping in corso..." }); 
    try {
      const res = await fetch(`http://localhost:3001/api/offerte-volantini/test-${method}/${store}`);
      if (!res.ok) throw new Error(`Errore caricamento: ${res.status}`);
      const data = await res.json();
      setResult({ data: data.html }); 
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };
  // FINE FUNZIONE testScrape

  // Funzione per la ricerca Carrefour
  const cercaCarrefour = async () => {
    setLoading(true);
    setResult(null); 
    try {
      // Chiama la rotta Carrefour (che usa l'indirizzo fisso 10023 Chieri nel backend)
      const res = await fetch(`api/offerte-volantini/carrefour`); 
      const data = await res.json();
      
      if (data.status === 'ok') {
        
        // Stampa i log del backend nella console del browser
        console.log("--- LOG COMPLETI DAL BACKEND (Carrefour) ---");
        data.logs.forEach(log => console.log(log));
        console.log("-------------------------------------------");

        // Memorizza l'oggetto completo (che include 'logs', 'all_final_flyers', 'store_chosen_url', ecc.)
        setResult(data);
        
      } else {
         // Gestisce errori e memorizza anche i log in caso di fallimento
         setResult({ error: data.message || "Errore sconosciuto nel backend.", logs: data.logs || [] });
      }
    } catch (error) {
      setResult({ error: `Errore di connessione al backend: ${error.message}`, logs: [] });
    } finally {
      setLoading(false);
    }
  };

  // Funzione per renderizzare i risultati (CORRETTA)
  const renderResults = () => {
    if (!result) return null;
    
    // Sezione per mostrare i log
    const logSection = (result.logs && result.logs.length > 0) ? (
        <div className="log-container">
            <h4>Log di Esecuzione (Backend):</h4>
            <pre className="log-output">
                {result.logs.join('\n')}
            </pre>
        </div>
    ) : null;

    // 1. Gestione errori
    if (result.error) {
        return (
            <>
                <p className="risultato-errore">ERRORE FATALE: {result.error}</p>
                {logSection}
            </>
        );
    }
    
    // 2. Gestione risultati dei test
    if (result.data) {
        return (
            <div className="risultato-container">
                <h3>Risultato Test Scraping</h3>
                <pre className="risultato-scraping">{result.data}</pre>
            </div>
        );
    }

    // 3. Gestione risultati Carrefour (mostra i link)
    const flyers = result.all_final_flyers;
    const storeUrl = result.store_chosen_url; // Chiave corretta dal backend
    
    // Tentativo di estrarre un nome leggibile dall'URL
    const storeName = storeUrl ? storeUrl.split('/').slice(-3, -1).join(' / ') : 'Non disponibile';

    return (
        <div className="risultato-container">
            {logSection} 
            
            <h3>Risultato Scraper Carrefour</h3>

            {/* Visualizza l'URL del negozio */}
            <p>
                <strong>Negozio Scelto:</strong> 
                <a 
                    href={storeUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    title={storeUrl}
                >
                    {storeName} 🔗
                </a>
            </p>
            
            {flyers && flyers.length > 0 ? (
                <>
                    <h4>Volantini disponibili ({flyers.length}):</h4>
                    <ul>
                        {flyers.map((flyer, index) => (
                            <li key={index}>
                                🔗 <a 
                                    href={flyer.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    title={`URL: ${flyer.url}`}
                                >
                                    {flyer.title || `Volantino senza titolo (${index + 1})`}
                                </a>
                            </li>
                        ))}
                    </ul>
                </>
            ) : (
                <p>Nessun volantino sfogliabile trovato per il negozio scelto. Controlla i Log per i dettagli sull'errore allo STEP 6 o 9.</p>
            )}
        </div>
    );
  };

  return (
    <div className="pagina01_03-volantini">
      <h1>🛒 Offerte Volantini Carrefour / Coop / Conad</h1>

      <div className="sezione-input-cap">
        <label>Nota: La ricerca Carrefour usa l'indirizzo fisso **{cap}** (Chieri, TO).</label>
        <input
          type="text"
          value={cap}
          onChange={(e) => setCap(e.target.value)}
          placeholder="Es. 10020 cambiano to"
          disabled // Disabilita l'input per chiarezza sul test Carrefour
        />
        <button 
          onClick={cercaCarrefour} 
          disabled={loading}
        >
          {loading ? 'Caricamento in corso...' : 'Cerca Carrefour (Test Fisso)'}
        </button>
      </div>

      <div className="bottoni-scraping">
        <button onClick={() => testScrape("coop", "puppeteer")} disabled={loading}>Test Puppeteer Coop</button>
        <button onClick={() => testScrape("coop", "playwright")} disabled={loading}>Test Playwright Coop</button>
        <button onClick={() => testScrape("conad", "puppeteer")} disabled={loading}>Test Puppeteer Conad</button>
        <button onClick={() => testScrape("conad", "playwright")} disabled={loading}>Test Playwright Conad</button>
      </div>
      
      {renderResults()} 
      
    </div>
  );
}