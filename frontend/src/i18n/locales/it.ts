import type { MessageCatalog } from './en'

export const it = {
  errors: {
    BAD_REQUEST: 'La richiesta non è valida.',
    UNAUTHORIZED: 'Devi accedere per continuare.',
    FORBIDDEN: 'Non hai accesso.',
    NOT_FOUND: 'Pagina o risorsa non trovata.',
    CONFLICT: 'È in conflitto con qualcosa già salvato.',
    VALIDATION_ERROR: 'Controlla i campi e riprova.',
    INTERNAL_ERROR: 'Qualcosa è andato storto. Riprova.',
    HTTP_ERROR: 'Non è stato possibile completare la richiesta.',
    UNKNOWN: 'Qualcosa è andato storto.',
  },
} as const satisfies MessageCatalog
