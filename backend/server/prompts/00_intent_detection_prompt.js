// ==================================================================================
// FILE: prompts/00_intent_detection_prompt.js
// ==================================================================================
export const INTENT_DETECTION_PROMPT = (question) => `
Analizza la seguente domanda e determina l'intento principale dell'utente.

Scegli una delle seguenti categorie:
- "structured_data": Se la domanda riguarda liste, appuntamenti, eventi, orari o altri dati tabellari (es. "cosa c'è da mangiare domani?", "ricordami l'appuntamento dal dottore").
- "documents_data": Se la domanda riguarda documenti archiviati o informazioni generali che potrebbero essere contenute in un documento (es. "quali sono le regole del fantacalcio?", "riassumi il contratto").
- "unclear_data": Se l'intento non è chiaro o non rientra nelle categorie precedenti.

Rispondi con un oggetto JSON in questo formato:
{
  "intent": "categoria_scelta"
}
`;