import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.category_preference import CategoryPreference
from app.models.user import User
from tests.test_days import (
    MONDAY,
    NEXT_MONDAY,
    _category,
    _options_url,
    _signed_in_with_plan,
    _user,
)


def test_multi_select_defaults_to_off(client: TestClient) -> None:
    _signed_in_with_plan(client)

    options = client.get(_options_url(MONDAY)).json()

    assert _category(options, "Pranzo", "Primi")["multi_select"] is False
    assert _category(options, "Colazione", "Contorni")["multi_select"] is False


def test_turning_multi_select_on_applies_to_the_category_name(
    client: TestClient, database: Session
) -> None:
    _signed_in_with_plan(client)

    response = client.put(
        "/api/category-preferences",
        json={"category": "Contorni", "multi_select": True},
    )

    assert response.status_code == 200
    assert response.json() == {"category": "Contorni", "multi_select": True}
    options = client.get(_options_url(MONDAY)).json()
    assert _category(options, "Colazione", "Contorni")["multi_select"] is True
    assert _category(options, "Pranzo", "Primi")["multi_select"] is False
    assert database.scalars(select(CategoryPreference.category)).all() == ["Contorni"]


def test_multi_select_stays_on_for_later_days(client: TestClient) -> None:
    _signed_in_with_plan(client)
    assert (
        client.put(
            "/api/category-preferences",
            json={"category": "Primi", "multi_select": True},
        ).status_code
        == 200
    )

    next_monday = client.get(_options_url(NEXT_MONDAY)).json()

    assert _category(next_monday, "Pranzo", "Primi")["multi_select"] is True


def test_turning_multi_select_off_removes_the_preference(
    client: TestClient, database: Session
) -> None:
    _signed_in_with_plan(client)
    assert (
        client.put(
            "/api/category-preferences",
            json={"category": "Contorni", "multi_select": True},
        ).status_code
        == 200
    )

    response = client.put(
        "/api/category-preferences",
        json={"category": "Contorni", "multi_select": False},
    )

    assert response.status_code == 200
    assert response.json() == {"category": "Contorni", "multi_select": False}
    assert database.scalars(select(CategoryPreference)).all() == []
    assert (
        _category(client.get(_options_url(MONDAY)).json(), "Colazione", "Contorni")[
            "multi_select"
        ]
        is False
    )


def test_category_preferences_are_per_user(
    client: TestClient, database: Session
) -> None:
    grace = _user(database, "grace@example.com")
    database.add(CategoryPreference(user_id=grace.id, category="Contorni"))
    database.commit()
    _signed_in_with_plan(client)

    options = client.get(_options_url(MONDAY)).json()

    assert _category(options, "Colazione", "Contorni")["multi_select"] is False
    ada = database.scalars(select(User).where(User.email == "ada@example.com")).one()
    assert [
        (row.user_id, row.category)
        for row in database.scalars(select(CategoryPreference)).all()
    ] == [(grace.id, "Contorni")]
    assert ada.id != grace.id


def test_category_preferences_require_a_session(client: TestClient) -> None:
    response = client.put(
        "/api/category-preferences",
        json={"category": "Contorni", "multi_select": True},
    )

    assert response.status_code == 401
    assert response.json()["code"] == "UNAUTHORIZED"


def test_turning_on_rejects_more_than_the_maximum(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        "app.category_preferences.service.MAX_MULTI_SELECT_CATEGORIES", 1
    )
    _signed_in_with_plan(client)
    assert (
        client.put(
            "/api/category-preferences",
            json={"category": "Contorni", "multi_select": True},
        ).status_code
        == 200
    )

    response = client.put(
        "/api/category-preferences",
        json={"category": "Primi", "multi_select": True},
    )

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"
    assert (
        _category(client.get(_options_url(MONDAY)).json(), "Pranzo", "Primi")[
            "multi_select"
        ]
        is False
    )


def test_a_failed_save_keeps_the_previous_preference(
    client: TestClient, database: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _signed_in_with_plan(client)
    assert (
        client.put(
            "/api/category-preferences",
            json={"category": "Contorni", "multi_select": True},
        ).status_code
        == 200
    )

    def fail_commit(self: Session) -> None:
        raise RuntimeError("commit failed")

    monkeypatch.setattr(Session, "commit", fail_commit)
    with pytest.raises(RuntimeError, match="commit failed"):
        client.put(
            "/api/category-preferences",
            json={"category": "Primi", "multi_select": True},
        )
    monkeypatch.undo()

    database.expire_all()
    assert database.scalars(select(CategoryPreference.category)).all() == ["Contorni"]
    assert (
        _category(client.get(_options_url(MONDAY)).json(), "Pranzo", "Primi")[
            "multi_select"
        ]
        is False
    )
