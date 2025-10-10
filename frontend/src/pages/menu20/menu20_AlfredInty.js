import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/MainStyle.css'; 



function ExportMenu20() {
  const navigate = useNavigate();

  return (
    <div className="app-layout">
      <header className="header">
        <button className="btn-back" onClick={() => navigate('/main-menu')}>
          ← Torna al Menu
        </button>
        <h1>Menu 20 🧠✨ Alfred Inty - Assistente AI Tuttofare</h1>
      </header>



       <main className="main-content main-menu-grid">


        
        <button onClick={() => navigate('/route-20-22')} className="menu-button small ai-feature">
          🎯 <br /> SEzione 22 - Alfred - Richiesta su Informazioni su Documenti Archiviati
        </button>

        <button onClick={() => navigate('/sottopagina20_23-ai-butler')} className="menu-button small">🤖   
        20.23 - AI - RICHIESTA SU INFORMAZIONI SU TUTTGI GLI ARCHIVI
        </button>





        <button onClick={() => navigate('/pagina8-archivio-documenti')} className="menu-button small ai-feature">
          📋 <br /> SottoMenu 2 - momentaneo archivia documenti
        </button>

        
        <button onClick={() => navigate('/pagina-vuota')} className="menu-button small ai-feature">
          📊 <br /> SottoMenu 4 - 
        </button>

        <button onClick={() => navigate('/pagina-vuota')} className="menu-button small ai-feature">
          💡 <br /> SottoMenu 5 - 
        </button>

        <button onClick={() => navigate('/pagina-vuota')} className="menu-button small ai-feature">
          🔍 <br /> SottoMenu 6 - 
        </button>

        <button onClick={() => navigate('/pagina-vuota')} className="menu-button small ai-feature">
          🎨 <br /> SottoMenu 7 - 
        </button>

        <button onClick={() => navigate('/pagina-vuota')} className="menu-button small ai-feature">
          💬 <br /> SottoMenu 8 - 
        </button>

        <button onClick={() => navigate('/pagina-vuota')} className="menu-button small ai-feature">
          📚 <br /> SottoMenu 9 - 
        </button>

        





      </main>

      <div className="ai-assistant-info">
        <div className="assistant-avatar">
          🧠
        </div>
        <div className="assistant-status">
          <span className="status-indicator online"></span>
          Alfred Inty è online e pronto ad assisterti
        </div>
      </div>

    </div>
  );
}

export default ExportMenu20;