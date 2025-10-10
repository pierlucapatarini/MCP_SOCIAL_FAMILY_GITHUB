// FILE: src/pages/MainMenu.js (VERSIONE CORRETTA E COMPLETA)

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../styles/MainStyle.css';
import AlfredChatbot from './PaginaAlfredChatbot'; // Assicurati che il percorso sia corretto

function MainMenu() {
  const [alfredExists, setAlfredExists] = useState(true);
  const [loading, setLoading] = useState(true);
  const [userFamilyGroup, setUserFamilyGroup] = useState('');
  const navigate = useNavigate();

  const isAlfredUser = (user) => {
    return user.is_ai === true || 
           user.username === 'Alfred AI' ||
           (user.email && user.email.includes('alfred.') && user.email.includes('@family.ai'));
  };

  const checkAlfredExists = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('family_group')
        .eq('id', user.id)
        .single();
      
      if (!profile?.family_group) {
        setAlfredExists(true);
        setLoading(false);
        return;
      }

      setUserFamilyGroup(profile.family_group);
      
      const { data: users, error } = await supabase
        .from('profiles')
        .select('id, username, email, is_ai')
        .eq('family_group', profile.family_group);

      if (error) {
        console.error("Errore nel controllo utenti:", error);
        setLoading(false);
        return;
      }

      const foundAlfred = (users || []).find(u => isAlfredUser(u));
      setAlfredExists(!!foundAlfred);

    } catch (error) {
      console.error("Errore nel controllo Alfred:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAlfredExists();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="app-layout">
        <div className="loading">Caricamento menu principale...</div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <header className="header">
        <h1>🏠 Menu Principale</h1>
        {userFamilyGroup && (
          <p className="family-group-indicator">Famiglia: {userFamilyGroup}</p>
        )}
        <button className="btn-secondary" onClick={handleLogout}>
          Log out
        </button>
      </header>

      <main className="main-content main-menu-grid">
        {/* L'alert per Alfred mancante rimane qui, corretto */}
        {!alfredExists && userFamilyGroup && (
          <div className="alert-box alfred-alert">
            <div className="alfred-alert-content">
              <span className="alfred-alert-icon">🤖</span>
              <div className="alfred-alert-text">
                <h3>Alfred AI non configurato</h3>
                <p>Il tuo maggiordomo digitale non è ancora presente nel gruppo famiglia <strong>{userFamilyGroup}</strong>.</p>
                <p>Configuralo ora per sbloccare tutte le funzionalità automatiche!</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/pagina9-gestione-utenti')} 
              className="btn-primary alfred-alert-button"
            >
              🤖 Configura Alfred AI
            </button>
          </div>
        )}

        {/* ... tutti i tuoi pulsanti del menu rimangono qui ... */}

        


  <button onClick={() => navigate('/menu01-spesa')} className="menu-button small">🔍   
 MENU 1 - menu Spesa</button>

  <button onClick={() => navigate('/menu03-food-alimentazione')} className="menu-button small">🔍   
 MENU 3 - Food e alimentazione</button>

  <button onClick={() => navigate('/menu16-UtilitaVarie')} className="menu-button small">🔍   
 MENU 16 - Utilità Varie</button>
      
  <button onClick={() => navigate('/menu20-alfred-inty')} className="menu-button small">🤖   
 MENU 20 - MENU Alfred</button>







        <button onClick={() => navigate('/pagina6-calendario-appuntamenti')} className="menu-button small">📅   
 Pagina 4.1 - Calendario</button>

        <button onClick={() => navigate('/sottopagina4_2-todolist')} className="menu-button small">✅   
 Pagina 4.2 - ToDo List</button>


        <button onClick={() => navigate('/pagina2-family-chat')} className="menu-button small">💬   
 Pagina 5.1 - Family Chat</button>

        <button onClick={() => navigate('/video-chat-diretta')} className="menu-button small">📞   
 Pagina 5.2.1 - Videochiamata</button>

        <button onClick={() => navigate('/video-chat-gruppo')} className="menu-button small">👥   
 Pagina 5.2.2 Videochiamata Gruppo</button>

        <button onClick={() => navigate('/pagina6-1-gestione-farmaci')} className="menu-button small">💊   
 Pagina 6.1 - Gestione Farmaci</button>
  
        <button onClick={() => navigate('/pagina8-archivio-documenti')} className="menu-button small">📁   
 Pagina 10.1 - Archivio Documenti</button>

        <button onClick={() => navigate('/pagina9-gestione-utenti')} className="menu-button small">👨‍👩‍👧‍👦   
 Pagina 99.1 - Gestione Utenti</button>

        <button onClick={() => navigate('/route-101_0pagina-metadata-catalog')} className="menu-button small">🗂️   
 Pagina 101 Gestione Metadata</button>

        <button onClick={() => navigate('/pagina102-test-notifiche')} className="menu-button small">🧪   
Test 102 - Notifiche</button>

  <button onClick={() => navigate('/test-grafica')} className="menu-button small">🎨   
Test  103 Grafica</button>

  <button onClick={() => navigate('/test-audio-video')} className="menu-button small">🎨   
 Test 104 audio/video</button>

 
      <button onClick={() => navigate('/test-apikey')} className="menu-button small ai-feature">
          🏠 <br /> Test 108 controllo api key
        </button>


  <button onClick={() => navigate('/test-vuoto105')} className="menu-button small">🎨   
 Test 105 vuoto</button>

  <button onClick={() => navigate('/test-vuoto106')} className="menu-button small">🎨   
 Test 106 vuoto</button>

  <button onClick={() => navigate('/test-vuoto107')} className="menu-button small">🎨   
 Test 107 vuoto</button>
     



      
      
      
      </main>


      {/* 
        ================================================================
        ECCO LA CORREZIONE:
        Mostriamo il chatbot non appena il caricamento è finito.
        Il pulsante sarà sempre visibile, indipendentemente da 'alfredExists'.
        ================================================================
      */}
      {!loading && (
          <AlfredChatbot />
      )}
    </div>
  );
}

export default MainMenu;
