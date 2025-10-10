import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient.js'; // ✅ CORRETTO

// Autenticazione e Menu Principale
import Auth from './pages/Auth.js'; // 
import MainMenu from './pages/MainMenu.js'; // 

// Pagine Principali da sistemare e suddividere nei menu
import SottoPagina2_VideochiamataDiretta from './pages/SottoPagina2_VideochiamataDiretta.js'; // ✅ CORRETTO
import SottoPagina2_VideochiamataGruppo from './pages/SottoPagina2_VideochiamataGruppo.js'; // ✅ CORRETTO
import Pagina2_FamilyChat from './pages/Pagina2_FamilyChat.js'; // ✅ CORRETTO
import Pagina6_CalendarioAppuntamenti from './pages/Pagina6_CalendarioAppuntamenti.js'; // ✅ CORRETTO
import Pagina7_GestioneFarmaci from './pages/Pagina7_GestioneFarmaci.js'; // ✅ CORRETTO
import Pagina8_ArchivioDocumenti from './pages/Pagina8_ArchivioDocumenti.js'; // ✅ CORRETTO
import Pagina9_GestioneUtenti from './pages/Pagina9_GestioneUtenti.js'; // ✅ CORRETTO
import FunctionMetadataCatalog from './pages/101_0PageFrontMetadataCatalog.js'; // ✅ CORRETTO
import SottoPagina4_2TodoList from './pages/SottoPagina4_2TodoList.js'; // 




// import per menu 1 
import ExportPagina01_01ShoppingList from './pages/menu01/Pagina1_ShoppingList.js'; // ✅ CORRETTO
import ExportSottoPagina1_3 from './pages/menu01/SottoPagina01_03_OfferteVolantini.js'; // ✅ CORRETTO
import ExportPagina01_02ArchivioProdotti from './pages/menu01/Pagina01_02ArchivioProdotti.js'; // ✅ CORRETTO

// import per menu 3
import FunRecipeAI from './pages/menu03/SottoPagina3_1RicetteAI.js'; // ✅ CORRETTO
import FunContacalorie from './pages/menu03/SottoPagina3_4_ContaCaloriePasto.js'; // ✅ CORRETTO
import FunAnalisiAndamentoPeso from './pages/menu03/SottoPagina3_5AnalisiAndamentoPeso.js'; // ✅ CORRETTO
import ExportsSottoPagina3_6 from './pages/menu03/SottoPagina3_6AnalizzaFrigoDispensaTrovaRicette.js'; // ✅ CORRETTO


// Menu 16 - Utilità Varie
import ExportMenu16 from './pages/menu16/menu16_UtilitaVarie.js'; // ✅ CORRETTO
import ExportPagina16_01 from './pages/menu16/Pagina16_01CopiaNotebookLLM.js'; // ✅ CORRETTO
import ExportPagina16_02 from './pages/menu16/Pagina16_02LeggiScriviArchivia_Mail.js'; // ✅ CORRETTO
import ExportPagina16_03 from './pages/menu16/Pagina16_03NoteScriviDettaArchivia.js'; // ✅ CORRETTO
import ExportPagina16_06 from './pages/menu16/Pagina16_06LeggiNotizieMondo.js'; // ✅ CORRETTO
import ExportPagina16_07 from './pages/menu16/Pagina16_07ProgrammiTV.js'; // ✅ CORRETTO

// Menu 20 - Alfred Inty
import ExportMenu20 from './pages/menu20/menu20_AlfredInty.js'; // ✅ CORRETTO

 
import ExportPagina20_22 from './pages/menu20/Pagina20_22AlfredInformazioniDocumentiArchiviati.js'; // ✅ CORRETTO
import ExportPagina20_23AIButler from './pages/menu20/Pagina20_23_AI Butler'; // ✅ CORRETTO (Assumo tu abbia rinominato il file o aggiunto l'estensione .js)

// Menu 100... test vari
import ExportTestNotificheMail from './pages/MenuTest/102_0TestInvioNotificheMail.js'; // ✅ CORRETTO
import ExportTestGrafica from './pages/MenuTest/103_0TestGrafica.js'; // ✅ CORRETTO
import ExportTestAudioVideo from './pages/MenuTest/104_0TestAudioVideoFoto.js'; // ✅ CORRETTO
import ExportTestVuoto105 from './pages/MenuTest/105_0TestVuoto.js'; // ✅ CORRETTO
import ExportTestVuoto106 from './pages/MenuTest/106_0TestVuoto.js'; // ✅ CORRETTO
import ExportTestVuoto107 from './pages/MenuTest/107_0TestVuoto.js'; // ✅ CORRETTO
import ExportApiKeyValidator from './pages/MenuTest/108_0ApiKeyValidator.js'; // ✅ CORRETTO

// pagina vuota
import ExportPaginaVuota from './pages/PaginaVuota.js'; // ✅ CORRETTO
import ExportMenu01 from './pages/menu01/menu01_Spesa.js'; // ✅ CORRETTO
import ExportMenu03 from './pages/menu03/menu03_FoodAlimentazione.js'; // ✅ CORRETTO


function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      if (authListener) authListener.unsubscribe();
    };
  }, []);

  const ProtectedRoute = ({ element }) => {
    return session ? element : <Navigate to="/" />;
  };

  return (
    <Router>
      <Routes>


        {/* 1. AGGIUNGI QUESTA NUOVA ROTTA per /auth */}
        <Route path="/auth" element={session ? <Navigate to="/main-menu" /> : <Auth />} />
  
        {/* 2. MODIFICA LA ROTTA PRINCIPALE (root) per reindirizzare a /auth se non c'è sessione */}
        <Route path="/" element={session ? <Navigate to="/main-menu" /> : <Navigate to="/auth" />} />

        {/* Menu Principale */}
        <Route path="/main-menu" element={<ProtectedRoute element={<MainMenu />} />} />




        


        {/* rotte da sistemare ed inserire nei prorpi menu */}

        {/*Pagina 2 */}
        <Route path="/pagina2-family-chat" element={<ProtectedRoute element={<Pagina2_FamilyChat />} />} />
        <Route path="/video-chat-diretta" element={<ProtectedRoute element={<SottoPagina2_VideochiamataDiretta />} />} />
        <Route path="/video-chat-gruppo" element={<ProtectedRoute element={<SottoPagina2_VideochiamataGruppo />} />} />
      
        {/* Pagina 4 */}
        <Route path="/sottopagina4_2-todolist" element={<ProtectedRoute element={<SottoPagina4_2TodoList />} />} />
        
        {/* Altre pagine principali */}
        <Route path="/pagina6-calendario-appuntamenti" element={<ProtectedRoute element={<Pagina6_CalendarioAppuntamenti />} />} />
        <Route path="/pagina6-1-gestione-farmaci" element={<ProtectedRoute element={<Pagina7_GestioneFarmaci />} />} />
        <Route path="/pagina8-archivio-documenti" element={<ProtectedRoute element={<Pagina8_ArchivioDocumenti />} />} />
        <Route path="/pagina9-gestione-utenti" element={<ProtectedRoute element={<Pagina9_GestioneUtenti />} />} />

        {/* menu sistemati */}


        {/* ROTTE MENU 1 Pagina 1 */}
        <Route path="/menu01-spesa" element={<ProtectedRoute element={<ExportMenu01 />} />} />

        <Route path="/pagina01_01-shopping-list" element={<ProtectedRoute element={<ExportPagina01_01ShoppingList />} />} />
        <Route path="/pagina01-02-archivio-prodotti" element={<ProtectedRoute element={<ExportPagina01_02ArchivioProdotti />} />} />
        <Route path="/sottopagina-1-3-offerte-volantini" element={<ProtectedRoute element={<ExportSottoPagina1_3 />} />} />

        {/* ROTTE MENU 3 Pagine 3 */}
        <Route path="/menu03-food-alimentazione" element={<ProtectedRoute element={<ExportMenu03 />} />} />

        <Route path="/sottopagina3-1-ricette-ai" element={<ProtectedRoute element={<FunRecipeAI />} />} />
        <Route path="/sottopagina3-4-calorieAI" element={<ProtectedRoute element={<FunContacalorie />} />} />
        <Route path="/sottopagina3-5-andamento-peso" element={<ProtectedRoute element={<FunAnalisiAndamentoPeso />} />} />
        <Route path="/sottopagina-3-6-analizza-frigo" element={<ProtectedRoute element={<ExportsSottoPagina3_6 />} />} />



        {/* ROTTE MENU 16 - UTILITÀ VARIE */}
        <Route path="/menu16-UtilitaVarie" element={<ProtectedRoute element={<ExportMenu16 />} />} />
        <Route path="/route-16-01-notebookllm" element={<ProtectedRoute element={<ExportPagina16_01 />} />} />
        <Route path="/route-16-02-leggiscrivimail" element={<ProtectedRoute element={<ExportPagina16_02 />} />} />
        <Route path="/route-16-03-note-scrivi-detta-archivia" element={<ProtectedRoute element={<ExportPagina16_03 />} />} /> {/* ✅ nuova rotta */}
        <Route path="/route-16-06" element={<ProtectedRoute element={<ExportPagina16_06 />} />} />
        <Route path="/route-16-07-programmiTV" element={<ProtectedRoute element={<ExportPagina16_07 />} />} />

        {/* ROTTE MENU 20 - ALFRED INTY */}
        <Route path="/menu20-alfred-inty" element={<ProtectedRoute element={<ExportMenu20 />} />} />
        
        <Route path="/route-20-22" element={<ProtectedRoute element={<ExportPagina20_22 />} />} />
        <Route path="/sottopagina20_23-ai-butler" element={<ProtectedRoute element={<ExportPagina20_23AIButler />} />} />

        {/* Rotte di test */}
        <Route path="/route-101_0pagina-metadata-catalog" element={<ProtectedRoute element={<FunctionMetadataCatalog />} />} />
        <Route path="/pagina102-test-notifiche" element={<ProtectedRoute element={<ExportTestNotificheMail />} />} />
        <Route path="/test-grafica" element={<ProtectedRoute element={<ExportTestGrafica />} />} />
        <Route path="/test-audio-video" element={<ProtectedRoute element={<ExportTestAudioVideo />} />} />
        <Route path="/test-vuoto105" element={<ProtectedRoute element={<ExportTestVuoto105 />} />} />
        <Route path="/test-vuoto106" element={<ProtectedRoute element={<ExportTestVuoto106 />} />} />
        <Route path="/test-vuoto107" element={<ProtectedRoute element={<ExportTestVuoto107 />} />} />
        <Route path="/test-apikey" element={<ProtectedRoute element={<ExportApiKeyValidator />} />} />


        {/* Pagina Vuota */}
        <Route path="/pagina-vuota" element={<ProtectedRoute element={<ExportPaginaVuota />} />} />
      </Routes>
    </Router>
  );
}

export default App;