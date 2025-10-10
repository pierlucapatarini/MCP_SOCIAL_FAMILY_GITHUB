// ==================================================================================
// 🟢 INIZIO ROTTA "Routes101_0RecuperoMetadataTabelle"
// ==================================================================================
import { Router } from "express";
import { supabaseAdmin } from "../config.js";

const router = Router();

// ---------- QUI INCOLLI IL CODICE ORIGINALE DELLA ROTTA ----------

// ==================================================================================
// 🟢 INIZIO ROTTA "Routes101_0RecuperoMetadataTabelle" METADATA FUNZIONI AUSILIARIE CON LOG DETTAGLIATI
// MENU 101.0 - SERVE PER CREARE LA TABELLS METADATA DA DARE IN PASTO ALL AI PER CAPIRE DOVE SONO I DATI NELLETE TABELLE SQL STRUTTURIT
// ==================================================================================

/**
 * Funzione per recuperare i metadati SQL dalla tua tabella 'ai_metadata_catalog' (regole globali).
 */
const getSqlMetadataString = async (familyId, supabase) => {
    console.log('--- LOG: FASE 0.1: Avvio recupero Metadati SQL (ai_metadata_catalog) ---');
    try {
        const METADATA_TABLE_NAME = 'ai_metadata_catalog'; 
        
        const { data: metadataRows, error } = await supabase
            .from(METADATA_TABLE_NAME) 
            .select('table_name, description, sample_data, column_metadata'); 
            
        if (error) {
            console.error("❌ LOG: Errore Supabase nel recupero metadati:", error.message);
            return "Errore di sistema nel recupero dei metadati SQL.";
        }
        
        if (!metadataRows || metadataRows.length === 0) {
            console.warn("⚠️ LOG: Nessuna riga trovata nella tabella di metadati.");
            return "Nessun metadato SQL strutturato configurato o recuperabile.";
        }

        console.log(`✅ LOG: Trovate ${metadataRows.length} tabelle di metadati.`);
        
        // Formatta la stringa per l'AI
        const formattedString = metadataRows.map(row => {
            const table_name = row.table_name;
            const table_description = row.description;
            const example_rows = row.sample_data ? JSON.stringify(row.sample_data, null, 2) : 'Nessun esempio fornito.';
            
            let columnsText = 'Nessun campo specificato.';
            
            if (row.column_metadata) {
                try {
                    const columnMetadata = (typeof row.column_metadata === 'string') 
                        ? JSON.parse(row.column_metadata) 
                        : row.column_metadata;
                        
                    if (Array.isArray(columnMetadata)) {
                        columnsText = columnMetadata.map(col => {
                            const synonyms = col.synonyms && Array.isArray(col.synonyms) ? col.synonyms.join(', ') : 'Nessuno';
                            return `${col.name} (tipo: ${col.type}, sinonimi: ${synonyms}, descrizione: ${col.description})`;
                        }).join('\n');
                    }
                } catch (e) {
                    console.error("❌ LOG: Errore nel parsing di column_metadata:", e.message);
                    columnsText = 'Errore di parsing dei campi e sinonimi.';
                }
            }
            
            return `TABELLA: ${table_name}\nDESCRIZIONE: ${table_description}\nCAMPI E SINONIMI:\n${columnsText}\nRIGHE DI ESEMPIO:\n${example_rows}\n`;
        }).join('---\n');
        
        console.log(`✅ LOG: Metadati formattati. (Dimensione: ${formattedString.length} caratteri)`);
        console.log('--- LOG: FASE 0.2: Fine recupero Metadati SQL ---');
        return formattedString;
        
    } catch (e) {
        console.error("❌ LOG: Errore critico in getSqlMetadataString:", e.message);
        return "Errore di sistema nel recupero dei metadati SQL.";
    }
};

/**
 * Funzione per eseguire la query SQL sui dati reali della famiglia.
 */
const executeIntelligentStructuredQuery = async (familyId, hints, supabase) => {
    console.log('--- LOG: FASE 2.1: Avvio executeIntelligentStructuredQuery ---');
    try {
        console.log(`🔍 LOG: Hints ricevuti: ${JSON.stringify(hints)}`);

        const { target_table, target_fields, filter_condition } = hints;
        
        if (!target_table) {
             console.warn('⚠️ LOG: target_table non specificata negli hints. Ritorno vuoto.');
             return [];
        }

        let selectFields = target_fields.length > 0 ? target_fields.join(',') : '*';
        console.log(`🔨 LOG: SELECT fields: ${selectFields}`);
        
        let query = supabase.from(target_table).select(selectFields);
        
        // Applicazione filtro famiglia (CRUCIALE per l'isolamento dei dati)
        query = query.eq('family_group', familyId); 
        console.log(`🔒 LOG: Applicato filtro family_group = ${familyId}`);


        // 🚨 IMPLEMENTAZIONE DELLA TUA LOGICA DI FILTRO (PUNTO CRITICO)
        if (filter_condition && filter_condition.length > 0) {
             console.log(`⚙️ LOG: Applicazione logica di filtro: "${filter_condition}"`);
             // LA TUA LOGICA DI TRADUZIONE DELLA STRINGA IN METODI SUPABASE VA QUI!
             
             // ESEMPIO DI LOGICA:
             /*
             if (target_table === 'prodotti') {
                 if (filter_condition.toLowerCase().includes('urgente')) {
                    query = query.eq('priorita', 'alta');
                 }
             }
             */
        } else {
             console.log('⚙️ LOG: Nessuna condizione di filtro complessa da applicare (filter_condition è vuoto).');
        }


        const { data, error } = await query.limit(20); 
        if (error) throw error;
        
        console.log(`✅ LOG: Query strutturata completata. Trovate ${data.length} righe.`);
        
        const results = data.map(item => ({
            type: target_table,
            title: item.title || item[target_fields[0]] || `Elemento da ${target_table} (ID: ${item.id || 'N/D'})`,
            data: item 
        }));

        console.log('--- LOG: FASE 2.2: Fine executeIntelligentStructuredQuery ---');
        return results;

    } catch (e) {
        console.error(`❌ LOG: Errore in executeIntelligentStructuredQuery: ${e.message}. Ritorno risultati vuoti.`);
        return [];
    }
};

// ==================================================================================
// FINE "Routes101_0RecuperoMetadataTabelle" 
// ==================================================================================
 

// ==================================================================================
// 🟢 FINE ROTTA "Routes101_0RecuperoMetadataTabelle"
// ==================================================================================
export default router;
