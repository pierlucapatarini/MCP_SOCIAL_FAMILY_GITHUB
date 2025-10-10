// ================================================================================
// ROUTER CATALOG CORRETTO - ServerMetadataCatalogo.js
// ================================================================================
import express from "express";
import { supabaseAdmin } from "./index.js"; 


const router = express.Router();

// ================================================================================
// TEST ENDPOINT - Verifica configurazione
// ================================================================================
router.get("/test", async (req, res) => {
  console.log("🧪 Testing catalog endpoint...");
  
  try {
    // Verifica che supabaseAdmin sia disponibile
    if (!supabaseAdmin) {
      throw new Error("supabaseAdmin not available - check SUPABASE_SERVICE_ROLE_KEY");
    }
    
    // Test connessione
    const { data, error } = await supabaseAdmin
      .from('ai_metadata_catalog')
      .select('count(*)')
      .single();
    
    if (error && error.code === 'PGRST116') {
      // Tabella non esiste
      return res.status(404).json({
        error: "Table ai_metadata_catalog not found",
        hint: "Create the table in Supabase first"
      });
    }
    
    if (error) {
      console.error("❌ Supabase error:", error);
      throw error;
    }
    
    console.log("✅ Database connection OK");
    res.json({ 
      success: true, 
      message: "Catalog API is working!",
      tableExists: true,
      recordCount: data.count || 0
    });
    
  } catch (err) {
    console.error("❌ Test endpoint error:", err.message);
    res.status(500).json({ 
      error: err.message,
      details: err.details || "Check server configuration"
    });
  }
});

// ================================================================================
// GET CATALOG - Usa supabaseAdmin
// ================================================================================
router.get("/", async (req, res) => {
  console.log("📊 GET /api/catalog called");
  
  try {
    if (!supabaseAdmin) {
      throw new Error("supabaseAdmin not configured - missing SERVICE_ROLE_KEY");
    }
    
    const { data, error } = await supabaseAdmin
      .from("ai_metadata_catalog")
      .select("*")
      .order("table_name");
    
    if (error) {
      console.error("❌ Database error:", error);
      
      // Errori specifici più chiari
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: "Table ai_metadata_catalog does not exist",
          hint: "Create the table using the SQL in the setup guide"
        });
      }
      
      throw error;
    }
    
    console.log(`✅ Found ${data.length} records in catalog`);
    res.json(data || []); // Assicurati di ritornare array vuoto se data è null
    
  } catch (err) {
    console.error("❌ GET catalog error:", err.message);
    res.status(500).json({ 
      error: err.message,
      code: err.code || 'UNKNOWN_ERROR',
      details: err.details || "Check server logs for details"
    });
  }
});

// ================================================================================
// REFRESH CATALOG - Con RPC functions (CORRETTO PER [OBJECT OBJECT] e METADATA)
// ================================================================================
router.post("/refresh", async (req, res) => {
  console.log("🔄 POST /api/catalog/refresh called");
  
  try {
    if (!supabaseAdmin) {
      throw new Error("supabaseAdmin not configured");
    }

    // Prima controlla se le RPC functions esistono
    const { data: tables, error: tableError } = await supabaseAdmin.rpc("list_tables");
    
    if (tableError) {
      console.error("❌ RPC list_tables error:", tableError);
      
      if (tableError.code === 'PGRST202') {
        return res.status(400).json({
          error: "RPC function 'list_tables' not found",
          hint: "Create the RPC functions in Supabase using the SQL provided"
        });
      }
      
      throw tableError;
    }

    console.log(`📋 Found ${tables.length} tables to process`);

    for (const tableObj of tables) { // Iteriamo sull'oggetto restituito
      
      // 🛑 CORREZIONE 1: Estraiamo il nome della tabella dalla proprietà 'table_name'
      const table = tableObj.table_name; 

      if (!table || typeof table !== 'string') {
        console.warn("⚠️ Skipping invalid table object:", tableObj);
        continue;
      }

      try {
        // Ottieni colonne
        const { data: columns, error: colError } = await supabaseAdmin.rpc("list_columns", {
          t_name: table,
        });
        
        if (colError) {
          console.warn(`⚠️ Could not get columns for ${table}:`, colError);
          continue;
        }

        const fields = columns.map((c) => c.column_name);

        // 🚀 NUOVA LOGICA: Creazione del metadata iniziale per le colonne (richiesta utente)
        const initialColumnMetadata = columns.map(c => ({
            name: c.column_name,
            type: c.data_type,
            description: `Campo ${c.column_name} della tabella ${table}.`, // Descrizione base
            synonyms: [], // Array vuoto per i sinonimi
        }));

        // Prime 5 righe
        const { data: samples, error: sampleError } = await supabaseAdmin
          .from(table)
          .select("*")
          .limit(5);
        
        if (sampleError) {
          console.warn(`⚠️ Could not get samples for ${table}:`, sampleError);
        }

        // Upsert nel catalogo
        await supabaseAdmin.from("ai_metadata_catalog").upsert(
          {
            table_name: table,
            description: `Tabella ${table}, contiene dati ancora da descrivere.`,
            searchable_fields: fields.slice(0, 5), // prima proposta automatica
            primary_field: fields[0],
            sample_data: samples || [],
            column_metadata: initialColumnMetadata, // 🚀 AGGIUNTO
          },
          { onConflict: "table_name" }
        );
        
        console.log(`✅ Processed table: ${table}`);
      } catch (err) {
        console.warn(`⚠️ Error processing table ${table}:`, err.message);
        // Continua con le altre tabelle
      }
    }

    res.json({ 
      success: true, 
      message: `Catalogo aggiornato con ${tables.length} tabelle ✅`,
      tablesProcessed: tables.length
    });
    
  } catch (err) {
    console.error("❌ Refresh catalog error:", err.message);
    res.status(500).json({ 
      error: err.message,
      code: err.code || 'UNKNOWN_ERROR',
      details: err.details || "Check server logs for details"
    });
  }
});

// ================================================================================
// UPDATE RECORD - Usa supabaseAdmin (CORRETTO PER URL MALFORMATO E METADATA)
// ================================================================================
router.put("/:tableName", async (req, res) => {
    let { tableName } = req.params;

    // 🛑 CORREZIONE 2A: Gestisce il parametro di rotta malformato inviato dal frontend
    if (tableName && tableName.startsWith('{') && tableName.endsWith('}')) {
        try {
            const parsed = JSON.parse(tableName);
            tableName = parsed.table_name;
        } catch (e) {
            console.error("❌ Failed to parse malformed tableName parameter:", req.params.tableName);
            return res.status(400).json({ error: "Malformed table name in URL parameter." });
        }
    }
    
    console.log(`📝 PUT /api/catalog/${tableName} called`);
  
  try {
    if (!supabaseAdmin) {
      throw new Error("supabaseAdmin not configured");
    }
    
    // 🛑 CORREZIONE 2B: Estrae anche column_metadata dal body
    const { description, searchable_fields, primary_field, column_metadata } = req.body;

    const updateData = {
        description,
        searchable_fields,
        primary_field,
        updated_at: new Date().toISOString(),
    };

    // Aggiunge column_metadata all'oggetto di update solo se presente nel body
    if (column_metadata !== undefined) {
        updateData.column_metadata = column_metadata;
    }

    const { data, error } = await supabaseAdmin
      .from("ai_metadata_catalog")
      .update(updateData)
      .eq("table_name", tableName)
      .select();

    if (error) {
      console.error("❌ Update error:", error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      return res.status(404).json({
        error: `Table ${tableName} not found in catalog`
      });
    }
    
    console.log(`✅ Updated table: ${tableName}`);
    res.json({ success: true, data: data[0] });
    
  } catch (err) {
    console.error("❌ Update catalog error:", err.message);
    res.status(500).json({ 
      error: err.message,
      details: err.details || "Check server logs"
    });
  }
});

export default router;