import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import '../../styles/MainStyle.css';
import '../../styles/StilePagina16_03.css';

const API_URL = process.env.REACT_APP_API_URL; 

const Pagina16_03NoteScritteDettate = () => {
  const navigate = useNavigate();
  
  // Stati base
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [alfredData, setAlfredData] = useState(null);
  const [familyGroup, setFamilyGroup] = useState('');
  
  // Stati per progetti e note
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectNotes, setProjectNotes] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
  
  // Filtri
  const [showOnlyMyNotes, setShowOnlyMyNotes] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Stati per il form
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteType, setNoteType] = useState('text');
  const [formData, setFormData] = useState({
    title_notes: '',
    description_notes: '',
    text_notes: '',
    summary_notes: ''
  });
  
  // Stati per registrazione audio
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showTranscriptionOptions, setShowTranscriptionOptions] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  
  // Stati per disegno
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef(null);
  const [drawingColor, setDrawingColor] = useState('#000000');
  
  // Stati per file upload
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

// ===============================================
// === NUOVI STATI E REF PER LA REGISTRAZIONE VIDEO (AGGIORNATI) ===
// ===============================================
const [isRecordingVideo, setIsRecordingVideo] = useState(false);
const [videoStream, setVideoStream] = useState(null);
const [videoRecorder, setVideoRecorder] = useState(null);
const videoRef = useRef(null); // Ref per lo streaming della camera in tempo reale
const recordedVideoRef = useRef(null); // Ref per la preview del video registrato
// ===============================================


  
  // Stati per visualizzazione dettaglio
  const [selectedNote, setSelectedNote] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  
  // Stati per PDF generation
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // useEffect iniziale - Caricamento dati
  useEffect(() => {
    initializeData();
  }, []);

  // useEffect per filtrare note quando cambia il filtro
  useEffect(() => {
    filterNotes();
  }, [projectNotes, showOnlyMyNotes]);

  const initializeData = async () => {
    try {
      // Blocco 1: Autenticazione e Dati Utente
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        navigate('/auth');
        return;
      }
      
      setUser(authUser);
      
      // Recupero dati utente dal profilo
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, family_group, email')
        .eq('id', authUser.id)
        .single();
      
      if (profileError || !profileData) {
        console.error('Errore recupero profilo:', profileError);
        return;
      }
      
      setUserData(profileData);
      setFamilyGroup(profileData.family_group);
      
      // Blocco 2: Recupero Dati Alfred AI
      const { data: alfredProfile, error: alfredError } = await supabase
        .from('profiles')
        .select('id, username, family_group, is_ai')
        .eq('family_group', profileData.family_group)
        .eq('is_ai', true)
        .single();
      
      if (!alfredError && alfredProfile) {
        setAlfredData(alfredProfile);
      }
      
      // Blocco 3: Caricamento Progetti (title_notes univoci)
      await loadProjects(profileData.family_group);
      
      setLoading(false);
      
    } catch (error) {
      console.error('Errore inizializzazione:', error);
      setLoading(false);
    }
  };

// ===============================================
// === LOGICA RESET E HELPER VIDEO (NUOVA) ===
// ===============================================

// Funzione helper per resettare lo stato del video
const resetVideo = () => {
    if (videoStream) {
        // Ferma le tracce della camera e microfono
        videoStream.getTracks().forEach(track => track.stop());
    }
    setVideoStream(null);
    setVideoRecorder(null);
    setIsRecordingVideo(false);
};

// Funzione helper per resettare lo stato del form (DEVE ESSERE QUI)

const resetForm = () => {
    setFormData({
      title_notes: selectedProject || '',
      description_notes: '',
      text_notes: '',
      summary_notes: '',
      file: null,          
      file_name: '',       
      file_type: '', 
    });
    setAudioBlob(null); 
    setSelectedFile(null); 
    setNoteType('text');
    // RIMOZIONE: Eliminare setShowForm(false); da qui
    setIsEditing(false);
    setEditingNoteId(null);
    setTranscriptionText(''); 
    setShowTranscriptionOptions(false); 
    
    // Reset stato Audio
    setIsRecording(false);
    clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // Reset stato Video
    resetVideo(); 
    
    // Reset canvas (se hai un canvasRef)
    if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
};

// ===============================================
// === LOGICA REGISTRAZIONE VIDEO (AGGIORNATA) ===
// ===============================================
// ... intorno alla riga 219 (o dove inizia la funzione)
const startVideoRecording = async () => {
    resetVideo(); 
    
    // FIX: Dichiarare 'stream' qui per renderla accessibile nel blocco catch
    let stream = null; 
    
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setVideoStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream; 
        }
        
        // Tentativo di usare un codec robusto, altrimenti fallback generico
        const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9') 
            ? 'video/webm; codecs=vp9'
            : MediaRecorder.isTypeSupported('video/webm; codecs=vp8')
            ? 'video/webm; codecs=vp8'
            : 'video/webm';

        const options = { mimeType: mimeType }; 
        const mediaRecorder = new MediaRecorder(stream, options);
        setVideoRecorder(mediaRecorder);
        
        let videoChunks = [];
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                videoChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            stream.getTracks().forEach(track => track.stop()); 
            
            const videoBlob = new Blob(videoChunks, { type: mimeType });
            
            const videoUrl = URL.createObjectURL(videoBlob);
            if (recordedVideoRef.current) {
              recordedVideoRef.current.src = videoUrl;
            }

            setFormData(prev => ({
                ...prev,
                file: videoBlob, 
                file_name: `video_${Date.now()}.webm`,
                file_type: mimeType,
                summary_notes: prev.summary_notes || `Video registrato (${(videoBlob.size / 1024 / 1024).toFixed(2)}MB)`
            }));

            setVideoRecorder(null);
            setVideoStream(null);
        };

        mediaRecorder.start();
        setIsRecordingVideo(true);
    } catch (error) {
        console.error("Errore nell'accesso alla webcam:", error);
        alert("Impossibile accedere alla webcam o al microfono. Assicurati che i permessi siano concessi.");
        setIsRecordingVideo(false);
        // Pulizia in caso di fallimento dell'avvio
        if (stream) { // 'stream' è ora definita
            stream.getTracks().forEach(track => track.stop());
        }
        setVideoStream(null);
    }
};

const stopVideoRecording = () => {
    if (videoRecorder && videoRecorder.state === 'recording') {
        videoRecorder.stop();
        setIsRecordingVideo(false); 
    }
    // FIX 2: Rimossa la chiusura dello stream da qui, ora è gestita nell'handler onstop.
};
// ===============================================


  

  const loadProjects = async (fg) => {
    try {
      const { data, error } = await supabase
        .from('note_vocali_appunti')
        .select('title_notes, pdf_summary_url, inserted_at')
        .eq('family_group', fg)
        .order('title_notes', { ascending: true });
      
      if (error) throw error;
      
      // Raggruppa per title_notes e conta note
      const projectMap = {};
      data.forEach(note => {
        if (!projectMap[note.title_notes]) {
          projectMap[note.title_notes] = {
            name: note.title_notes,
            count: 0,
            pdf_url: note.pdf_summary_url,
            last_update: note.inserted_at
          };
        }
        projectMap[note.title_notes].count++;
        // Mantieni il PDF più recente
        if (note.pdf_summary_url && new Date(note.inserted_at) > new Date(projectMap[note.title_notes].last_update)) {
          projectMap[note.title_notes].pdf_url = note.pdf_summary_url;
          projectMap[note.title_notes].last_update = note.inserted_at;
        }
      });
      
      const projectsList = Object.values(projectMap);
      setProjects(projectsList);
      
    } catch (error) {
      console.error('Errore caricamento progetti:', error);
    }
  };

  const loadProjectNotes = async (projectName) => {
    try {
      const { data, error } = await supabase
        .from('note_vocali_appunti')
        .select('*')
        .eq('family_group', familyGroup)
        .eq('title_notes', projectName)
        .order('inserted_at', { ascending: false });
      
      if (error) throw error;
      
      setProjectNotes(data || []);
      setSelectedProject(projectName);
      
    } catch (error) {
      console.error('Errore caricamento note progetto:', error);
    }
  };

  const filterNotes = () => {
    let filtered = [...projectNotes];
    
    if (showOnlyMyNotes && user) {
      filtered = filtered.filter(note => note.inserted_by_user === user.id);
    }
    
    setFilteredNotes(filtered);
  };

  // Funzione di ricerca progetti
  const handleSearchProjects = (value) => {
    setSearchTerm(value);
    // Implementa ricerca se necessario
  };

  // Gestione form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  

  // Funzione per aprire form in modalità EDIT
  const handleEditNote = (note) => {
    setIsEditing(true);
    setEditingNoteId(note.id);
    setNoteType(note.note_type);
    setFormData({
      title_notes: note.title_notes,
      description_notes: note.description_notes || '',
      text_notes: note.text_notes || '',
      summary_notes: note.summary_notes || '',
      // Se è un file/video, precompila i dati per l'editing
      file: note.file_url ? new File([], note.file_name || 'file_esistente', { type: note.file_type || 'application/octet-stream' }) : null,
      file_name: note.file_name || '',
      file_type: note.file_type || ''
    });
    
    // Se è un disegno, carica l'immagine sul canvas
    if (note.note_type === 'drawing' && note.drawing_data && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = note.drawing_data;
    }
    
    // Per i video, se c'è un file_url, usalo per la preview
    if (note.note_type === 'video' && note.file_url && recordedVideoRef.current) {
        recordedVideoRef.current.src = note.file_url;
    }
    
    setShowForm(true);
    setShowDetail(false);
  };

  // Registrazione Audio con Speech-to-Text
  const startRecording = async () => {
    // Reset stato trascrizione
    setTranscriptionText('');
    setShowTranscriptionOptions(false);
      
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
        
        // Se il browser supporta l'API Web Speech, mostra l'opzione trascrizione
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
           setShowTranscriptionOptions(true);
        } else {
           // Se non supportato, salta e prepara il salvataggio solo audio
           skipTranscription();
        }
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Errore avvio registrazione:', error);
      alert('Errore accesso al microfono. Verifica i permessi.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  // Speech-to-Text usando Web Speech API
  const transcribeAudio = async () => {
    setIsTranscribing(true);
    
    try {
      // Verifica supporto Web Speech API
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('Il browser non supporta il riconoscimento vocale. Usa Chrome o Edge.');
        setIsTranscribing(false);
        return;
      }
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      
      recognition.lang = 'it-IT';
      recognition.continuous = false;
      recognition.interimResults = false;
      
      // FIX: Rimosso il codice errato che tentava di leggere il Blob come DataURL 
      // e di usare l'API Audio con l'API Speech, cosa che non funziona bene.
      // Invece, chiediamo all'utente di avviare la riproduzione dell'audio registrato
      // e avviamo l'API Web Speech per ascoltare dal *sistema*.

      // Tentativo di trascrizione rapida con un'ulteriore acquisizione dal microfono
      // per il tempo necessario alla trascrizione.
      alert("Preparati a riprodurre l'audio registrato. Dopo aver premuto OK, avvia la riproduzione del file audio nella preview in basso.");
      
      // Acquisizione microfono per Web Speech API
      const liveStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recognition.onend = () => {
          liveStream.getTracks().forEach(track => track.stop());
          setIsTranscribing(false);
      };
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setTranscriptionText(transcript);
        setFormData(prev => ({
          ...prev,
          text_notes: transcript,
          summary_notes: `Trascrizione audio: ${transcript.substring(0, 100)}...`
        }));
        // Non forzare l'arresto qui, lascialo all'onend (o togliendo il microfono).
      };
      
      recognition.onerror = (event) => {
        console.error('Errore trascrizione:', event.error);
        alert('Errore nella trascrizione. Riprova o inserisci il testo manualmente.');
        setIsTranscribing(false);
        liveStream.getTracks().forEach(track => track.stop());
      };
      
      recognition.start();
      
    } catch (error) {
      console.error('Errore trascrizione:', error);
      alert('Errore nella trascrizione audio: ' + error.message);
      setIsTranscribing(false);
    }
  };

  const skipTranscription = () => {
    setShowTranscriptionOptions(false);
    setTranscriptionText('');
    setFormData(prev => ({
      ...prev,
      summary_notes: `Nota vocale (${formatRecordingTime(recordingTime)})`,
      text_notes: '' // Assicurati che il testo sia vuoto se si salta la trascrizione
    }));
  };

  // Gestione Canvas per disegni
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.strokeStyle = drawingColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Gestione File Upload con Supabase Storage
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Limita dimensione file a 50MB (coerente con Multer)
      if (file.size > 50 * 1024 * 1024) {
        alert('Il file è troppo grande. Massimo 50MB.');
        return;
      }
      
      setFormData(prev => ({
          ...prev,
          file: file, 
          file_name: file.name,
          file_type: file.type || 'application/octet-stream',
          summary_notes: prev.summary_notes || `File allegato: ${file.name}`
      }));
      setSelectedFile(file); // Mantenuto per compatibilità con la UI
    }
  };

  // Salvataggio/Aggiornamento Nota
// ===============================================
// === FUNZIONE DI SALVATAGGIO NOTA (MIGLIORATA GESTIONE FILE E ERRORI) ===
// ===============================================
const handleSaveNote = async () => {
    if (!formData.title_notes.trim() || !noteType) {
      alert('Inserisci un nome progetto/titolo e seleziona un tipo di nota.');
      return;
    }
    
    // Controlli di stato
    if (noteType === 'video' && (isRecordingVideo || !formData.file)) {
      alert(isRecordingVideo ? 'Ferma prima la registrazione video.' : 'Registra un video o scegli un file.');
      return;
    }
    if (noteType === 'voice' && isRecording) {
      alert('Ferma prima la registrazione audio.');
      return;
    }
    // Richiedi un file solo per i tipi 'file' e 'video' se stiamo CREANDO
    if ((noteType === 'file' || noteType === 'video') && !formData.file && !isEditing) {
        alert('Seleziona un file o registra un video da allegare.');
        return;
    }

    try {
      setLoading(true);
      
      const dataToSend = new FormData();
      dataToSend.append('title_notes', formData.title_notes);
      dataToSend.append('description_notes', formData.description_notes);
      dataToSend.append('text_notes', formData.text_notes);
      dataToSend.append('summary_notes', formData.summary_notes);
      dataToSend.append('note_type', noteType);
      dataToSend.append('family_group', familyGroup);
      dataToSend.append('username', userData.username); 
      dataToSend.append('inserted_by_user', user.id); 

      // Logica specifica per i tipi con file/blob
      if (noteType === 'voice' && audioBlob) {
          dataToSend.append('audio_transcription', transcriptionText || '');
          // Nome file per il backend
          dataToSend.append('file', audioBlob, `audio_${Date.now()}.webm`); 
      } else if (noteType === 'drawing' && canvasRef.current) {
        // I disegni vengono inviati come file (Blob)
        const drawingDataUrl = canvasRef.current.toDataURL('image/png');
        const blob = await (await fetch(drawingDataUrl)).blob(); 
        dataToSend.append('file', blob, `drawing_${Date.now()}.png`);
        dataToSend.append('drawing_data_url', drawingDataUrl);
      } else if ((noteType === 'file' || noteType === 'video') && formData.file) {
        // Usa direttamente formData.file che contiene il Blob/File (video registrato o file scelto)
        dataToSend.append('file', formData.file, formData.file_name);
      }
      
      
      

      // Determina l'endpoint e il metodo
      const url = isEditing && editingNoteId 
          ? `api/notes/edit-note/${editingNoteId}`
          : 'api/notes/create-note';
          
      const method = isEditing && editingNoteId ? 'PUT' : 'POST';

      const response = await fetch(url, {
          method: method,
          body: dataToSend, 
          // Non impostare l'header 'Content-Type' per FormData, il browser lo fa
          // automaticamente e include il boundary
      });

      if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `Errore HTTP ${response.status} durante il salvataggio della nota.`;

          if (response.status === 431) {
              errorMessage = "Errore 431: La richiesta è troppo grande (forse troppi cookie o dati). Riprova dopo aver pulito i cookie o riduci la dimensione della nota/disegno.";
          } else {
              try {
                  const errorData = JSON.parse(errorText);
                  errorMessage = errorData.error || errorMessage;
              } catch (e) {
                  errorMessage = `Errore sconosciuto (Status ${response.status}). Risposta: ${errorText.substring(0, 100)}...`;
              }
          }
          
          throw new Error(errorMessage);
      }

      alert('Nota salvata con successo!');
      
      resetForm();
      await loadProjects(familyGroup);
      if (selectedProject) {
        await loadProjectNotes(selectedProject);
      }
      
    } catch (error) {
      console.error('Errore salvataggio nota:', error);
      alert('Errore nel salvataggio della nota: ' + error.message);
    } finally {
      setLoading(false);
    }
};

  // Eliminazione Nota
  const handleDeleteNote = async (noteId, note) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa nota?')) {
      return;
    }
    
    try {
      // Elimina file da storage se presenti (questa logica è stata mantenuta nel frontend)
      if (note.file_url || note.audio_url) {
        const url = note.file_url || note.audio_url;
        // Assumiamo che il percorso sia: bucket_url/note16_03/family_group/filename
        const path = url.split('/note16_03/')[1]; 
        if (path) {
          // Esegui la rimozione del file tramite il backend per maggiore sicurezza
        }
      }
      
      const { error } = await supabase
        .from('note_vocali_appunti')
        .delete()
        .eq('id', noteId);
      
      if (error) throw error;
      
      await loadProjects(familyGroup);
      if (selectedProject) {
        await loadProjectNotes(selectedProject);
      }
      setShowDetail(false);
      
    } catch (error) {
      console.error('Errore eliminazione nota:', error);
      alert('Errore nell\'eliminazione della nota');
    }
  };

  // Generazione PDF Riassuntivo tramite AI
const generateProjectPDF = async (projectName) => {
  if (!familyGroup) {
    alert('Errore: Gruppo famigliare non definito.');
    return;
  }

  setIsGeneratingPDF(true);
  
  try {
    // Chiamata al backend
    const response = await fetch(`${API_URL}api/notes/generate-pdf-summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectName: projectName,
        familyGroup: familyGroup 
      })
    });
    
    // 1. Gestione Errori HTTP
    if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = `Errore HTTP ${response.status} durante la generazione del PDF.`;
        
        if (response.status === 431) {
            errorMsg = "Errore 431: La richiesta è troppo grande (troppi dati nella richiesta).";
        } else {
            try {
                const errorData = JSON.parse(errorText);
                errorMsg = errorData.error || errorMsg;
            } catch (e) {
                errorMsg = `Errore sconosciuto (Status ${response.status}). Risposta: ${errorText.substring(0, 100)}...`;
            }
        }
        throw new Error(errorMsg);
    }

    // 2. Download del PDF (Risposta di successo)
    const blob = await response.blob();
    
    // 3. Creazione e click del link temporaneo per il download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}_Riepilogo_AI_${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(a);
    a.click();
    
    // 4. Pulizia
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url); 
    
    alert('✅ PDF generato e scaricato con successo!');
    
    // 5. Aggiorna la lista progetti
    await loadProjects(familyGroup); 

  } catch (error) {
    console.error('Errore nella generazione del PDF:', error);
    alert(`❌ Errore nella generazione del PDF: ${error.message}`);
  } finally {
    // 6. Blocco finally per resettare lo stato di caricamento
    setIsGeneratingPDF(false);
  }
};


  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <p>Caricamento in corso...</p>
        </div>
      </div>
    );
  }

  // Vista Progetti (Home)
  if (!selectedProject) {
    return (
      <div className="page-container">
        <header className="page-header">
          <div className="header-content">
            <button 
              className="btn-secondary btn-icon"
              onClick={() => navigate(-1)}
              title="Indietro"
            >
              ←
            </button>
            <h1 className="page-title">Progetti e Note</h1>
            <button 
              className="btn-secondary btn-icon"
              onClick={() => navigate('/main-menu')}
              title="Menu Principale"
            >
              ☰
            </button>
          </div>
        </header>

        <main className="page-main">
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Cerca progetto..."
              value={searchTerm}
              onChange={(e) => handleSearchProjects(e.target.value)}
            />
            <button 
              className="btn-primary"
              onClick={() => {
                setShowForm(true);
                resetForm(); // Aggiunto reset form
              }}
            >
              + Nuovo Progetto
            </button>
          </div>

          {showForm && (
            <div className="note-form-container">
              <h2 className="form-title">
                {isEditing ? 'Modifica Nota' : 'Crea Nuova Nota'}
              </h2>
              
              <div className="note-type-selector">
                <button
                  className={`type-btn ${noteType === 'text' ? 'active' : ''}`}
                  onClick={() => { setNoteType('text'); resetVideo(); }}
                >
                  ✏️ Testo
                </button>
                <button
                  className={`type-btn ${noteType === 'voice' ? 'active' : ''}`}
                  onClick={() => { setNoteType('voice'); resetVideo(); }}
                >
                  🎤 Vocale
                </button>
                <button
                  className={`type-btn ${noteType === 'drawing' ? 'active' : ''}`}
                  onClick={() => { setNoteType('drawing'); resetVideo(); }}
                >
                  🎨 Disegno
                </button>
                <button
                  className={`type-btn ${noteType === 'file' ? 'active' : ''}`}
                  onClick={() => { setNoteType('file'); resetVideo(); }}
                >
                  📁 File
                </button>

<button
  className={`type-btn ${noteType === 'video' ? 'active' : ''}`}
  onClick={() => { setNoteType('video'); resetForm(); }}
>
  📹 Video
</button>
              </div>

              <div className="form-group">
                <label>Nome Progetto *</label>
                <input
                  type="text"
                  name="title_notes"
                  value={formData.title_notes}
                  onChange={handleInputChange}
                  placeholder="Es: Progetto Casa, Lavoro 2025..."
                  required
                />
              </div>

              <div className="form-group">
                <label>Descrizione</label>
                <input
                  type="text"
                  name="description_notes"
                  value={formData.description_notes}
                  onChange={handleInputChange}
                  placeholder="Breve descrizione..."
                />
              </div>

              {noteType === 'text' && (
                <div className="form-group">
                  <label>Testo Nota</label>
                  <textarea
                    name="text_notes"
                    value={formData.text_notes}
                    onChange={handleInputChange}
                    rows="8"
                    placeholder="Scrivi qui il contenuto della nota..."
                  />
                </div>
              )}

              {noteType === 'voice' && (
                <div className="voice-recorder">
                  <div className="recorder-controls">
                    {!isRecording && !audioBlob && (
                      <button 
                        className="btn-primary"
                        onClick={startRecording}
                      >
                        🎤 Avvia Registrazione
                      </button>
                    )}
                    {isRecording && (
                      <>
                        <div className="recording-indicator">
                          <span className="recording-dot"></span>
                          Registrazione: {formatRecordingTime(recordingTime)}
                        </div>
                        <button 
                          className="btn-secondary"
                          onClick={stopRecording}
                        >
                          ⏹ Stop
                        </button>
                      </>
                    )}
                  </div>
                  
                  {audioBlob && showTranscriptionOptions && (
                    <div className="transcription-options">
                      <p className="transcription-question">
                        Vuoi trascrivere l'audio in testo?
                      </p>
                      <div className="transcription-buttons">
                        <button 
                          className="btn-primary"
                          onClick={transcribeAudio}
                          disabled={isTranscribing}
                        >
                          {isTranscribing ? '⏳ In ascolto...' : '📝 Sì, trascrivi'}
                        </button>
                        <button 
                          className="btn-secondary"
                          onClick={skipTranscription}
                        >
                          ❌ No, mantieni solo audio
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {audioBlob && !showTranscriptionOptions && (
                    <div className="audio-preview">
                      <p>✅ Audio registrato ({formatRecordingTime(recordingTime)})</p>
                      <audio controls src={URL.createObjectURL(audioBlob)} />
                      {transcriptionText && (
                        <div className="transcription-result">
                          <h4>Trascrizione:</h4>
                          <p>{transcriptionText}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {noteType === 'drawing' && (
                <div className="drawing-container">
                  <div className="drawing-controls">
                    <label>Colore:</label>
                    <input
                      type="color"
                      value={drawingColor}
                      onChange={(e) => setDrawingColor(e.target.value)}
                    />
                    <button 
                      className="btn-secondary"
                      onClick={clearCanvas}
                    >
                      🗑️ Pulisci
                    </button>
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={800}
                    height={400}
                    className="drawing-canvas"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                  />
                </div>
              )}

              {noteType === 'file' && (
                <div className="file-upload-container">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.xlsx,.xls,.mp4,.mov"
                  />
                  <button 
                    className="btn-primary"
                    onClick={() => fileInputRef.current.click()}
                  >
                    📁 Scegli File
                  </button>
                  {formData.file && (
                    <div className="file-selected">
                      <p>File selezionato: <strong>{formData.file.name}</strong></p>
                      <p className="file-size">
                        {(formData.file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  )}
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="upload-progress">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p>{uploadProgress}%</p>
                    </div>
                  )}
                </div>
              )}

// ===============================================
// === INTERFACCIA VIDEO ===
// ===============================================
{noteType === 'video' && (
    <div className="video-capture-section form-group">
        <h3 className="section-title">{isRecordingVideo ? 'Registrazione in corso...' : 'Registra un Video'}</h3>
        
        <div className="video-display-area">
            {isRecordingVideo && (
                <div className="video-live-preview">
                  <video ref={videoRef} autoPlay muted playsInline className="video-preview-stream" style={{ width: '100%', maxHeight: '300px' }} />
                  <div className="recording-indicator">🔴 REC</div>
                </div>
            )}

            {!isRecordingVideo && formData.file && formData.file_type.startsWith('video') && (
                <div className="video-recorded-preview">
                  <video ref={recordedVideoRef} controls className="video-preview-recorded" style={{ width: '100%', maxHeight: '300px' }} />
                </div>
            )}
            
            {!isRecordingVideo && !formData.file && isEditing && (
                 <p className="hint">Nessun nuovo video registrato. Verrà mantenuto il video precedente (se esiste).</p>
            )}
        </div>
        
        <div className="video-controls">
            {!isRecordingVideo && !(formData.file && formData.file_type.startsWith('video')) ? (
                <button type="button" onClick={startVideoRecording} className="btn-primary">
                    🔴 Avvia Registrazione
                </button>
            ) : isRecordingVideo ? (
                <button type="button" onClick={stopVideoRecording} className="btn-danger">
                    🛑 Ferma Registrazione
                </button>
            ) : (
                <button type="button" onClick={() => { resetVideo(); startVideoRecording(); }} className="btn-secondary">
                    🔄 Riprova Registrazione
                </button>
            )}
        </div>
        
        {(isRecordingVideo || (formData.file && formData.file_type.startsWith('video'))) && (
            <p className="hint">Il video verrà allegato alla nota al momento del salvataggio.</p>
        )}
    </div>
)}


              <div className="form-group">
                <label>Note aggiuntive</label>
                <textarea
                  name="summary_notes"
                  value={formData.summary_notes}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Aggiungi note o riepilogo..."
                />
              </div>

              <div className="form-actions">
                <button 
                  className="btn-secondary"
                  onClick={resetForm}
                >
                  Annulla
                </button>
                <button 
                  className="btn-primary"
                  onClick={handleSaveNote}
                >
                  💾 {isEditing ? 'Aggiorna' : 'Salva'} Nota
                </button>
              </div>
            </div>
          )}

          <div className="projects-list">
            <h2 className="section-title">I tuoi progetti ({projects.length})</h2>
            
            {projects.length === 0 ? (
              <p className="no-data">
                Nessun progetto trovato. Crea il tuo primo progetto!
              </p>
            ) : (
              <div className="projects-grid">
                {projects.map((project, index) => (
                  <div key={index} className="project-card">
                    <div 
                      className="project-card-main"
                      onClick={() => loadProjectNotes(project.name)}
                    >
                      <div className="project-icon">📁</div>
                      <div className="project-info">
                        <h3>{project.name}</h3>
                        <p className="project-count">
                          {project.count} {project.count === 1 ? 'nota' : 'note'}
                        </p>
                      </div>
                    </div>
                    
                    {project.pdf_url ? (
                      <button
                        className="btn-pdf"
                        onClick={() => window.open(project.pdf_url, '_blank')}
                        title="Apri PDF riassuntivo"
                      >
                        📄 PDF
                      </button>
                    ) : (
                      <button
                        className="btn-generate-pdf"
                        onClick={() => generateProjectPDF(project.name)}
                        disabled={isGeneratingPDF}
                        title="Genera PDF riassuntivo"
                      >
                        {isGeneratingPDF ? '⏳' : '📄+'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        <footer className="page-footer">
          <p>Family Group: {familyGroup}</p>
        </footer>
      </div>
    );
  }

  // Vista Note di un Progetto
  return (
    <div className="page-container">
      <header className="page-header">
        <div className="header-content">
          <button 
            className="btn-secondary btn-icon"
            onClick={() => {
              setSelectedProject(null);
              setProjectNotes([]);
              setFilteredNotes([]);
            }}
            title="Torna ai progetti"
          >
            ←
          </button>
          <h1 className="page-title">{selectedProject}</h1>
          <button 
            className="btn-secondary btn-icon"
            onClick={() => navigate('/main-menu')}
            title="Menu Principale"
          >
            ☰
          </button>
        </div>
      </header>

      <main className="page-main">
        <div className="project-actions-bar">
          <button 
            className="btn-primary"
            onClick={() => {
              setShowForm(true);
              // Quando si crea una nuova nota in un progetto, preimposta il titolo
              resetForm(); 
              setFormData(prev => ({ ...prev, title_notes: selectedProject }));
            }}
          >
            + Nuova Nota
          </button>
          
          <div className="filter-controls">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showOnlyMyNotes}
                onChange={(e) => setShowOnlyMyNotes(e.target.checked)}
              />
              <span>Solo le mie note</span>
            </label>
          </div>
          
          <button
            className="btn-secondary"
            onClick={() => generateProjectPDF(selectedProject)}
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? '⏳ Generazione...' : '📄 Genera PDF Riassunto'}
          </button>
        </div>

        {showForm && (
          <div className="note-form-container">
            <h2 className="form-title">
              {isEditing ? 'Modifica Nota' : 'Crea Nuova Nota'}
            </h2>
            
            <div className="note-type-selector">
              <button
                className={`type-btn ${noteType === 'text' ? 'active' : ''}`}
                onClick={() => { setNoteType('text'); resetVideo(); }}
              >
                ✏️ Testo
              </button>
              <button
                className={`type-btn ${noteType === 'voice' ? 'active' : ''}`}
                onClick={() => { setNoteType('voice'); resetVideo(); }}
              >
                🎤 Vocale
              </button>
              <button
                className={`type-btn ${noteType === 'drawing' ? 'active' : ''}`}
                onClick={() => { setNoteType('drawing'); resetVideo(); }}
              >
                🎨 Disegno
              </button>
              <button
                className={`type-btn ${noteType === 'file' ? 'active' : ''}`}
                onClick={() => { setNoteType('file'); resetVideo(); }}
              >
                📁 File
              </button>
<button
  className={`type-btn ${noteType === 'video' ? 'active' : ''}`}
  onClick={() => { setNoteType('video'); resetForm(); }}
>
  📹 Video
</button>
            </div>

            <div className="form-group">
              <label>Nome Progetto *</label>
              <input
                type="text"
                name="title_notes"
                value={formData.title_notes}
                onChange={handleInputChange}
                placeholder="Nome progetto..."
                required
                readOnly={selectedProject}
              />
            </div>

            <div className="form-group">
              <label>Descrizione</label>
              <input
                type="text"
                name="description_notes"
                value={formData.description_notes}
                onChange={handleInputChange}
                placeholder="Breve descrizione..."
              />
            </div>

            {noteType === 'text' && (
              <div className="form-group">
                <label>Testo Nota</label>
                <textarea
                  name="text_notes"
                  value={formData.text_notes}
                  onChange={handleInputChange}
                  rows="8"
                  placeholder="Scrivi qui il contenuto della nota..."
                />
              </div>
            )}

            {noteType === 'voice' && (
              <div className="voice-recorder">
                <div className="recorder-controls">
                  {!isRecording && !audioBlob && (
                    <button 
                      className="btn-primary"
                      onClick={startRecording}
                    >
                      🎤 Avvia Registrazione
                    </button>
                  )}
                  {isRecording && (
                    <>
                      <div className="recording-indicator">
                        <span className="recording-dot"></span>
                        Registrazione: {formatRecordingTime(recordingTime)}
                      </div>
                      <button 
                        className="btn-secondary"
                        onClick={stopRecording}
                      >
                        ⏹ Stop
                      </button>
                    </>
                  )}
                </div>
                
                {audioBlob && showTranscriptionOptions && (
                  <div className="transcription-options">
                    <p className="transcription-question">
                      Vuoi trascrivere l'audio in testo?
                    </p>
                    <div className="transcription-buttons">
                      <button 
                        className="btn-primary"
                        onClick={transcribeAudio}
                        disabled={isTranscribing}
                      >
                        {isTranscribing ? '⏳ In ascolto...' : '📝 Sì, trascrivi'}
                      </button>
                      <button 
                        className="btn-secondary"
                        onClick={skipTranscription}
                      >
                        ❌ No, mantieni solo audio
                      </button>
                    </div>
                  </div>
                )}
                
                {audioBlob && !showTranscriptionOptions && (
                  <div className="audio-preview">
                    <p>✅ Audio registrato ({formatRecordingTime(recordingTime)})</p>
                    <audio controls src={URL.createObjectURL(audioBlob)} />
                    {transcriptionText && (
                      <div className="transcription-result">
                        <h4>Trascrizione:</h4>
                        <p>{transcriptionText}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {noteType === 'drawing' && (
              <div className="drawing-container">
                <div className="drawing-controls">
                  <label>Colore:</label>
                  <input
                    type="color"
                    value={drawingColor}
                    onChange={(e) => setDrawingColor(e.target.value)}
                  />
                  <button 
                    className="btn-secondary"
                    onClick={clearCanvas}
                  >
                    🗑️ Pulisci
                  </button>
                </div>
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={400}
                  className="drawing-canvas"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              </div>
            )}

            {noteType === 'file' && (
              <div className="file-upload-container">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.xlsx,.xls"
                />
                <button 
                  className="btn-primary"
                  onClick={() => fileInputRef.current.click()}
                >
                  📁 Scegli File
                </button>
                {formData.file && (
                  <div className="file-selected">
                    <p>File selezionato: <strong>{formData.file.name}</strong></p>
                    <p className="file-size">
                      {(formData.file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                )}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="upload-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p>{uploadProgress}%</p>
                  </div>
                )}
              </div>
            )}
            
            {/* VISTO VIDEO IN MODO DETTAGLIATO */}
            {noteType === 'video' && (
                <div className="video-capture-section form-group">
                    <h3 className="section-title">{isRecordingVideo ? 'Registrazione in corso...' : 'Registra un Video'}</h3>
                    
                    <div className="video-display-area">
                        {isRecordingVideo && (
                            <div className="video-live-preview">
                              <video ref={videoRef} autoPlay muted playsInline className="video-preview-stream" style={{ width: '100%', maxHeight: '300px' }} />
                              <div className="recording-indicator">🔴 REC</div>
                            </div>
                        )}

                        {!isRecordingVideo && formData.file && formData.file_type.startsWith('video') && (
                            <div className="video-recorded-preview">
                              <video ref={recordedVideoRef} controls className="video-preview-recorded" style={{ width: '100%', maxHeight: '300px' }} />
                            </div>
                        )}
                         {!isRecordingVideo && !formData.file && isEditing && (
                             <p className="hint">Nessun nuovo video registrato. Verrà mantenuto il video precedente (se esiste).</p>
                        )}
                    </div>
                    
                    <div className="video-controls">
                        {!isRecordingVideo && !(formData.file && formData.file_type.startsWith('video')) ? (
                            <button type="button" onClick={startVideoRecording} className="btn-primary">
                                🔴 Avvia Registrazione
                            </button>
                        ) : isRecordingVideo ? (
                            <button type="button" onClick={stopVideoRecording} className="btn-danger">
                                🛑 Ferma Registrazione
                            </button>
                        ) : (
                            <button type="button" onClick={() => { resetVideo(); startVideoRecording(); }} className="btn-secondary">
                                🔄 Riprova Registrazione
                            </button>
                        )}
                    </div>
                    
                    {(isRecordingVideo || (formData.file && formData.file_type.startsWith('video'))) && (
                        <p className="hint">Il video verrà allegato alla nota al momento del salvataggio.</p>
                    )}
                </div>
            )}


            <div className="form-group">
              <label>Note aggiuntive</label>
              <textarea
                name="summary_notes"
                value={formData.summary_notes}
                onChange={handleInputChange}
                rows="3"
                placeholder="Aggiungi note o riepilogo..."
              />
            </div>

            <div className="form-actions">
              <button 
                className="btn-secondary"
                onClick={resetForm}
              >
                Annulla
              </button>
              <button 
                className="btn-primary"
                onClick={handleSaveNote}
              >
                💾 {isEditing ? 'Aggiorna' : 'Salva'} Nota
              </button>
            </div>
          </div>
        )}

        <div className="notes-list">
          <h2 className="section-title">
            Note del progetto ({filteredNotes.length})
          </h2>
          
          {filteredNotes.length === 0 ? (
            <p className="no-data">
              {showOnlyMyNotes 
                ? 'Non hai ancora note in questo progetto.' 
                : 'Nessuna nota trovata. Crea la prima nota!'}
            </p>
          ) : (
            <div className="notes-grid">
              {filteredNotes.map(note => (
                <div 
                  key={note.id} 
                  className="note-card"
                >
                  <div 
                    className="note-card-clickable"
                    onClick={() => {
                      setSelectedNote(note);
                      setShowDetail(true);
                    }}
                  >
                    <div className="note-card-header">
                      <span className="note-type-badge">
                        {note.note_type === 'text' && '✏️'}
                        {note.note_type === 'voice' && '🎤'}
                        {note.note_type === 'drawing' && '🎨'}
                        {note.note_type === 'file' && '📁'}
                        {note.note_type === 'video' && '📹'} 
                      </span>
                      <h3>{note.description_notes || 'Senza titolo'}</h3>
                    </div>
                    
                    {note.text_notes && (
                      <p className="note-preview">
                        {note.text_notes.substring(0, 100)}
                        {note.text_notes.length > 100 && '...'}
                      </p>
                    )}
                    
                    {note.audio_transcription && (
                      <p className="note-preview">
                        🎤 {note.audio_transcription.substring(0, 100)}
                        {note.audio_transcription.length > 100 && '...'}
                      </p>
                    )}
                    
                    <div className="note-card-footer">
                      <span className="note-author">{note.username}</span>
                      <span className="note-date">
                        {formatDate(note.inserted_at)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="note-card-actions">
                    <button
                      className="btn-icon btn-edit"
                      onClick={() => handleEditNote(note)}
                      title="Modifica"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-icon btn-delete"
                      onClick={() => handleDeleteNote(note.id, note)}
                      title="Elimina"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showDetail && selectedNote && (
          <div className="modal-overlay" onClick={() => setShowDetail(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{selectedNote.description_notes || 'Nota senza titolo'}</h2>
                <button 
                  className="btn-icon"
                  onClick={() => setShowDetail(false)}
                >
                  ✕
                </button>
              </div>
              
              <div className="modal-body">
                <div className="detail-info">
                  <p><strong>Tipo:</strong> {selectedNote.note_type}</p>
                  <p><strong>Progetto:</strong> {selectedNote.title_notes}</p>
                  <p><strong>Autore:</strong> {selectedNote.username}</p>
                  <p><strong>Data:</strong> {formatDate(selectedNote.inserted_at)}</p>
                  {selectedNote.last_modified_at && (
                    <p><strong>Ultima modifica:</strong> {formatDate(selectedNote.last_modified_at)}</p>
                  )}
                </div>
                
                {selectedNote.text_notes && (
                  <div className="detail-section">
                    <h3>Contenuto</h3>
                    <p className="note-text-content">{selectedNote.text_notes}</p>
                  </div>
                )}
                
                {selectedNote.audio_url && (
                  <div className="detail-section">
                    <h3>Audio</h3>
                    <audio controls src={selectedNote.audio_url} className="audio-player-full" />
                  </div>
                )}
                
                {selectedNote.audio_transcription && (
                  <div className="detail-section">
                    <h3>Trascrizione Audio</h3>
                    <p className="note-text-content">{selectedNote.audio_transcription}</p>
                  </div>
                )}
                {(selectedNote.drawing_data_url || selectedNote.drawing_data) && (
  <div className="detail-section">
    <h3>Disegno</h3>
    <img
      src={selectedNote.drawing_data_url || selectedNote.drawing_data}
      alt="Disegno"
      className="drawing-preview"
    />
  </div>
)}

                
                {selectedNote.note_type === 'video' && selectedNote.file_url && (
                    <div className="detail-section">
                        <h3>Video Allegato</h3>
                        <video controls src={selectedNote.file_url} className="video-player-full" style={{ maxWidth: '100%' }} />
                    </div>
                )}
                
                {(selectedNote.file_url && selectedNote.note_type === 'file') && (
                  <div className="detail-section">
                    <h3>File Allegato</h3>
                    <p><strong>{selectedNote.file_name}</strong></p>
                    <a 
                      href={selectedNote.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn-primary"
                    >
                      📥 Scarica File
                    </a>
                  </div>
                )}
                
                {selectedNote.summary_notes && (
                  <div className="detail-section">
                    <h3>Note aggiuntive</h3>
                    <p>{selectedNote.summary_notes}</p>
                  </div>
                )}
              </div>
              
              <div className="modal-footer">
                <button 
                  className="btn-secondary"
                  onClick={() => setShowDetail(false)}
                >
                  Chiudi
                </button>
                <button 
                  className="btn-primary"
                  onClick={() => handleEditNote(selectedNote)}
                >
                  ✏️ Modifica
                </button>
                <button 
                  className="btn-danger"
                  onClick={() => handleDeleteNote(selectedNote.id, selectedNote)}
                >
                  🗑️ Elimina
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="page-footer">
        <p>Family Group: {familyGroup} | Progetto: {selectedProject}</p>
      </footer>
    </div>
  );
}; // <-- Questa è l'unica parentesi graffa di chiusura per il componente!

export default Pagina16_03NoteScritteDettate;