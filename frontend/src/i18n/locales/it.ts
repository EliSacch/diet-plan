import type { MessageCatalog } from "./en";

export const it = {
  errors: {
    BAD_REQUEST: "La richiesta non è valida.",
    UNAUTHORIZED: "Devi accedere per continuare.",
    FORBIDDEN: "Non hai accesso.",
    NOT_FOUND: "Pagina o risorsa non trovata.",
    CONFLICT: "È in conflitto con qualcosa già salvato.",
    PAYLOAD_TOO_LARGE: "La richiesta è troppo grande.",
    RATE_LIMITED: "Troppe richieste. Riprova più tardi.",
    VALIDATION_ERROR: "Controlla i campi e riprova.",
    INTERNAL_ERROR: "Qualcosa è andato storto. Riprova.",
    HTTP_ERROR: "Non è stato possibile completare la richiesta.",
    UNKNOWN: "Qualcosa è andato storto.",
  },
  labels: {
    CHECKING_YOUR_SESSION: "Controllo della sessione…",
    DAYS: "Giorni",
    DIET_PLAN: "Piano alimentare",
    LOADING_YOUR_DIET_PLAN: "Caricamento del piano alimentare…",
    MEALS: "Pasti",
    PROFILE: "Profilo",
    SIGN_IN_WITH_GOOGLE: "Accedi con Google",
    SIGNING_IN: "Accesso in corso…",
    SIGN_OUT: "Esci",
    UNKNOWN_ERROR: "Errore sconosciuto",
    UPLOAD_DIET_PLAN: "Carica il piano alimentare",
  },
} as const satisfies MessageCatalog;
