from app.core.config import Settings
from app.main import api_docs_urls


def test_cookie_secure_follows_explicit_setting() -> None:
    secure = Settings(
        DATABASE_URL="postgresql+psycopg://u:p@localhost/db",
        GOOGLE_CLIENT_ID="id",
        GOOGLE_CLIENT_SECRET="secret",
        GOOGLE_REDIRECT_URI="http://localhost/callback",
        DEBUG=True,
        COOKIE_SECURE=True,
    )
    insecure = Settings(
        DATABASE_URL="postgresql+psycopg://u:p@localhost/db",
        GOOGLE_CLIENT_ID="id",
        GOOGLE_CLIENT_SECRET="secret",
        GOOGLE_REDIRECT_URI="http://localhost/callback",
        DEBUG=False,
        COOKIE_SECURE=False,
    )

    assert secure.cookie_secure is True
    assert insecure.cookie_secure is False


def test_cookie_secure_defaults_to_not_debug() -> None:
    debug = Settings(
        DATABASE_URL="postgresql+psycopg://u:p@localhost/db",
        GOOGLE_CLIENT_ID="id",
        GOOGLE_CLIENT_SECRET="secret",
        GOOGLE_REDIRECT_URI="http://localhost/callback",
        DEBUG=True,
        COOKIE_SECURE=None,
    )
    production = Settings(
        DATABASE_URL="postgresql+psycopg://u:p@localhost/db",
        GOOGLE_CLIENT_ID="id",
        GOOGLE_CLIENT_SECRET="secret",
        GOOGLE_REDIRECT_URI="http://localhost/callback",
        DEBUG=False,
        COOKIE_SECURE=None,
    )

    assert debug.cookie_secure is False
    assert production.cookie_secure is True


def test_api_docs_urls_only_when_debug() -> None:
    assert api_docs_urls(True) == ("/docs", "/redoc", "/openapi.json")
    assert api_docs_urls(False) == (None, None, None)


def test_use_psycopg_driver_rewrites_postgres_urls() -> None:
    assert (
        Settings.use_psycopg_driver("postgres://user:secret@host/db")
        == "postgresql+psycopg://user:secret@host/db"
    )
    assert (
        Settings.use_psycopg_driver("postgresql://user:secret@host/db?sslmode=require")
        == "postgresql+psycopg://user:secret@host/db?sslmode=require"
    )


def test_use_psycopg_driver_leaves_other_urls_unchanged() -> None:
    url = "postgresql+psycopg://user:secret@localhost/db"
    assert Settings.use_psycopg_driver(url) == url
    assert Settings.use_psycopg_driver("sqlite://") == "sqlite://"
    assert Settings.use_psycopg_driver(None) is None


def test_parse_allowed_origins_splits_commas() -> None:
    origins = Settings.parse_allowed_origins(
        "http://localhost:5173,http://localhost:3000"
    )

    assert origins == ["http://localhost:5173", "http://localhost:3000"]


def test_parse_allowed_origins_empty_string_is_empty_list() -> None:
    assert Settings.parse_allowed_origins("") == []


def test_parse_allowed_origins_keeps_a_list() -> None:
    origins = ["http://localhost:5173"]

    assert Settings.parse_allowed_origins(origins) == origins
