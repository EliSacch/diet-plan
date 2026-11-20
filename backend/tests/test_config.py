from app.core.config import Settings


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
