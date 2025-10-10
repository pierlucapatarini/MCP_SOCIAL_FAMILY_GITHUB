// SottoPagina4_2TodoList.jsx
// Pagina della To-Do List per l'app di famiglia.
// Gestisce la creazione, visualizzazione e filtro delle attività.

import React, { useEffect, useState, useRef, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient'; // Importa il client Supabase centralizzato
import '../styles/StileSottoPagina4_2.css';

// Assicuriamoci che Font Awesome sia caricato
const fontAwesome = document.createElement('link');
fontAwesome.rel = 'stylesheet';
fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
if (!document.head.querySelector('link[href*="font-awesome"]')) {
  document.head.appendChild(fontAwesome);
}

// Context di autenticazione semplificato per l'uso autonomo
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

// Componente per la schermata della To-Do List
function SottoPagina4_2TodoList() {
  const navigate = useNavigate();
  
  // Stato per l'utente corrente - sarà popolato dinamicamente
  const [currentUser, setCurrentUser] = useState(null);
  const [todos, setTodos] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  const [addressedToUsers, setAddressedToUsers] = useState([]);
  const [deadline, setDeadline] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filter, setFilter] = useState({ 
    insertedBy: null, 
    addressedTo: null, 
    priority: 'all', 
    status: 'all' 
  });
  const [sort, setSort] = useState('inserted_at_desc');
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const successModalMessage = "✅ Attività creata con successo!";
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  const [todoToDelete, setTodoToDelete] = useState(null);
  const [error, setError] = useState(null);

  const filterPanelRef = useRef();

  // Funzione per il reindirizzamento al menu principale
  const handleGoBack = () => {
    navigate('/main-menu');
  };

  // Funzione per ottenere l'utente corrente dalla sessione Supabase
  const getCurrentUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error("Errore nel recupero dell'utente:", error);
        setError("Errore di autenticazione. Per favore, rieffettua il login.");
        return null;
      }

      if (!user) {
        setError("Utente non autenticato. Reindirizzamento al login...");
        setTimeout(() => navigate('/login'), 2000);
        return null;
      }

      // Recupera il profilo dell'utente dalla tabella profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error("Errore nel recupero del profilo:", profileError);
        setError("Profilo utente non trovato.");
        return null;
      }

      return profile;
    } catch (err) {
      console.error("Errore di rete nel recupero dell'utente:", err);
      setError("Errore di connessione.");
      return null;
    }
  };

  // Funzione per ottenere tutti gli utenti (profili)
  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('id, username');
      if (error) {
        console.error("Errore nel recupero dei profili:", error);
        setError("Errore nel caricamento degli utenti.");
      } else {
        setProfiles(data || []);
      }
    } catch (err) {
      console.error("Errore di rete nel recupero dei profili:", err);
      setError("Errore di connessione nel caricamento degli utenti.");
    }
  };

  // Funzione per ottenere le attività e le loro assegnazioni
  const fetchTodos = async () => {
    setIsLoading(true);
    try {
      const { data: todosData, error: todosError } = await supabase
        .from('todos')
        .select('*, inserted_by(id, username)');
    
      if (todosError) {
        console.error("Errore nel recupero delle attività:", todosError);
        setError("Errore nel caricamento delle attività.");
        setIsLoading(false);
        return;
      }

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('todo_assignments')
        .select('id, user_id, user_id(username)');

      if (assignmentsError) {
        console.error("Errore nel recupero delle assegnazioni:", assignmentsError);
        setError("Errore nel caricamento delle assegnazioni.");
        setIsLoading(false);
        return;
      }

      const todosWithAssignments = (todosData || []).map(todo => {
        const assignedUsers = (assignmentsData || [])
          .filter(assignment => assignment.id === todo.id)
          .map(assignment => assignment.user_id);
        
        const assignedUsernames = assignedUsers.map(u => u?.username || 'Utente sconosciuto').join(', ');

        return {
          ...todo,
          addressed_to_users: assignedUsers,
          addressed_to_usernames: assignedUsernames,
        };
      });

      setTodos(todosWithAssignments);
      setError(null); // Pulisci eventuali errori precedenti
    } catch (err) {
      console.error("Errore di rete nel recupero delle attività:", err);
      setError("Errore di connessione nel caricamento delle attività.");
    } finally {
      setIsLoading(false);
    }
  };

  // Funzione per l'aggiunta di una nuova attività
  const handleCreateTodo = async (e) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    if (!currentUser) {
      setError("Utente non autenticato. Non è possibile creare attività.");
      return;
    }

    try {
      setError(null); // Pulisci eventuali errori precedenti
      
      // Inserisce il nuovo todo
      const { data: todoData, error: todoError } = await supabase
        .from('todos')
        .insert({
          task: newTodo.trim(),
          inserted_by: currentUser.id, // Usa l'ID dell'utente corrente
          deadline: deadline || null
        })
        .select()
        .single();

      if (todoError) {
        console.error("Errore nella creazione dell'attività:", todoError);
        setError("Errore nella creazione dell'attività: " + todoError.message);
        return;
      }

      // Inserisce le assegnazioni per ogni utente selezionato
      if (addressedToUsers.length > 0) {
        const assignments = addressedToUsers.map(userId => ({
          id: todoData.id,
          user_id: userId
        }));

        const { error: assignmentsError } = await supabase
          .from('todo_assignments')
          .insert(assignments);
        
        if (assignmentsError) {
          console.error("Errore nell'assegnazione degli utenti:", assignmentsError);
          // Rollback: elimina il todo creato
          await supabase.from('todos').delete().eq('id', todoData.id);
          setError("Errore nell'assegnazione degli utenti: " + assignmentsError.message);
          return;
        }
      }

      // Reset del form
      setNewTodo('');
      setAddressedToUsers([]);
      setDeadline('');
      setIsNewTaskModalOpen(false);
      
      // Aggiorna la lista e mostra il messaggio di successo
      await fetchTodos();
      setIsSuccessModalOpen(true);
      setTimeout(() => setIsSuccessModalOpen(false), 3000);
    } catch (err) {
      console.error("Errore di rete nella creazione dell'attività:", err);
      setError("Errore di connessione nella creazione dell'attività.");
    }
  };

  // Funzione per la gestione delle checkbox di assegnazione
  const handleAssignChange = (userId) => {
    setAddressedToUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // Funzione per il toggle di completamento di un'attività
  const toggleCompleted = async (todo) => {
    try {
      setError(null);
      const { error } = await supabase
        .from('todos')
        .update({ is_completed: !todo.is_completed })
        .eq('id', todo.id);

      if (error) {
        console.error("Errore nell'aggiornamento dell'attività:", error);
        setError("Errore nell'aggiornamento dell'attività: " + error.message);
      } else {
        await fetchTodos();
      }
    } catch (err) {
      console.error("Errore di rete nell'aggiornamento dell'attività:", err);
      setError("Errore di connessione nell'aggiornamento dell'attività.");
    }
  };
  
  // Funzione per l'eliminazione di un'attività
  const handleDeleteTodo = async () => {
    if (!todoToDelete) return;

    try {
      setError(null);
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', todoToDelete.id);

      if (error) {
        console.error("Errore nell'eliminazione dell'attività:", error);
        setError("Errore nell'eliminazione dell'attività: " + error.message);
      } else {
        await fetchTodos();
        setIsDeleteConfirmModalOpen(false);
        setTodoToDelete(null);
      }
    } catch (err) {
      console.error("Errore di rete nell'eliminazione dell'attività:", err);
      setError("Errore di connessione nell'eliminazione dell'attività.");
    }
  };

  // Gestione del filtro
  const handleFilterChange = (type, id) => {
    setFilter(prev => ({
      ...prev,
      [type]: prev[type] === id ? null : id
    }));
  };

  // Funzione per determinare se una scadenza è imminente
  const isDeadlineNear = (deadline) => {
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  };

  // Funzione per determinare se una scadenza è scaduta
  const isDeadlineOverdue = (deadline) => {
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    const today = new Date();
    return deadlineDate < today;
  };

  // Calcolo delle statistiche
  const calculateStats = () => {
    const totalTasks = todos.length;
    const completedTasks = todos.filter(todo => todo.is_completed).length;
    const tasksInDeadline = todos.filter(todo => 
      !todo.is_completed && (isDeadlineNear(todo.deadline) || isDeadlineOverdue(todo.deadline))
    ).length;
    const highPriorityTasks = todos.filter(todo => 
      !todo.is_completed && todo.deadline && isDeadlineOverdue(todo.deadline)
    ).length;

    return {
      total: totalTasks,
      completed: completedTasks,
      inDeadline: tasksInDeadline,
      highPriority: highPriorityTasks
    };
  };

  const stats = calculateStats();

  // Gestione del filtro rapido dalle statistiche
  const handleQuickFilter = (filterType) => {
    setFilter(prev => ({
      ...prev,
      status: filterType
    }));
  };

  // Ordina e filtra le attività da visualizzare
  const filteredAndSortedTodos = todos
    .filter(todo => {
      const insertedByMatch = !filter.insertedBy || todo.inserted_by?.id === filter.insertedBy;
      const addressedToMatch = !filter.addressedTo || todo.addressed_to_users?.some(u => u?.id === filter.addressedTo);
      
      // Filtro per priorità
      let priorityMatch = true;
      if (filter.priority === 'high') {
        priorityMatch = !todo.is_completed && todo.deadline && isDeadlineOverdue(todo.deadline);
      } else if (filter.priority === 'medium') {
        priorityMatch = !todo.is_completed && isDeadlineNear(todo.deadline) && !isDeadlineOverdue(todo.deadline);
      } else if (filter.priority === 'low') {
        priorityMatch = !todo.deadline || (!isDeadlineNear(todo.deadline) && !isDeadlineOverdue(todo.deadline));
      }
      
      // Filtro per stato
      let statusMatch = true;
      if (filter.status === 'todo') {
        statusMatch = !todo.is_completed;
      } else if (filter.status === 'in_progress') {
        statusMatch = !todo.is_completed && todo.deadline && isDeadlineNear(todo.deadline);
      } else if (filter.status === 'completed') {
        statusMatch = todo.is_completed;
      }
      
      return insertedByMatch && addressedToMatch && priorityMatch && statusMatch;
    })
    .sort((a, b) => {
      // Prima ordiniamo per stato (completate in fondo)
      if (a.is_completed !== b.is_completed) {
        return a.is_completed ? 1 : -1;
      }
      
      // Poi applichiamo l'ordinamento scelto dall'utente
      if (sort === 'inserted_at_asc') {
        return new Date(a.inserted_at) - new Date(b.inserted_at);
      }
      if (sort === 'inserted_at_desc') {
        return new Date(b.inserted_at) - new Date(a.inserted_at);
      }
      if (sort === 'deadline_asc') {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      }
      if (sort === 'deadline_desc') {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(b.deadline) - new Date(a.deadline);
      }
      return 0;
    });

  // Effetto per il caricamento iniziale dei dati
  useEffect(() => {
    const initializeApp = async () => {
      const user = await getCurrentUser();
      if (user) {
        setCurrentUser(user);
        await Promise.all([fetchProfiles(), fetchTodos()]);
      }
    };
    
    initializeApp();
  }, []); // Esegue una sola volta all'avvio

  // Effetto per gestire i click fuori dal pannello filtri
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(event.target)) {
        setShowFilterPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Funzione per formattare la data
  const formatDate = (dateString) => {
    if (!dateString) return 'Nessuna scadenza';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  // Funzione per ottenere la classe CSS della scadenza
  const getDeadlineClass = (deadline, isCompleted) => {
    if (isCompleted || !deadline) return '';
    if (isDeadlineOverdue(deadline)) return 'deadline-overdue';
    if (isDeadlineNear(deadline)) return 'deadline-near';
    return '';
  };

  // Mostra errore se l'utente non è autenticato
  if (error && !currentUser) {
    return (
      <div className="app-layout">
        <header className="header">
          <button onClick={handleGoBack} className="btn-icon" aria-label="Torna al menu principale">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <h1>📝 To-Do List Familiare</h1>
        </header>
        <main className="main-content">
          <div className="empty-message">
            {error}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <header className="header">
        <button onClick={handleGoBack} className="btn-icon" aria-label="Torna al menu principale">
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <h1>📝 To-Do List Familiare</h1>
      </header>
      
      <main className="main-content">
        {/* Mostra errori se presenti */}
        {error && (
          <div className="error-message" style={{ 
            backgroundColor: '#fef2f2', 
            color: '#dc2626', 
            padding: '1rem', 
            borderRadius: '0.5rem', 
            marginBottom: '1rem',
            border: '1px solid #fecaca'
          }}>
            <strong>Errore:</strong> {error}
          </div>
        )}

        <div className="utility-bar">
          <button 
            onClick={() => setIsNewTaskModalOpen(true)} 
            className="btn-icon btn-primary"
            aria-label="Aggiungi nuova attività"
            disabled={!currentUser}
          >
            <i className="fa-solid fa-plus"></i>
          </button>
          <button 
            onClick={() => setShowFilterPanel(!showFilterPanel)} 
            className="btn-icon btn-secondary"
            aria-label="Mostra filtri"
          >
            <i className="fa-solid fa-filter"></i>
          </button>
          
          {/* Controlli di ordinamento */}
          <div className="filter-dropdowns">
            <div className="filter-dropdown">
              <label htmlFor="sort-select">
                <i className="fa-solid fa-sort"></i> Ordina per:
              </label>
              <select 
                id="sort-select"
                value={sort} 
                onChange={(e) => setSort(e.target.value)}
                className="dropdown-select"
              >
                <option value="inserted_at_desc">Data inserimento (Recente)</option>
                <option value="inserted_at_asc">Data inserimento (Vecchio)</option>
                <option value="deadline_asc">Scadenza (Imminente)</option>
                <option value="deadline_desc">Scadenza (Lontana)</option>
              </select>
            </div>
            
            <div className="filter-dropdown">
              <label htmlFor="priority-filter">
                <i className="fa-solid fa-flag"></i> Priorità:
              </label>
              <select 
                id="priority-filter"
                value={filter.priority} 
                onChange={(e) => setFilter({...filter, priority: e.target.value})}
                className="dropdown-select"
              >
                <option value="all">Tutte le priorità</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Bassa</option>
              </select>
            </div>
          </div>
        </div>

        {/* Card Statistiche trasformate in pulsanti filtro */}
        <div className="stats-grid">
          <button 
            className={`stat-card stat-card-total ${filter.status === 'all' ? 'active' : ''}`}
            onClick={() => handleQuickFilter('all')}
          >
            <div className="stat-icon">
              <i className="fa-solid fa-list"></i>
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.total}</div>
              <div className="stat-label">Totale Task</div>
            </div>
          </button>
          
          <button 
            className={`stat-card stat-card-completed ${filter.status === 'completed' ? 'active' : ''}`}
            onClick={() => handleQuickFilter('completed')}
          >
            <div className="stat-icon">
              <i className="fa-solid fa-check-circle"></i>
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.completed}</div>
              <div className="stat-label">Completate</div>
            </div>
          </button>
          
          <button 
            className={`stat-card stat-card-todo ${filter.status === 'todo' ? 'active' : ''}`}
            onClick={() => handleQuickFilter('todo')}
          >
            <div className="stat-icon">
              <i className="fa-solid fa-tasks"></i>
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.total - stats.completed}</div>
              <div className="stat-label">Attività da Fare</div>
            </div>
          </button>
          
          <button 
            className={`stat-card stat-card-priority ${filter.status === 'in_progress' ? 'active' : ''}`}
            onClick={() => handleQuickFilter('in_progress')}
          >
            <div className="stat-icon">
              <i className="fa-solid fa-exclamation-triangle"></i>
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.highPriority}</div>
              <div className="stat-label">In Scadenza</div>
            </div>
          </button>
        </div>

        {/* Pannello dei filtri e ordinamento */}
        {showFilterPanel && (
          <div ref={filterPanelRef} className="filter-panel">
            <div className="filter-group">
              <label>Inserito da:</label>
              <div className="filter-options">
                <button
                  onClick={() => handleFilterChange('insertedBy', currentUser?.id)}
                  className={`filter-btn ${filter.insertedBy === currentUser?.id ? 'active' : ''}`}
                >
                  <i className="fa-solid fa-user"></i> Tu
                </button>
                <button
                  onClick={() => setFilter({ ...filter, insertedBy: null })}
                  className={`filter-btn ${filter.insertedBy === null ? 'active' : ''}`}
                >
                  <i className="fa-solid fa-users"></i> Tutti
                </button>
              </div>
            </div>

            <div className="filter-group">
              <label>Assegnato a:</label>
              <div className="filter-options">
                {/* Pulsante "Tutti" per resettare il filtro */}
                <button
                  onClick={() => setFilter({ ...filter, addressedTo: null })}
                  className={`filter-btn ${filter.addressedTo === null ? 'active' : ''}`}
                >
                  <i className="fa-solid fa-user-group"></i> Tutti
                </button>
                
                {/* Mappa tutti i profili dinamici per il filtro */}
                {profiles.map(profile => (
                  <button
                    key={profile.id}
                    onClick={() => handleFilterChange('addressedTo', profile.id)}
                    className={`filter-btn ${filter.addressedTo === profile.id ? 'active' : ''}`}
                  >
                    <i className="fa-solid fa-user-check"></i> {profile.username}
                  </button>
                ))}
              </div>
            </div>

            <div className="sort-group">
              <label>Ordina per:</label>
              <select 
                onChange={(e) => setSort(e.target.value)} 
                value={sort} 
                className="select-sort"
              >
                <option value="inserted_at_desc">Data inserimento (Recente)</option>
                <option value="inserted_at_asc">Data inserimento (Vecchio)</option>
                <option value="deadline_asc">Scadenza (Imminente)</option>
                <option value="deadline_desc">Scadenza (Lontana)</option>
              </select>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="loading-message">
            <div className="loading-spinner"></div>
            Caricamento attività...
          </div>
        ) : filteredAndSortedTodos.length === 0 ? (
          <div className="empty-message">
            Nessuna attività trovata. Inizia creando la tua prima attività!
          </div>
        ) : (
          <ul className="todo-list">
            {filteredAndSortedTodos.map(todo => (
              <li 
                key={todo.id} 
                className={`todo-item ${todo.is_completed ? 'completed' : ''} ${getDeadlineClass(todo.deadline, todo.is_completed)}`}
              >
                <div className="todo-content">
                  <div className="todo-meta">
                    <span className="todo-meta-item">
                      <i className="fa-solid fa-user-plus"></i>
                      Da: <strong>{todo.inserted_by?.username || 'Sconosciuto'}</strong>
                    </span>
                    <span className="todo-meta-item">
                      <i className="fa-solid fa-user-tag"></i>
                      A: <strong>{todo.addressed_to_usernames || 'Nessuno'}</strong>
                    </span>
                    <span className="todo-meta-item">
                      <i className="fa-solid fa-calendar-days"></i>
                      <strong className={getDeadlineClass(todo.deadline, todo.is_completed)}>
                        {formatDate(todo.deadline)}
                        {isDeadlineOverdue(todo.deadline) && !todo.is_completed && ' (Scaduta)'}
                        {isDeadlineNear(todo.deadline) && !todo.is_completed && ' (Imminente)'}
                      </strong>
                    </span>
                  </div>
                  <div 
                    className="todo-text" 
                    role="button"
                    tabIndex={0}
                    aria-label={`Attività: ${todo.task}`}
                  >
                    {todo.is_completed && <i className="fa-solid fa-check-circle"></i>}
                    {todo.task}
                  </div>
                </div>
                <div className="todo-actions">
                  <button
                    className={`btn-complete-task ${todo.is_completed ? 'completed' : ''}`}
                    onClick={() => toggleCompleted(todo)}
                    aria-label={`${todo.is_completed ? 'Segna come non completata' : 'Segna come completata'}: ${todo.task}`}
                  >
                    <i className={`fa-solid ${todo.is_completed ? 'fa-undo' : 'fa-check'}`}></i>
                  </button>
                  <button
                    className="btn-delete-task"
                    onClick={() => {
                      setTodoToDelete(todo);
                      setIsDeleteConfirmModalOpen(true);
                    }}
                    aria-label={`Elimina attività: ${todo.task}`}
                  >
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {/* Modale per l'aggiunta di una nuova attività */}
      {isNewTaskModalOpen && currentUser && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsNewTaskModalOpen(false);
            setNewTodo('');
            setAddressedToUsers([]);
            setDeadline('');
          }
        }}>
          <div className="modal-content">
            <h3 className="modal-title">✨ Nuova Attività</h3>
            <form onSubmit={handleCreateTodo}>
              <input
                type="text"
                placeholder="Descrivi l'attività da svolgere..."
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                className="form-input"
                required
                autoFocus
              />
              <div className="modal-section">
                <label>
                  <i className="fa-solid fa-users"></i> Assegna a:
                </label>
                <div className="checkbox-group">
                  {profiles.map(profile => (
                    <div key={profile.id} className="checkbox-item">
                      <input
                        type="checkbox"
                        id={`user-${profile.id}`}
                        checked={addressedToUsers.includes(profile.id)}
                        onChange={() => handleAssignChange(profile.id)}
                      />
                      <label htmlFor={`user-${profile.id}`}>
                        <i className="fa-solid fa-user"></i> {profile.username}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-section">
                <label>
                  <i className="fa-solid fa-calendar"></i> Data di scadenza:
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="form-input"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-primary">
                  <i className="fa-solid fa-plus"></i> Aggiungi Attività
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setIsNewTaskModalOpen(false);
                    setNewTodo('');
                    setAddressedToUsers([]);
                    setDeadline('');
                  }} 
                  className="btn-secondary"
                >
                  <i className="fa-solid fa-times"></i> Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale di conferma eliminazione */}
      {isDeleteConfirmModalOpen && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsDeleteConfirmModalOpen(false);
            setTodoToDelete(null);
          }
        }}>
          <div className="modal-content">
            <h3 className="modal-title">🗑️ Conferma Eliminazione</h3>
            <p>Sei sicuro di voler eliminare questa attività?</p>
            <div className="todo-preview">
              <strong>"{todoToDelete?.task}"</strong>
            </div>
            <div className="modal-actions">
              <button onClick={handleDeleteTodo} className="btn-delete">
                <i className="fa-solid fa-trash"></i> Elimina
              </button>
              <button 
                onClick={() => {
                  setIsDeleteConfirmModalOpen(false);
                  setTodoToDelete(null);
                }} 
                className="btn-secondary"
              >
                <i className="fa-solid fa-times"></i> Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale di successo (attività creata) */}
      {isSuccessModalOpen && (
        <div className="success-message-modal">
          <i className="fa-solid fa-check-circle"></i>
          <span>{successModalMessage}</span>
        </div>
      )}
    </div>
  );
}

export default SottoPagina4_2TodoList;