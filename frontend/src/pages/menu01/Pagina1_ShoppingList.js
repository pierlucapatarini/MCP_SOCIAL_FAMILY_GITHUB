import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import "../../styles/StilePagina1.css";
import "../../styles/MainStyle.css";
import { FaBars } from 'react-icons/fa';

// --- COSTANTI DI CONFIGURAZIONE ---
const SUPERMARKETS = [
  { key: "esselunga", label: "Esselunga", priceField: "prezzo_esselunga", corsiaField: "corsia_esselunga", icon: "🛒" },
  { key: "mercato", label: "Mercato", priceField: "prezzo_mercato", corsiaField: "corsia_mercato", icon: "🍏" },
  { key: "carrefour", label: "Carrefour", priceField: "prezzo_carrefour", corsiaField: "corsia_carrefour", icon: "🇫🇷" },
  { key: "penny", label: "Penny", priceField: "prezzo_penny", corsiaField: "corsia_penny", icon: "💰" },
  { key: "coop", label: "Coop", priceField: "prezzo_coop", corsiaField: "corsia_coop", icon: "🤝" },
];

const MODES = [
  { key: "archivio", label: "Digitare/Visualizza Lista", icon: "📚" },
  { key: "preferiti", label: "Lista Preferiti", icon: "⭐️" },
  { key: "vocale", label: "Comando Vocale", icon: "🎤" },
  { key: "ricette", label: "Ricette AI", icon: "👩‍🍳" },
];

// --- COMPONENTE PRINCIPALE ---
export default function ExportPagina01_01ShoppingList() {
  const navigate = useNavigate();
  
  // --- STATI ---
  const [userProfile, setUserProfile] = useState(null);
  const [familyGroup, setFamilyGroup] = useState(null);
  const [prodotti, setProdotti] = useState([]);
  const [categorie, setCategorie] = useState([]);
  const [shoppingItems, setShoppingItems] = useState([]);
  
  const [selectedSupermarket, setSelectedSupermarket] = useState(SUPERMARKETS[0].key);
  const [mode, setMode] = useState(MODES[0].key);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOtherPrices, setShowOtherPrices] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, ascending: true });
  const [isListening, setIsListening] = useState(false);
  const [showFullList, setShowFullList] = useState(false);

  // --- CARICAMENTO DATI ---
  useEffect(() => {
    async function loadInitialData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("id, username, family_group").eq("id", user.id).single();
      if (profile) {
        setUserProfile(profile);
        setFamilyGroup(profile.family_group);

        const [prodRes, catRes, shopRes] = await Promise.all([
          supabase.from("prodotti").select("*").eq("family_group", profile.family_group).order("articolo", { ascending: true }),
          supabase.from("categorie").select("*").order("name", { ascending: true }),
          supabase.from("shopping_items").select("*").eq("family_group", profile.family_group).order("created_at", { ascending: true }),
        ]);

        setProdotti(prodRes.data || []);
        setCategorie(catRes.data || []);
        setShoppingItems(shopRes.data || []);
      }
    }
    loadInitialData();
  }, [navigate]);

  // --- FUNZIONI HELPER ---
  const findCategory = (idOrName) => categorie.find(c => c.id === idOrName || c.name === idOrName) || {};

  // --- LOGICA DI RICERCA E ORDINAMENTO ---
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (mode === "preferiti") {
      const favorites = prodotti.filter(p => p.preferito);
      if (!q) return favorites.sort((a, b) => (findCategory(a.categoria_id)?.name || '').localeCompare(findCategory(b.categoria_id)?.name || ''));
      return favorites.filter(p => p.articolo.toLowerCase().includes(q) || (p.descrizione || "").toLowerCase().includes(q));
    }
    if (!q) return [];
    const truncatedQuery = q.length > 2 ? q.slice(0, -1) : q;
    return prodotti.filter(p => p.articolo.toLowerCase().includes(truncatedQuery) || (p.descrizione || "").toLowerCase().includes(truncatedQuery));
  }, [prodotti, searchQuery, mode, categorie]);

  const sortedShoppingItems = useMemo(() => {
    const notTaken = shoppingItems.filter(i => !i.fatto);
    const taken = shoppingItems.filter(i => i.fatto);
    
    if (sortConfig.key) {
      const sup = SUPERMARKETS.find(s => s.key === selectedSupermarket);
      notTaken.sort((a, b) => {
        let valA, valB;
        if (sortConfig.key === 'categoria') {
          valA = findCategory(a.categoria)?.name || '';
          valB = findCategory(b.categoria)?.name || '';
        } else if (sortConfig.key === 'corsia') {
          valA = findCategory(a.categoria)?.[sup?.corsiaField] || '';
          valB = findCategory(b.categoria)?.[sup?.corsiaField] || '';
        }
        return sortConfig.ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return [...notTaken, ...taken];
  }, [shoppingItems, sortConfig, selectedSupermarket, categorie]);

  // --- GESTIONE VOCALE ---
  const startVoiceRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('Riconoscimento vocale non supportato.');
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => setSearchQuery(event.results[0][0].transcript);
    recognition.onerror = (event) => alert('Errore riconoscimento vocale: ' + event.error);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  // --- AZIONI CRUD SULLA LISTA ---
  async function handleShoppingItem(action, payload) {
    if (!familyGroup || !userProfile) return;
    let result;
    switch (action) {
      case 'add':
        const sup = SUPERMARKETS.find(s => s.key === selectedSupermarket);
        const newItem = {
          articolo: payload.articolo,
          descrizione: payload.descrizione,
          inserito_da: userProfile.username,
          user_id: userProfile.id,
          quantita: 1,
          prezzo: payload[sup?.priceField] ?? 0,
          supermercato: selectedSupermarket,
          categoria: findCategory(payload.categoria_id)?.name || null,
          prodotto_id: payload.id,
          family_group: familyGroup,
          ...SUPERMARKETS.reduce((acc, s) => ({ ...acc, [s.priceField]: payload[s.priceField] }), {}),
        };
        result = await supabase.from("shopping_items").insert(newItem).select();
        if (result.data) setShoppingItems(s => [...s, ...result.data]);
        break;
      case 'update':
        result = await supabase.from("shopping_items").update(payload.patch).eq("id", payload.id).select();
        if (result.data) setShoppingItems(prev => prev.map(r => r.id === payload.id ? result.data[0] : r));
        break;
      case 'delete':
        await supabase.from('shopping_items').delete().eq('id', payload.id);
        setShoppingItems(prev => prev.filter(r => r.id !== payload.id));
        break;
      case 'clear':
        if (!window.confirm("Sei sicuro di azzerare tutta la lista?")) return;
        await supabase.from("shopping_items").delete().eq("family_group", familyGroup);
        setShoppingItems([]);
        break;
      case 'finish':
        const taken = shoppingItems.filter(i => i.fatto);
        if (taken.length === 0) return alert("Nessun articolo selezionato come preso.");
        const acquisti = taken.map(it => ({ ...it, data_acquisto: new Date().toISOString() }));
        await supabase.from("acquisti_effettuati").insert(acquisti);
        await supabase.from("shopping_items").delete().in("id", taken.map(t => t.id));
        setShoppingItems(prev => prev.filter(i => !i.fatto));
        alert("Acquisti salvati.");
        break;
      default: break;
    }
  }

  // --- RENDER COMPONENTI ---
  const renderShoppingList = (isFull) => (
    <div className="shopping-table-container">
      <table className="shopping-table">
        <thead>
          <tr>
            <th className="articolo-column-header">Articolo</th>
            <th>✔️</th>
            <th>🗑️</th>
            {isFull && <>
              <th>Quantità</th>
              <th>Prezzo</th>
              <th onClick={() => setSortConfig({ key: 'categoria', ascending: !sortConfig.ascending })}>
                Categoria {sortConfig.key === 'categoria' && (sortConfig.ascending ? '↓' : '↑')}
              </th>
              <th onClick={() => setSortConfig({ key: 'corsia', ascending: !sortConfig.ascending })}>
                Corsia {sortConfig.key === 'corsia' && (sortConfig.ascending ? '↓' : '↑')}
              </th>
            </>}
          </tr>
        </thead>
        <tbody>
          {sortedShoppingItems.map(item => {
            const prodotto = prodotti.find(p => p.id === item.prodotto_id) || {};
            const sup = SUPERMARKETS.find(s => s.key === selectedSupermarket);
            const categoria = findCategory(item.categoria);
            const prezzo = prodotto[sup?.priceField] ?? item.prezzo;

            return (
              <tr key={item.id} className={item.fatto ? 'taken' : ''}>
                <td title={item.descrizione} className="articolo-column-cell">{item.articolo}</td>
                <td><button className="btn-icon" onClick={() => handleShoppingItem('update', { id: item.id, patch: { fatto: !item.fatto } })}>{item.fatto ? '✔️' : '◻️'}</button></td>
                <td><button className="btn-icon" onClick={() => handleShoppingItem('delete', { id: item.id })}>🗑️</button></td>
                {isFull && <>
                  <td><input type="number" className="small-input" value={item.quantita} onChange={e => handleShoppingItem('update', { id: item.id, patch: { quantita: parseInt(e.target.value) } })} /></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <input type="number" className="small-input" value={prezzo} onChange={e => handleShoppingItem('update', { id: item.id, patch: { prezzo: parseFloat(e.target.value) } })} />
                      <button className="btn-primary" style={{ marginLeft: '5px' }} onClick={() => setShowOtherPrices(showOtherPrices === item.id ? null : item.id)}>...</button>
                      {showOtherPrices === item.id && (
                        <div className="other-prices-dropdown">
                          {SUPERMARKETS.map(s => <div key={s.key}>{s.label}: {prodotto[s.priceField] ?? '-'}</div>)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>{categoria?.name}</td>
                  <td>{categoria?.[sup?.corsiaField] || ''}</td>
                </>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // --- JSX ---
  return (
    <div className="app-layout">
      <div className={`header ${!showFullList ? 'header-mobile-compact' : ''}`}>
        <button onClick={() => navigate('/main-menu')} className="btn-secondary"><FaBars /> Ritorna al menu</button>
        <h1>Lista della Spesa</h1>
        <p>Family's: <strong>{familyGroup || '...'}</strong></p>
      </div>

      <div className="scrollable-content">
        <div className="controls-container">
          {showFullList && (
            <>
              <div className="info-box"><h2>Seleziona Supermercato</h2><p>Prezzi e corsie si aggiorneranno.</p></div>
              <div className="tab-buttons">
                {SUPERMARKETS.map(s => <button key={s.key} className={`tab-button ${selectedSupermarket === s.key ? 'active' : ''}`} onClick={() => setSelectedSupermarket(s.key)}>{s.icon} {s.label}</button>)}
              </div>
            </>
          )}
          <div className="info-box"><h2>Modalità Inserimento</h2></div>
          <div className="tab-buttons">
            {MODES.map(m => <button key={m.key} className={`tab-button ${m.key === mode ? 'active' : ''}`} onClick={() => m.key === 'ricette' ? navigate('/pagina3-ricette-ai') : setMode(m.key)}>{m.icon} {m.label}</button>)}
          </div>
        </div>

        {mode !== 'ricette' && (
          <div className="input-group">
            <input type="text" className="search-input" placeholder={mode === 'preferiti' ? 'Cerca nei preferiti...' : 'Cerca o parla...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            {mode === 'vocale' && <button onClick={startVoiceRecognition} disabled={isListening} className="btn-add">{isListening ? '🎤 Ascolto...' : '🎤 Parla'}</button>}
            <button className="btn-primary" onClick={() => navigate('/pagina4-archivio-prodotti')}>+ Nuovo</button>
          </div>
        )}

        {(mode === 'preferiti' || searchQuery) && searchResults.length > 0 && (
          <div className="shopping-table-container">
            <table className="shopping-table">
              <thead><tr><th>Articolo</th><th>Descrizione</th><th>Categoria</th><th>Azione</th></tr></thead>
              <tbody>
                {searchResults.map(p => (
                  <tr key={p.id}>
                    <td><strong>{p.articolo}</strong>{p.preferito && '⭐'}</td>
                    <td>{p.descrizione}</td>
                    <td>{findCategory(p.categoria_id)?.name || 'N/A'}</td>
                    <td><button className="btn-add" onClick={() => handleShoppingItem('add', p)}>Aggiungi</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {searchQuery && searchResults.length === 0 && <div className="info-box red">Nessun prodotto trovato.</div>}

        <div className="button-list-container">
          <button className={`btn-secondary ${!showFullList ? 'active' : ''}`} onClick={() => setShowFullList(false)}>Vista Ridotta</button>
          <button className={`btn-secondary ${showFullList ? 'active' : ''}`} onClick={() => setShowFullList(true)}>Vista Completa</button>
        </div>

        {shoppingItems.length > 0 && renderShoppingList(showFullList)}
      </div>

      <div className="footer">
        {shoppingItems.length > 0 && mode === 'archivio' && (
          <div className="input-group">
            <button className="btn-delete" onClick={() => handleShoppingItem('clear')}>Azzera Lista</button>
            <button className="btn-primary" onClick={() => handleShoppingItem('finish')}>FINE SPESA 🥳</button>
          </div>
        )}
      </div>
    </div>
  );
}
