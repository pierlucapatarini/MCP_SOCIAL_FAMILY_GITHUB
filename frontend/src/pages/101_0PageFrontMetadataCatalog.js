import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL; 

export default function FunctionMetadataCatalog() {
    const navigate = useNavigate();
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Carica catalogo
    const fetchCatalog = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/api/catalog`);
            if (!res.ok) throw new Error('Errore nel recupero del catalogo.');
            const data = await res.json();
            setTables(data);
        } catch (err) {
            console.error("Error fetching catalog:", err);
            setError(err.message || "Impossibile caricare il catalogo.");
        } finally {
            setLoading(false);
        }
    };

    // Aggiorna record singolo
    const updateTable = async (table) => {
        setError(null);
        try {
            const res = await fetch(`${API_URL}/api/catalog/${table.table_name}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    description: table.description,
                    searchable_fields: table.searchable_fields,
                    primary_field: table.primary_field,
                    // Aggiungo i metadati di ogni colonna
                    column_metadata: table.column_metadata,
                }),
            });
            if (!res.ok) throw new Error(`Errore durante il salvataggio per ${table.table_name}.`);

            alert(`Metadata per ${table.table_name} salvati!`);
            fetchCatalog();
        } catch (err) {
            console.error("Error updating table:", err);
            alert(`Errore nel salvataggio per ${table.table_name}.`);
        }
    };

    // Refresh catalogo (ricrea da DB)
    const refreshCatalog = async () => {
        if (!window.confirm("Sei sicuro di voler ricreare il catalogo dal DB?")) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/api/catalog/refresh`, { method: "POST" });
            if (!res.ok) throw new Error('Errore nella richiesta di refresh.');

            alert("Richiesta di refresh inviata. Caricamento in corso...");
            fetchCatalog();
        } catch (err) {
            console.error("Error refreshing catalog:", err);
            setError("Errore nel refresh del catalogo.");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCatalog();
    }, []);

    // Funzione helper per gestire l'array di sinonimi
    const handleSynonymsChange = (e, table, colName) => {
        const value = e.target.value;
        const synonymsArray = value.split(',').map(s => s.trim());
        setTables((prev) =>
            prev.map((t) =>
                t.table_name === table.table_name
                    ? {
                        ...t,
                        column_metadata: t.column_metadata.map((col) =>
                            col.name === colName
                                ? { ...col, synonyms: synonymsArray }
                                : col
                        ),
                    }
                    : t
            )
        );
    };

    return (
        <div className="app-layout">
            {/* HEADER - Stile come Pagina 1 */}
            <div className="header">
                <button onClick={() => navigate('/main-menu')} className="btn-secondary">
                    Ritorna al menu
                </button>
                <h1>📊 Metadata Catalog</h1>
                <button
                    onClick={refreshCatalog}
                    disabled={loading}
                    className="btn-primary"
                    style={{ marginLeft: 'auto' }}
                >
                    🔄 Refresh dal DB
                </button>
            </div>

            {/* CONTENUTO SCORREVOLE - Stile come Pagina 1 */}
            <div className="scrollable-content p-6">
                {loading && <p className="text-center font-bold" style={{ marginTop: '20px' }}>Caricamento in corso... ⏳</p>}
                {error && <div className="info-box red text-center">ERRORE: {error}</div>}

                {!loading && !error && tables.length === 0 && (
                    <div className="info-box red text-center">Nessuna tabella trovata nel catalogo .. vai al Refresh.</div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tables.map((table) => (
                        <div key={table.table_name} className="card" style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', boxShadow: '2px 2px 5px rgba(0,0,0,0.1)' }}>
                            <div className="card-content space-y-4">
                                <h2 className="text-xl font-semibold">{table.table_name}</h2>

                                {/* Descrizione */}
                                <div className="input-group">
                                    <label>📝 Descrizione</label>
                                    <textarea
                                        value={table.description || ""}
                                        placeholder="Aggiungi una descrizione per la tabella..."
                                        className="textarea-field"
                                        rows="3"
                                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                        onChange={(e) =>
                                            setTables((prev) =>
                                                prev.map((t) =>
                                                    t.table_name === table.table_name
                                                        ? { ...t, description: e.target.value }
                                                        : t
                                                )
                                            )
                                        }
                                    ></textarea>
                                </div>

                                {/* Campi Ricercabili */}
                                <div className="input-group">
                                    <label>🔎 Campi Ricercabili</label>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        {Object.keys(table.sample_data?.[0] || {}).map((field) => (
                                            <div key={field} className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    id={`${table.table_name}-${field}`}
                                                    checked={table.searchable_fields?.includes(field)}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setTables((prev) =>
                                                            prev.map((t) =>
                                                                t.table_name === table.table_name
                                                                    ? {
                                                                        ...t,
                                                                        searchable_fields: checked
                                                                            ? [...(t.searchable_fields || []), field]
                                                                            : (t.searchable_fields || []).filter((f) => f !== field),
                                                                    }
                                                                    : t
                                                            )
                                                        );
                                                    }}
                                                />
                                                <label htmlFor={`${table.table_name}-${field}`} style={{ fontSize: '0.875rem' }}>{field}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Campo Principale */}
                                <div className="input-group">
                                    <label>🔑 Campo Principale</label>
                                    <select
                                        value={table.primary_field || ""}
                                        className="select-field"
                                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                        onChange={(e) =>
                                            setTables((prev) =>
                                                prev.map((t) =>
                                                    t.table_name === table.table_name
                                                        ? { ...t, primary_field: e.target.value }
                                                        : t
                                                )
                                            )
                                        }
                                    >
                                        <option value="">Seleziona campo</option>
                                        {Object.keys(table.sample_data?.[0] || {}).map((field) => (
                                            <option key={field} value={field}>
                                                {field}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* NUOVO: Metadati Colonne */}
                                <div className="input-group space-y-4">
                                    <h4 className="font-semibold text-lg border-b pb-2">Metadati Colonne</h4>
                                    {table.column_metadata?.map((col, index) => (
                                        <div key={col.name} className="bg-gray-100 p-3 rounded-md space-y-2">
                                            <p className="font-medium text-gray-700">Campo: <span className="font-bold">{col.name}</span> <span className="text-sm italic text-gray-500">({col.type})</span></p>

                                            {/* Descrizione singola colonna */}
                                            <label htmlFor={`desc-${table.table_name}-${col.name}`} className="block text-sm font-medium text-gray-600">Descrizione</label>
                                            <textarea
                                                id={`desc-${table.table_name}-${col.name}`}
                                                className="textarea-field w-full"
                                                rows="2"
                                                style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                                value={col.description || ""}
                                                onChange={(e) => {
                                                    const newValue = e.target.value;
                                                    setTables((prev) =>
                                                        prev.map((t) =>
                                                            t.table_name === table.table_name
                                                                ? {
                                                                    ...t,
                                                                    column_metadata: t.column_metadata.map((c) =>
                                                                        c.name === col.name ? { ...c, description: newValue } : c
                                                                    ),
                                                                }
                                                                : t
                                                        )
                                                    );
                                                }}
                                            />

                                            {/* Sinonimi */}
                                            <label htmlFor={`syn-${table.table_name}-${col.name}`} className="block text-sm font-medium text-gray-600">Sinonimi (separati da virgola)</label>
                                            <input
                                                type="text"
                                                id={`syn-${table.table_name}-${col.name}`}
                                                className="input-field w-full"
                                                style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                                value={col.synonyms?.join(', ') || ""}
                                                onChange={(e) => handleSynonymsChange(e, table, col.name)}
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Sample Data */}
                                <div>
                                    <label className="block mb-1">📑 Esempio Dati (prime 5 righe)</label>
                                    <pre style={{ backgroundColor: '#f3f4f6', fontSize: '0.875rem', padding: '10px', borderRadius: '4px', maxHeight: '160px', overflowY: 'auto' }}>
                                        {JSON.stringify(table.sample_data, null, 2)}
                                    </pre>
                                </div>

                                {/* Save */}
                                <button
                                    className="btn-primary"
                                    style={{ width: '100%', marginTop: '10px' }}
                                    onClick={() => updateTable(table)}
                                >
                                    💾 Salva Modifiche
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="footer"></div>
        </div>
    );
}
