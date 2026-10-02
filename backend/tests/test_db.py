from unittest.mock import MagicMock

import pytest
from sqlalchemy.orm import DeclarativeBase, Session

from app.db.base import Base
from app.db.session import get_db


def test_base_is_declarative() -> None:
    assert issubclass(Base, DeclarativeBase)


def test_get_db_closes_the_session(monkeypatch: pytest.MonkeyPatch) -> None:
    session = MagicMock(spec=Session)
    monkeypatch.setattr("app.db.session.SessionLocal", lambda: session)

    generator = get_db()
    assert next(generator) is session

    with pytest.raises(StopIteration):
        next(generator)

    session.close.assert_called_once()


def test_get_db_closes_the_session_when_use_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = MagicMock(spec=Session)
    monkeypatch.setattr("app.db.session.SessionLocal", lambda: session)

    generator = get_db()
    next(generator)

    with pytest.raises(RuntimeError):
        generator.throw(RuntimeError("query failed"))

    session.close.assert_called_once()
