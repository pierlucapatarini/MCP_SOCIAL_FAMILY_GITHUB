import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';
import '../../styles/MainStyle.css';
import SottoPagina4_AnalisiModal from '../SottoPagina4_AnalisiModal';

// --- COMPONENTI ---

const Modal = ({ type, data, categories, onClose, onSave }) => {
    const [formData, setFormData] = useState(data || {});

    useEffect(() => {
        setFormData(data || {});
    }, [data]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSave = () => {
        if (type === 'categoria' && formData.name !== data.name && !window.confirm("Attenzione: cambiare il nome di una categoria modificherà tutti i prodotti collegati. Procedere?")) {
            return;
        }
        onSave(formData);
    };

    if (!data) return null;

    const renderProductFields = () => (
        <>
            <div className="form-group"><label>Articolo: <span className="obbligatorio">(Obbligatorio)</span></label><input name="articolo" value={formData.articolo || ''} onChange={handleChange} className="form-input" /></div>
            <div className="form-group"><label>Descrizione:</label><input name="descrizione_articolo" value={formData.descrizione_articolo || ''} onChange={handleChange} className="form-input" /></div>
            <div className="form-group"><label>Categoria: <span className="obbligatorio">(Obbligatorio)</span></label><select name="categoria_id" value={formData.categoria_id || ''} onChange={handleChange} className="form-input"><option value="">Seleziona</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div className="form-group"><label>Unità Misura:</label><input name="unita_misura" value={formData.unita_misura || ''} onChange={handleChange} placeholder="kg, l, pz" className="form-input" /></div>
            <div className="form-group checkbox-group"><input type="checkbox" name="preferito" checked={formData.preferito || false} onChange={handleChange} id="modal-preferito" /><label htmlFor="modal-preferito">Preferito</label></div>
            <h4>Prezzi Supermercati (€)</h4>
            {['esselunga', 'mercato', 'carrefour', 'penny', 'coop'].map(market => (
                <div className="input-with-label" key={market}><label>{market.charAt(0).toUpperCase() + market.slice(1)}:</label><input type="number" name={`prezzo_${market}`} value={formData[`prezzo_${market}`] || ''} onChange={handleChange} placeholder="0.00" className="form-input" /></div>
            ))}
        </>
    );

    const renderCategoryFields = () => (
        <>
            <div className="form-group"><label>Nome Categoria: <span className="obbligatorio">(Obbligatorio)</span></label><input name="name" value={formData.name || ''} onChange={handleChange} className="form-input" /></div>
            <h4>Corsie Supermercati</h4>
            {['esselunga', 'mercato', 'carrefour', 'penny', 'coop'].map(market => (
                <div className="input-with-label" key={market}><label>{market.charAt(0).toUpperCase() + market.slice(1)}:</label><input name={`corsia_${market}`} value={formData[`corsia_${market}`] || ''} onChange={handleChange} placeholder="Corsia" className="small-input form-input" /></div>
            ))}
        </>
    );

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3>✏️ Modifica {type === 'prodotto' ? 'Prodotto' : 'Categoria'}</h3>
                {type === 'prodotto' ? renderProductFields() : renderCategoryFields()}
                <div className="modal-actions">
                    <button className="btn-primary" onClick={handleSave}>Salva</button>
                    <button className="btn-secondary" onClick={onClose}>Annulla</button>
                </div>
            </div>
        </div>
    );
};

const AddForm = ({ type, formData, setFormData, categories, onSubmit }) => {
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    return (
        <div className="info-box add-form">
            <h3>➕ Aggiungi {type === 'prodotto' ? 'un nuovo prodotto' : 'una nuova categoria'}</h3>
            {type === 'prodotto' ? (
                <>
                    <div className="form-grid">
                        <div className="form-group"><label>Articolo: <span className="obbligatorio">(Obbligatorio)</span></label><input value={formData.articolo} name="articolo" onChange={handleChange} className="form-input" /></div>
                        <div className="form-group"><label>Descrizione:</label><input value={formData.descrizione_articolo} name="descrizione_articolo" onChange={handleChange} className="form-input" /></div>
                        <div className="form-group"><label>Categoria: <span className="obbligatorio">(Obbligatorio)</span></label><select value={formData.categoria_id} name="categoria_id" onChange={handleChange} className="form-input"><option value="">Seleziona</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                        <div className="form-group"><label>Unità Misura:</label><input value={formData.unita_misura} name="unita_misura" onChange={handleChange} placeholder="kg, l, pz" className="form-input" /></div>
                        <div className="form-group checkbox-group"><input type="checkbox" checked={formData.preferito} name="preferito" onChange={handleChange} id="preferito" /><label htmlFor="preferito">Preferito</label></div>
                    </div>
                    <h4>Prezzi Supermercati (€)</h4>
                    {['esselunga', 'mercato', 'carrefour', 'penny', 'coop'].map(market => (
                         <div className="input-with-label" key={market}><label>{market.charAt(0).toUpperCase() + market.slice(1)}:</label><input type="number" value={formData[`prezzo_${market}`]} name={`prezzo_${market}`} onChange={handleChange} placeholder="0.00" className="form-input" /></div>
                    ))}
                </>
            ) : (
                <>
                    <div className="form-group"><label>Nome: <span className="obbligatorio">(Obbligatorio)</span></label><input value={formData.name} name="name" onChange={handleChange} className="form-input" /></div>
                    <h4>Corsie Supermercati</h4>
                     {['esselunga', 'mercato', 'carrefour', 'penny', 'coop'].map(market => (
                         <div className="input-with-label" key={market}><label>{market.charAt(0).toUpperCase() + market.slice(1)}:</label><input value={formData[`corsia_${market}`]} name={`corsia_${market}`} onChange={handleChange} placeholder="Corsia" className="small-input form-input" /></div>
                    ))}
                </>
            )}
            <button className="btn-add form-submit-btn" onClick={onSubmit}>➕ Aggiungi</button>
        </div>
    );
};

// --- PAGINA PRINCIPALE ---

export default function ExportPagina01_02ArchivioProdotti() {
    const navigate = useNavigate();
    const [sezioneAttiva, setSezioneAttiva] = useState('prodotti');
    const [loading, setLoading] = useState(true);
    const [familyGroup, setFamilyGroup] = useState(null);
    const [prodotti, setProdotti] = useState([]);
    const [categorie, setCategorie] = useState([]);
    const [query, setQuery] = useState('');
    const [prodottiPerCategoria, setProdottiPerCategoria] = useState([]);
    
    const [modal, setModal] = useState({ visible: false, type: null, data: null });
    const [showAnalisiModal, setShowAnalisiModal] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    
    const initialProdForm = { articolo: '', descrizione_articolo: '', categoria_id: '', preferito: false, unita_misura: '' };
    const initialCatForm = { name: '' };
    const [formData, setFormData] = useState(initialProdForm);

    const fetchAndSetData = useCallback(async (fg) => {
        const [prodRes, catRes] = await Promise.all([
            supabase.from('prodotti').select('*, categorie(name)').eq('family_group', fg).order('articolo'),
            supabase.from('categorie').select('*').eq('family_group', fg).order('name')
        ]);
        setProdotti(prodRes.data || []);
        setCategorie(catRes.data || []);
    }, []);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data: profile } = await supabase.from('profiles').select('family_group').eq('id', session.user.id).single();
            const fg = profile?.family_group || crypto.randomUUID();
            if (!profile?.family_group) {
                await supabase.from('profiles').update({ family_group: fg }).eq('id', session.user.id);
            }
            setFamilyGroup(fg);
            await fetchAndSetData(fg);
            setLoading(false);
        };
        init();
    }, [fetchAndSetData]);

    const handleApiRequest = async (action, table, payload) => {
        let response;
        try {
            switch (action) {
                case 'insert':
                    response = await supabase.from(table).insert({ ...payload, family_group: familyGroup });
                    break;
                case 'update':
                    response = await supabase.from(table).update(payload).eq('id', modal.data.id);
                    break;
                case 'delete':
                    if (table === 'categorie') {
                        const { data: prods } = await supabase.from('prodotti').select('id').eq('categoria_id', payload.id);
                        if (prods.length > 0) return alert(`Impossibile cancellare: ${prods.length} prodotti associati.`);
                    }
                    response = await supabase.from(table).delete().eq('id', payload.id);
                    break;
                default: return;
            }
            if (response.error) throw response.error;
            await fetchAndSetData(familyGroup);
            return true;
        } catch (error) {
            alert(`Errore: ${error.message}`);
            return false;
        }
    };

    const handleAdd = async () => {
        const table = sezioneAttiva === 'prodotti' ? 'prodotti' : 'categorie';
        const requiredField = sezioneAttiva === 'prodotti' ? 'articolo' : 'name';
        if (!formData[requiredField]) return alert('Il campo nome è obbligatorio.');
        
        if (await handleApiRequest('insert', table, formData)) {
            setShowAddForm(false);
            setFormData(sezioneAttiva === 'prodotti' ? initialProdForm : initialCatForm);
        }
    };

    const handleSave = async (updatedData) => {
        const table = modal.type === 'prodotto' ? 'prodotti' : 'categorie';
        if (await handleApiRequest('update', table, updatedData)) {
            setModal({ visible: false, type: null, data: null });
        }
    };

    const handleDelete = (type, id) => handleApiRequest('delete', type, { id });

    const switchSezione = (sezione) => {
        setSezioneAttiva(sezione);
        setQuery('');
        setShowAddForm(false);
        setProdottiPerCategoria([]);
        setFormData(sezione === 'prodotti' ? initialProdForm : initialCatForm);
    };

    const filteredProdotti = prodotti.filter(p => p.articolo.toLowerCase().includes(query.toLowerCase()) || p.categorie?.name.toLowerCase().includes(query.toLowerCase()));
    const filteredCategorie = categorie.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));

    if (loading) return <div className="loading">Caricamento...</div>;

    return (
        <div className="app-layout">
            <header className="header">
                <button className="btn-secondary" onClick={() => navigate('/main-menu')}>← Menu</button>
                <h1>📦 Archivio Prodotti</h1>
                <p>Gestisci i tuoi articoli e le loro categorie.</p>
            </header>

            <div className="tab-buttons">
                <button className={`tab-button ${sezioneAttiva === 'prodotti' ? 'active' : ''}`} onClick={() => switchSezione('prodotti')}>🛒 Prodotti</button>
                <button className={`tab-button ${sezioneAttiva === 'categorie' ? 'active' : ''}`} onClick={() => switchSezione('categorie')}>🗂️ Categorie</button>
                <button className="btn-primary" onClick={() => setShowAnalisiModal(true)}>📈 Analisi Acquisti</button>
            </div>

            <main className="main-content">
                <section className="section">
                    <div className="input-group">
                        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`🔍 Cerca ${sezioneAttiva}...`} className="search-input" />
                        <button className="btn-add" onClick={() => setShowAddForm(s => !s)}>{showAddForm ? 'Annulla' : '➕ Aggiungi'}</button>
                    </div>

                    {showAddForm && <AddForm type={sezioneAttiva} formData={formData} setFormData={setFormData} categories={categorie} onSubmit={handleAdd} />}

                    {sezioneAttiva === 'prodotti' && (
                        <div className="shopping-table-container">
                            <table className="shopping-table">
                                <thead><tr><th>Articolo</th><th>Categoria</th><th>Azioni</th></tr></thead>
                                <tbody>
                                    {filteredProdotti.map(p => (
                                        <tr key={p.id}>
                                            <td><strong>{p.articolo}</strong>{p.preferito && '⭐'}</td>
                                            <td>{p.categorie?.name || 'N/D'}</td>
                                            <td className="actions-cell">
                                                <button className="btn-edit btn-icon" onClick={() => setModal({ visible: true, type: 'prodotto', data: p })}>✏️</button>
                                                <button className="btn-delete btn-icon" onClick={() => handleDelete('prodotti', p.id)}>🗑️</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {sezioneAttiva === 'categorie' && (
                        prodottiPerCategoria.length > 0 ? (
                            <>
                                <button className="btn-secondary" onClick={() => setProdottiPerCategoria([])}>← Torna alle Categorie</button>
                                <div className="shopping-table-container">
                                    <table className="shopping-table">
                                        <thead><tr><th>Articolo</th><th>Azioni</th></tr></thead>
                                        <tbody>
                                            {prodottiPerCategoria.map(p => (
                                                <tr key={p.id}>
                                                    <td><strong>{p.articolo}</strong></td>
                                                    <td className="actions-cell">
                                                        <button className="btn-edit btn-icon" onClick={() => setModal({ visible: true, type: 'prodotto', data: p })}>✏️</button>
                                                        <button className="btn-delete btn-icon" onClick={() => handleDelete('prodotti', p.id)}>🗑️</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            <div className="shopping-table-container">
                                <table className="shopping-table">
                                    <thead><tr><th>Nome Categoria</th><th>Azioni</th></tr></thead>
                                    <tbody>
                                        {filteredCategorie.map(c => (
                                            <tr key={c.id}>
                                                <td><strong>{c.name}</strong></td>
                                                <td className="actions-cell">
                                                    <button className="btn-edit btn-icon" onClick={() => setModal({ visible: true, type: 'categoria', data: c })}>✏️</button>
                                                    <button className="btn-delete btn-icon" onClick={() => handleDelete('categorie', c.id)}>🗑️</button>
                                                    <button className="btn-action btn-icon" onClick={() => setProdottiPerCategoria(prodotti.filter(p => p.categoria_id === c.id))}>🔍</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}
                </section>

                {modal.visible && <Modal type={modal.type} data={modal.data} categories={categorie} onClose={() => setModal({ visible: false })} onSave={handleSave} />}
                {showAnalisiModal && <SottoPagina4_AnalisiModal prodotti={prodotti} familyGroup={familyGroup} onClose={() => setShowAnalisiModal(false)} />}
            </main>
        </div>
    );
}
