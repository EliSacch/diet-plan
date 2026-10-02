from app.core.config import Settings


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
