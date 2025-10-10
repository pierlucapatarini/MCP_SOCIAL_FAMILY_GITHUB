// Edge Function: functions/create-alfred-user/index.ts
// VERSIONE con UPSERT (fix errore chiave duplicata)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verifica autenticazione
    const authHeader = req.headers.get('Authorization')!
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )
    
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Non autorizzato' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { familyGroup } = await req.json()
    if (!familyGroup) {
      return new Response(JSON.stringify({ error: 'familyGroup richiesto' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Controlla se Alfred esiste già
    const { data: existingAlfred } = await supabaseServiceRole
      .from('profiles')
      .select('id, email, is_ai, username')
      .eq('family_group', familyGroup)
      .eq('is_ai', true)
      .maybeSingle()

    if (existingAlfred) {
      return new Response(JSON.stringify({
        error: 'Alfred AI esiste già per questo gruppo famiglia',
        existingUser: existingAlfred,
      }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Crea utente in auth
    const alfredEmail = `alfred.${familyGroup.replace(/-/g, '').substring(0, 8)}@family.ai`
    let alfredAuthUser = null

    const { data: newAuthUser, error: createUserError } =
      await supabaseServiceRole.auth.admin.createUser({
        email: alfredEmail,
        password: generateUUID(),
        email_confirm: true,
        user_metadata: {
          username: 'Alfred AI',
          is_ai: true,
          family_group: familyGroup,
          created_by: 'edge_function',
        },
      })

    if (createUserError) {
      if (createUserError.message.includes('already been registered')) {
        const { data: { users } } = await supabaseServiceRole.auth.admin.listUsers()
        alfredAuthUser = users.find((u) => u.email === alfredEmail)
        if (!alfredAuthUser) throw new Error('Utente Alfred non trovato')
      } else {
        throw createUserError
      }
    } else {
      alfredAuthUser = newAuthUser.user
    }

    const alfredId = alfredAuthUser.id
    const currentTime = new Date().toISOString()

    const alfredProfileData = {
      id: alfredId,
      username: 'Alfred AI',
      email: alfredEmail,
      avatar: '🤖',
      family_group: familyGroup,
      is_ai: true,
      gender: null,
      age: null,
      height: null,
      activity_level: 'moderato',
      target_weight: null,
      created_at: currentTime,
      updated_at: currentTime,
    }

    // 🔑 FIX: uso upsert invece di insert
    const { data: newAlfred, error: upsertError } = await supabaseServiceRole
      .from('profiles')
      .upsert([alfredProfileData], { onConflict: 'id' })
      .select()
      .single()

    if (upsertError) {
      throw new Error(`Errore upsert: ${upsertError.message}`)
    }

    return new Response(JSON.stringify({
      success: true,
      alfred: newAlfred,
      message: `Alfred AI creato con successo! ID: ${newAlfred.id}`,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: `Errore: ${error.message}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
