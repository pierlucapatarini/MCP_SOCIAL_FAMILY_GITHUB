import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../styles/MainStyle.css';
import '../styles/StilePagina9.css';

// Costante per identificare Alfred AI
const ALFRED_AI_IDENTIFIER = 'alfred.ai';

function Pagina9_GestioneUtenti() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [modalMode, setModalMode] = useState('add');
  const navigate = useNavigate();
  const [alfredExists, setAlfredExists] = useState(false);
  const [isCreatingAlfred, setIsCreatingAlfred] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  
const availableAvatars = [
  '👤','👨','👩','🧑','👶','👦','👧',
  '👨‍💼','👩‍💼','👨‍🎓','👩‍🎓','👨‍⚕️','👩‍⚕️',
  '👨‍🍳','👩‍🍳','👨‍💻','👩‍💻','👨‍🎨','👩‍🎨',
  '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼',
  '🌟','⭐','💫','✨','🔥','💎','🏆','🎯','🤖'
]

  const activityLevels = [
    { value: 'sedentario', label: 'Sedentario' },
    { value: 'leggero', label: 'Leggero' },
    { value: 'moderato', label: 'Moderato' },
    { value: 'attivo', label: 'Attivo' },
    { value: 'molto_attivo', label: 'Molto Attivo' }
  ];

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    avatar: '👤',
    gender: '',
    age: '',
    height: '',
    activity_level: 'moderato',
    target_weight: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  // Funzione helper per identificare Alfred
  const isAlfredUser = (user) => {
    return user.is_ai === true || 
           (user.email && user.email.includes(ALFRED_AI_IDENTIFIER)) ||
           user.username === 'Alfred AI';
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setSuccessMessage('');
      setErrorMessage('');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      setCurrentUser(user);

      const { data: profile } = await supabase
        .from('profiles')
        .select('family_group')
        .eq('id', user.id)
        .single();
      
      if (!profile?.family_group) {
        setUsers([]);
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('family_group', profile.family_group)
        .order('username', { ascending: true });

      if (error) throw error;

      setUsers(data || []);

      // Controlla se Alfred esiste
      const foundAlfred = (data || []).find(u => isAlfredUser(u));
      setAlfredExists(!!foundAlfred);

    } catch (error) {
      console.error("Errore nel recupero degli utenti:", error.message);
      setErrorMessage("Errore nel recupero degli utenti: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddUser = () => {
    setModalMode('add');
    setEditingUser(null);
    setFormData({
      username: '',
      email: '',
      avatar: '👤',
      gender: '',
      age: '',
      height: '',
      activity_level: 'moderato',
      target_weight: ''
    });
    setShowUserModal(true);
  };

  const handleEditUser = (user) => {
    setModalMode('edit');
    setEditingUser(user);
    setFormData({
      username: user.username || '',
      email: user.email || '',
      avatar: user.avatar || '👤',
      gender: user.gender || '',
      age: user.age || '',
      height: user.height || '',
      activity_level: user.activity_level || 'moderato',
      target_weight: user.target_weight || ''
    });
    setShowUserModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');
    
    try {
      if (modalMode === 'add') {
        setErrorMessage("Funzione di aggiunta utente in fase di sviluppo.");
        return;
      } else {
        const updateData = {
          username: formData.username,
          avatar: formData.avatar,
          gender: formData.gender,
          age: formData.age ? parseInt(formData.age) : null,
          height: formData.height ? parseInt(formData.height) : null,
          activity_level: formData.activity_level,
          target_weight: formData.target_weight ? parseFloat(formData.target_weight) : null
        };

        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', editingUser.id);

        if (error) throw error;
      }
      
      setShowUserModal(false);
      setSuccessMessage("Utente aggiornato con successo!");
      await fetchUsers();
    } catch (error) {
      console.error("Errore nell'operazione:", error.message);
      setErrorMessage("Errore nell'operazione: " + error.message);
    }
  };

  const handleDeleteUserClick = (user) => {
    if (user.id === currentUser.id) {
      setErrorMessage("Non puoi eliminare il tuo stesso account.");
      return;
    }
    
    if (isAlfredUser(user)) {
      setErrorMessage("Non puoi eliminare Alfred AI.");
      return;
    }
    
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ family_group: null })
        .eq('id', userToDelete.id);

      if (error) throw error;
      
      setSuccessMessage("Utente rimosso dal gruppo famiglia.");
      await fetchUsers();
    } catch (error) {
      console.error("Errore nella rimozione:", error.message);
      setErrorMessage("Errore nella rimozione: " + error.message);
    } finally {
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    }
  };

  const createAlfredUser = async () => {
    setIsCreatingAlfred(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utente non autenticato");

      const { data: profile } = await supabase
        .from('profiles')
        .select('family_group')
        .eq('id', user.id)
        .single();

      if (!profile?.family_group) throw new Error("Gruppo famiglia non trovato");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessione non trovata");

      const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
      const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
      const functionUrl = `${SUPABASE_URL}/functions/v1/create-alfred-user`;

      const payload = { familyGroup: profile.family_group };

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Controlla se Alfred esiste già
        if (response.status === 409) {
          setErrorMessage("Alfred AI è già presente nel tuo gruppo famiglia.");
          await fetchUsers(); // Refresh per mostrare Alfred esistente
          return;
        }
        throw new Error(responseData.error || 'Errore sconosciuto dalla Edge Function');
      }

      console.log('Alfred creato con successo:', responseData.alfred);
      setSuccessMessage("Alfred AI creato con successo!");
      
      // Refresh immediato degli utenti
      await fetchUsers();
      
    } catch (error) {
      console.error('Errore nella creazione di Alfred:', error);
      setErrorMessage("Errore nella creazione di Alfred: " + error.message);
    } finally {
      setIsCreatingAlfred(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  if (loading) return <div className="loading">Caricamento utenti...</div>;

  return (
    <div className="app-layout">
      <header className="header">
        <h1>👥 Gestione Utenti</h1>
        <p>Gestisci i membri del tuo gruppo famiglia.</p>
        <div className="um-header-actions">
          <button onClick={handleAddUser} className="um-btn-add">➕ Aggiungi Utente</button>
          <button onClick={() => navigate('/main-menu')} className="btn-secondary">Menu Principale</button>
        </div>
      </header>

      <main className="main-content">
        {successMessage && <div className="um-alert-box success-box">{successMessage}</div>}
        {errorMessage && <div className="um-alert-box error-box">{errorMessage}</div>}

        {/* Sezione creazione Alfred AI */}
        {!alfredExists && (
          <div className="um-alert-box alfred-creation-box">
            <div className="um-alert-content">
              <span className="um-alert-icon">🤖</span>
              <div className="um-alert-text">
                <p><strong>Alfred AI non è ancora presente nel tuo gruppo famiglia!</strong></p>
                <p>Alfred è il tuo maggiordomo digitale che ti aiuterà con promemoria, gestione del peso, 
                   monitoraggio delle attività e molto altro. Crealo ora per sbloccare tutte le funzionalità!</p>
              </div>
            </div>
            <button 
              onClick={createAlfredUser} 
              className="um-btn-create-ai" 
              disabled={isCreatingAlfred}
            >
              {isCreatingAlfred ? '🔄 Creazione in corso...' : '🤖 Crea Alfred AI'}
            </button>
          </div>
        )}

        {/* Tabella utenti */}
        <div className="um-table-container">
          <table className="um-users-table">
            <thead>
              <tr>
                <th>Avatar</th>
                <th>Nome Utente</th>
                <th>Email</th>
                <th>Tipo</th>
                <th>Genere</th>
                <th>Età</th>
                <th>Altezza (cm)</th>
                <th>Livello Attività</th>
                <th>Peso Target (kg)</th>
                <th>Creato il</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className={user.id === currentUser?.id ? 'um-current-user-row' : ''}>
                  <td><span className="um-avatar">{user.avatar || '👤'}</span></td>
                  <td>
                    <span className="um-username">
                      {user.username || 'N/A'}
                      {user.id === currentUser?.id && <span className="um-current-user-badge">(Tu)</span>}
                      {isAlfredUser(user) && <span className="um-ai-badge">🤖 (AI)</span>}
                    </span>
                  </td>
                  <td>{user.email || 'N/A'}</td>
                  <td>
                    {isAlfredUser(user) ? (
                      <span className="um-type-badge um-type-ai">🤖 Maggiordomo AI</span>
                    ) : (
                      <span className="um-type-badge um-type-user">👤 Utente</span>
                    )}
                  </td>
                  <td>{user.gender || 'N/A'}</td>
                  <td>{user.age || 'N/A'}</td>
                  <td>{user.height || 'N/A'}</td>
                  <td>
                    <span className={`um-activity-badge um-activity-${user.activity_level || 'moderato'}`}>
                      {activityLevels.find(l => l.value === user.activity_level)?.label || 'Moderato'}
                    </span>
                  </td>
                  <td>{user.target_weight || 'N/A'}</td>
                  <td>{formatDate(user.created_at)}</td>
                  <td>
                    <div className="um-actions">
                      <button 
                        onClick={() => handleEditUser(user)} 
                        className="um-btn-edit"
                        disabled={isAlfredUser(user)}
                        title={isAlfredUser(user) ? "Alfred AI non può essere modificato" : "Modifica utente"}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteUserClick(user)}
                        className="um-btn-delete"
                        disabled={user.id === currentUser?.id || isAlfredUser(user)}
                        title={
                          user.id === currentUser?.id ? "Non puoi eliminare te stesso" :
                          isAlfredUser(user) ? "Alfred AI non può essere eliminato" :
                          "Rimuovi dal gruppo famiglia"
                        }
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="11" className="um-no-users">
                    Nessun utente trovato nel gruppo famiglia.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal per modifica utente */}
        {showUserModal && (
          <div className="um-modal-overlay">
            <div className="um-modal">
              <div className="um-modal-header">
                <h3>{modalMode === 'add' ? 'Aggiungi Utente' : 'Modifica Utente'}</h3>
                <button onClick={() => setShowUserModal(false)} className="um-modal-close">✕</button>
              </div>
              <form onSubmit={handleSubmit} className="um-modal-form">
                <div className="um-form-row">
                  <label>Nome Utente:</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="um-form-row">
                  <label>Avatar:</label>
                  <div className="um-avatar-selector">
                    {availableAvatars.map(avatar => (
                      <button
                        key={avatar}
                        type="button"
                        className={`um-avatar-option ${formData.avatar === avatar ? 'selected' : ''}`}
                        onClick={() => setFormData(prev => ({ ...prev, avatar }))}
                      >
                        {avatar}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="um-form-row">
                  <label>Genere:</label>
                  <select name="gender" value={formData.gender} onChange={handleInputChange}>
                    <option value="">Seleziona</option>
                    <option value="M">Maschio</option>
                    <option value="F">Femmina</option>
                    <option value="Altro">Altro</option>
                  </select>
                </div>

                <div className="um-form-row">
                  <label>Età:</label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    min="1"
                    max="120"
                  />
                </div>

                <div className="um-form-row">
                  <label>Altezza (cm):</label>
                  <input
                    type="number"
                    name="height"
                    value={formData.height}
                    onChange={handleInputChange}
                    min="50"
                    max="250"
                  />
                </div>

                <div className="um-form-row">
                  <label>Livello di Attività:</label>
                  <select name="activity_level" value={formData.activity_level} onChange={handleInputChange}>
                    {activityLevels.map(level => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>

                <div className="um-form-row">
                  <label>Peso Target (kg):</label>
                  <input
                    type="number"
                    name="target_weight"
                    value={formData.target_weight}
                    onChange={handleInputChange}
                    step="0.1"
                    min="20"
                    max="300"
                  />
                </div>

                <div className="um-modal-actions">
                  <button type="button" onClick={() => setShowUserModal(false)} className="btn-secondary">
                    Annulla
                  </button>
                  <button type="submit" className="um-btn-save">
                    {modalMode === 'add' ? 'Crea' : 'Salva'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal conferma eliminazione */}
        {showDeleteConfirm && userToDelete && (
          <div className="um-modal-overlay">
            <div className="um-modal um-modal-small">
              <div className="um-modal-header">
                <h3>Conferma Rimozione</h3>
              </div>
              <div className="um-modal-content">
                <p>Sei sicuro di voler rimuovere <strong>{userToDelete.username}</strong> dal gruppo famiglia?</p>
                <p className="um-warning">L'utente non sarà più visibile nel gruppo ma i suoi dati saranno conservati.</p>
              </div>
              <div className="um-modal-actions">
                <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary">
                  Annulla
                </button>
                <button onClick={handleConfirmDelete} className="um-btn-delete-confirm">
                  Rimuovi
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Pagina9_GestioneUtenti;