import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import axios from 'axios'; 
import { v4 as uuidv4 } from 'uuid'; 
import '../styles/MainStyle.css';

const API_URL = process.env.REACT_APP_API_URL; 

// MODIFICA RICHIESTA 2: Definizione delle categorie
const DOCUMENT_CATEGORIES = [
    'bollette',
    'assicurazioni',
    'fotografie',
    'lavoro',
    'salute',
    'scontrini_spesa',
    'docum_dich_redditi',
    'contratti_vari',
    'altro',
];
// FINE MODIFICA RICHIESTA 2

function ArchivioDocumenti() {
    const navigate = useNavigate();
    const location = useLocation();
    const [documents, setDocuments] = useState([]);
    const [file, setFile] = useState(null);
    // [MODIFICA 1] Sostituiti editableFileName con i due nuovi stati
    const [originalFileName, setOriginalFileName] = useState(''); 
    const [personalFileName, setPersonalFileName] = useState(''); 
    const [description, setDescription] = useState('');
    const [referenceDate, setReferenceDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [isImageLoading, setIsImageLoading] = useState(false);
    const [familyGroup, setFamilyGroup] = useState(null);
    const [familyUsers, setFamilyUsers] = useState([]);
    const [loggedUserId, setLoggedUserId] = useState(null);
    const [loggedUsername, setLoggedUsername] = useState(null);
    const [error, setError] = useState(null);
    const [sortBy, setSortBy] = useState('created_at');
    const [sortDirection, setSortDirection] = useState('desc');

    const [searchUsernames, setSearchUsernames] = useState([]);
    const [searchYear, setSearchYear] = useState('');
    const [searchQueryName, setSearchQueryName] = useState('');
    const [fileUrlToArchive, setFileUrlToArchive] = useState(null);
    const [localFileUrl, setLocalFileUrl] = useState(null); // STATO per l'URL temporaneo del file locale
    
    // MODIFICA RICHIESTA 6: Nuovo stato per il filtro categoria
    const [searchCategory, setSearchCategory] = useState('');
    
    // =========================================================
    // NUOVI STATI PER UPLOAD (RICHIESTE 2, 4)
    // =========================================================
    const [isForAlfred, setIsForAlfred] = useState(false);
    const [alfredUserId, setAlfredUserId] = useState(null);
    const [alfredUsername, setAlfredUsername] = useState(null);
    const [documentCategory, setDocumentCategory] = useState(DOCUMENT_CATEGORIES[0]); // MODIFICA RICHIESTA 2: Categoria
    const [expirationDate, setExpirationDate] = useState(''); // MODIFICA RICHIESTA 4: Data Scadenza
    // =========================================================

    // === RECUPERO PROFILO ALFRED ===
    const fetchAlfredProfile = useCallback(async (currentFamilyGroup) => {
        if (!currentFamilyGroup) return;

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username')
                .eq('family_group', currentFamilyGroup)
                .eq('is_ai', true)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
                throw error;
            }

            if (data) {
                setAlfredUserId(data.id);
                setAlfredUsername(data.username);
            } else {
                console.warn("Alfred non trovato. Assicurarsi che ci sia un profilo con 'is_ai=true' nel gruppo famiglia.");
            }
        } catch (err) {
            console.error("Errore nel recupero del profilo di Alfred:", err);
            setError(`Errore nel recupero del profilo AI: ${err.message}`);
        }
    }, []);

    // === FETCH DOCUMENTS ===
    const fetchDocuments = useCallback(async (group, filters = {}, sortField = 'created_at', sortDir = 'desc') => {
        setLoading(true);
        setError(null);
        try {
            const { data: usersData, error: usersError } = await supabase
                .from('profiles')
                .select('id, username')
                .eq('family_group', group)
                .order('username', { ascending: true });
            if (usersError) throw usersError;

            const userMap = usersData.reduce((map, user) => {
                map[user.id] = user.username;
                return map;
            }, {});
            setFamilyUsers(usersData);

            let query = supabase
                .from('documents-family')
                .select('*, personal_file_name') 
                .eq('family_group', group);

            if (filters.usernames && filters.usernames.length > 0) {
                const userIds = usersData.filter(u => filters.usernames.includes(u.username)).map(u => u.id);
                if (userIds.length > 0) query = query.in('uploaded_by', userIds);
            }
            if (filters.year) {
                const startOfYear = `${filters.year}-01-01`;
                const endOfYear = `${filters.year}-12-31`;
                query = query.gte('reference_date', startOfYear).lte('reference_date', endOfYear);
            }
            if (filters.searchQueryName) {
                query = query.or(
                    `file_name.ilike.%${filters.searchQueryName}%,personal_file_name.ilike.%${filters.searchQueryName}%,description.ilike.%${filters.searchQueryName}%`
                );
            }
            // MODIFICA RICHIESTA 6: Aggiungi filtro per categoria
            if (filters.searchCategory) {
                query = query.eq('categoria_documento', filters.searchCategory);
            }
            // FINE MODIFICA RICHIESTA 6

            if (sortField !== 'username') {
                query = query.order(sortField, { ascending: sortDir === 'asc' });
            }

            const { data: documentsData, error: documentsError } = await query;
            if (documentsError) throw documentsError;

            let combinedDocuments = documentsData.map(doc => ({
                ...doc,
                username: doc.username || userMap[doc.uploaded_by] || 'Sconosciuto'
            }));

            if (sortField === 'username') {
                combinedDocuments.sort((a, b) => {
                    const usernameA = a.username.toLowerCase();
                    const usernameB = b.username.toLowerCase();
                    if (usernameA < usernameB) return sortDir === 'asc' ? -1 : 1;
                    if (usernameA > usernameB) return sortDir === 'asc' ? 1 : -1;
                    return 0;
                });
            }

            setDocuments(combinedDocuments || []);
        } catch (err) {
            console.error('Errore nel recupero dei dati:', err);
            setError('Errore nel caricamento dei documenti: ' + err.message);
            setDocuments([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // === INIT DATA ===
    useEffect(() => {
        const initData = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    navigate('/auth');
                    return;
                }
                const userId = session.user.id;
                setLoggedUserId(userId);

                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('family_group, username')
                    .eq('id', userId)
                    .single();

                if (profileError || !profileData) {
                    navigate('/auth');
                    return;
                }

                setFamilyGroup(profileData.family_group);
                setLoggedUsername(profileData.username);

                // RECUPERA PROFILO ALFRED
                await fetchAlfredProfile(profileData.family_group);

                if (location.state && location.state.fileToArchive) {
                    const { fileName, fileUrl } = location.state.fileToArchive;
                    // Se arriva dalla chat, imposta entrambi i nomi e l'URL
                    setOriginalFileName(fileName); 
                    setPersonalFileName(fileName); 
                    setFileUrlToArchive(fileUrl);
                    // L'URL locale non serve in questo caso, è già un URL remoto
                    setLocalFileUrl(fileUrl); 
                    window.history.replaceState({}, document.title);
                }

                fetchDocuments(profileData.family_group, {}, sortBy, sortDirection);
            } catch (err) {
                console.error('Errore init data:', err);
                setError('Errore iniziale: ' + err.message);
            }
        };
        initData();
    }, [navigate, fetchDocuments, sortBy, sortDirection, location.state, fetchAlfredProfile]);
    
    // Funzione per generare un URL temporaneo per i file locali (per l'apertura)
    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);

        if (selectedFile) {
            setOriginalFileName(selectedFile.name);
            setPersonalFileName(selectedFile.name);

            // Crea un URL temporaneo per la visualizzazione locale
            const url = URL.createObjectURL(selectedFile);
            setLocalFileUrl(url);
        } else {
            setFile(null);
            setOriginalFileName('');
            setPersonalFileName('');
            setLocalFileUrl(null);
        }
    };
    
    // Cleanup dell'URL locale quando il componente smonta
    useEffect(() => {
        return () => {
            if (localFileUrl && localFileUrl.startsWith('blob:')) {
                URL.revokeObjectURL(localFileUrl);
            }
        };
    }, [localFileUrl]);

    // === UPLOAD FILE CON LOGICA ALFRED ===
    const handleFileUpload = async (e) => {
        e.preventDefault();
        
        if (!file && !fileUrlToArchive) {
            setError("Seleziona un file o passa un file dalla chat.");
            return;
        }
        
        if (!personalFileName) { 
            setError("Inserisci un nome personale per il documento.");
            return;
        }
        
        if (!documentCategory) {
            setError("Seleziona una categoria per il documento.");
            return;
        }
        
        setIsImageLoading(true);
        setError(null);

        const finalReferenceDate = referenceDate || new Date().toISOString().slice(0, 10);
        
        // Dati base per l'inserimento
        const baseDocData = {
            family_group: familyGroup,
            uploaded_by: loggedUserId,
            username: loggedUsername,
            file_name: originalFileName, 
            personal_file_name: personalFileName, 
            description: description,
            reference_date: finalReferenceDate,
            file_type: file ? file.type : 'link', 
            categoria_documento: documentCategory, 
            data_scadenza: expirationDate || null, 
        };

        let insertedFamilyDocId = null; 

        try {
            let familyFileUrl = fileUrlToArchive;
            let finalFileName;

            if (file) {
                // CORREZIONE ERRORE: file.name.split è corretto qui
                const parts = file.name.split('.');
                const fileExtension = parts.length > 1 ? parts.pop() : 'dat'; 
                finalFileName = `${Date.now()}_${loggedUserId}_${originalFileName.replace(/[^a-z0-9]/gi, '_')}.${fileExtension}`; 
                const uniquePath = `${familyGroup}/${finalFileName}`;
                
                // 1. UPLOAD PER LA FAMIGLIA (family_documents bucket)
                const { error: uploadError } = await supabase.storage
                    .from('family_documents')
                    .upload(uniquePath, file);
                if (uploadError) throw new Error(`Errore upload famiglia: ${uploadError.message}`);

                const { data: { publicUrl: newPublicUrl } } = supabase.storage
                    .from('family_documents')
                    .getPublicUrl(uniquePath);

                familyFileUrl = newPublicUrl;
                
                // 2. DUPLICAZIONE CONDIZIONALE PER ALFRED (Solo per file locali)
                if (isForAlfred && alfredUserId) {
                    try {
                        const finalAlfredFileName = `alfred_${Date.now()}_${loggedUserId}_${originalFileName.replace(/[^a-z0-9]/gi, '_')}.${fileExtension}`; 
                        const alfredBucketPath = `${familyGroup}/${finalAlfredFileName}`;
                        
                        // 1. Carica il file nel bucket di Alfred
                        const { error: alfredUploadError } = await supabase.storage
                            .from('bucket-documents-alfred')
                            .upload(alfredBucketPath, file);
                        
                        if (alfredUploadError) {
                            throw new Error("Errore upload Alfred: " + alfredUploadError.message);
                        }
                        
                        // Ottiene l'URL pubblico del file
                        const { data: alfredUrlData } = supabase.storage
                            .from('bucket-documents-alfred')
                            .getPublicUrl(alfredBucketPath);
                        const alfredFileUrl = alfredUrlData.publicUrl;

                        // 2. Inserisce il record nella tabella Alfred e ottiene l'ID
                        const alfredDocumentData = {
                            ...baseDocData,
                            uploaded_by: alfredUserId,
                            username: alfredUsername,
                            file_url: alfredFileUrl,
                        };

                        const { data: alfredInsertData, error: alfredInsertError } = await supabase
                            .from('documents-alfred')
                            .insert([alfredDocumentData])
                            .select();
                        
                        if (alfredInsertError) {
                            throw new Error("Errore nell'inserimento del record Alfred: " + alfredInsertError.message);
                        }

                        // 3. Avvia il processo di ingestione sul backend usando i dati appena salvati
                        console.log("Avvio del processo di ingestione sul server...");
                        const response = await axios.post(`${API_URL}/api/process-document`, {
                            familyGroup: familyGroup,
                            fileName: originalFileName, 
                            fileUrl: alfredFileUrl,
                            username: loggedUsername,
                            documentId: alfredInsertData[0].id,
                            uploadedBy: loggedUserId,
                            uploadedByName: loggedUsername, 
                            fileType: file ? file.type : 'link', 
                        });
                        console.log("Risposta dal server di ingestione:", response.data);
                        
                    
                    } catch (ingestionError) {
                        console.error("Errore durante la gestione di Alfred:", ingestionError.message);
                        alert("Errore durante il processo di elaborazione AI.");
                    }
                } else if (isForAlfred && !alfredUserId) {
                    console.warn("Profilo Alfred non disponibile. Duplicazione per Alfred saltata.");
                }
            }

            // 3. INSERIMENTO FINALE NELLA TABELLA FAMIGLIA
            const newDoc = {
                ...baseDocData,
                file_url: familyFileUrl,
            };
            
            const { data: familyInsertData, error: insertError } = await supabase
                .from('documents-family')
                .insert([newDoc])
                .select(); 

            if (insertError) throw new Error(`Errore inserimento famiglia: ${insertError.message}`);

            insertedFamilyDocId = familyInsertData[0].id;

            // MODIFICA RICHIESTA 5: INTEGRAZIONE CALENDARIO
            if (expirationDate) {
                try {
                    const eventData = {
                        id: uuidv4(), 
                        title: `SCADENZA: ${personalFileName}`, 
                        categoria_eve: 'FINANZA', 
                        description: `Documento: ${personalFileName} (Cat: ${documentCategory}). Caricato da: ${loggedUsername}. Visualizza: ${familyFileUrl}`, 
                        start: new Date(expirationDate).toISOString(),
                        end: new Date(expirationDate).toISOString(), 
                        created_by: loggedUserId,
                        family_group: familyGroup, 
                        document_id: insertedFamilyDocId, 
                        document_url: familyFileUrl, 
                    };

                    console.log("Creazione evento calendario tramite Supabase...");
                    const { error: calendarInsertError } = await supabase
                        .from('events')
                        .insert([eventData]);
                    
                    if (calendarInsertError) throw calendarInsertError;

                    console.log("Evento calendario creato con successo tramite Supabase.");
                } catch (calendarError) {
                    console.error("Errore durante la creazione dell'evento calendario (Supabase):", calendarError.message);
                    alert("Documento archiviato, ma errore nella creazione dell'evento calendario: " + calendarError.message);
                }
            }
            
            // Reset form
            setFile(null);
            setOriginalFileName(''); 
            setPersonalFileName('');
            setDescription('');
            setReferenceDate('');
            setExpirationDate(''); 
            setDocumentCategory(DOCUMENT_CATEGORIES[0]); 
            setFileUrlToArchive(null);
            setLocalFileUrl(null); 
            setIsForAlfred(false); 
            
            fetchDocuments(familyGroup, {}, sortBy, sortDirection);
        } catch (err) {
            console.error("Errore caricamento:", err);
            setError("Errore salvataggio: " + err.message);
        } finally {
            setIsImageLoading(false);
        }
    };

    // === DELETE FILE ===
    const handleDelete = async (docId, fileUrl) => {
        if (window.confirm(`Sei sicuro di voler eliminare questo documento?`)) {
            try {
                // Elimina il record dalla tabella 'documents-alfred' (se presente)
                const { error: alfredDeleteError } = await supabase
                    .from('documents-alfred')
                    .delete()
                    .eq('id', docId);

                if (alfredDeleteError) {
                    console.error("Errore durante l'eliminazione del record Alfred:", alfredDeleteError);
                }

                // Elimina il record dalla tabella 'documents-family'
                const { error: deleteError } = await supabase
                    .from('documents-family')
                    .delete()
                    .eq('id', docId);

                if (deleteError) {
                    throw deleteError;
                }
                
                fetchDocuments(familyGroup, {
                    usernames: searchUsernames,
                    year: searchYear,
                    searchQueryName: searchQueryName,
                    searchCategory: searchCategory
                }, sortBy, sortDirection);

            } catch (error) {
                console.error("Errore durante l'eliminazione del documento:", error);
                setError('Errore durante l\'eliminazione: ' + error.message);
            }
        }
    };

    // === FILTRI ===
    const handleUserFilterChange = (username) => {
        setSearchUsernames(prev =>
            prev.includes(username)
                ? prev.filter(u => u !== username)
                : [...prev, username]
        );
    };

    return (
        <div className="app-layout">
            <header className="header">
                <h1>📂 Archivio Documenti</h1>
                <p>Gestisci documenti importanti per la tua famiglia.</p>
                <button onClick={() => navigate('/main-menu')} className="btn-secondary">
                    Menu Principale
                </button>
            </header>

            <section className="main-content">
                {/* --- Carica Documento --- */}
                <div className="info-box">
                    <h2>Carica un nuovo documento</h2>
                    <form onSubmit={handleFileUpload} className="upload-form-row">
                        {/* === UPLOAD FILE CON LOGICA ALFRED === */}

                        {fileUrlToArchive ? (
                            <div className="archived-file-display-row">
                                <div>File da archiviare: <strong>{originalFileName}</strong></div>
                                {(fileUrlToArchive.endsWith('.png') || fileUrlToArchive.endsWith('.jpg') || fileUrlToArchive.endsWith('.jpeg')) && (
                                    <img src={fileUrlToArchive} alt="Anteprima file" className="file-preview-large" />
                                )}
                            </div>
                        ) : (
                            <div className="file-select-row">
                                <label htmlFor="file-input" className="file-label">
                                    Seleziona File
                                    <input
                                        id="file-input"
                                        type="file"
                                        onChange={handleFileChange}
                                        className="hidden-input"
                                    />
                                </label>
                                <span className="file-name-display">{file ? file.name : 'Nessun file selezionato'}</span>
                                {file && file.type.startsWith('image/') && (
                                    <img src={URL.createObjectURL(file)} alt="Anteprima file" className="file-preview-large" />
                                )}
                            </div>
                        )}

                        <div className="form-group-column">
                            
                            {/* [MODIFICA] Nome del File (Originale - Solo Visualizzazione) */}
                            <div className="form-group">
                                <label htmlFor="original-file-name">Nome File Originale (Non modificabile)</label>
                                <input
                                    id="original-file-name"
                                    type="text"
                                    value={originalFileName}
                                    className="form-input"
                                    readOnly 
                                    style={{ backgroundColor: '#f0f0f0' }}
                                    required
                                />
                            </div>

                            {/* NUOVO BLOCCO PER IL PULSANTE VISUALIZZA: Sotto e a destra */}
                            {/* Lo visualizza solo se un file è stato selezionato (localFileUrl è impostato) */}
                            {(file || fileUrlToArchive) && localFileUrl && (
                                <div style={{ textAlign: 'right', marginTop: '-10px', marginBottom: '10px' }}>
                                    <a 
                                        href={localFileUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        title="Visualizza Documento"
                                        style={{
                                            backgroundColor: '#337AFF',
                                            color: 'white',
                                            padding: '8px 12px',
                                            borderRadius: '5px',
                                            textDecoration: 'none',
                                            fontWeight: 'bold',
                                            display: 'inline-block' 
                                        }}
                                    >
                                        📄 Visualizza
                                    </a>
                                </div>
                            )}

                            {/* [MODIFICA 5] Nuovo campo: Nome Personale del File (Editabile) */}
                            <div className="form-group">
                                <label htmlFor="personal-file-name">Nome Personale del File (per la ricerca testuale)</label>
                                <input
                                    id="personal-file-name"
                                    type="text"
                                    value={personalFileName}
                                    onChange={(e) => setPersonalFileName(e.target.value)} 
                                    placeholder="Es: Bolletta Enel Giugno"
                                    className="form-input"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="description">Descrizione: (se possibile indicare dei termini che aiutino la ricerca )</label>
                                <input
                                    id="description"
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="form-input"
                                />
                            </div>
                            {/* MODIFICA RICHIESTA 2: Campo Categoria */}
                            <div className="form-group">
                                <label htmlFor="category-select">Categoria Documento:</label>
                                <select
                                    id="category-select"
                                    value={documentCategory}
                                    onChange={(e) => setDocumentCategory(e.target.value)}
                                    className="form-input"
                                    required
                                >
                                    {DOCUMENT_CATEGORIES.map(category => (
                                        <option key={category} value={category}>{category.replace(/_/g, ' ')}</option>
                                    ))}
                                </select>
                            </div>
                            {/* FINE MODIFICA RICHIESTA 2 */}
                            <div className="form-group">
                                <label htmlFor="ref-date">Data di Riferimento: ( non obbligatorio , utile per un filtro sulle date )</label>
                                <input
                                    id="ref-date"
                                    type="date"
                                    value={referenceDate}
                                    onChange={(e) => setReferenceDate(e.target.value)}
                                    className="form-input"
                                />
                            </div>
                            {/* MODIFICA RICHIESTA 4: Campo Data Scadenza Documento */}
                            <div className="form-group">
                                <label htmlFor="exp-date">Data Scadenza Documento: (utile per promemoria)</label>
                                <input
                                    id="exp-date"
                                    type="date"
                                    value={expirationDate}
                                    onChange={(e) => setExpirationDate(e.target.value)}
                                    className="form-input"
                                />
                            </div>
                            {/* FINE MODIFICA RICHIESTA 4 */}

                            {/* === CHECKBOX PER ALFRED (STILE MANTENUTO) === */}
                            
<div className="form-group" style={{ 
    alignItems: 'center', 
    marginTop: '15px', 
    // NUOVI STILI PER INGRANDIRE E METTERE IN RISALTO
    padding: '10px', 
    backgroundColor: '#fffbe5', // Sfondo giallo chiaro per risaltare
    border: '1px solid #ffcc00', 
    borderRadius: '5px' 
}}>
    <input
        type="checkbox"
        id="isForAlfred"
        checked={isForAlfred}
        onChange={(e) => setIsForAlfred(e.target.checked)}
        style={{ 
            marginRight: '12px',
            // Aumenta la dimensione del checkbox
            width: '20px', 
            height: '20px' 
        }}
        disabled={!alfredUserId} // Disabilita se il profilo di Alfred non è stato trovato
    />
    <label 
        htmlFor="isForAlfred" 
        title={!alfredUserId ? "Alfred non trovato nel gruppo famiglia" : ""}
        // Aumenta la dimensione del font
        style={{ fontWeight: 'bold', fontSize: '1.1em' }} 
    >
        Archivia anche per Alfred (Assistente AI)
    </label>
    {!alfredUserId && (
        <span style={{ color: 'red', marginLeft: '10px', fontSize: '0.9em' }}>
            (Alfred non trovato)
        </span>
    )}
</div>
                            {/* =================================================== */}

                        </div>

                        <button type="submit" disabled={isImageLoading} className="btn-primary form-submit-btn">
                            {isImageLoading ? 'Caricamento...' : '➕ Carica/Archivia Documento'}
                        </button>
                        {error && <div className="info-box red">{error}</div>}
                    </form>
                </div>

                {/* --- Filtra Documenti --- */}
                <div className="info-box" style={{ marginTop: '16px' }}>
                    <h2>Filtra e cerca documenti</h2>
                    <div className="filter-container">
                        <div className="filter-group">
                            <label htmlFor="filter-1">Parola chiave su nome o descrizione</label>
                            <input
                                id="filter-1"
                                type="text"
                                value={searchQueryName}
                                onChange={(e) => setSearchQueryName(e.target.value)}
                                className="search-input"
                                placeholder="Cerca nel nome o nella descrizione"
                            />
                        </div>
                        {/* MODIFICA RICHIESTA 6: Filtro per Categoria */}
                        <div className="filter-group">
                            <label htmlFor="category-filter">Filtra per Categoria:</label>
                            <select
                                id="category-filter"
                                value={searchCategory}
                                onChange={(e) => setSearchCategory(e.target.value)}
                                className="styled-select"
                            >
                                <option value="">Tutte le Categorie</option>
                                {DOCUMENT_CATEGORIES.map(category => (
                                    <option key={category} value={category}>{category.replace(/_/g, ' ')}</option>
                                ))}
                            </select>
                        </div>
                        {/* FINE MODIFICA RICHIESTA 6 */}
                        <div className="filter-group-checkbox">
                            <label>Scegli Utente cha ha inserito :</label>
                            <div className="checkbox-list">
                                {familyUsers.map(user => (
                                    <label key={user.id} className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            value={user.username}
                                            checked={searchUsernames.includes(user.username)}
                                            onChange={() => handleUserFilterChange(user.username)}
                                            className="custom-checkbox"
                                        />
                                        {user.username}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="filter-group">
                            <label htmlFor="year-select">Anno di riferimento:</label>
                            <select
                                id="year-select"
                                value={searchYear}
                                onChange={(e) => setSearchYear(e.target.value)}
                                className="styled-select"
                            >
                                <option value="">Tutti</option>
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* CORREZIONE LAYOUT PULSANTI FILTRO */}
                    <div className="filter-buttons-row" style={{ marginTop: '12px' }}>
                        <button
                            className="btn-primary"
                            onClick={() => fetchDocuments(familyGroup, {
                                usernames: searchUsernames,
                                year: searchYear,
                                searchQueryName: searchQueryName,
                                searchCategory: searchCategory 
                            }, sortBy, sortDirection)}
                        >
                            Applica Filtri
                        </button>
                        <button
                            className="btn-secondary"
                            onClick={() => {
                                setSearchUsernames([]);
                                setSearchYear('');
                                setSearchQueryName('');
                                setSearchCategory(''); 
                                fetchDocuments(familyGroup, {}, sortBy, sortDirection);
                            }}
                        >
                            Elimina Filtri
                        </button>
                    </div>
                </div>

                {/* --- Lista Documenti --- */}
                {loading ? (
                    <div className="loading">Caricamento documenti...</div>
                ) : documents.length > 0 ? (
                    <div className="shopping-table-container">
                        <table className="shopping-table">
                            <thead>
                                <tr>
                                    <th onClick={() => { setSortBy('username'); setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); }}>Utente</th>
                                    <th onClick={() => { setSortBy('file_name'); setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); }}>Nome File</th>
                                    <th>Descrizione</th>
                                    {/* MODIFICA RICHIESTA 2: Aggiunto header categoria */}
                                    <th onClick={() => { setSortBy('categoria_documento'); setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); }}>Categoria</th> 
                                    <th onClick={() => { setSortBy('reference_date'); setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); }}>Data Riferimento</th>
                                    {/* MODIFICA RICHIESTA 4: Aggiunto header scadenza */}
                                    <th onClick={() => { setSortBy('data_scadenza'); setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); }}>Data Scadenza</th> 
                                    <th>Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {documents.map((doc) => (
                                    <tr key={doc.id}>
                                        <td>{doc.username || 'Sconosciuto'}</td>
                                        {/* [MODIFICA 7] Mostra il nome personale se disponibile, altrimenti il nome file originale */}
                                        <td>{doc.personal_file_name || doc.file_name}</td>
                                        <td>{doc.description}</td>
                                        {/* MODIFICA RICHIESTA 2: Mostra categoria */}
                                        <td>{doc.categoria_documento ? doc.categoria_documento.replace(/_/g, ' ') : 'N/D'}</td> 
                                        <td>{doc.reference_date ? new Date(doc.reference_date).toLocaleDateString() : 'N/D'}</td>
                                        {/* MODIFICA RICHIESTA 4: Mostra data scadenza e evidenzia se scaduta */}
                                        <td className={doc.data_scadenza && new Date(doc.data_scadenza) < new Date() ? 'expired-date' : ''}>
                                            {doc.data_scadenza ? new Date(doc.data_scadenza).toLocaleDateString() : 'N/D'}
                                        </td> 
                                        <td className="actions-cell">
                                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="btn-action btn-icon" title="Visualizza">📄</a>
                                            {/* La funzione handleDelete è stata aggiornata per eliminare da entrambe le tabelle */}
                                            <button onClick={() => handleDelete(doc.id, doc.file_url)} className="btn-delete btn-icon" title="Elimina">🗑️</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="info-box red" style={{ marginTop: '24px' }}>
                        <p>Nessun documento trovato con i filtri selezionati.</p>
                    </div>
                )}
            </section>
        </div>
    );
}

export default ArchivioDocumenti;