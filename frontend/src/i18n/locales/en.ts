export const en = {
  errors: {
    BAD_REQUEST: "The request was not valid.",
    UNAUTHORIZED: "You need to sign in to continue.",
    FORBIDDEN: "You do not have access to this.",
    NOT_FOUND: "That page or resource was not found.",
    CONFLICT: "That conflicts with something already saved.",
    VALIDATION_ERROR: "Check the fields and try again.",
    INTERNAL_ERROR: "Something went wrong. Try again.",
    HTTP_ERROR: "The request could not be completed.",
    UNKNOWN: "Something went wrong.",
  },
} as const;

export type MessageCatalog = {
  errors: Record<keyof typeof en.errors, string>;
};
