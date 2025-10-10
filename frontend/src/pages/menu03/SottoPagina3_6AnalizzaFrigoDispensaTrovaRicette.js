import React, { useState } from 'react';
// AGGIUNTE: Film e Zap per le icone di Immagini/Video
import { Camera, Upload, ChefHat, Loader, X, ArrowLeft, Plus, Trash2, Search, Zap, Film } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../../styles/StileSottoPagina3_6.css';

const SottoPagina3_6AnalizzaFrigoDispensaTrovaRicette = () => {
    const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [loading, setLoading] = useState(false);
    const [recipes, setRecipes] = useState([]);
    const [foundIngredients, setFoundIngredients] = useState([]);
    const [manualIngredients, setManualIngredients] = useState([]);
    const [inputIngredient, setInputIngredient] = useState('');
    const [error, setError] = useState('');
    
    // STATI AGGIUNTI/MODIFICATI per i media
    const [currentStep, setCurrentStep] = useState('upload'); 
    const [recipePrompt, setRecipePrompt] = useState(''); 
    const [selectedRecipeIndex, setSelectedRecipeIndex] = useState(null); 
    const [generatedImages, setGeneratedImages] = useState([]); // Array di oggetti { stepText, dataUrl }
    const [videoUrl, setVideoUrl] = useState(null); // URL del video o audio (non più usato)
    const [isAudioOnly, setIsAudioOnly] = useState(false); // Flag logico (usato per condizionare il player)
    const [narrationText, setNarrationText] = useState(null); // STATO per lo script narrato
    
    const navigate = useNavigate();

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            setImages((prevImages) => [...prevImages, ...files]);
            setImagePreviews((prevPreviews) => [
                ...prevPreviews,
                ...files.map((file) => URL.createObjectURL(file)),
            ]);
            setRecipes([]);
            setFoundIngredients([]);
            setManualIngredients([]); 
            setError("");
            setCurrentStep('upload'); 
        }
    };

    const handleAddIngredient = () => {
        if (inputIngredient.trim() === '') return;
        
        const newIngredients = inputIngredient.split(',')
            .map(i => i.trim())
            .filter(i => i !== '' && !manualIngredients.includes(i) && !foundIngredients.includes(i));
        
        if (newIngredients.length > 0) {
            setManualIngredients([...manualIngredients, ...newIngredients]);
            setFoundIngredients(Array.from(new Set([...foundIngredients, ...newIngredients])));
        }
        setInputIngredient('');
    };

    const handleRemoveIngredient = (name) => {
        setManualIngredients(manualIngredients.filter((i) => i !== name));
        setFoundIngredients(foundIngredients.filter((i) => i !== name)); 
    };

    const handleAnalyzeIngredients = async () => {
        if (images.length === 0) {
            setError("Per favore, carica almeno una foto del tuo frigo.");
            return;
        }

        setLoading(true);
        setError("");
        setRecipes([]); 
        
        const formData = new FormData();
        images.forEach((image) => {
            formData.append(`fridgeImages`, image);
        });

        try {
            const response = await fetch('/api/food/ricette-da-foto', { 
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Errore durante l'analisi.");

            setFoundIngredients(data.ingredients || []); 
            setManualIngredients([]); 
            setCurrentStep('ingredients_found'); 
            
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFindRecipes = async () => {
        if (foundIngredients.length === 0) {
            setError("Nessun ingrediente disponibile per la ricerca.");
            return;
        }
        if (recipePrompt.trim() === '') {
             setError("Per favore, specifica che tipo di pasto desideri (es. pranzo freddo e veloce).");
             return;
        }

        setLoading(true);
        setError("");
        setRecipes([]);
        setCurrentStep('recipes_requested');
        
        const allIngredients = Array.from(new Set([...foundIngredients, ...manualIngredients]));
        
        const payload = {
            ingredients: allIngredients,
            preferences: recipePrompt 
        };

        try {
            const response = await fetch('/api/food/ricette-da-foto', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Errore durante la ricerca ricette.");

            setRecipes(data.recipes || []);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    // Funzione 1: Genera Immagini (mediaType: 'images')
    const handleGenerateImages = async (recipe, index) => {
        setLoading(true);
        setError('');
        setGeneratedImages([]); 
        setVideoUrl(null); 
        setNarrationText(null); // Reset
        setSelectedRecipeIndex(index);
        
        try {
            const response = await fetch('/api/food/ricette-da-foto/generate-media', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipe: recipe,
                    mediaType: 'images' 
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Errore durante la generazione delle immagini.");

            setGeneratedImages(data.images || []);
            
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    // Funzione 2A: Montaggio Foto + Audio (mediaType: 'video_photo_montage')
    const handleGenerateVideoMontage = async () => {
        if (generatedImages.length === 0) {
            setError("Devi prima generare le immagini (Step 1) per creare il montaggio.");
            return;
        }
        
        setLoading(true);
        setError('');
        setVideoUrl(null);
        setNarrationText(null); // Reset
        setIsAudioOnly(false); 

        const imagePayload = generatedImages.map(img => img.dataUrl);

        try {
            const response = await fetch('/api/food/ricette-da-foto/generate-media', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipe: recipes[selectedRecipeIndex], 
                    mediaType: 'video_photo_montage', 
                    existingImages: imagePayload 
                }),
            });
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Errore durante il montaggio video/audio.");
            
            setNarrationText(data.narrationText); 
            setVideoUrl(null); 
            setIsAudioOnly(data.isAudioOnly || true); // Default a true per mostrare il box
            
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    // Funzione 2B: Video dal Testo (Solo Testo Narrato) (mediaType: 'video_text_only')
    const handleGenerateVideoFromText = async () => {
        setLoading(true);
        setError('');
        setVideoUrl(null);
        setNarrationText(null); // Reset cruciale
        setIsAudioOnly(false); 
        
        try {
            const response = await fetch('/api/food/ricette-da-foto/generate-media', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipe: recipes[selectedRecipeIndex], 
                    mediaType: 'video_text_only' 
                }),
            });
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Errore durante la generazione della narrazione.");
            
            setNarrationText(data.narrationText); // Imposta il testo narrato
            setVideoUrl(null); 
            setIsAudioOnly(data.isAudioOnly || true); // Default a true per mostrare il box

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false); // Disattiva il loading
        }
    };


    const clearImage = () => {
        setImages([]);
        setImagePreviews([]);
        setRecipes([]);
        setFoundIngredients([]);
        setManualIngredients([]);
        setError('');
        setRecipePrompt('');
        setCurrentStep('upload');
        setSelectedRecipeIndex(null);
        setGeneratedImages([]);
        setVideoUrl(null);
        setIsAudioOnly(false);
        setNarrationText(null); // Reset
    };
    


    return (
        <div className="fridge-recipe-container">
            <button onClick={() => navigate(-1)} className="back-button-fridge">
                <ArrowLeft size={20} /> Torna Indietro
            </button>

            <header className="fridge-recipe-header">
                <ChefHat size={32} />
                <h1>Ricette dal Frigo e dalla Dispensa</h1>
            </header>
            <p className="intro-text">
                Non sai cosa cucinare? Carica una foto in Step 1 e procedi!
            </p>

            {/* STEP 1: CARICAMENTO IMMAGINI */}
            <div className="upload-section">
                <div className="upload-box" onClick={() => document.querySelector(".file-input").click()}>
                    <Camera size={48} className="upload-icon" />
                    <p>Scatta o carica foto (Max 10)</p>
                    <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        onChange={handleImageChange} 
                        className="file-input"
                        multiple
                    />
                    <button className="upload-btn">
                        <Upload size={20} /> Carica Foto
                    </button>
                </div>

                {imagePreviews.length > 0 && (
                    <div className="preview-container">
                        {imagePreviews.map((preview, index) => (
                            <img key={index} src={preview} alt={`Anteprima frigo ${index + 1}`} className="fridge-preview" />
                        ))}
                        <button onClick={clearImage} className="remove-image-btn">
                            <X size={20} /> Rimuovi Tutto
                        </button>
                    </div>
                )}
            </div>
            
            {/* PULSANTE: TROVA INGREDIENTI */}
            {imagePreviews.length > 0 && currentStep === 'upload' && (
                <div className="action-section">
                    <button onClick={handleAnalyzeIngredients} disabled={loading} className="find-recipes-btn">
                        {loading ? <Loader className="spinner" /> : <Search size={20} />}
                        {loading ? 'Alfred sta analizzando...' : 'Trova Ingredienti Presenti'}
                    </button>
                </div>
            )}
            
            {error && <div className="error-message error-box">{error}</div>}

            {/* STEP 2: INGREDIENTI TROVATI + AGGIUNTA MANUALE + RICHIESTA PASTO */}
            {currentStep === 'ingredients_found' && (
                <>
                    <div className="found-ingredients-section">
                        <h2>Ingredienti Trovati e Aggiornati:</h2>
                        <p className="intro-text">Questa è la lista completa. Rimuovi i non necessari o aggiungine altri qui sotto.</p>
                        <ul className="ingredients-list">
                            {Array.from(new Set([...foundIngredients, ...manualIngredients])).map((ingredient, index) => (
                                <li key={index} className={manualIngredients.includes(ingredient) ? 'manual-added' : 'available'}>
                                    {ingredient}
                                    {manualIngredients.includes(ingredient) && (
                                        <button onClick={() => handleRemoveIngredient(ingredient)} className="manual-remove-btn">
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="manual-ingredients-section">
                        <h2>Aggiungi ingredienti mancanti</h2>
                        <div className="manual-input-container">
                            <input
                                type="text"
                                placeholder="Separa i nomi con una virgola (es. tonno, pasta, basilico...)"
                                value={inputIngredient}
                                onChange={(e) => setInputIngredient(e.target.value)}
                                className="manual-input"
                            />
                            <button onClick={handleAddIngredient} className="manual-add-btn">
                                <Plus size={18} /> Aggiorna Lista Ingredienti
                            </button>
                        </div>
                    </div>
                    
                    {/* NUOVO STEP 3: RICHIESTA CONVERSAZIONALE DEL PASTO */}
                    <div className="recipe-request-step">
                        <h2 className='chef-prompt'>Dimmi che tipo di pasto vuoi?</h2>
                        <p className="intro-text">
                            Alfred ti ascolta! Specifica le tue preferenze (es. "per pranzo ho voglia qualcosa di freddo e veloce").
                        </p>
                        <textarea
                            className="preference-input"
                            placeholder="Es. Voglio un pasto per cena, che sia caldo e magari vegetariano."
                            value={recipePrompt}
                            onChange={(e) => setRecipePrompt(e.target.value)}
                            rows="3"
                        ></textarea>
                        
                        <button 
                            onClick={handleFindRecipes} 
                            disabled={loading} 
                            className="find-recipes-btn" 
                            style={{ marginTop: '20px' }}
                        >
                            {loading ? <Loader className="spinner" /> : <ChefHat size={20} />}
                            {loading ? 'Alfred sta cucinando...' : 'Trova Ricette'}
                        </button>
                    </div>
                </>
            )}
            
            {/* STEP 4: SEZIONE RICETTE (Visualizzazione Avanzata) */}
            <div className="recipes-results">
                {loading && currentStep === 'recipes_requested' && <p className="loading-text">Alfred sta cercando le migliori ricette per te...</p>}
                {recipes.length > 0 && <h2>Ecco cosa puoi preparare:</h2>}
                {recipes.map((recipe, index) => (
                    <div 
                        key={index} 
                        className={`recipe-card ${selectedRecipeIndex === index ? 'selected' : ''}`}
                        onClick={() => {
                            if (selectedRecipeIndex !== index) {
                                setSelectedRecipeIndex(index);
                                setGeneratedImages([]);
                                setVideoUrl(null);
                                setIsAudioOnly(false);
                                setNarrationText(null); // Reset
                            }
                        }}
                    >
                        <h3>{recipe.titolo}</h3>
                        
                        {/* Sezione Azioni e Dettaglio (mostrata solo se la ricetta è selezionata) */}
                        {selectedRecipeIndex === index && (
                            <div className="recipe-detail-section">
                                <div className="recipe-actions">
                                    
                                    {/* PULSANTE 1: Generazione Immagini (Base) */}
                                    <button 
                                        onClick={() => handleGenerateImages(recipe, index)} 
                                        disabled={loading}
                                        className="action-btn generate-images-btn"
                                    >
                                        {loading && !narrationText ? <Loader className="spinner" /> : <Zap size={18} />}
                                        {loading && !narrationText ? 'Generazione Immagini...' : '1. Genera Immagini Step (AI)'}
                                    </button>
                                    
                                    {/* PULSANTE 2A: Montaggio Foto + Testo Narrato (Richiede le immagini generate) */}
                                    {generatedImages.length > 0 && (
                                        <button 
                                            onClick={handleGenerateVideoMontage} 
                                            disabled={loading}
                                            className="action-btn generate-video-btn"
                                        >
                                            {loading && !narrationText ? <Loader className="spinner" /> : <Film size={18} />}
                                            {loading && !narrationText ? 'Creazione Montaggio...' : '2A. Crea Video (Foto + Script)'}
                                        </button>
                                    )}

                                    {/* PULSANTE 2B: Video dal Testo (Solo Testo Narrato) */}
                                    <button 
                                        onClick={handleGenerateVideoFromText} 
                                        disabled={loading}
                                        className="action-btn generate-video-btn"
                                    >
                                        {loading && !narrationText ? <Loader className="spinner" /> : <Film size={18} />}
                                        {loading && !narrationText ? 'Generazione Script...' : '2B. Crea Script Ricetta (Testo)'}
                                    </button>
                                    
                                </div>
                                
                                {/* PLAYER: Mostra il testo narrato e l'immagine di placeholder */}
                                {(narrationText && isAudioOnly) && (
                                    <div className="video-preview-container">
                                        <h4>Risultato: Script Narrato (Generato da OpenAI)</h4>
                                        <p className="audio-note">
                                            L'AI ha generato lo script per il tuo video a **costo zero**. Puoi leggerlo o usarlo per registrare la tua voce fuori campo.
                                        </p>
                                        
                                        <div className="narration-script-box">
                                            <pre>{narrationText}</pre>
                                        </div>
                                        
                                        {/* Immagine di Placeholder */}
                                        <div className="audio-placeholder-image" style={{ 
                                            // Usa la prima immagine generata o un placeholder fisso
                                            backgroundImage: `url(${generatedImages.length > 0 ? generatedImages[0].dataUrl : 'path/to/default/image.jpg'})`,
                                            height: '200px', 
                                            width: '100%', 
                                            backgroundSize: 'cover', 
                                            backgroundPosition: 'center', 
                                            marginTop: '10px',
                                            border: '2px solid #333',
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            borderRadius: '8px',
                                        }}>
                                            <span style={{ color: 'white', textShadow: '2px 2px 4px #000', padding: '5px', fontWeight: 'bold', textAlign: 'center' }}>
                                                {generatedImages.length > 0 ? 'MONTAGGIO FOTO + SCRIPT' : 'VIDEO SEMPLICE + SCRIPT'}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Sezione Immagini Step per Step (Generato da Opzione 1) */}
                                {generatedImages.length > 0 && (
                                    <div className="images-step-container">
                                        <h4>Immagini Step per Step:</h4>
                                        {generatedImages.map((img, i) => (
                                            <div key={i} className="step-image-item">
                                                <p className="step-text">**Step {i + 1}:** {img.stepText}</p>
                                                <img src={img.dataUrl} alt={`Step ${i + 1}`} className="step-preview-image" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                <div className="recipe-content compact-layout"> 
                                    <div className="ingredients-section">
                                        <h4>Ingredienti:</h4>
                                        <ul>
                                            {recipe.ingredienti.map((ing, i) => (
                                                <li key={i} className={ing.mancante ? 'missing' : 'available'}>
                                                    {ing.nome} ({ing.quantita})
                                                    {ing.mancante && <span> (Mancante)</span>}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="instructions-section">
                                        <h4>Istruzioni:</h4>
                                        <ol>
                                            {recipe.istruzioni.map((step, i) => (
                                                <li key={i}>{step}</li>
                                            ))}
                                        </ol>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                    </div>
                ))}
            </div>
            
        </div>
    );
};

export default SottoPagina3_6AnalizzaFrigoDispensaTrovaRicette;