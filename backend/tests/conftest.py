import os

# Settings() runs at import. CI has no .env file.
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://user:password@localhost:5432/test",
)
os.environ.setdefault("GOOGLE_CLIENT_ID", "test-client-id")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test-client-secret")
os.environ.setdefault(
    "GOOGLE_REDIRECT_URI",
    "http://localhost:5173/auth/google/callback",
)
