import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/MainStyle.css'; 

function ExportMenu01() {
  const navigate = useNavigate();

  return (
    <div className="app-layout">
      <header className="header">
        <button className="btn-back" onClick={() => navigate('/main-menu')}>
          ← Torna al Menu
        </button>
        <h1>Menu 01 🧠✨ Spesa</h1>
      </header>

      <main className="main-content main-menu-grid">

<button onClick={() => navigate('/pagina01_01-shopping-list')} className="menu-button small">🛒   
 1.1 Lista della Spesa</button>

        <button onClick={() => navigate('/pagina01-02-archivio-prodotti')} className="menu-button small">📦   
 1.2 Archivio Prodotti</button>

        <button onClick={() => navigate('/sottopagina-1-3-offerte-volantini')} className="menu-button small">📊 
 1.3 - Offerte Volantini supermercati</button>



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

export default ExportMenu01;
