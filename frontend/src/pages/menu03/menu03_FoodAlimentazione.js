import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/MainStyle.css'; 

function ExportMenu03() {
  const navigate = useNavigate();

  return (
    <div className="app-layout">
      <header className="header">
        <button className="btn-back" onClick={() => navigate('/main-menu')}>
          ← Torna al Menu
        </button>
        <h1>Menu 3 🧠✨ Food e alimentazione</h1>
      </header>

      <main className="main-content main-menu-grid">




        <button onClick={() => navigate('/sottopagina3-1-ricette-ai')} className="menu-button small">👩‍🍳   
 3.1 AI - Ricette</button>

        <button onClick={() => navigate('/sottopagina3-4-calorieAI')} className="menu-button small">🔢   
 3.4 AI - Contacalorie</button>


        <button onClick={() => navigate('/sottopagina3-5-andamento-peso')} className="menu-button small">📈   
 3.5 AI - Analisi peso</button>


        <button onClick={() => navigate('/sottopagina-3-6-analizza-frigo')} className="menu-button small">📅   
3.6 AI - Analizza Frigo e dispensa e trova ricette</button>















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

export default ExportMenu03;
