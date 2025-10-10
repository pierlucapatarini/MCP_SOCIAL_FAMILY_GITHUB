import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient"; // Assicurati che il percorso sia corretto
import { FaBars, FaStar, FaTv, FaClock, FaCalendarAlt, FaChevronLeft, FaChevronRight, FaSlidersH, FaHeart } from 'react-icons/fa';
import { MdOutlineLocalMovies } from 'react-icons/md';
import "../../styles/MainStyle.css"; // Stile universale
import "../../styles/StilePagina16_07.css"; // Stile specifico della pagina

// --- COSTANTI DI CONFIGURAZIONE / FALLBACK DATI ---
const TIME_SLOTS = [
  { label: "Mattina (06:00 - 12:00)", start: "06:00", end: "12:00" },
  { label: "Pomeriggio (12:00 - 20:00)", start: "12:00", end: "20:00" },
  { label: "Sera/Notte (20:00 - 24:00)", start: "20:00", end: "24:00" },
];

const FALLBACK_PROGRAMS = [
    // Nota: In una vera applicazione, questi dati verrebbero caricati da un'API EPG esterna.
    // Qui li usiamo come MOCK per il giorno attuale (Lun-Dom)
    { id: 'prog101', day: 'Lun', time: '07:00', end: '08:30', title: 'Buongiorno Italia', channel: 'Rai 1', channelNumber: 1, genre: 'Notizie' },
    { id: 'prog102', day: 'Lun', time: '11:00', end: '12:00', title: 'Cooking Show: Lo Chef in 10 Minuti', channel: 'Rete 4', channelNumber: 4, genre: 'Hobby' },
    { id: 'prog4', day: 'Lun', time: '18:00', end: '19:00', title: 'Cartoni Animati: Eroi Spaziali', channel: 'K2', channelNumber: 41, genre: 'Bambini' },
    { id: 'prog10', day: 'Lun', time: '21:20', end: '23:30', title: 'Film Drammatico: La Scelta', channel: 'Rai 1', channelNumber: 1, genre: 'Film' },
    { id: 'prog502', day: 'Mar', time: '11:00', end: '12:00', title: 'Programma Mattutino', channel: 'Rai 2', channelNumber: 2, genre: 'Intrattenimento' },
    { id: 'prog6', day: 'Mar', time: '19:10', end: '20:00', title: 'Documentario: Natura Selvaggia', channel: 'Rete 4', channelNumber: 4, genre: 'Documentario' },
    { id: 'prog5', day: 'Mar', time: '21:20', end: '23:00', title: 'Serie TV: Misteri Svelati (Ep. 5)', channel: 'Rai 2', channelNumber: 2, genre: 'Serie TV' },
    { id: 'prog8', day: 'Mer', time: '20:45', end: '23:30', title: 'Partita di Calcio: Champions League', channel: 'Canale 5', channelNumber: 5, genre: 'Sport' },
    { id: 'prog15', day: 'Sab', time: '14:00', end: '16:00', title: 'Rugby: Sei Nazioni', channel: 'DMAX', channelNumber: 52, genre: 'Sport' },
    { id: 'prog14', day: 'Sab', time: '21:25', end: '00:30', title: 'Intrattenimento: C\'è Posta per Te', channel: 'Canale 5', channelNumber: 5, genre: 'Intrattenimento' },
    { id: 'prog16', day: 'Dom', time: '21:20', end: '23:55', title: 'Film Blockbuster: Avventura Galattica', channel: 'Rai 4', channelNumber: 21, genre: 'Film' },
];

// Mappa per recupero veloce dei dettagli del programma
const programMap = FALLBACK_PROGRAMS.reduce((acc, prog) => {
    acc[prog.id] = prog;
    return acc;
}, {});

// Utility: Genera i giorni della settimana (da oggi)
const getWeeklyDays = () => {
  const today = new Date();
  const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']; 
  const week = [];

  for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      week.push({
          label: days[date.getDay()],
          date: date.toISOString().split('T')[0], // YYYY-MM-DD
          index: i 
      });
  }
  return week;
};
const weeklyDays = getWeeklyDays();

// Utility: Converte l'orario in numero per l'ordinamento e la fascia oraria
const timeToNumber = (time) => {
    if (!time || time.length !== 5 || time[2] !== ':') return 0;
    return parseInt(time.replace(':', ''), 10);
};

// --- COMPONENTE PRINCIPALE ---
export default function Pagina4_TVPrograms() {
  const navigate = useNavigate();

  // --- STATI ---
  const [userProfile, setUserProfile] = useState(null);
  const [familyGroup, setFamilyGroup] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [favorites, setFavorites] = useState([]);
  
  const [isFavoritesView, setIsFavoritesView] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState('Tutti');
  const [selectedGenre, setSelectedGenre] = useState('Tutti');
  const [selectedDayIndex, setSelectedDayIndex] = useState(0); // 0 è oggi
  
  const [isLoading, setIsLoading] = useState(false);
  const [isDbLoading, setIsDbLoading] = useState(false);

  // --- DATI DERIVATI (Memoized) ---
  const uniqueChannels = useMemo(() => ['Tutti', ...new Set(FALLBACK_PROGRAMS.map(p => p.channel))].sort(), []);
  const uniqueGenres = useMemo(() => ['Tutti', ...new Set(FALLBACK_PROGRAMS.map(p => p.genre))].sort(), []);

  const selectedDay = weeklyDays[selectedDayIndex];

  // LOGICA DI FETCH E FILTRAGGIO
  const filterAndGroupPrograms = useMemo(() => {
    const favoriteProgramIds = favorites.map(f => f.program_id);

    let programsToFilter = [];

    if (isFavoritesView) {
        // Mostra i dettagli di tutti i programmi preferiti, indipendentemente dal giorno
        programsToFilter = FALLBACK_PROGRAMS.filter(p => favoriteProgramIds.includes(p.id));
    } else {
        // Mostra i programmi del giorno selezionato (mocked)
        programsToFilter = programs;
    }
    
    // FILTRI
    if (selectedChannel !== 'Tutti') {
        programsToFilter = programsToFilter.filter(p => p.channel === selectedChannel);
    }

    if (selectedGenre !== 'Tutti') {
        programsToFilter = programsToFilter.filter(p => p.genre === selectedGenre);
    }

    // ORDINAMENTO
    programsToFilter.sort((a, b) => timeToNumber(a.time) - timeToNumber(b.time));

    // RAGGRUPPAMENTO
    const groups = TIME_SLOTS.map(slot => ({
        ...slot,
        programs: []
    }));

    programsToFilter.forEach(program => {
        const programStartTime = timeToNumber(program.time);

        const slot = groups.find(slot => {
            const slotStart = timeToNumber(slot.start);
            const slotEnd = timeToNumber(slot.end);

            if (slot.end === "24:00") {
                // Gestisce la fascia serale/notturna
                return programStartTime >= slotStart;
            } else {
                return programStartTime >= slotStart && programStartTime < slotEnd;
            }
        });

        if (slot) {
            slot.programs.push(program);
        }
    });

    return groups;
  }, [programs, favorites, isFavoritesView, selectedChannel, selectedGenre]);


  // --- CARICAMENTO DATI INIZIALE (Utente, Gruppo e Preferiti) ---
  useEffect(() => {
    async function loadInitialData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("id, family_group").eq("id", user.id).single();
      if (profile && profile.family_group) {
        setUserProfile(profile);
        setFamilyGroup(profile.family_group);
        await fetchFavorites(profile.family_group);
        await cleanUpPastPrograms(profile.family_group);
      }
      // Carica i programmi del giorno iniziale (oggi)
      fetchProgramsForDay(weeklyDays[0].label);
    }
    loadInitialData();
  }, [navigate]);

  // --- CARICAMENTO PROGRAMMI MOCK PER IL GIORNO SELEZIONATO ---
  const fetchProgramsForDay = (dayLabel) => {
    setIsLoading(true);
    // Simulazione di chiamata API/DB
    setTimeout(() => {
        const dailyData = FALLBACK_PROGRAMS.filter(p => p.day === dayLabel);
        setPrograms(dailyData);
        setIsLoading(false);
    }, 500);
  };
  
  // --- GESTIONE FIRESTORE -> SUPABASE (Programmi Preferiti) ---

  const fetchFavorites = async (group_id) => {
    if (!group_id) return;
    setIsDbLoading(true);
    
    const { data, error } = await supabase
        .from('favorite_programs')
        .select('*')
        .eq('family_group', group_id);
    
    if (error) {
        console.error("Errore nel recupero dei preferiti da Supabase:", error);
    } else {
        setFavorites(data || []);
    } 
    setIsDbLoading(false);
  };

  const cleanUpPastPrograms = async (group_id) => {
    if (!group_id) return;
    const todayISO = new Date().toISOString().split('T')[0];

    // Ottieni tutti i preferiti del gruppo
    const { data: allFavorites, error: fetchError } = await supabase
        .from('favorite_programs')
        .select('id, program_date')
        .eq('family_group', group_id);

    if (fetchError) {
        console.error("Errore nel recupero per la pulizia:", fetchError);
        return;
    }

    // Filtra quelli da cancellare (program_date passata)
    const toDeleteIds = allFavorites
        .filter(fav => fav.program_date && fav.program_date < todayISO)
        .map(fav => fav.id);

    if (toDeleteIds.length > 0) {
        const { error: deleteError } = await supabase
            .from('favorite_programs')
            .delete()
            .in('id', toDeleteIds);

        if (deleteError) {
            console.error("Errore nella pulizia del DB:", deleteError);
        } else {
            console.log(`Rimossi ${toDeleteIds.length} programmi preferiti datati.`);
            // Ricarica i preferiti dopo la pulizia
            await fetchFavorites(group_id); 
        }
    }
  };

  const toggleFavorite = async (programId) => {
    if (!familyGroup || !userProfile) return;

    const existingFavorite = favorites.find(f => f.program_id === programId);
    const programDetails = programMap[programId];
    
    if (!programDetails) return;

    if (existingFavorite) {
        // DELETE
        const { error } = await supabase
            .from('favorite_programs')
            .delete()
            .eq('id', existingFavorite.id);

        if (!error) {
            setFavorites(prev => prev.filter(f => f.id !== existingFavorite.id));
            alert(`${programDetails.title} rimosso dai preferiti.`);
        } else {
            console.error(error);
            alert('Errore nella rimozione del preferito.');
        }

    } else {
        // INSERT
        const programDayLabel = programDetails.day;
        const programDate = weeklyDays.find(d => d.label === programDayLabel)?.date || new Date().toISOString().split('T')[0];

        const newFavorite = {
            program_id: programId,
            program_day_label: programDayLabel,
            program_date: programDate,
            id_user: userProfile.id,
            family_group: familyGroup,
        };

        const { data, error } = await supabase
            .from('favorite_programs')
            .insert(newFavorite)
            .select();
        
        if (!error && data) {
            setFavorites(prev => [...prev, data[0]]);
            alert(`${programDetails.title} aggiunto ai preferiti.`);
        } else {
            console.error(error);
            alert("Errore nell'aggiunta del preferito.");
        }
    }
  };

  // --- GESTIONE DEGLI EVENTI ---
  const handleDayChange = (index) => {
    if (isFavoritesView) return; 
    setSelectedDayIndex(index);
    fetchProgramsForDay(weeklyDays[index].label);
  };
  
  const changeDay = (direction) => {
    if (isFavoritesView) return; 

    let newIndex = selectedDayIndex + direction;
    if (newIndex < 0) newIndex = 6;
    if (newIndex > 6) newIndex = 0;
    
    handleDayChange(newIndex);
  };

  // --- RENDER COMPONENTI ---

  const renderProgramCard = (program) => {
    const isFavorite = favorites.some(f => f.program_id === program.id);
    const genreColors = {
        'Film': 'bg-red-500/20 text-red-300', 'Notizie': 'bg-blue-500/20 text-blue-300',
        'Approfondimento': 'bg-indigo-500/20 text-indigo-300', 'Serie TV': 'bg-green-500/20 text-green-300',
        'Documentario': 'bg-yellow-500/20 text-yellow-300', 'Sport': 'bg-sky-500/20 text-sky-300',
        'Intrattenimento': 'bg-purple-500/20 text-purple-300', 'Bambini': 'bg-pink-500/20 text-pink-300',
        'Hobby': 'bg-orange-500/20 text-orange-300', 'Fiction': 'bg-lime-500/20 text-lime-300',
        'default': 'bg-gray-700/50 text-gray-400'
    };
    const colorClass = genreColors[program.genre] || genreColors.default;

    return (
        <div key={program.id} className="program-card">
            {/* Info Principali */}
            <div className="flex-1 min-w-0">
                <div className="program-title-container">
                    <MdOutlineLocalMovies className="icon-main text-indigo-400" />
                    <h3 className="program-title-text">{program.title}</h3>
                </div>
                <div className="program-details-row">
                    <div className="program-detail-item">
                        <FaTv className="icon-detail text-sky-400" />
                        <span className="font-extrabold text-white text-base mr-2">{program.channelNumber}</span>
                        <span className="font-semibold">{program.channel}</span>
                    </div>
                    <div className="program-detail-item">
                        <FaClock className="icon-detail text-green-400" />
                        <span>{program.time} - {program.end}</span>
                    </div>
                </div>
            </div>

            {/* Genere e Azione */}
            <div className="program-action-container">
                <span className={`program-genre-tag ${colorClass}`}>
                    {program.genre}
                </span>
                
                {/* Pulsante Preferito */}
                <button
                    onClick={() => toggleFavorite(program.id)}
                    className={`btn-favorite ${isFavorite ? 'favorite-active' : 'favorite-inactive'}`}
                    title={isFavorite ? "Rimuovi dai Preferiti" : "Aggiungi ai Preferiti"}
                >
                    <FaStar className="w-5 h-5" fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
            </div>
        </div>
    );
  };
  
  const hasPrograms = filterAndGroupPrograms.some(g => g.programs.length > 0);

  // --- JSX ---
  return (
    <div className="app-layout-tv">
        
        {/* Header */}
        <header className="header-tv">
            <button onClick={() => navigate('/main-menu')} className="btn-secondary"><FaBars /> Ritorna al menu</button>
            <h1 className="header-title-tv">Palinsesto TV Familiare</h1>
            <p className="header-subtitle-tv">Gruppo: <strong>{familyGroup || '...'}</strong></p>
        </header>

        <div className="scrollable-content-tv">
            
            {/* Controlli Principali */}
            <div className="controls-container-tv">
                
                {/* Pulsante Vista Preferiti */}
                <button
                    onClick={() => setIsFavoritesView(prev => !prev)}
                    className={`btn-toggle-view ${isFavoritesView ? 'active-pink' : 'inactive-gray'}`}
                    disabled={isDbLoading}
                >
                    <FaHeart className="w-5 h-5" fill={isFavoritesView ? 'currentColor' : 'none'} />
                    <span>{isFavoritesView ? `Preferiti (${favorites.length})` : 'Visualizza Preferiti'}</span>
                </button>
                
                {/* Filtri Canale e Genere */}
                <div className="relative w-full">
                    <FaSlidersH className="input-icon text-indigo-400" />
                    <select
                        onChange={(e) => setSelectedChannel(e.target.value)}
                        value={selectedChannel}
                        className="select-filter pl-10 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="Tutti">Filtra per Canale (Tutti)</option>
                        {uniqueChannels.map(channel => <option key={channel} value={channel}>{channel}</option>)}
                    </select>
                </div>

                <div className="relative w-full">
                    <FaStar className="input-icon text-yellow-400" />
                    <select
                        onChange={(e) => setSelectedGenre(e.target.value)}
                        value={selectedGenre}
                        className="select-filter pl-10 focus:ring-yellow-500 focus:border-yellow-500"
                    >
                        <option value="Tutti">Filtra per Genere (Tutti)</option>
                        {uniqueGenres.map(genre => <option key={genre} value={genre}>{genre}</option>)}
                    </select>
                </div>
            </div>
            
            {/* Selettore Giorno (Tabs) */}
            {!isFavoritesView && (
                <div className="day-selector-container">
                    <div className="day-tabs-scroll">
                        {weeklyDays.map((day, index) => (
                            <button
                                key={day.date}
                                onClick={() => handleDayChange(index)}
                                className={`day-tab-button ${index === selectedDayIndex ? 'active-day' : 'inactive-day'}`}
                            >
                                <span className="block">{day.label}</span>
                                <span className="text-xs opacity-75">{day.date.substring(5).replace('-', '/')}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Contenitore Programmi */}
            <div className="programs-list-wrapper" aria-live="polite" aria-busy={isLoading}>
                <div className="programs-list-header">
                    <button
                        onClick={() => changeDay(-1)}
                        className="btn-day-change"
                        disabled={selectedDayIndex === 0 || isFavoritesView}
                    >
                        <FaChevronLeft className="w-6 h-6" />
                    </button>

                    <h2 className="programs-list-title">
                        <FaCalendarAlt className="w-6 h-6 flex-shrink-0" />
                        <span>{isFavoritesView ? 'La Tua Lista Preferiti' : `Programmi di ${selectedDay?.label}`}</span>
                        {!isFavoritesView && <span className="text-sm text-gray-400 ml-2 hidden sm:inline">({selectedDay?.date.substring(5).replace('-', '/')})</span>}
                    </h2>

                    <button
                        onClick={() => changeDay(1)}
                        className="btn-day-change"
                        disabled={selectedDayIndex === 6 || isFavoritesView}
                    >
                        <FaChevronRight className="w-6 h-6" />
                    </button>
                </div>
                
                {isDbLoading && (
                    <div className="loading-box">
                        <FaClock className="w-6 h-6 animate-spin mr-3 text-yellow-400" />
                        <p className="text-base font-semibold text-yellow-300">Sincronizzazione preferiti in corso...</p>
                    </div>
                )}
                
                {isLoading && !isFavoritesView && (
                    <div className="loading-box">
                        <FaClock className="w-8 h-8 animate-spin mr-3 text-indigo-400" />
                        <p className="text-lg font-semibold">Caricamento palinsesto TV...</p>
                    </div>
                )}

                {!isLoading && hasPrograms ? (
                    <div className="programs-grouped-list">
                        {filterAndGroupPrograms.map(group => (
                            group.programs.length > 0 ? (
                                <div key={group.label} className="program-group">
                                    <h3 className="group-label">
                                        <FaClock className="w-5 h-5 text-green-400" />
                                        <span>{group.label}</span>
                                    </h3>
                                    <div className="space-y-4">
                                        {group.programs.map(renderProgramCard)}
                                    </div>
                                </div>
                            ) : null
                        ))}
                    </div>
                ) : !isLoading && (
                    <div className="no-programs-box">
                        <p className="text-xl font-semibold">
                            {isFavoritesView 
                                ? "Non hai programmi preferiti da mostrare." 
                                : `Nessun programma trovato per ${selectedDay?.label} con i filtri attuali.`
                            }
                        </p>
                        <p className="mt-2 text-sm">
                            {isFavoritesView 
                                ? "Aggiungi un programma cliccando sull'icona a stella nella vista del palinsesto." 
                                : "Prova a modificare i filtri Canale o Genere, o a selezionare un altro giorno."
                            }
                        </p>
                    </div>
                )}

            </div>
        </div>
        
        {/* Footer (Note di implementazione) */}
        <footer className="footer-tv">
            <p className="text-sm font-bold text-green-300 mb-1">Integrazione Supabase</p>
            <p>I programmi TV sono MOCK, ma i tuoi preferiti sono salvati in Supabase (tabella: `favorite_programs`) e condivisi con il tuo gruppo familiare.</p>
        </footer>
    </div>
  );
}