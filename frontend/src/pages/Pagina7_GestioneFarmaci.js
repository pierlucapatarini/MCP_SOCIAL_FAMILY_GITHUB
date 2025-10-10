import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, setHours, setMinutes, addDays, addWeeks, addMonths, addYears } from 'date-fns';
import it from 'date-fns/locale/it';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/MainStyle.css';
import '../styles/StilePagina7_gestionefarmaci.css'; // Nuovo file CSS specifico
import { FaEdit, FaTrash, FaPlus, FaTimes, FaExchangeAlt } from 'react-icons/fa';

const locales = { it };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });
const categoryColors = { 'FARMACO': '#33FFF9' };

const CustomEventContent = ({ event }) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '2px', fontSize: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</strong>
            <span style={{ fontSize: '10px', marginLeft: '5px', whiteSpace: 'nowrap' }}>
                {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
            </span>
        </div>
        {event.quantita && (
            <div style={{ fontSize: '12px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                Quantità: {event.quantita} - Farmaco: {event.nome_farmaco}
            </div>
        )}
    </div>
);

const CustomToolbar = (toolbar) => (
    <div className="rbc-toolbar">
        <span className="rbc-btn-group">
            <button type="button" onClick={() => toolbar.onNavigate('TODAY')}>Oggi</button>
        </span>
        <span className="rbc-toolbar-label">
            <button type="button" onClick={() => toolbar.onNavigate('PREV')} className="rbc-btn-nav">
                <span className="rbc-icon">{'<'}</span>
            </button>
            <span className="toolbar-label-text">{toolbar.label}</span>
            <button type="button" onClick={() => toolbar.onNavigate('NEXT')} className="rbc-btn-nav">
                <span className="rbc-icon">{'>'}</span>
            </button>
        </span>
        <span className="rbc-btn-group">
            {['month', 'week', 'day', 'agenda'].map(v => (
                <button key={v} type="button" onClick={() => toolbar.onView(v)} className={toolbar.view === v ? 'active' : ''}>
                    {v === 'month' ? 'Mese' : v === 'week' ? 'Settimana' : v === 'day' ? 'Giorno' : 'Agenda'}
                </button>
            ))}
        </span>
    </div>
);

export default function Pagina7_GestioneFarmaci() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [events, setEvents] = useState([]);
    const [archivioFarmaci, setArchivioFarmaci] = useState([]);
    const [familyUsers, setFamilyUsers] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState('month');

    const [modalData, setModalData] = useState(null);
    const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
    const [showMagazzinoModal, setShowMagazzinoModal] = useState(false);
    const [showArchivioModal, setShowArchivioModal] = useState(false);
    const [showUpdateStockModal, setShowUpdateStockModal] = useState(false);

    // Nuovo stato per la gestione delle modifiche in riga
    const [editedFarmaci, setEditedFarmaci] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStock, setFilterStock] = useState('all'); // all, low, normal

    const [formData, setFormData] = useState({
        id: null, title: '', description: '', date: '', startTime: '', endTime: '',
        nome_farmaco: '', quantita: 0,
        repeatPattern: 'nessuna', repeatEndDate: '',
        isNotificationEnabled: false, sendBefore: 1, notify_emails: []
    });

    const [magazzinoFormData, setMagazzinoFormData] = useState({
        id: null, nome_farmaco: '', dosaggio: '', istruzioni: '',
        quantita_attuale: 0, quantita_scortaminima: 0, giorni_ricezione: ''
    });

    const [updateStockData, setUpdateStockData] = useState({
        id: null, quantita_attuale: 0
    });

    const updateFormData = (updates) => setFormData(prev => ({ ...prev, ...updates }));
    const updateMagazzinoFormData = (updates) => setMagazzinoFormData(prev => ({ ...prev, ...updates }));
    const updateUpdateStockData = (updates) => setUpdateStockData(prev => ({ ...prev, ...updates }));

    const combineDateTime = (date, time) => {
        if (!date || !time) return null;
        const [hours, minutes] = time.split(':').map(Number);
        return setMinutes(setHours(new Date(date), hours), minutes);
    };

    const fetchData = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data: profileData, error: profileError } = await supabase
                .from('profiles').select('*').eq('id', session.user.id).single();
            if (profileError) throw profileError;
            setProfile(profileData);

            if (profileData.family_group) {
                const [eventsResponse, archivioResponse, usersResponse] = await Promise.all([
                    supabase.from('events_farmaci').select('*').eq('family_group', profileData.family_group).order('start', { ascending: true }),
                    supabase.from('ArchivioFarmaci').select('*').eq('family_group', profileData.family_group),
                    supabase.from('profiles').select('id, username, avatar, email').eq('family_group', profileData.family_group)
                ]);

                if (eventsResponse.data) {
                    setEvents(eventsResponse.data.map(e => ({ ...e, start: new Date(e.start), end: new Date(e.end) })));
                }
                if (archivioResponse.data) {
                    setArchivioFarmaci(archivioResponse.data);
                }
                if (usersResponse.data) setFamilyUsers(usersResponse.data);
            }
        } catch (err) {
            console.error("Errore caricamento dati:", err);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const channel = supabase
            .channel('db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'events_farmaci' }, payload => {
                fetchData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ArchivioFarmaci' }, payload => {
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchData]);

    const createRecurringSeries = (options) => {
        const { startDateTime, duration, repeatPattern, repeatEndDate, baseEvent } = options;
        const eventsToInsert = [];
        let currentStart = new Date(startDateTime);
        const finalEndDate = addDays(new Date(repeatEndDate), 1);
        const incrementFunctions = {
            daily: (d) => addDays(d, 1),
            weekly: (d) => addWeeks(d, 1),
            monthly: (d) => addMonths(d, 1),
            annually: (d) => addYears(d, 1)
        };

        while (currentStart < finalEndDate && eventsToInsert.length < 1000) {
            eventsToInsert.push({
                ...baseEvent,
                start: currentStart.toISOString(),
                end: new Date(currentStart.getTime() + duration).toISOString(),
            });
            currentStart = incrementFunctions[repeatPattern](currentStart);
        }
        return eventsToInsert;
    };

    const handleSaveEvent = async (e) => {
        e.preventDefault();
        if (!profile?.family_group || !formData.nome_farmaco || !formData.quantita) {
            alert('Assicurati di aver selezionato il farmaco e la quantità.');
            return;
        }

        const startDateTime = combineDateTime(formData.date, formData.startTime);
        const endDateTime = combineDateTime(formData.date, formData.endTime);
        if (!startDateTime || !endDateTime || endDateTime <= startDateTime) {
            alert('Date e orari non validi');
            return;
        }

        const baseEvent = {
            title: `Assunzione ${formData.nome_farmaco}`,
            description: `Dose: ${formData.quantita}`,
            categoria_eve: 'FARMACO',
            nome_farmaco: formData.nome_farmaco,
            quantita: formData.quantita,
            notify_at: formData.isNotificationEnabled ?
                new Date(startDateTime.getTime() - formData.sendBefore * 60 * 60 * 1000).toISOString() : null,
            notify_emails: formData.isNotificationEnabled ? formData.notify_emails : [],
            family_group: profile.family_group,
            created_by: profile.id,
            username: profile.username,
        };

        try {
            if (formData.repeatPattern === 'nessuna' || formData.repeatPattern === undefined || formData.repeatPattern === '') {
                // Gestione di un singolo evento
                const eventData = { ...baseEvent, start: startDateTime.toISOString(), end: endDateTime.toISOString() };

                if (modalData?.id) {
                    // Update
                    const { data, error } = await supabase.from('events_farmaci').update(eventData).eq('id', modalData.id).select();
                    if (error) throw error;
                    setEvents(prev => [...prev.filter(ev => ev.id !== data[0].id), { ...data[0], start: new Date(data[0].start), end: new Date(data[0].end) }]);
                } else {
                    // Insert
                    const { data, error } = await supabase.from('events_farmaci').insert([eventData]).select();
                    if (error) throw error;
                    setEvents(prev => [...prev, { ...data[0], start: new Date(data[0].start), end: new Date(data[0].end) }]);
                }
            } else {
                // Gestione di eventi ricorrenti
                const recurrenceId = uuidv4();
                const eventsToInsert = createRecurringSeries({
                    baseEvent: { ...baseEvent, repeat_pattern: formData.repeatPattern, recurrence_id: recurrenceId, username: profile.username },
                    startDateTime,
                    duration: endDateTime.getTime() - startDateTime.getTime(),
                    repeatPattern: formData.repeatPattern,
                    repeatEndDate: formData.repeatEndDate,
                });

                if (modalData?.recurrence_id) {
                    await supabase.from('events_farmaci').delete().eq('recurrence_id', modalData.recurrence_id);
                }

                const { data, error } = await supabase.from('events_farmaci').insert(eventsToInsert).select();
                if (error) throw error;

                setEvents(prev => {
                    const filtered = modalData?.recurrence_id
                        ? prev.filter(ev => ev.recurrence_id !== modalData.recurrence_id)
                        : prev;
                    const newEvents = data.map(e => ({ ...e, start: new Date(e.start), end: new Date(e.end) }));
                    return [...filtered, ...newEvents];
                });
            }
            setModalData(null);
        } catch (err) {
            console.error('Errore salvataggio:', err);
            alert(`Errore: ${err.message}`);
        }
    };

    const handleSaveMagazzinoItem = async (e) => {
        e.preventDefault();
        if (!profile?.family_group) return;

        try {
            let data, error;
            const { id, ...itemDataToSave } = magazzinoFormData;

            if (id) {
                const { data: updateData, error: updateError } = await supabase
                    .from('ArchivioFarmaci')
                    .update({ ...itemDataToSave, family_group: profile.family_group })
                    .eq('id', id)
                    .select();
                data = updateData;
                error = updateError;
            } else {
                const { data: insertData, error: insertError } = await supabase
                    .from('ArchivioFarmaci')
                    .insert([{ ...itemDataToSave, family_group: profile.family_group, username: profile.username }])
                    .select();
                data = insertData;
                error = insertError;
            }

            if (error) throw error;
            if (data?.length) {
                const savedItem = data[0];
                setArchivioFarmaci(prev => [...prev.filter(i => i.id !== savedItem.id), savedItem]);
            }
            setShowMagazzinoModal(false);
            setMagazzinoFormData({ id: null, nome_farmaco: '', dosaggio: '', istruzioni: '', quantita_attuale: 0, quantita_scortaminima: 0, giorni_ricezione: '' });
            setShowArchivioModal(false);
        } catch (err) {
            console.error('Errore salvataggio farmaco:', err);
            alert(`Errore: ${err.message}`);
        }
    };

    const handleDeleteMagazzinoItem = async (itemId) => {
        if (window.confirm("Sei sicuro di voler eliminare questo farmaco?")) {
            try {
                const { error } = await supabase.from('ArchivioFarmaci').delete().eq('id', itemId);
                if (error) throw error;
                setArchivioFarmaci(prev => prev.filter(i => i.id !== itemId));
            } catch (err) {
                console.error('Errore eliminazione farmaco:', err);
                alert(`Errore: ${err.message}`);
            }
        }
    };

    const handleEditFarmaco = (farmaco) => {
        setMagazzinoFormData({
            id: farmaco.id,
            nome_farmaco: farmaco.nome_farmaco,
            dosaggio: farmaco.dosaggio || '',
            istruzioni: farmaco.istruzioni || '',
            quantita_attuale: farmaco.quantita_attuale,
            quantita_scortaminima: farmaco.quantita_scortaminima,
            giorni_ricezione: farmaco.giorni_ricezione || ''
        });
        setShowMagazzinoModal(true);
    };

    // Funzione per gestire le modifiche in riga
    const handleTableChange = (id, field, value) => {
        setEditedFarmaci(prev => ({
            ...prev,
            [id]: {
                ...(prev[id] || archivioFarmaci.find(f => f.id === id)),
                [field]: value
            }
        }));
    };

    // Funzione per salvare tutte le modifiche
    const handleSaveAllEdits = async () => {
        try {
            const updates = Object.values(editedFarmaci).map(farmaco => {
                const { id, ...fieldsToUpdate } = farmaco;
                return supabase.from('ArchivioFarmaci').update(fieldsToUpdate).eq('id', id);
            });
            await Promise.all(updates);

            // Aggiorna lo stato locale con i nuovi dati salvati
            setArchivioFarmaci(prev => prev.map(farmaco => editedFarmaci[farmaco.id] || farmaco));
            setEditedFarmaci({}); // Resetta le modifiche in sospeso
            alert("Modifiche salvate con successo!");

        } catch (err) {
            console.error('Errore nel salvataggio delle modifiche:', err);
            alert('Si è verificato un errore durante il salvataggio.');
        }
    };

    const handleUpdateStock = async (e) => {
        e.preventDefault();
        try {
            const { data, error } = await supabase
                .from('ArchivioFarmaci')
                .update({ quantita_attuale: updateStockData.quantita_attuale })
                .eq('id', updateStockData.id)
                .select();

            if (error) throw error;

            if (data?.length) {
                setArchivioFarmaci(prev => prev.map(item =>
                    item.id === data[0].id ? { ...item, quantita_attuale: data[0].quantita_attuale } : item
                ));
            }

            setShowUpdateStockModal(false);
            setUpdateStockData({ id: null, quantita_attuale: 0 });
        } catch (err) {
            console.error('Errore aggiornamento stock:', err);
            alert(`Errore: ${err.message}`);
        }
    };

    const handleOpenUpdateStock = (item) => {
        setUpdateStockData({
            id: item.id,
            quantita_attuale: item.quantita_attuale
        });
        setShowUpdateStockModal(true);
    };

    // Filtri per l'archivio
    const filteredFarmaci = archivioFarmaci.filter(farmaco => {
        const matchesSearch = farmaco.nome_farmaco.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (farmaco.dosaggio && farmaco.dosaggio.toLowerCase().includes(searchTerm.toLowerCase()));
        
        if (filterStock === 'low') {
            return matchesSearch && farmaco.quantita_attuale <= farmaco.quantita_scortaminima;
        } else if (filterStock === 'normal') {
            return matchesSearch && farmaco.quantita_attuale > farmaco.quantita_scortaminima;
        }
        return matchesSearch;
    });

    // Statistiche
    const stats = {
        total: archivioFarmaci.length,
        lowStock: archivioFarmaci.filter(f => f.quantita_attuale <= f.quantita_scortaminima).length,
        normalStock: archivioFarmaci.filter(f => f.quantita_attuale > f.quantita_scortaminima).length,
        noStock: archivioFarmaci.filter(f => f.quantita_attuale === 0).length
    };

    const getQuantityIndicatorClass = (current, min) => {
        if (current === 0) return 'fm-low';
        if (current <= min) return 'fm-low';
        if (current <= min * 2) return 'fm-medium';
        return 'fm-high';
    };

    const resetEventForm = (date = new Date()) => {
        const now = new Date();
        setFormData({
            id: null, title: '', description: '', date: format(date, 'yyyy-MM-dd'),
            startTime: format(now, 'HH:mm'), endTime: format(setHours(now, now.getHours() + 1), 'HH:mm'),
            nome_farmaco: '', quantita: 0,
            repeatPattern: 'nessuna', repeatEndDate: '',
            isNotificationEnabled: false, sendBefore: 1, notify_emails: []
        });
    };

    const handleSelectSlot = ({ start }) => {
        setModalData({ date: start });
        resetEventForm(start);
    };

    const handleSelectEvent = (event) => {
        if (event.repeat_pattern) {
            setShowRecurrenceModal(true);
            setModalData(event);
        } else {
            openEventModal(event);
        }
    };

    const openEventModal = (event, isRecurring = false) => {
        setModalData(event);
        setFormData({
            ...formData,
            id: event.id || null,
            title: event.title || '',
            description: event.description || '',
            date: format(event.start, 'yyyy-MM-dd'),
            startTime: format(event.start, 'HH:mm'),
            endTime: format(event.end, 'HH:mm'),
            nome_farmaco: event.nome_farmaco || '',
            quantita: event.quantita || 0,
            notify_emails: event.notify_emails || [],
            sendBefore: event.notify_at ? Math.round((event.start - new Date(event.notify_at)) / (1000 * 60 * 60)) : 1,
            isNotificationEnabled: !!event.notify_at,
            repeatPattern: isRecurring ? event.repeat_pattern : 'nessuna',
            repeatEndDate: isRecurring ? format(
                events.filter(e => e.recurrence_id === event.recurrence_id)
                    .sort((a, b) => b.end - a.end)[0]?.end || event.end,
                'yyyy-MM-dd'
            ) : ''
        });
        setShowRecurrenceModal(false);
    };

    const handleDeleteEvent = async (mode = 'single') => {
        if (!modalData?.id) return;

        const { error } = mode === 'all' && modalData.recurrence_id
            ? await supabase.from('events_farmaci').delete().eq('recurrence_id', modalData.recurrence_id)
            : await supabase.from('events_farmaci').delete().eq('id', modalData.id);

        if (!error) {
            setEvents(prev => mode === 'all' && modalData.recurrence_id
                ? prev.filter(ev => ev.recurrence_id !== modalData.recurrence_id)
                : prev.filter(ev => ev.id !== modalData.id)
            );
        }
        setModalData(null);
        setShowRecurrenceModal(false);
    };

    const eventStyleGetter = (event) => ({
        style: {
            backgroundColor: categoryColors['FARMACO'],
            color: 'white', borderRadius: '8px', border: 'none', padding: '4px 8px',
            whiteSpace: 'pre-wrap', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', fontSize: '14px'
        }
    });

    return (
        <div className="app-layout">
            <div className="header">
                <h1>💊 Gestione Farmaci</h1>
                <p>Gestisci l'archivio dei farmaci e gli appuntamenti per l'assunzione!</p>
                <div className="fm-header-actions">
                    <button onClick={() => navigate('/main-menu')} className="fm-btn-secondary">
                        Torna al Menu Principale
                    </button>
                    <button className="fm-btn-add" onClick={() => { setModalData({ date: new Date() }); resetEventForm(); }}>
                        Nuovo Appuntamento
                    </button>
                    <button className="fm-btn-add" onClick={() => { setShowMagazzinoModal(true); setMagazzinoFormData({ id: null, nome_farmaco: '', dosaggio: '', istruzioni: '', quantita_attuale: 0, quantita_scortaminima: 0, giorni_ricezione: '' }); }}>
                        Aggiungi Farmaco
                    </button>
                    <button className="fm-btn-primary" onClick={() => { setShowArchivioModal(true); }}>
                        Visualizza Magazzino
                    </button>
                </div>
            </div>

            <div className="main-content">
                <div className="fm-info-box">
                    <h2>Gestisci gli appuntamenti</h2>
                    <p>Clicca su una data o su un appuntamento per gestirlo.</p>
                </div>
                <div className="fm-calendar-wrapper">
                    {profile ? (
                        <Calendar
                            localizer={localizer} events={events} culture="it"
                            startAccessor="start" endAccessor="end" style={{ height: 600 }} selectable
                            views={["month", "week", "day", "agenda"]} view={view} onView={setView}
                            date={currentDate} onNavigate={setCurrentDate}
                            onSelectSlot={handleSelectSlot} onSelectEvent={handleSelectEvent}
                            eventPropGetter={eventStyleGetter}
                            components={{ event: CustomEventContent, toolbar: CustomToolbar }}
                            messages={{
                                today: 'Oggi', previous: 'Precedente', next: 'Successivo',
                                month: 'Mese', week: 'Settimana', day: 'Giorno', agenda: 'Agenda'
                            }}
                        />
                    ) : (
                        <p>Caricamento del profilo in corso...</p>
                    )}
                </div>
            </div>
            <div className="footer">
                <p>&copy; 2024 Gruppo Famiglia. Tutti i diritti riservati.</p>
            </div>

            {/* Modals */}

            {/* Recurrence Modal */}
            {showRecurrenceModal && (
                <div className="fm-modal-overlay">
                    <div className="fm-modal-content">
                        <div className="fm-modal-header">
                            <h2>Gestisci Appuntamento Ricorrente</h2>
                            <button className="fm-btn-close" onClick={() => { setShowRecurrenceModal(false); setModalData(null); }}>&times;</button>
                        </div>
                        <div className="fm-modal-body">
                            <p>Questo appuntamento fa parte di una serie. Come vuoi procedere?</p>
                            <div className="fm-header-actions">
                                <button className="fm-btn-primary" onClick={() => openEventModal(modalData, false)}>Modifica Solo Questo</button>
                                <button className="fm-btn-primary" onClick={() => openEventModal(modalData, true)}>Modifica Tutta la Serie</button>
                                <button className="fm-btn-delete" onClick={() => handleDeleteEvent('single')}>Elimina Solo Questo</button>
                                <button className="fm-btn-delete" onClick={() => handleDeleteEvent('all')}>Elimina Tutta la Serie</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Event Modal per Appuntamenti Farmaco */}
            {modalData && !showRecurrenceModal && (
                <div className="fm-modal-overlay">
                    <div className="fm-modal-content fm-form-modal">
                        <div className="fm-modal-header">
                            <h2>{modalData?.id ? 'Modifica Appuntamento Farmaco' : 'Aggiungi Nuovo Appuntamento'}</h2>
                            <button className="fm-btn-close" onClick={() => setModalData(null)}>&times;</button>
                        </div>
                        <form onSubmit={handleSaveEvent}>
                            <div className="fm-modal-body">
                                <div className="fm-form-grid">
                                    <div className="fm-form-group">
                                        <label>💊 Farmaco:</label>
                                        <select className="fm-select" value={formData.nome_farmaco} onChange={(e) => updateFormData({ nome_farmaco: e.target.value })} required>
                                            <option value="">Seleziona un farmaco...</option>
                                            {archivioFarmaci.map(farmaco => (
                                                <option key={farmaco.id} value={farmaco.nome_farmaco}>
                                                    {farmaco.nome_farmaco}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="fm-form-group">
                                        <label>📏 Quantità:</label>
                                        <input type="number" step="0.01" className="fm-input" value={formData.quantita} onChange={(e) => updateFormData({ quantita: parseFloat(e.target.value) })} required />
                                    </div>
                                    <div className="fm-form-group">
                                        <label>📅 Data:</label>
                                        <input type="date" className="fm-input" value={formData.date} onChange={(e) => updateFormData({ date: e.target.value })} required />
                                    </div>
                                    <div className="fm-form-group">
                                        <label>⏰ Ora Assunzione:</label>
                                        <input type="time" className="fm-input" value={formData.startTime} onChange={(e) => updateFormData({ startTime: e.target.value })} required />
                                    </div>
                                    <div className="fm-form-group">
                                        <label>🔄 Frequenza di Ripetizione:</label>
                                        <select className="fm-select" value={formData.repeatPattern} onChange={(e) => updateFormData({ repeatPattern: e.target.value })}>
                                            <option value="nessuna">Nessuna</option>
                                            <option value="daily">Giornaliera</option>
                                            <option value="weekly">Settimanale</option>
                                            <option value="monthly">Mensile</option>
                                            <option value="annually">Annuale</option>
                                        </select>
                                    </div>
                                    {formData.repeatPattern !== 'nessuna' && (
                                        <div className="fm-form-group">
                                            <label>📅 Data di Fine Ripetizione:</label>
                                            <input type="date" className="fm-input" value={formData.repeatEndDate} onChange={(e) => updateFormData({ repeatEndDate: e.target.value })} required />
                                        </div>
                                    )}
                                    <div className="fm-form-group">
                                        <label>
                                            <input type="checkbox" checked={formData.isNotificationEnabled}
                                                onChange={(e) => updateFormData({ isNotificationEnabled: e.target.checked })} />
                                            🔔 Attiva Notifiche
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="fm-modal-footer">
                                <div className="fm-footer-left">
                                    {modalData?.id && (
                                        <button type="button" className="fm-btn-delete" onClick={() => handleDeleteEvent()}>Elimina</button>
                                    )}
                                </div>
                                <div className="fm-footer-right">
                                    <button type="submit" className="fm-btn-primary" disabled={!profile}>Salva</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Magazzino Modal (Inserisci/Modifica Farmaco) */}
            {showMagazzinoModal && (
                <div className="fm-modal-overlay">
                    <div className="fm-modal-content fm-form-modal">
                        <div className="fm-modal-header">
                            <h2>{magazzinoFormData.id ? 'Modifica Farmaco' : 'Aggiungi Nuovo Farmaco'}</h2>
                            <button className="fm-btn-close" onClick={() => setShowMagazzinoModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleSaveMagazzinoItem}>
                            <div className="fm-modal-body">
                                <div className="fm-form-grid">
                                    <div className="fm-form-group">
                                        <label>💊 Nome Farmaco:</label>
                                        <input type="text" className="fm-input" value={magazzinoFormData.nome_farmaco} onChange={(e) => updateMagazzinoFormData({ nome_farmaco: e.target.value })} required />
                                    </div>
                                    <div className="fm-form-group">
                                        <label>📏 Dosaggio:</label>
                                        <input type="text" className="fm-input" value={magazzinoFormData.dosaggio} onChange={(e) => updateMagazzinoFormData({ dosaggio: e.target.value })} />
                                    </div>
                                    <div className="fm-form-group">
                                        <label>📝 Istruzioni:</label>
                                        <textarea className="fm-textarea" value={magazzinoFormData.istruzioni} onChange={(e) => updateMagazzinoFormData({ istruzioni: e.target.value })} />
                                    </div>
                                    <div className="fm-form-group fm-quantity-group">
                                        <label>📦 Quantità Attuale:</label>
                                        <input type="number" step="0.01" className="fm-input" value={magazzinoFormData.quantita_attuale} onChange={(e) => updateMagazzinoFormData({ quantita_attuale: parseFloat(e.target.value) })} required />
                                    </div>
                                    <div className="fm-form-group">
                                        <label>⚠️ Quantità Scorta Minima:</label>
                                        <input type="number" step="0.01" className="fm-input" value={magazzinoFormData.quantita_scortaminima} onChange={(e) => updateMagazzinoFormData({ quantita_scortaminima: parseFloat(e.target.value) })} />
                                    </div>
                                    <div className="fm-form-group">
                                        <label>📅 Giorni di Ricezione:</label>
                                        <input type="text" className="fm-input" value={magazzinoFormData.giorni_ricezione} onChange={(e) => updateMagazzinoFormData({ giorni_ricezione: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                            <div className="fm-modal-footer">
                                <div className="fm-footer-left">
                                    {magazzinoFormData.id && (
                                        <button type="button" className="fm-btn-delete" onClick={() => handleDeleteMagazzinoItem(magazzinoFormData.id)}>Elimina</button>
                                    )}
                                </div>
                                <div className="fm-footer-right">
                                    <button type="submit" className="fm-btn-primary">Salva</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Archivio completo con nuovo design a carte */}
            {showArchivioModal && (
                <div className="fm-modal-overlay">
                    <div className="fm-modal-content">
                        <div className="fm-modal-header">
                            <h2>🏪 Archivio Magazzino Farmaci</h2>
                            <button className="fm-btn-close" onClick={() => setShowArchivioModal(false)}>&times;</button>
                        </div>
                        <div className="fm-modal-body">
                            {/* Stats Cards */}
                            <div className="fm-stats-container">
                                <div className="fm-stat-card">
                                    <div className="fm-stat-number">{stats.total}</div>
                                    <div className="fm-stat-label">Farmaci Totali</div>
                                </div>
                                <div className="fm-stat-card">
                                    <div className="fm-stat-number">{stats.lowStock}</div>
                                    <div className="fm-stat-label">Scorta Bassa</div>
                                </div>
                                <div className="fm-stat-card">
                                    <div className="fm-stat-number">{stats.normalStock}</div>
                                    <div className="fm-stat-label">Scorta Normale</div>
                                </div>
                                <div className="fm-stat-card">
                                    <div className="fm-stat-number">{stats.noStock}</div>
                                    <div className="fm-stat-label">Esauriti</div>
                                </div>
                            </div>

                            {/* Search and Filter */}
                            <div className="fm-search-container">
                                <input
                                    type="text"
                                    placeholder="Cerca farmaci..."
                                    className="fm-search-input"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <select
                                    className="fm-filter-select"
                                    value={filterStock}
                                    onChange={(e) => setFilterStock(e.target.value)}
                                >
                                    <option value="all">Tutti i farmaci</option>
                                    <option value="low">Solo scorta bassa</option>
                                    <option value="normal">Solo scorta normale</option>
                                </select>
                            </div>

                            {/* Farmaci Cards */}
                            <div className="fm-archivio-container">
                                {filteredFarmaci.map(farmaco => (
                                    <div key={farmaco.id} className={`fm-farmaco-card ${farmaco.quantita_attuale <= farmaco.quantita_scortaminima ? 'fm-low-stock' : ''}`}>
                                        <div className="fm-farmaco-header">
                                            <h3 className="fm-farmaco-name">{farmaco.nome_farmaco}</h3>
                                            <div className="fm-farmaco-actions">
                                                <button
                                                    className="fm-btn-edit"
                                                    onClick={() => handleEditFarmaco(farmaco)}
                                                    title="Modifica farmaco"
                                                >
                                                    <FaEdit />
                                                </button>
                                                <button
                                                    className="fm-btn-delete"
                                                    onClick={() => handleDeleteMagazzinoItem(farmaco.id)}
                                                    title="Elimina farmaco"
                                                >
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="fm-farmaco-content">
                                            <div className="fm-farmaco-row">
                                                <div className="fm-form-group">
                                                    <label>📏 Dosaggio:</label>
                                                    <input
                                                        type="text"
                                                        className="fm-input"
                                                        value={(editedFarmaci[farmaco.id] || farmaco).dosaggio || ''}
                                                        onChange={(e) => handleTableChange(farmaco.id, 'dosaggio', e.target.value)}
                                                    />
                                                </div>
                                                <div className="fm-form-group fm-quantity-group">
                                                    <label>📦 Quantità Attuale:</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="fm-input"
                                                        value={(editedFarmaci[farmaco.id] || farmaco).quantita_attuale || 0}
                                                        onChange={(e) => handleTableChange(farmaco.id, 'quantita_attuale', parseFloat(e.target.value) || 0)}
                                                    />
                                                    <span className={`fm-quantity-indicator ${getQuantityIndicatorClass(farmaco.quantita_attuale, farmaco.quantita_scortaminima)}`}>
                                                        {farmaco.quantita_attuale === 0 ? '❌' : 
                                                         farmaco.quantita_attuale <= farmaco.quantita_scortaminima ? '⚠️' :
                                                         farmaco.quantita_attuale <= farmaco.quantita_scortaminima * 2 ? '⚡' : '✅'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="fm-farmaco-row">
                                                <div className="fm-form-group">
                                                    <label>⚠️ Scorta Minima:</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="fm-input"
                                                        value={(editedFarmaci[farmaco.id] || farmaco).quantita_scortaminima || 0}
                                                        onChange={(e) => handleTableChange(farmaco.id, 'quantita_scortaminima', parseFloat(e.target.value) || 0)}
                                                    />
                                                </div>
                                                <div className="fm-form-group">
                                                    <label>📅 Giorni Ricezione:</label>
                                                    <input
                                                        type="text"
                                                        className="fm-input"
                                                        value={(editedFarmaci[farmaco.id] || farmaco).giorni_ricezione || ''}
                                                        onChange={(e) => handleTableChange(farmaco.id, 'giorni_ricezione', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            {farmaco.istruzioni && (
                                                <div className="fm-form-group">
                                                    <label>📝 Istruzioni:</label>
                                                    <textarea
                                                        className="fm-textarea"
                                                        value={(editedFarmaci[farmaco.id] || farmaco).istruzioni || ''}
                                                        onChange={(e) => handleTableChange(farmaco.id, 'istruzioni', e.target.value)}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="fm-modal-footer">
                            <div className="fm-footer-left">
                                <span className={`fm-save-indicator ${Object.keys(editedFarmaci).length > 0 ? 'fm-has-changes' : ''}`}>
                                    {Object.keys(editedFarmaci).length > 0 ? 
                                        `${Object.keys(editedFarmaci).length} modifiche in sospeso` : 
                                        'Nessuna modifica'}
                                </span>
                            </div>
                            <div className="fm-footer-right">
                                <button 
                                    type="button" 
                                    className="fm-btn-primary" 
                                    onClick={handleSaveAllEdits}
                                    disabled={Object.keys(editedFarmaci).length === 0}
                                >
                                    Salva Modifiche
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Nuovo Modale per l'aggiornamento dello stock */}
            {showUpdateStockModal && (
                <div className="fm-modal-overlay">
                    <div className="fm-modal-content fm-form-modal">
                        <div className="fm-modal-header">
                            <h2>📦 Aggiorna Stock</h2>
                            <button className="fm-btn-close" onClick={() => setShowUpdateStockModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleUpdateStock}>
                            <div className="fm-modal-body">
                                <div className="fm-form-group">
                                    <label>📦 Nuova Quantità:</label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        className="fm-input" 
                                        value={updateStockData.quantita_attuale} 
                                        onChange={(e) => updateUpdateStockData({ quantita_attuale: parseFloat(e.target.value) })} 
                                        required 
                                    />
                                </div>
                            </div>
                            <div className="fm-modal-footer">
                                <div className="fm-footer-right">
                                    <button type="submit" className="fm-btn-primary">Salva</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}