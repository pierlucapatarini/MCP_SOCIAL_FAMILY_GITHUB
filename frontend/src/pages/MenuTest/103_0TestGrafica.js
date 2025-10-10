import React, { useState, useEffect, useMemo } from 'react';

// Funzione placeholder per simulare le icone Lucide (Non modificate)
const Icon = ({ name, className, style }) => {
    const icons = {
        bell: <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9zm6 13a2 2 0 0 1-2-2h4a2 2 0 0 1-2 2z" />,
        sun: (
            <>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M20 12h2M2 12h2M18.36 5.64l-1.41 1.41M6.05 17.95l-1.41 1.41M5.64 5.64l1.41 1.41M17.95 17.95l1.41 1.41" />
            </>
        ),
        'user-circle': (
            <>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 10V6M12 18v-4" />
            </>
        ),
        star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
        'check-circle': (
            <>
                <path d="M22 11.08V12a10 10 0 1 1-5.71-8.58" />
                <path d="M22 4L12 14.01l-3-3" />
            </>
        ),
        edit: (
            <>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </>
        ),
        'trash-2': (
            <>
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </>
        ),
        eye: (
            <>
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
            </>
        ),
        'arrow-right': (
            <>
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
            </>
        ),
        twitter: <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.4 3.2 4.6l.8.3c1.7.6 3.4.7 4.9.4C7.5 7 4 10.3 4 14.5c0 3.8 2 6.8 5.7 8.4-1.2.3-2.5.5-3.8.5-1.6 0-3.2-.2-4.6-.7C6 21 9.5 22 13 22c3.7 0 7-1.4 9.6-4.5.3-.2.5-.5.7-.8l.2-.3c.4-.6.7-1.3.9-2.1l.1-.3c.1-.4.2-.8.2-1.2C23 11 22.7 8.5 22 4z" />,
        linkedin: (
            <>
                <path d="M16 8a6 6 0 0 0-6 6v7h-4V14a6 6 0 0 1 6-6z" />
                <rect width="4" height="12" x="2" y="9" />
                <circle cx="4" cy="4" r="2" />
            </>
        ),
    };

    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
            {icons[name] || <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />}
        </svg>
    );
};

// =======================================================
// ⬇️ MAPPATURE DEI VALORI COMPLESSI ⬇️
// =======================================================
const SHADOW_MAP = {
    'Nessuna Ombra': 'none',
    'Soft (Default)': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    'Medium': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
    'Forte': '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
    'Inner Shadow': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
};

const ARTISTIC_EFFECT_MAP = {
    'Nessuno': 'none',
    'Bianco e Nero': 'grayscale(100%)',
    'Seppia': 'sepia(100%)',
    'Rotazione Tonalità': 'hue-rotate(90deg)',
    'Contrasto Forte': 'contrast(1.5)',
};

const FONT_FAMILY_MAP = {
    'Inter': "'Inter', sans-serif",
    'Roboto': "'Roboto', sans-serif",
    'Montserrat': "'Montserrat', sans-serif",
    'Lato': "'Lato', sans-serif",
    'Open Sans': "'Open Sans', sans-serif",
};

const BORDER_RADIUS_MAP = {
    'Nessuno (0)': '0rem',
    'Piccolo (4px)': '0.25rem',
    'Medio (8px)': '0.5rem',
    'Grande (16px)': '1rem',
    'Pillola (50%)': '50%',
};

const FONT_SIZE_MAP = {
    'Sottile (0.9)': '0.9rem',
    'Normale (1.0)': '1rem',
    'Media (1.1)': '1.1rem',
    'Grande (1.2)': '1.2rem',
    'Enorme (1.3)': '1.3rem',
};

const FONT_WEIGHT_MAP = {
    'Extra Light (200)': '200',
    'Light (300)': '300',
    'Normale (400)': '400',
    'Semi-Grassetto (600)': '600',
    'Grassetto (700)': '700',
};

const ICON_SIZE_MAP = {
    'Piccola (16px)': '1rem',
    'Media (20px)': '1.25rem',
    'Normale (24px)': '1.5rem',
    'Grande (32px)': '2rem',
    'Enorme (40px)': '2.5rem',
};

const PATTERN_MAP = {
    'Nessun Pattern': 'none',
    'Strisce Sottili': 'repeating-linear-gradient(45deg, rgba(255,255,255,.1) 0px, rgba(255,255,255,.1) 1px, transparent 1px, transparent 10px)',
    'Puntini': 'radial-gradient(var(--bg-color) 3px, transparent 4px)',
    'Scacchiera': 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
    'Diagonali Incrociate': 'repeating-linear-gradient(45deg, var(--primary-color) 0 1px, var(--bg-color) 1px 5px)',
};

// =======================================================
// 🟢 CONTENUTO DELLO STILE CSS (ISOLATO COME STRINGA)
// Questo blocco contiene tutto il CSS dinamico e statico.
// =======================================================
const STYLE_CONTENT = `
/* ======================================================= */
/* Definizioni Variabili CSS Globali (DEFAULT)             */
/* ======================================================= */
:root {
    /* GLOBALI (Questi valori vengono sovrascritti da JS all'avvio) */
    --bg-color: #f3f4f6;
    --pattern-app: none;
    --artistic-app-effect: none;
    --primary-color: #4f46e5;
    --secondary-color: #10b981;
    --main-border-color: #e5e7eb;
    
    /* ALTEZZE FISSE PER LAYOUT (Calcolate dinamicamente in JS) */
    --header-height: 5rem; 
    --footer-height: 5rem; 

    /* Fallback/Default delle Sezioni per evitare interruzioni */
    --header-section-bg-color: #ffffff;
    --main-section-bg-color: #ffffff;
    --main-table-alt-color: #f7f7f7;
    --main-border-color: #e5e7eb;
}

/* 🔴 STRUTTURA GENERALE APP (Layout Fisso a Due Colonne su Desktop) */
body {
    margin: 0;
    line-height: 1.5;
    background-color: var(--bg-color) !important;
    background-image: var(--pattern-app) !important; 
    filter: var(--artistic-app-effect) !important;
    background-size: 40px 40px; 
    height: 100vh;
    overflow: hidden; /* Il body non scorre, scorre solo il contenuto a destra */
}

.app-container {
    display: flex;
    height: 100vh;
    flex-direction: column; /* Mobile first: tutto in colonna */
}

/* 🔴 PANNELLO DI CONTROLLO (Sinistra - Fisso) */
.control-panel-sidebar {
    width: 100%; /* Larghezza completa su mobile */
    max-height: 50vh; /* Limita l'altezza su mobile */
    padding: 1rem; 
    overflow-y: auto; 
    background-color: white; 
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    z-index: 20; 
}
.panel-title {
    font-size: 1.5rem !important; 
    font-weight: 700 !important; 
    margin-bottom: 1.5rem; 
    color: var(--primary-color) !important; 
}

/* 🔴 WRAPPER DEL CONTENUTO (Destra - Layout Fisso/Scrollabile) */
.main-content-wrapper {
    flex-grow: 1; 
    display: flex;
    flex-direction: column;
    position: relative; 
    overflow: hidden; /* Gestisce lo scroll interno */
}

/* Media Query per Desktop (Due Colonne Fisse) */
@media (min-width: 1024px) {
    .app-container {
        flex-direction: row; 
    }
    .control-panel-sidebar {
        width: 24rem; /* Larghezza fissa per il pannello */
        height: 100%;
        max-height: 100%;
        position: sticky;
        top: 0;
    }
    .main-content-wrapper {
        width: calc(100% - 24rem); /* Larghezza residua */
    }
}


/* 🔴 SEZIONI FISSE (Header e Footer) */
.fixed-top-section {
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    height: var(--header-height); /* Altezza dinamica */
    display: flex;
    flex-direction: column;
    justify-content: center;
}
.fixed-bottom-section {
    position: sticky;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 10;
    box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1);
    height: var(--footer-height); /* Altezza dinamica */
    display: flex;
    flex-direction: column;
    justify-content: center;
}

/* 🔴 AREA DI CONTENUTO SCROLLABILE (tra Header e Footer) */
.scrollable-content {
    overflow-y: auto;
    flex-grow: 1;
    /* Su desktop, l'altezza è calcolata per non sovrapporsi alle sezioni fisse */
    max-height: calc(100vh - var(--header-height, 0px) - var(--footer-height, 0px));
    padding: 1.5rem;
}


/* ======================================================= */
/* 🔴 STILI DINAMICI DELLE SEZIONI (Attenzione: Le variabili sono impostate da JS) */
/* ======================================================= */

.ui-section {
    padding: 1.5rem;
    margin-bottom: 2rem;
    transition: all 0.3s ease;
    border: 1px solid var(--main-border-color); 
    
    /* Variabili Fallback e Nomi Generici */
    --section-bg-color: white;
    --button-bg-color: var(--primary-color);
    --font-family: 'Inter', sans-serif;
    --text-color: #1f2937;
    --font-size: 1rem;
    --font-weight: 400;
    --border-radius: 0.5rem;
    --shadow-style: none;
    --icon-size: 1.5rem;
    --icon-color: var(--primary-color);
    --section-artistic-effect: none;
    --h2-font-size: 1.75rem;

    /* Applicazione delle variabili (questi valori sono dinamici!) */
    background-color: var(--section-bg-color) !important;
    color: var(--text-color) !important;
    font-family: var(--font-family) !important;
    font-weight: var(--font-weight) !important;
    font-size: var(--font-size) !important;
    border-radius: var(--border-radius) !important; 
    box-shadow: var(--shadow-style) !important; 
    filter: var(--section-artistic-effect) !important;
}

/* Definizione delle variabili CSS per ogni sezione (I valori sono letti da JS) */
#header {
    --section-bg-color: var(--header-section-bg-color);
    --button-bg-color: var(--header-button-color);
    --font-family: var(--header-font-family);
    --text-color: var(--header-text-color);
    --font-size: var(--header-font-size);
    --font-weight: var(--header-font-weight);
    --border-radius: var(--header-border-radius);
    --shadow-style: var(--header-shadow-style);
    --icon-size: var(--header-icon-size);
    --icon-color: var(--header-icon-color);
    --section-artistic-effect: var(--header-section-artistic-effect);
    --h2-font-size: var(--header-h2-font-size);
}
#preHeader {
    --section-bg-color: var(--pre-header-section-bg-color);
    --button-bg-color: var(--pre-header-button-color);
    --font-family: var(--pre-header-font-family);
    --text-color: var(--pre-header-text-color);
    --font-size: var(--pre-header-font-size);
    --font-weight: var(--pre-header-font-weight);
    --border-radius: var(--pre-header-border-radius);
    --shadow-style: var(--pre-header-shadow-style);
    --icon-size: var(--pre-header-icon-size);
    --icon-color: var(--pre-header-icon-color);
    --section-artistic-effect: var(--pre-header-section-artistic-effect);
    --h2-font-size: var(--pre-header-h2-font-size);
}
#main {
    --section-bg-color: var(--main-section-bg-color);
    --button-bg-color: var(--main-button-color);
    --font-family: var(--main-font-family);
    --text-color: var(--main-text-color);
    --font-size: var(--main-font-size);
    --font-weight: var(--main-font-weight);
    --border-radius: var(--main-border-radius);
    --shadow-style: var(--main-shadow-style);
    --icon-size: var(--main-icon-size);
    --icon-color: var(--main-icon-color);
    --section-artistic-effect: var(--main-section-artistic-effect);
    --h2-font-size: var(--main-h2-font-size);
    /* Variabili Tabella */
    --main-table-striped: transparent;
    --main-table-bordered-columns: none;
}
#preFooter {
    --section-bg-color: var(--pre-footer-section-bg-color);
    --button-bg-color: var(--pre-footer-button-color);
    --font-family: var(--pre-footer-font-family);
    --text-color: var(--pre-footer-text-color);
    --font-size: var(--pre-footer-font-size);
    --font-weight: var(--pre-footer-font-weight);
    --border-radius: var(--pre-footer-border-radius);
    --shadow-style: var(--pre-footer-shadow-style);
    --icon-size: var(--pre-footer-icon-size);
    --icon-color: var(--pre-footer-icon-color);
    --section-artistic-effect: var(--pre-footer-section-artistic-effect);
    --h2-font-size: var(--pre-footer-h2-font-size);
}
#footer {
    --section-bg-color: var(--footer-section-bg-color);
    --button-bg-color: var(--footer-button-color);
    --font-family: var(--footer-font-family);
    --text-color: var(--footer-text-color);
    --font-size: var(--footer-font-size);
    --font-weight: var(--footer-font-weight);
    --border-radius: var(--footer-border-radius);
    --shadow-style: var(--footer-shadow-style);
    --icon-size: var(--footer-icon-size);
    --icon-color: var(--footer-icon-color);
    --section-artistic-effect: var(--footer-section-artistic-effect);
    --h2-font-size: var(--footer-h2-font-size);
}


/* 🔴 STILI BASE APPLICATI DALLE VARIABILI DI SEZIONE */

.ui-section h2 {
    font-size: var(--h2-font-size) !important; 
    font-weight: 700 !important;
    margin-bottom: 1.5rem;
    color: var(--primary-color) !important; 
    border-bottom: 1px solid var(--main-border-color);
    padding-bottom: 0.5rem;
}

/* Pulsanti */
.ui-button {
    background-color: var(--button-bg-color) !important;
    color: white !important; 
    padding: 0.5rem 1rem;
    border-radius: var(--border-radius) !important; 
    font-weight: 600 !important;
    transition: background-color 0.2s, box-shadow 0.2s;
    box-shadow: var(--shadow-style);
    border: none;
    cursor: pointer;
    text-align: center;
    white-space: nowrap;
}
.ui-button:hover {
    background-color: color-mix(in srgb, var(--button-bg-color) 85%, black) !important;
}
.ui-button.secondary-button {
    background-color: var(--secondary-color) !important;
}
.ui-button.secondary-button:hover {
    background-color: color-mix(in srgb, var(--secondary-color) 85%, black) !important;
}
.ui-button.error-button {
    background-color: #ef4444 !important; 
}

/* Icone */
.ui-section .ui-icon {
    color: var(--icon-color) !important; 
    min-width: var(--icon-size);
    min-height: var(--icon-size);
    width: var(--icon-size);
    height: var(--icon-size);
    cursor: pointer;
    transition: color 0.3s;
}

/* Input/Form */
.ui-section .input-text, .ui-section .input-text-select {
    border: 1px solid var(--main-border-color);
    padding: 0.5rem;
    border-radius: var(--border-radius) !important; 
    color: var(--text-color) !important; 
    font-size: var(--font-size) !important; 
    width: 100%; 
    box-sizing: border-box;
    background-color: white;
}

/* 🔴 STILI TABELLA (MAIN) */
#main .ui-table {
    border-collapse: collapse;
    width: 100%;
}
#main .ui-table th {
    background-color: var(--main-button-color) !important; 
    color: white !important; 
    padding: 0.75rem 1rem;
    border-right: var(--main-table-bordered-columns); 
}
#main .ui-table td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--main-border-color);
    border-right: var(--main-table-bordered-columns); 
}
/* Rimuovi bordo destro dall'ultima colonna */
#main .ui-table th:last-child, #main .ui-table td:last-child {
    border-right: none;
}
/* Sfondo righe alternato (gestito da JS) */
#main .ui-table tbody tr:nth-child(odd) {
    background-color: var(--main-table-striped);
}
#main .ui-table tbody tr:hover {
    background-color: color-mix(in srgb, var(--main-section-bg-color) 90%, #d1d5db) !important;
}

/* Gruppi di Utilità */
.ui-section-group {
    margin-bottom: 1rem; 
    padding: 0.75rem; 
    border: 1px solid #d1d5db; 
    border-radius: var(--header-border-radius); 
    background-color: #f9fafb;
}
.grid-2-col-gap-3 {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem; 
    margin-bottom: 0.5rem;
}
.input-color-preview {
    height: 1.5rem;
    width: 100%;
    margin-top: 0.25rem;
    border-radius: 0.25rem;
    border: 1px solid #d1d5db;
    padding: 2px;
    box-sizing: border-box; 
    cursor: pointer;
}
.input-text-select.small-select {
    font-size: 0.8rem !important;
    padding: 0.3rem;
    height: 1.8rem;
    line-height: 1;
}

/* Layout Flex Utilità */
.flex-row-center-between {
    display: flex;
    flex-direction: column; /* Default mobile */
    justify-content: space-between;
    align-items: center;
    gap: 1rem; 
    margin-bottom: 1rem;
}
@media (min-width: 768px) { /* Adattamento per Desktop (md:) */
    .flex-row-center-between.md-row {
        flex-direction: row;
        gap: 0;
    }
}
.ui-button-group {
    display: flex;
    gap: 1rem; 
    flex-wrap: wrap;
}
.form-group-inline {
    display: flex;
    align-items: center;
    gap: 0.5rem; 
}
.action-group {
    display: flex;
    align-items: center;
    gap: 1rem; 
}

`;


// ----------------------------------------------------
// Componente di Test per la Grafica 
// ----------------------------------------------------
export default function ExportTestGrafica() {

    // Lo stato è stato modularizzato
    const [styles, setStyles] = useState({
        // IMPOSTAZIONI GLOBALI
        global: {
            bgColor: '#f3f4f6', // SFONDO APP
            patternApp: 'Nessun Pattern', // PATTERN APP
            artisticAppEffect: 'Nessuno', // EFFETTI APP
            primaryColor: '#4f46e5', // Colore Primario/Branding
            secondaryColor: '#10b981', // Colore Secondario
            mainBorderColor: '#e5e7eb', // Colore Bordi
            tableAltColor: '#f7f7f7', // Colore Alternato per righe
        },
        // IMPOSTAZIONI PER SEZIONE (Valori iniziali presi dalla tua richiesta)
        header: {
            sectionBgColor: '#ffffff',
            buttonColor: '#4f46e5',
            fontFamily: 'Inter',
            textColor: '#1f2937',
            fontSize: 'Normale (1.0)',
            fontWeight: 'Semi-Grassetto (600)',
            borderRadius: 'Medio (8px)',
            shadowStyle: 'Soft (Default)',
            iconSize: 'Normale (24px)',
            iconColor: '#4f46e5',
            sectionArtisticEffect: 'Nessuno',
        },
        preHeader: {
            sectionBgColor: '#e5e7eb',
            buttonColor: '#10b981',
            fontFamily: 'Inter',
            textColor: '#1f2937',
            fontSize: 'Sottile (0.9)',
            fontWeight: 'Normale (400)',
            borderRadius: 'Nessuno (0)',
            shadowStyle: 'Nessuna Ombra',
            iconSize: 'Media (20px)',
            iconColor: '#4f46e5',
            sectionArtisticEffect: 'Nessuno',
        },
        main: {
            sectionBgColor: '#ffffff',
            buttonColor: '#4f46e5',
            fontFamily: 'Inter',
            textColor: '#1f2937',
            fontSize: 'Normale (1.0)',
            fontWeight: 'Normale (400)',
            borderRadius: 'Medio (8px)',
            shadowStyle: 'Soft (Default)',
            iconSize: 'Normale (24px)',
            iconColor: '#4f46e5',
            sectionArtisticEffect: 'Nessuno',
            // Opzioni Tabella (Specifiche Main)
            tableStriped: false, 
            tableBordered: true, 
        },
        preFooter: {
            sectionBgColor: '#f3f4f6',
            buttonColor: '#10b981',
            fontFamily: 'Inter',
            textColor: '#1f2937',
            fontSize: 'Normale (1.0)',
            fontWeight: 'Semi-Grassetto (600)',
            borderRadius: 'Medio (8px)',
            shadowStyle: 'Nessuna Ombra',
            iconSize: 'Grande (32px)',
            iconColor: '#4f46e5',
            sectionArtisticEffect: 'Nessuno',
        },
        footer: {
            sectionBgColor: '#e5e7eb',
            buttonColor: '#4f46e5',
            fontFamily: 'Inter',
            textColor: '#1f2937',
            fontSize: 'Sottile (0.9)',
            fontWeight: 'Normale (400)',
            borderRadius: 'Nessuno (0)',
            shadowStyle: 'Nessuna Ombra',
            iconSize: 'Piccola (16px)',
            iconColor: '#4f46e5',
            sectionArtisticEffect: 'Nessuno',
        }
    });

    // Funzione per aggiornare le variabili CSS globali (sul root del documento)
    const setCssVariables = () => {
        const root = document.documentElement.style;

        // Funzione helper per convertire Camel Case in Kebab Case
        const toKebabCase = (key) => key.replace(/([A-Z])/g, '-$1').toLowerCase();

        // 1. Aggiorna variabili GLOBALI
        Object.keys(styles.global).forEach(key => {
            let value = styles.global[key];
            if (key === 'patternApp') value = PATTERN_MAP[value] || value;
            if (key === 'artisticAppEffect') value = ARTISTIC_EFFECT_MAP[value] || value;
            
            root.setProperty(`--${toKebabCase(key)}`, value);
        });

        // 2. Aggiorna variabili di SEZIONE
        Object.keys(styles).filter(k => k !== 'global').forEach(sectionKey => {
            const sectionStyles = styles[sectionKey];
            Object.keys(sectionStyles).forEach(styleKey => {
                let value = sectionStyles[styleKey];
                const varName = `--${sectionKey}-${toKebabCase(styleKey)}`;

                // Mappatura dei valori complessi
                if (styleKey === 'shadowStyle') {
                    value = SHADOW_MAP[value] || value;
                    // Imposta l'ombra sul pulsante come la shadow della sezione
                    root.setProperty(`--${sectionKey}-button-shadow`, value);
                }
                else if (styleKey === 'sectionArtisticEffect') value = ARTISTIC_EFFECT_MAP[value] || value;
                else if (styleKey === 'fontFamily') value = FONT_FAMILY_MAP[value] || value;
                else if (styleKey === 'fontSize') {
                    value = FONT_SIZE_MAP[value] || value;
                    const baseSize = parseFloat(value.replace('rem', ''));
                    // Calcola la dimensione dell'H2 in base alla dimensione del font base
                    const h2Size = `${baseSize * 1.75}rem`; 
                    root.setProperty(`--${sectionKey}-h2-font-size`, h2Size);
                }
                else if (styleKey === 'fontWeight') value = FONT_WEIGHT_MAP[value] || value;
                else if (styleKey === 'borderRadius') value = BORDER_RADIUS_MAP[value] || value;
                else if (styleKey === 'iconSize') value = ICON_SIZE_MAP[value] || value;
                // Gestione speciale per le opzioni Tabella (Main)
                else if (sectionKey === 'main' && styleKey === 'tableStriped') {
                    // Imposta il colore alternato, o trasparente se disabilitato
                    root.setProperty('--main-table-striped', value ? 'var(--table-alt-color)' : 'transparent');
                    return;
                }
                else if (sectionKey === 'main' && styleKey === 'tableBordered') {
                    root.setProperty('--main-table-bordered-columns', value ? '1px solid var(--main-border-color)' : 'none');
                    return;
                }
                
                root.setProperty(varName, value);
            });
        });
    };

    // Chiama setCssVariables ogni volta che lo stato cambia
    useEffect(() => {
        setCssVariables();
        
        // Questo è necessario per calcolare le altezze iniziali di Header/Footer dopo il rendering
        const updateFixedHeights = () => {
            const headerElement = document.getElementById('header');
            const footerElement = document.getElementById('footer');
            if (headerElement && footerElement) {
                // Imposta l'altezza fissa sul root
                document.documentElement.style.setProperty('--header-height', `${headerElement.offsetHeight}px`);
                document.documentElement.style.setProperty('--footer-height', `${footerElement.offsetHeight}px`);
            }
        };

        // Aggiorna dopo il rendering
        updateFixedHeights();

        // Aggiungi un resize listener per adattare se la finestra cambia dimensione
        window.addEventListener('resize', updateFixedHeights);
        return () => window.removeEventListener('resize', updateFixedHeights);
        
    }, [styles]); 

    // Handler per gli input del pannello di controllo
    const handleChange = (e, section) => {
        const { id, value, type, checked } = e.target;
        
        if (type === 'checkbox') {
            setStyles(prev => ({
                ...prev,
                [section]: { ...prev[section], [id]: checked }
            }));
        } else {
            setStyles(prev => ({ 
                ...prev, 
                [section]: { ...prev[section], [id]: value } 
            }));
        }
    };


    const SectionControl = ({ title, sectionKey }) => {
        const currentStyles = styles[sectionKey];
        const isMain = sectionKey === 'main';

        return (
            <div className="ui-section-group">
                <h3>{title}</h3>
                
                {/* -------------------- Colori -------------------- */}
                <div className="grid-2-col-gap-3">
                    <label className="block">Sfondo Sez.: 
                        <input type="color" id="sectionBgColor" value={currentStyles.sectionBgColor} onChange={(e) => handleChange(e, sectionKey)} className="input-color-preview" />
                    </label>
                    <label className="block">Pulsanti: 
                        <input type="color" id="buttonColor" value={currentStyles.buttonColor} onChange={(e) => handleChange(e, sectionKey)} className="input-color-preview" />
                    </label>
                    <label className="block">Testo: 
                        <input type="color" id="textColor" value={currentStyles.textColor} onChange={(e) => handleChange(e, sectionKey)} className="input-color-preview" />
                    </label>
                    <label className="block">Icone: 
                        <input type="color" id="iconColor" value={currentStyles.iconColor} onChange={(e) => handleChange(e, sectionKey)} className="input-color-preview" />
                    </label>
                </div>
                
                {/* -------------------- Font/Testo -------------------- */}
                <hr className="my-3 border-gray-200" />
                <label htmlFor={`${sectionKey}-fontFamily`} className="block mb-1">Font:</label>
                <select id="fontFamily" value={currentStyles.fontFamily} onChange={(e) => handleChange(e, sectionKey)} className="input-text-select small-select">
                    {Object.keys(FONT_FAMILY_MAP).map(f => <option key={f} value={f}>{f}</option>)}
                </select>

                <div className="grid-2-col-gap-3">
                    <select id="fontSize" value={currentStyles.fontSize} onChange={(e) => handleChange(e, sectionKey)} className="input-text-select small-select">
                        {Object.keys(FONT_SIZE_MAP).map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select id="fontWeight" value={currentStyles.fontWeight} onChange={(e) => handleChange(e, sectionKey)} className="input-text-select small-select">
                        {Object.keys(FONT_WEIGHT_MAP).map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                </div>
                
                {/* -------------------- Layout/Effetti -------------------- */}
                <hr className="my-3 border-gray-200" />
                <div className="grid-2-col-gap-3">
                    <select id="borderRadius" value={currentStyles.borderRadius} onChange={(e) => handleChange(e, sectionKey)} className="input-text-select small-select">
                        {Object.keys(BORDER_RADIUS_MAP).map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <select id="shadowStyle" value={currentStyles.shadowStyle} onChange={(e) => handleChange(e, sectionKey)} className="input-text-select small-select">
                        {Object.keys(SHADOW_MAP).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select id="iconSize" value={currentStyles.iconSize} onChange={(e) => handleChange(e, sectionKey)} className="input-text-select small-select">
                        {Object.keys(ICON_SIZE_MAP).map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                    <select id="sectionArtisticEffect" value={currentStyles.sectionArtisticEffect} onChange={(e) => handleChange(e, sectionKey)} className="input-text-select small-select">
                        {Object.keys(ARTISTIC_EFFECT_MAP).map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>

                {/* Opzioni Tabella (Solo Main) */}
                {isMain && (
                    <>
                        <hr className="my-3 border-gray-200" />
                        <h3 className="mb-2">Opzioni Tabella</h3>
                        <label className="form-group-inline mb-1">
                            <input type="checkbox" id="tableStriped" checked={currentStyles.tableStriped} onChange={(e) => handleChange(e, sectionKey)} />
                            <span>Sfondo Righe Alternato</span>
                        </label>
                        <label className="form-group-inline">
                            <input type="checkbox" id="tableBordered" checked={currentStyles.tableBordered} onChange={(e) => handleChange(e, sectionKey)} />
                            <span>Bordi Colonne (Verticali)</span>
                        </label>
                    </>
                )}
            </div>
        );
    };

    return (
        <>
            {/* Inietta la stringa CSS definita sopra il componente */}
            <style dangerouslySetInnerHTML={{ __html: STYLE_CONTENT }} />
            
            <div className="app-container">
                
                {/* ======================================== */}
                {/* 🔴 PANNELLO DI CONTROLLO (Fisso Sinistra)   */}
                {/* ======================================== */}
                <div id="control-panel" className="control-panel-sidebar">
                    <h1 className="panel-title">🎨 UI Configurator</h1>
                    
                    {/* Gruppo Opzioni Globali */}
                    <div className="ui-section-group">
                        <h3>Impostazioni Globali App</h3>
                        <label className="block mt-1">Sfondo App: 
                            <input type="color" id="bgColor" value={styles.global.bgColor} onChange={(e) => handleChange(e, 'global')} className="input-color-preview" />
                        </label>
                        <div className="grid-2-col-gap-3">
                            <label className="block">Primario: 
                                <input type="color" id="primaryColor" value={styles.global.primaryColor} onChange={(e) => handleChange(e, 'global')} className="input-color-preview" />
                            </label>
                            <label className="block">Secondario: 
                                <input type="color" id="secondaryColor" value={styles.global.secondaryColor} onChange={(e) => handleChange(e, 'global')} className="input-color-preview" />
                            </label>
                            <label className="block">Colore Bordi: 
                                <input type="color" id="mainBorderColor" value={styles.global.mainBorderColor} onChange={(e) => handleChange(e, 'global')} className="input-color-preview" />
                            </label>
                            <label className="block">Sfondo Righe Alt: 
                                <input type="color" id="tableAltColor" value={styles.global.tableAltColor} onChange={(e) => handleChange(e, 'global')} className="input-color-preview" />
                            </label>
                        </div>

                        <label htmlFor="patternApp" className="block mt-2 mb-1">Pattern Sfondo:</label>
                        <select id="patternApp" value={styles.global.patternApp} onChange={(e) => handleChange(e, 'global')} className="input-text-select small-select">
                            {Object.keys(PATTERN_MAP).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        
                        <label htmlFor="artisticAppEffect" className="block mb-1">Effetti Globali:</label>
                        <select id="artisticAppEffect" value={styles.global.artisticAppEffect} onChange={(e) => handleChange(e, 'global')} className="input-text-select small-select">
                            {Object.keys(ARTISTIC_EFFECT_MAP).map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>

                    <h1 className="panel-title mt-4">⚙️ Stili Sezione</h1>
                    <SectionControl title="HEADER (Fisso)" sectionKey="header" />
                    <SectionControl title="PRE HEADER" sectionKey="preHeader" />
                    <SectionControl title="MAIN" sectionKey="main" />
                    <SectionControl title="PRE FOOTER" sectionKey="preFooter" />
                    <SectionControl title="FOOTER (Fisso)" sectionKey="footer" />
                </div>

                {/* ======================================== */}
                {/* 🔴 AREA CONTENUTO (Destra) - Layout Fisso   */}
                {/* ======================================== */}
                <div id="main-layout" className="main-content-wrapper">
                    
                    {/* 1. HEADER (Bloccato in alto) */}
                    <div id="header" className="ui-section fixed-top-section">
                        <div className="flex-row-center-between md-row">
                            <p className="panel-title text-primary-override" style={{marginBottom: 0}}>Logo Header App</p>
                            <div className="ui-button-group">
                                <button className="ui-button secondary-button">Dashboard</button>
                                <button className="ui-button">Servizi</button>
                                <button className="ui-button">Contatti</button>
                            </div>
                            <div className="action-group">
                                <Icon name="sun" className="ui-icon icon-lg" />
                                <Icon name="user-circle" className="ui-icon icon-lg" />
                            </div>
                        </div>
                    </div>

                    {/* 🔴 CONTENUTO CENTRALE SCROLLABILE */}
                    <div className="scrollable-content">

                        {/* 2. PREHEADER */}
                        <div id="preHeader" className="ui-section">
                            <h2>PreHeader: Notifiche & Lingua</h2>
                            <div className="flex-row-center-between">
                                <input type="text" className="input-text" placeholder="Messaggio importante..." defaultValue="Offerta a tempo limitata!"/>
                                <div className="ui-button-group">
                                    <label className="form-group-inline">
                                        <input type="radio" name="lang" defaultChecked /><span>Italiano</span>
                                    </label>
                                    <label className="form-group-inline">
                                        <input type="radio" name="lang" /><span>English</span>
                                    </label>
                                </div>
                                <div className="action-group">
                                    <Icon name="bell" className="ui-icon icon-lg" />
                                    <button className="ui-button">Chiudi Avviso</button>
                                </div>
                            </div>
                        </div>
                        
                        {/* 3. MAIN */}
                        <div id="main" className="ui-section">
                            <h1 className="main-title" style={{color: 'var(--main-text-color)'}}>Area di Contenuto Principale</h1>
                            <h2>Main: Contenuto Principale & Tabella Finta</h2>

                            <textarea className="input-text" placeholder="Scrivi qui il contenuto principale..." defaultValue={`Questo è un blocco di testo multilinea. La dimensione del font, il colore e gli effetti (ombra, raggiatura) si applicano a questo elemento, seguendo lo stile della sezione Main. Prova a cambiare lo sfondo della sezione Main per vedere l'effetto immediato.`}></textarea>

                            <div className="ui-button-group action-group-bottom">
                                <button className="ui-button">Azione Principale</button>
                                <button className="ui-button error-button">Elimina Record</button>
                                <label className="form-group-inline">
                                    <input type="checkbox" defaultChecked />
                                    <span>Abilita Funzione X</span>
                                </label>
                                <Icon name="star" className="ui-icon icon-lg" />
                                <Icon name="check-circle" className="ui-icon icon-lg" />
                            </div>

                            {/* Tabella Finta (Dati) */}
                            <h3>Tabella Dati Finta</h3>
                            <div className="table-container">
                                <table className="ui-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Nome Progetto</th>
                                            <th>Stato</th>
                                            <th>Scadenza</th>
                                            <th>Azioni</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>101</td>
                                            <td>Piattaforma UI Test</td>
                                            <td><span className="status-completed" style={{color: 'var(--secondary-color)'}}>Completato</span></td>
                                            <td>2025/10/30</td>
                                            <td><Icon name="edit" className="ui-icon icon-sm cursor-pointer" /></td>
                                        </tr>
                                        <tr>
                                            <td>102</td>
                                            <td>Analisi Colori</td>
                                            <td><span className="status-in-progress">In Corso</span></td>
                                            <td>2025/11/15</td>
                                            <td><Icon name="trash-2" className="ui-icon icon-sm cursor-pointer" /></td>
                                        </tr>
                                        <tr>
                                            <td>103</td>
                                            <td>Ottimizzazione Mobile</td>
                                            <td><span className="status-pending">In Sospeso</span></td>
                                            <td>2025/12/01</td>
                                            <td><Icon name="eye" className="ui-icon icon-sm cursor-pointer" /></td>
                                        </tr>
                                        <tr>
                                            <td>104</td>
                                            <td>Testing Moduli</td>
                                            <td><span className="status-completed" style={{color: 'var(--secondary-color)'}}>Completato</span></td>
                                            <td>2025/09/25</td>
                                            <td><Icon name="edit" className="ui-icon icon-sm cursor-pointer" /></td>
                                        </tr>
                                        <tr>
                                            <td>105</td>
                                            <td>Report Finale</td>
                                            <td><span className="status-in-progress">In Corso</span></td>
                                            <td>2025/11/01</td>
                                            <td><Icon name="eye" className="ui-icon icon-sm cursor-pointer" /></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* 4. PREFOOTER */}
                        <div id="preFooter" className="ui-section">
                            <h2>PreFooter: Call to Action</h2>
                            <div className="flex-row-center-between">
                                <p>Sei pronto ad adottare questo nuovo stile?</p>
                                <div className="action-group">
                                    <Icon name="arrow-right" className="ui-icon icon-lg" />
                                    <button className="ui-button secondary-button">Conferma Design</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* 5. FOOTER (Bloccato in basso) */}
                    <div id="footer" className="ui-section fixed-bottom-section">
                        <div className="flex-row-center-between md-row">
                            <input type="email" className="input-text" placeholder="Iscriviti alla newsletter..." />
                            <div className="ui-button-group">
                                <a href="#" className="link-style" style={{color: 'var(--footer-icon-color)'}}>Privacy</a>
                                <span style={{color: 'var(--footer-text-color)'}}>|</span>
                                <a href="#" className="link-style" style={{color: 'var(--footer-icon-color)'}}>Termini</a>
                            </div>
                            <div className="action-group">
                                <Icon name="twitter" className="ui-icon icon-sm" />
                                <Icon name="linkedin" className="ui-icon icon-sm" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}