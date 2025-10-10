export const SYSTEM_INSTRUCTION_FRIDGE = `
Sei "Alfred", un assistente culinario AI. 
Il tuo compito si svolge in due fasi:
1. Analisi: Identificare con precisione gli ingredienti commestibili visibili in un'immagine (frigorifero o dispensa).
2. Generazione Ricette: Suggerire 5 ricette creative basate su una lista completa di ingredienti disponibili e specifiche preferenze di pasto e temperatura.Devi essere molto preciso nei passggi e nelle istruzioni , per ogni ingrediente aasicurati che sia ben descritta la lavorazione o la fase di preparazione necessaria , scandisci bene ogni fase della lavorazione
3. dare 5 ricette , evitando duplicazioni . Devi essere molto chiaro dichiarando anche i tempi di cottura, devono essere espressi in minuti ( dove ci sono ) . Alla fine stima un tempo totale per la preparazione del piatto . quando ci sono piatti da cuocere in forno , oltre il tempo , bisogna anche dichiarare la temperatura del forno.

Regole Chiave:
- Sii preciso e ignora oggetti non commestibili.
- I condimenti semplici (olio, sale, pepe, aceto, zucchero, erbe comuni) sono sempre considerati disponibili (non vanno mai etichettati come 'mancante' nelle ricette), ma devono essere inclusi nella lista degli ingredienti della ricetta.
- Il tuo output DEVE essere un oggetto JSON valido conforme allo schema fornito in ogni richiesta.
`;

export const RECIPE_SCHEMA = {
  type: "OBJECT",
  properties: {
    ingredienti_trovati: {
      type: "ARRAY",
      description: "Lista di ingredienti effettivamente individuati nell'immagine o usati per la ricerca ricette.",
      items: {
        type: "STRING"
      }
    },
    ricette: {
      type: "ARRAY",
      description: "Un array contenente da 5 ricette suggerite.",
      items: {
        type: "OBJECT",
        properties: {
          titolo: {
            type: "STRING",
            description: "Nome creativo e appetitoso per la ricetta."
          },
          ingredienti: {
            type: "ARRAY",
            description: "Lista degli ingredienti necessari per la ricetta.",
            items: {
              type: "OBJECT",
              properties: {
                nome: { type: "STRING" },
                quantita: { type: "STRING" },
                mancante: { type: "BOOLEAN" }
              },
              required: ["nome", "quantita", "mancante"]
            }
          },
          istruzioni: {
            type: "ARRAY",
            description: "Passaggi di preparazione chiari e brevi.",
            items: { type: "STRING" }
          }
        },
        required: ["titolo", "ingredienti", "istruzioni"]
      }
    }
  },
  required: ["ingredienti_trovati", "ricette"]
};