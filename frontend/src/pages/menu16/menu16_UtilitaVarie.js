import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/MainStyle.css'; 

function ExportMenu16() {
  const navigate = useNavigate();

  return (
    <div className="app-layout">
      <header className="header">
        <button className="btn-back" onClick={() => navigate('/main-menu')}>
          ← Torna al Menu
        </button>
        <h1>Menu 16 🧠✨ Utilità Varie</h1>
      </header>

      <main className="main-content main-menu-grid">

        <button onClick={() => navigate('/route-16-01-notebookllm')} className="menu-button small ai-feature">
          Sezione 01 🎯 <br /> - Riassumi e mappa partendo da testi o discorsi
        </button>

        <button onClick={() => navigate('/route-16-02-leggiscrivimail')} className="menu-button small ai-feature">
          Sezione 02 ✉️ <br /> - Leggi e scrivi le mail
        </button>

        <button onClick={() => navigate('/route-16-03-note-scrivi-detta-archivia')} className="menu-button small ai-feature">
          Sezione 03 📝 <br /> - Crea, detta e archivia le note
        </button>


        <button onClick={() => navigate('/route-16-06')} className="menu-button small ai-feature">
          🔐 <br /> Sezione 06 - Alfred LeggiLe Notizie del mondo
        </button>

        
        <button onClick={() => navigate('/route-16-07-programmiTV')} className="menu-button small">📺   
 Sezione 07 - PROGRAMMI TV</button>



        <button onClick={() => navigate('/pagina-vuota')} className="menu-button small ai-feature">
          📊 <br /> SEzione
        </button>

        <button onClick={() => navigate('/pagina-vuota')} className="menu-button small ai-feature">
          💡 <br /> SEzione
        </button>

        <button onClick={() => navigate('/pagina-vuota')} className="menu-button small ai-feature">
          🔍 <br /> SEzione
        </button>

      </main>

      <div className="ai-assistant-info">
        <div className="assistant-avatar">🧠</div>
        <div className="assistant-status">
          <span className="status-indicator online"></span>
          Alfred Inty è online e pronto ad assisterti
        </div>
      </div>
    </div>
  );
}

export default ExportMenu16;
