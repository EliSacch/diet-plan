from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.day import DailyChoice
from app.models.diet import DietOption
from app.models.user import User
from tests.test_diet_plans import replacement_document, sample_document, sign_in

MONDAY = date(2026, 11, 16)
TUESDAY = date(2026, 11, 17)
WEDNESDAY = date(2026, 11, 18)
NEXT_MONDAY = date(2026, 11, 23)


def _user(db: Session, email: str = "ada@example.com") -> User:
    user = User(email=email)
    db.add(user)
    db.flush()
    return user


def _choice(
    user_id: int,
    *,
    target_date: date = MONDAY,
    meal: str = "Pranzo",
    category: str = "Primi",
    name: str = "Pasta",
    amount: float | None = 80,
    unit: str | None = "g",
) -> DailyChoice:
    return DailyChoice(
        user_id=user_id,
        date=target_date,
        meal=meal,
        category=category,
        name=name,
        amount=amount,
        unit=unit,
    )


def test_a_user_can_store_choices_across_multiple_dates(database: Session) -> None:
    ada = _user(database)
    database.add_all(
        [
            _choice(ada.id, target_date=MONDAY),
            _choice(ada.id, target_date=TUESDAY, meal="Cena", category="Secondi"),
            _choice(ada.id, target_date=NEXT_MONDAY),
        ]
    )
    database.commit()

    dates = database.scalars(
        select(DailyChoice.date)
        .where(DailyChoice.user_id == ada.id)
        .order_by(DailyChoice.date)
    ).all()
    assert dates == [MONDAY, TUESDAY, NEXT_MONDAY]


def test_two_users_can_plan_the_same_date_and_slot(database: Session) -> None:
    ada = _user(database)
    grace = _user(database, "grace@example.com")
    database.add_all([_choice(ada.id), _choice(grace.id)])
    database.commit()

    assert len(database.scalars(select(DailyChoice)).all()) == 2


def test_choices_store_the_copied_values(database: Session) -> None:
    ada = _user(database)
    database.add_all(
        [
            _choice(ada.id),
            _choice(
                ada.id,
                meal="Colazione",
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
            DailyChoice.meal,
            DailyChoice.category,
            DailyChoice.name,
            DailyChoice.amount,
            DailyChoice.unit,
        ).order_by(DailyChoice.id)
    ).all()
    assert [tuple(row) for row in rows] == [
        ("Pranzo", "Primi", "Pasta", 80, "g"),
        ("Colazione", "Contorni", "Insalata mista", None, None),
    ]


def test_a_day_has_one_choice_per_meal_and_category(database: Session) -> None:
    ada = _user(database)
    database.add(_choice(ada.id))
    database.commit()

    database.add(_choice(ada.id, name="Riso", amount=70))
    with pytest.raises(IntegrityError):
        database.commit()
    database.rollback()


def _options_url(target_date: date | str = MONDAY) -> str:
    value = target_date.isoformat() if isinstance(target_date, date) else target_date
    return f"/api/days/{value}/options"


def test_options_return_the_matching_weekday_from_the_active_plan(
    client: TestClient,
) -> None:
    sign_in(client)
    assert client.post("/api/diet-plans", json=sample_document()).status_code == 201

    monday = client.get(_options_url(MONDAY))
    tuesday = client.get(_options_url(TUESDAY))
    next_monday = client.get(_options_url(NEXT_MONDAY))

    assert monday.status_code == 200
    assert monday.json() == sample_document()["days"][0]  # type: ignore[index]
    assert tuesday.status_code == 200
    assert tuesday.json() == sample_document()["days"][1]  # type: ignore[index]
    assert next_monday.json() == monday.json()


def test_options_follow_the_newly_active_plan(client: TestClient) -> None:
    sign_in(client)
    assert client.post("/api/diet-plans", json=sample_document()).status_code == 201
    assert (
        client.post("/api/diet-plans", json=replacement_document()).status_code == 201
    )

    response = client.get(_options_url(MONDAY))

    assert response.json() == replacement_document()["days"][0]  # type: ignore[index]


def test_options_without_an_active_plan_are_not_found(client: TestClient) -> None:
    sign_in(client)

    response = client.get(_options_url())

    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["code"] == "NOT_FOUND"


def test_options_for_a_weekday_missing_from_the_plan_are_not_found(
    client: TestClient,
) -> None:
    sign_in(client)
    assert client.post("/api/diet-plans", json=sample_document()).status_code == 201

    response = client.get(_options_url(WEDNESDAY))

    assert response.status_code == 404
    assert response.json()["code"] == "NOT_FOUND"


@pytest.mark.parametrize("target_date", ["not-a-date", "2026-02-30"])
def test_options_reject_an_invalid_date(client: TestClient, target_date: str) -> None:
    sign_in(client)

    response = client.get(_options_url(target_date))

    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["code"] == "VALIDATION_ERROR"


def test_options_require_a_session(client: TestClient) -> None:
    response = client.get(_options_url())

    assert response.status_code == 401
    assert response.json()["code"] == "UNAUTHORIZED"


def _day_url(target_date: date | str = MONDAY) -> str:
    value = target_date.isoformat() if isinstance(target_date, date) else target_date
    return f"/api/days/{value}"


DRINK = {
    "meal": "Colazione",
    "category": "Bevande",
    "name": "Bevanda a base di avena con calcio e vitamine agg.",
    "amount": 250,
    "unit": "ml",
}
SALAD = {
    "meal": "Colazione",
    "category": "Contorni",
    "name": "Insalata mista",
    "amount": None,
    "unit": None,
}
PASTA = {
    "meal": "Pranzo",
    "category": "Primi",
    "name": "Pasta",
    "amount": 80,
    "unit": "g",
}
FISH = {
    "meal": "Cena",
    "category": "Secondi",
    "name": "Pesce",
    "amount": 150,
    "unit": "g",
}
TEA = {
    "meal": "Colazione",
    "category": "Bevande",
    "name": "Tè",
    "amount": 200,
    "unit": "ml",
}


def _signed_in_with_plan(client: TestClient) -> None:
    sign_in(client)
    assert client.post("/api/diet-plans", json=sample_document()).status_code == 201


def test_a_day_that_was_never_saved_has_no_choices(client: TestClient) -> None:
    sign_in(client)

    response = client.get(_day_url(TUESDAY))

    assert response.status_code == 200
    assert response.json() == {"date": "2026-11-17", "choices": []}


def test_saved_choices_come_back_with_their_amounts(client: TestClient) -> None:
    _signed_in_with_plan(client)
    choices = [DRINK, SALAD, PASTA]

    saved = client.put(_day_url(MONDAY), json={"choices": choices})

    assert saved.status_code == 200
    assert saved.json() == {"date": "2026-11-16", "choices": choices}
    assert client.get(_day_url(MONDAY)).json() == saved.json()


def test_a_partial_day_can_be_saved(client: TestClient) -> None:
    _signed_in_with_plan(client)

    saved = client.put(_day_url(MONDAY), json={"choices": [PASTA]})

    assert saved.status_code == 200
    assert client.get(_day_url(MONDAY)).json()["choices"] == [PASTA]


def test_saving_a_day_again_replaces_only_that_days_choices(
    client: TestClient, database: Session
) -> None:
    _signed_in_with_plan(client)
    assert (
        client.put(_day_url(MONDAY), json={"choices": [DRINK, PASTA]}).status_code
        == 200
    )
    assert client.put(_day_url(TUESDAY), json={"choices": [FISH]}).status_code == 200

    saved = client.put(_day_url(MONDAY), json={"choices": [PASTA]})

    assert saved.status_code == 200
    assert client.get(_day_url(MONDAY)).json()["choices"] == [PASTA]
    assert client.get(_day_url(TUESDAY)).json()["choices"] == [FISH]
    assert len(database.scalars(select(DailyChoice)).all()) == 2


def test_clearing_a_day_deletes_its_choices(
    client: TestClient, database: Session
) -> None:
    _signed_in_with_plan(client)
    assert client.put(_day_url(MONDAY), json={"choices": [PASTA]}).status_code == 200

    cleared = client.put(_day_url(MONDAY), json={"choices": []})

    assert cleared.status_code == 200
    assert cleared.json() == {"date": "2026-11-16", "choices": []}
    assert database.scalars(select(DailyChoice)).all() == []


def test_another_users_day_stays_private(client: TestClient, database: Session) -> None:
    grace = _user(database, "grace@example.com")
    database.add(_choice(grace.id, name="Riso", amount=70))
    database.commit()
    _signed_in_with_plan(client)

    assert client.get(_day_url(MONDAY)).json()["choices"] == []
    assert client.put(_day_url(MONDAY), json={"choices": [PASTA]}).status_code == 200

    grace_choices = database.scalars(
        select(DailyChoice.name).where(DailyChoice.user_id == grace.id)
    ).all()
    assert grace_choices == ["Riso"]


def test_reloading_a_day_returns_the_copied_amount(
    client: TestClient, database: Session
) -> None:
    _signed_in_with_plan(client)
    assert client.put(_day_url(MONDAY), json={"choices": [PASTA]}).status_code == 200

    source = database.scalar(select(DietOption).where(DietOption.name == "Pasta"))
    assert source is not None
    source.amount = 120
    source.unit = "kg"
    database.commit()

    assert client.get(_day_url(MONDAY)).json()["choices"] == [PASTA]


@pytest.mark.parametrize(
    ("target_date", "choice"),
    [
        (MONDAY, {**PASTA, "amount": 500}),
        (MONDAY, {**PASTA, "unit": "kg"}),
        (MONDAY, {**PASTA, "name": "Pizza"}),
        (MONDAY, FISH),
        (TUESDAY, PASTA),
        (WEDNESDAY, PASTA),
        (MONDAY, {**SALAD, "amount": 1}),
    ],
)
def test_a_choice_must_match_an_option_of_that_weekday_in_the_active_plan(
    client: TestClient, target_date: date, choice: dict[str, object]
) -> None:
    _signed_in_with_plan(client)

    response = client.put(_day_url(target_date), json={"choices": [choice]})

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"
    assert response.json()["detail"] == (
        "choices.0: not an option of the active diet plan"
    )
    assert client.get(_day_url(target_date)).json()["choices"] == []


def test_choices_need_an_active_plan(client: TestClient) -> None:
    sign_in(client)

    response = client.put(_day_url(MONDAY), json={"choices": [PASTA]})

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


def test_an_empty_day_can_be_saved_without_an_active_plan(client: TestClient) -> None:
    sign_in(client)

    response = client.put(_day_url(TUESDAY), json={"choices": []})

    assert response.status_code == 200
    assert response.json() == {"date": "2026-11-17", "choices": []}


def test_two_choices_for_the_same_slot_are_rejected(client: TestClient) -> None:
    _signed_in_with_plan(client)

    response = client.put(
        _day_url(MONDAY), json={"choices": [PASTA, {**PASTA, "name": "Riso"}]}
    )

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"
    assert "Pranzo / Primi has more than one choice" in response.json()["detail"]


def test_a_saved_choice_can_be_kept_after_the_plan_changes(
    client: TestClient,
) -> None:
    _signed_in_with_plan(client)
    assert client.put(_day_url(MONDAY), json={"choices": [PASTA]}).status_code == 200
    assert (
        client.post("/api/diet-plans", json=replacement_document()).status_code == 201
    )

    saved = client.put(_day_url(MONDAY), json={"choices": [PASTA, TEA]})

    assert saved.status_code == 200
    assert saved.json()["choices"] == [PASTA, TEA]


def test_a_failed_save_keeps_the_previous_choices(
    client: TestClient, database: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _signed_in_with_plan(client)
    assert client.put(_day_url(MONDAY), json={"choices": [PASTA]}).status_code == 200

    def fail_commit(self: Session) -> None:
        raise RuntimeError("commit failed")

    monkeypatch.setattr(Session, "commit", fail_commit)
    with pytest.raises(RuntimeError, match="commit failed"):
        client.put(_day_url(MONDAY), json={"choices": [DRINK]})
    monkeypatch.undo()

    database.expire_all()
    assert client.get(_day_url(MONDAY)).json()["choices"] == [PASTA]


@pytest.mark.parametrize("method", ["get", "put"])
def test_day_routes_reject_invalid_dates(client: TestClient, method: str) -> None:
    sign_in(client)

    response = client.request(method, _day_url("2026-02-30"), json={"choices": []})

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


@pytest.mark.parametrize("method", ["get", "put"])
def test_day_routes_require_a_session(client: TestClient, method: str) -> None:
    response = client.request(method, _day_url(), json={"choices": []})

    assert response.status_code == 401
    assert response.json()["code"] == "UNAUTHORIZED"
