import os

# Settings() runs at import. CI has no .env file.
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://user:password@localhost:5432/test",
)
