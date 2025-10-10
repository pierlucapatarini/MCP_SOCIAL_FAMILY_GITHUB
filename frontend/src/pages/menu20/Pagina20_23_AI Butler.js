import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "../../supabaseClient"; 
import '../../styles/StileSottoPagina20_23.css'; 

// Variabili di configurazione
var __app_id = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
var __initial_auth_token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;


function ExportPagina20_23AIButler() {
  
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);
  const [events, setEvents] = useState([]);
  const [todos, setTodos] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loadingText, setLoadingText] = useState('Recupero dati...');

  // Funzione per il recupero dati
  const fetchData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // 1. Recupero Messaggi
      setLoadingText('Recupero messaggi recenti...');
      const { data: messagesData, error: messagesError } = await supabase.from('messages').select('content, created_at, sender_id').order('created_at', { ascending: false }).limit(20);
      if (messagesError) throw new Error(`Errore nel recupero messaggi: ${messagesError.message}. Controlla i nomi delle colonne e le policy RLS.`);
      setMessages(messagesData);

      // 2. Recupero Eventi
      setLoadingText('Recupero eventi in calendario...');
      const { data: eventsData, error: eventsError } = await supabase.from('events').select('title, description, start').order('start', { ascending: false }).limit(20);
      if (eventsError) throw new Error(`Errore nel recupero eventi: ${eventsError.message}. Controlla i nomi delle colonne e le policy RLS.`);
      setEvents(eventsData);

      // 3. Recupero To-dos
      setLoadingText('Recupero cose da fare...');
      const { data: todosData, error: todosError } = await supabase.from('todos').select('task, inserted_at, priority').limit(20);
      if (todosError) throw new Error(`Errore nel recupero to-dos: ${todosError.message}. Controlla i nomi delle colonne e le policy RLS.`);
      setTodos(todosData);

      // 4. Recupero e Lettura Documenti
      setLoadingText('Analisi documenti...');
      const { data: docsData, error: docsError } = await supabase.from('documents-family').select('file_url, file_name');
      if (docsError) throw new Error(`Errore nel recupero documenti: ${docsError.message}. Controlla i nomi delle colonne e le policy RLS.`);

      const documentsContent = await Promise.all(docsData.map(async (doc) => {
        try {
          const response = await fetch(doc.file_url);
          if (!response.ok) {
            console.error(`Errore nel download del documento ${doc.file_name}: ${response.statusText}`);
            return { name: doc.name, content: "Impossibile leggere il contenuto." };
          }
          const content = await response.text();
          return { name: doc.name, content: content.substring(0, 1000) }; // Limito a 1000 caratteri
        } catch (downloadError) {
          console.error(`Errore nel download del documento ${doc.name}:`, downloadError);
          return { name: doc.name, content: "Errore durante la lettura del documento." };
        }
      }));
      setDocuments(documentsContent);

    } catch (err) {
      setError(`Errore nel recupero dati: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []); // Esegui solo al primo render

  const handleGenerateSummary = async () => {
    setLoading(true);
    setLoadingText('Generazione riepilogo...');
    setError('');
    
    try {
      const response = await fetch(`${API_URL}api/alfred-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages, events, todos, documents }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nella generazione del riepilogo.');
      }
      
      const data = await response.json();
      setSummary(data.summary);
      
    } catch (err) {
      setError(err.message);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-page-layout"> 
      <header className="ai-header">
        <h1 className="ai-h1">🤖 AI Butler</h1>
        <button className="ai-btn-secondary" onClick={() => navigate('/main-menu')}>
          Indietro
        </button>
      </header>

      <main className="ai-main-content">
        <div className="ai-butler-card">
          <p className="ai-intro">
            Salve, sono qui per aiutarla a tenere traccia degli impegni della famiglia. Posso generare un riepilogo delle attività, eventi e messaggi più recenti.
          </p>

          <button
            onClick={handleGenerateSummary}
            className="ai-btn-primary" 
            disabled={loading}
          >
            {loading ? loadingText : 'Genera Riepilogo Settimanale'}
          </button>

          {error && <p className="ai-error-message">{error}</p>}
          
          {summary && (
            <div className="ai-summary-card"> 
              <h3>Riepilogo AI Butler</h3>
              <p className="ai-summary-content">{summary}</p> 
            </div>
          )}

          {loading && !summary && (
            <div className="ai-loading-spinner-container">
              <div className="ai-loading-spinner"></div>
              <p className="ai-loading-text">{loadingText}</p>
            </div>
          )}
        </div>
      </main>

      <footer className="ai-footer">
        <p>&copy; {new Date().getFullYear()} AI Butler. Tutti i diritti riservati.</p>
      </footer>
    </div>
  );
}

export default ExportPagina20_23AIButler;