from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.custom_option import CustomOption
from app.models.day import DailyChoice
from app.models.diet import DietOption
from app.models.user import User
from tests.test_diet_plans import sample_document, sign_in

URL = "/api/custom-options"
MONDAY = date(2026, 11, 16)
FARRO = {
    "meal": "Pranzo",
    "category": "Primi",
    "name": "Pasta di farro",
    "amount": 80,
    "unit": "g",
}


def _user(db: Session, email: str = "ada@example.com") -> User:
    user = User(email=email)
    db.add(user)
    db.flush()
    return user


def _custom_option(
    user_id: int,
    *,
    meal: str = "Pranzo",
    category: str = "Primi",
    name: str = "Pasta di farro",
    amount: float | None = 80,
    unit: str | None = "g",
) -> CustomOption:
    return CustomOption(
        user_id=user_id,
        meal=meal,
        category=category,
        name=name,
        amount=amount,
        unit=unit,
    )


def test_custom_options_store_their_values(database: Session) -> None:
    ada = _user(database)
    database.add_all(
        [
            _custom_option(ada.id),
            _custom_option(
                ada.id,
                meal="Cena",
                category="Contorni",
                name="Insalata mista",
                amount=None,
                unit=None,
            ),
        ]
    )
    database.commit()

    rows = database.execute(
        select(
            CustomOption.meal,
            CustomOption.category,
            CustomOption.name,
            CustomOption.amount,
            CustomOption.unit,
        ).order_by(CustomOption.id)
    ).all()
    assert [tuple(row) for row in rows] == [
        ("Pranzo", "Primi", "Pasta di farro", 80, "g"),
        ("Cena", "Contorni", "Insalata mista", None, None),
    ]


def test_custom_options_of_different_users_stay_separate(database: Session) -> None:
    ada = _user(database)
    grace = _user(database, "grace@example.com")
    database.add_all(
        [
            _custom_option(ada.id),
            _custom_option(grace.id),
            _custom_option(grace.id, name="Riso basmati", amount=70),
        ]
    )
    database.commit()

    ada_names = database.scalars(
        select(CustomOption.name).where(CustomOption.user_id == ada.id)
    ).all()
    grace_names = database.scalars(
        select(CustomOption.name)
        .where(CustomOption.user_id == grace.id)
        .order_by(CustomOption.id)
    ).all()
    assert ada_names == ["Pasta di farro"]
    assert grace_names == ["Pasta di farro", "Riso basmati"]


def test_custom_options_are_not_diet_options(database: Session) -> None:
    ada = _user(database)
    database.add(_custom_option(ada.id))
    database.commit()

    assert database.scalars(select(DietOption)).all() == []


def _signed_in_user(client: TestClient, database: Session) -> User:
    sign_in(client)
    return database.scalars(select(User).where(User.email == "ada@example.com")).one()


def test_create_returns_the_stored_custom_option(
    client: TestClient, database: Session
) -> None:
    ada = _signed_in_user(client, database)

    response = client.post(URL, json=FARRO)

    assert response.status_code == 201
    body = response.json()
    assert body == {"id": body["id"], **FARRO}
    row = database.get(CustomOption, body["id"])
    assert row is not None
    assert row.user_id == ada.id


def test_create_accepts_an_option_without_amount_or_unit(client: TestClient) -> None:
    sign_in(client)

    response = client.post(
        URL, json={"meal": "Cena", "category": "Contorni", "name": "Insalata mista"}
    )

    assert response.status_code == 201
    assert response.json()["amount"] is None
    assert response.json()["unit"] is None


def test_create_does_not_need_an_active_plan_and_never_touches_diet_options(
    client: TestClient, database: Session
) -> None:
    sign_in(client)
    assert client.post("/api/diet-plans", json=sample_document()).status_code == 201
    diet_options_before = database.scalars(select(DietOption)).all()

    assert client.post(URL, json=FARRO).status_code == 201

    diet_options_after = database.scalars(select(DietOption)).all()
    assert len(diet_options_after) == len(diet_options_before)
    assert "Pasta di farro" not in {option.name for option in diet_options_after}


@pytest.mark.parametrize(
    "change",
    [
        {"meal": ""},
        {"category": ""},
        {"name": ""},
        {"name": "x" * 301},
        {"amount": 0},
        {"amount": -5},
        {"amount": 100_001},
        {"unit": ""},
    ],
)
def test_create_rejects_invalid_fields(
    client: TestClient, change: dict[str, object]
) -> None:
    sign_in(client)

    response = client.post(URL, json={**FARRO, **change})

    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["code"] == "VALIDATION_ERROR"


def test_create_rejects_a_duplicate(client: TestClient) -> None:
    sign_in(client)
    assert client.post(URL, json=FARRO).status_code == 201

    response = client.post(URL, json=FARRO)

    assert response.status_code == 409
    assert response.json()["code"] == "CONFLICT"


def test_create_rejects_a_duplicate_without_amount_or_unit(
    client: TestClient,
) -> None:
    sign_in(client)
    option = {"meal": "Cena", "category": "Contorni", "name": "Insalata mista"}
    assert client.post(URL, json=option).status_code == 201

    response = client.post(URL, json=option)

    assert response.status_code == 409


@pytest.mark.parametrize(
    "change",
    [
        {"meal": "Cena"},
        {"category": "Secondi"},
        {"name": "Riso basmati"},
        {"amount": 70},
        {"unit": "ml"},
        {"amount": None, "unit": None},
    ],
)
def test_create_allows_options_that_differ_in_one_field(
    client: TestClient, change: dict[str, object]
) -> None:
    sign_in(client)
    assert client.post(URL, json=FARRO).status_code == 201

    response = client.post(URL, json={**FARRO, **change})

    assert response.status_code == 201


def test_create_allows_the_same_option_for_another_user(
    client: TestClient, database: Session
) -> None:
    grace = _user(database, "grace@example.com")
    database.add(_custom_option(grace.id))
    database.commit()
    sign_in(client)

    response = client.post(URL, json=FARRO)

    assert response.status_code == 201


def test_create_rejects_more_than_the_maximum(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr("app.custom_options.service.MAX_CUSTOM_OPTIONS", 2)
    sign_in(client)
    assert client.post(URL, json=FARRO).status_code == 201
    assert client.post(URL, json={**FARRO, "amount": 70}).status_code == 201

    response = client.post(URL, json={**FARRO, "amount": 60})

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


def test_create_requires_a_session(client: TestClient) -> None:
    response = client.post(URL, json=FARRO)

    assert response.status_code == 401
    assert response.json()["code"] == "UNAUTHORIZED"


def test_delete_removes_the_custom_option(
    client: TestClient, database: Session
) -> None:
    sign_in(client)
    option_id = client.post(URL, json=FARRO).json()["id"]

    response = client.delete(f"{URL}/{option_id}")

    assert response.status_code == 204
    assert response.content == b""
    assert database.get(CustomOption, option_id) is None


def test_delete_of_a_missing_option_is_not_found(client: TestClient) -> None:
    sign_in(client)

    response = client.delete(f"{URL}/999")

    assert response.status_code == 404
    assert response.json()["code"] == "NOT_FOUND"


def test_delete_of_another_users_option_is_not_found(
    client: TestClient, database: Session
) -> None:
    grace = _user(database, "grace@example.com")
    option = _custom_option(grace.id)
    database.add(option)
    database.commit()
    sign_in(client)

    response = client.delete(f"{URL}/{option.id}")

    assert response.status_code == 404
    assert response.json()["code"] == "NOT_FOUND"
    assert database.get(CustomOption, option.id) is not None


def test_delete_keeps_a_day_that_picked_the_option(
    client: TestClient, database: Session
) -> None:
    ada = _signed_in_user(client, database)
    option_id = client.post(URL, json=FARRO).json()["id"]
    database.add(DailyChoice(user_id=ada.id, date=MONDAY, **FARRO))
    database.commit()

    assert client.delete(f"{URL}/{option_id}").status_code == 204

    day = client.get(f"/api/days/{MONDAY.isoformat()}")
    assert day.json()["choices"] == [FARRO]


def test_delete_requires_a_session(client: TestClient) -> None:
    response = client.delete(f"{URL}/1")

    assert response.status_code == 401
    assert response.json()["code"] == "UNAUTHORIZED"
