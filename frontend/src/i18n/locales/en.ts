export const en = {
  errors: {
    BAD_REQUEST: "The request was not valid.",
    UNAUTHORIZED: "You need to sign in to continue.",
    FORBIDDEN: "You do not have access to this.",
    NOT_FOUND: "That page or resource was not found.",
    CONFLICT: "That conflicts with something already saved.",
    PAYLOAD_TOO_LARGE: "That request is too large.",
    RATE_LIMITED: "Too many requests. Try again later.",
    VALIDATION_ERROR: "Check the fields and try again.",
    INTERNAL_ERROR: "Something went wrong. Try again.",
    HTTP_ERROR: "The request could not be completed.",
    UNKNOWN: "Something went wrong.",
  },
  labels: {
    CHECKING_YOUR_SESSION: "Checking your session…",
    DAYS: "Days",
    LOADING_YOUR_DIET_PLAN: "Loading your diet plan…",
    MEALS: "Meals",
    PROFILE: "Profile",
    SIGN_IN_WITH_GOOGLE: "Sign in with Google",
    SIGNING_IN: "Signing in…",
    SIGN_OUT: "Sign out",
    UNKNOWN_ERROR: "Unknown error",
    UPLOAD_DIET_PLAN: "Upload diet plan",
  },
} as const;

export type MessageCatalog = {
  errors: Record<keyof typeof en.errors, string>;
  labels: Record<keyof typeof en.labels, string>;
};
