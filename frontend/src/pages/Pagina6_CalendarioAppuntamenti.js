import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import it from 'date-fns/locale/it';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/Pagina6_CalendarioAppuntamenti.css';

const locales = { it };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });
const categories = ['LAVORO', 'CASA', 'FINANZA', 'STUDIO', 'SALUTE', 'FARMACO', 'ALTRO'];
const categoryColors = {
    'LAVORO': '#FF5733', 'CASA': '#337AFF', 'FINANZA': '#33FF57', 'STUDIO': '#9B33FF',
    'SALUTE': '#FF33A8', 'FARMACO': '#33FFF9', 'ALTRO': '#6c757d'
};

const initialFormData = {
    title: '',
    category: '',
    description: '',
    start: new Date(),
    end: new Date(),
    isAllDay: false,
    repetition: 'no-repetition',
    repetition_until: null,
    isNotificationEnabled: false,
    selectedEmails: [],
    created_By: '',
    id: null
};

export default function Pagina6_CalendarioAppuntamenti() {
    const [profile, setProfile] = useState(null);
    const [events, setEvents] = useState([]);
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [formData, setFormData] = useState(initialFormData);
    const [modalData, setModalData] = useState(null);
    const [users, setUsers] = useState([]);
    const [selectedEmails, setSelectedEmails] = useState([]);
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentView, setCurrentView] = useState('month');

    const fetchEventsAndProfile = async () => {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            navigate('/');
            return;
        }

        const { user } = session;
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error('Errore nel recupero del profilo:', profileError);
            return;
        }

        setProfile(profileData);
        await fetchUsers(user.id);
        
        // MODIFICA 1: Passa l'ID del gruppo famiglia per il filtro
        await fetchEvents(user.id, profileData.family_group);
    };

    // MODIFICA 2: Aggiunge familyGroupId e filtra correttamente
    const fetchEvents = async (userId, familyGroupId) => {
        let query = supabase
            .from('events')
            .select('*, document_url'); 
        
        // FILTRO CORRETTO: SOLO eventi del gruppo famiglia
        if (familyGroupId) {
            query = query.eq('family_group', familyGroupId);
        } else {
            // Fallback: Se non c'è family_group, mostra solo i suoi eventi personali
            query = query.eq('created_by', userId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Errore nel recupero degli eventi:', error);
        } else {
            const formattedEvents = data.map(event => ({
                ...event,
                start: new Date(event.start),
                end: new Date(event.end),
                id: event.id,
            }));
            setEvents(formattedEvents);
        }
    };

    const fetchUsers = async (currentUserId) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, username, email');
        if (error) {
            console.error('Errore nel recupero degli utenti:', error);
        } else {
            const allUsers = data.filter(user => user.id !== currentUserId);
            setUsers(allUsers);
        }
    };

    useEffect(() => {
        fetchEventsAndProfile();
    }, []);

    const handleSelectSlot = ({ start, end }) => {
        if (!profile) return;
        setFormData({
            ...initialFormData,
            start: start,
            end: end,
            isAllDay: false,
            created_By: profile.id
        });
        setModalData(null);
        setModalIsOpen(true);
    };

    const handleSelectEvent = (event) => {
        if (!profile) return;
        setFormData({
            title: event.title,
            category: event.categoria_eve,
            description: event.description,
            start: event.start,
            end: event.end,
            isAllDay: false,
            repetition: 'no-repetition',
            repetition_until: null,
            isNotificationEnabled: false,
            selectedEmails: [],
            created_By: event.created_by,
            id: event.id
        });
        setModalData(event); 
        setModalIsOpen(true);
    };

    const handleOpenNewEventModal = () => {
        if (!profile) return;
        setFormData({
            ...initialFormData,
            created_By: profile.id
        });
        setModalData(null);
        setModalIsOpen(true);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleDateChange = (date, name) => {
        setFormData(prev => ({ ...prev, [name]: date }));
    };

    const handleTimeChange = (date, name) => {
        const newTime = date;
        const newDate = new Date(formData[name]);
        newDate.setHours(newTime.getHours());
        newDate.setMinutes(newTime.getMinutes());
        setFormData(prev => ({ ...prev, [name]: newDate }));
    };

    const getEventColor = (event) => {
        const category = event.categoria_eve || 'ALTRO';
        return categoryColors[category] || '#6c757d';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const eventData = {
            title: formData.title,
            categoria_eve: formData.category,
            description: formData.description,
            start: formData.start.toISOString(),
            end: formData.end.toISOString(),
            created_by: profile.id,
            // MODIFICA 3: Salva l'ID del gruppo famiglia, che è necessario per RLS e il filtro
            family_group: profile.family_group 
        };
        
        if (modalData?.document_url) {
            eventData.document_url = modalData.document_url;
        }

        try {
            let error;
            if (modalData?.id) {
                const { error: updateError } = await supabase
                    .from('events')
                    .update(eventData)
                    .eq('id', modalData.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('events')
                    .insert([{ ...eventData, id: uuidv4() }]);
                error = insertError;
            }

            if (error) {
                // DEBUG: Logga l'errore del database (RLS, dati mancanti, ecc.)
                console.error('ERRORE CRITICO SUPABASE NEL SALVATAGGIO:', error);
                alert('Errore nel salvataggio dell\'evento. Controlla la console per i dettagli (es. RLS).');
                throw error;
            }

            // Se il salvataggio ha successo, aggiorna il calendario
            await fetchEvents(profile.id, profile.family_group); 
            setModalIsOpen(false);
        } catch (error) {
            console.error('Errore nel salvataggio dell\'evento:', error);
            alert('Errore nel salvataggio dell\'evento. Riprova.');
        }
    };

    const handleDeleteEvent = async () => {
        try {
            const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', modalData.id);
            if (error) throw error;
            await fetchEvents(profile.id, profile.family_group); // Aggiorna con il family_group
            setModalIsOpen(false);
        } catch (error) {
            console.error('Errore nell\'eliminazione dell\'evento:', error);
            alert('Errore nell\'eliminazione dell\'evento. Riprova.');
        }
    };

    const handleUserSelect = (user) => {
        if (!selectedEmails.some(u => u.id === user.id)) {
            setSelectedEmails(prev => [...prev, user]);
        }
        setSearchTerm('');
        setShowUserDropdown(false);
    };

    const handleRemoveEmail = (userToRemove) => {
        setSelectedEmails(prev => prev.filter(user => user.id !== userToRemove.id));
    };

    const filteredUsers = users.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !selectedEmails.some(u => u.id === user.id)
    );

    const formatEventTitle = (event) => {
        const isPast = new Date(event.end) < new Date();
        return (
            <div style={{ color: 'white', opacity: isPast ? 0.6 : 1 }}>
                <strong>{event.title}</strong>
                <p>{event.description}</p>
            </div>
        );
    };

    return (
        <div className="pagina6-main-container">
            <button className="pagina6-back-btn" onClick={() => navigate('/main-menu')}>← Torna al menu</button>
            <div className="pagina6-calendar-container">
                <Calendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: 'calc(100vh - 120px)' }}
                    onSelectSlot={handleSelectSlot}
                    onSelectEvent={handleSelectEvent}
                    selectable
                    culture="it"
                    eventPropGetter={(event) => ({
                        style: {
                            backgroundColor: getEventColor(event),
                        },
                    })}
                    formats={{
                        dayFormat: (date, culture, localizer) => localizer.format(date, 'E', culture),
                    }}
                    components={{
                        event: ({ event }) => formatEventTitle(event),
                    }}
                    date={currentDate}
                    view={currentView}
                    onNavigate={setCurrentDate}
                    onView={setCurrentView}
                />
            </div>
            <button className="pagina6-add-event-btn" onClick={handleOpenNewEventModal}>+</button>
            {modalIsOpen && (
                <div className="pagina6-modal-backdrop">
                    <div className="pagina6-modal-content">
                        <div className="pagina6-modal-header">
                            <h4>{modalData?.id ? 'Modifica Evento' : 'Aggiungi Nuovo Evento'}</h4>
                            <button type="button" className="pagina6-close-btn" onClick={() => setModalIsOpen(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="pagina6-modal-body">
                                
                                <div className="pagina6-form-group" style={{ position: 'relative' }}>
                                    <label>Titolo</label>
                                    <input type="text" name="title" value={formData.title} onChange={handleChange} required />
                                    
                                    {modalData?.document_url && modalData.document_url.startsWith('http') && (
                                        <a 
                                            href={modalData.document_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="btn-action btn-icon"
                                            title="Visualizza Documento Collegato" 
                                            style={{
                                                position: 'absolute', 
                                                top: '30px', 
                                                right: '0', 
                                                backgroundColor: '#337AFF', 
                                                color: 'white', 
                                                padding: '8px 12px', 
                                                borderRadius: '5px', 
                                                textDecoration: 'none', 
                                                fontWeight: 'bold',
                                                zIndex: 10
                                            }}
                                        >
                                            📄
                                        </a>
                                    )}
                                </div>
                                
                                <div className="pagina6-form-group">
                                    <label>Categoria</label>
                                    <select name="category" value={formData.category} onChange={handleChange} required>
                                        <option value="">Seleziona Categoria</option>
                                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                                <div className="pagina6-form-group">
                                    <label>Descrizione</label>
                                    <textarea name="description" value={formData.description} onChange={handleChange}></textarea>
                                </div>
                                <div className="pagina6-form-group">
                                    <label>Inizio</label>
                                    <input type="datetime-local" name="start" value={format(formData.start, "yyyy-MM-dd'T'HH:mm")} onChange={(e) => handleDateChange(new Date(e.target.value), 'start')} required />
                                </div>
                                <div className="pagina6-form-group">
                                    <label>Fine</label>
                                    <input type="datetime-local" name="end" value={format(formData.end, "yyyy-MM-dd'T'HH:mm")} onChange={(e) => handleDateChange(new Date(e.target.value), 'end')} required />
                                </div>
                            </div>
                            <div className="pagina6-modal-footer">
                                {modalData?.id && (
                                    <button type="button" className="pagina6-btn-delete" onClick={() => handleDeleteEvent()}>Elimina</button>
                                )}
                                <button
                                    type="submit"
                                    className="pagina6-btn-primary"
                                    disabled={!profile}
                                >
                                    Salva Evento
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}