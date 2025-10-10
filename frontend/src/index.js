// File: src/index.js (Frontend)

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.js'; 
import reportWebVitals from './reportWebVitals.js'; 


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Chiama reportWebVitals solo se è importato
if (reportWebVitals) {
    reportWebVitals();
}


// 🛑 RIMUOVI O COMMENTA TUTTO IL BLOCCO DI REGISTRAZIONE DEL SERVICE WORKER
/*
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registrato con successo:', registration);
            })
            .catch(error => {
                console.error('Registrazione del Service Worker fallita:', error);
            });
    });
}
*/