from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.diet import DietOption
from app.models.user import User
from app.models.week import WeeklyChoice, WeeklyPlan
from tests.test_diet_plans import replacement_document, sample_document, sign_in

MONDAY = date(2026, 11, 16)
NEXT_MONDAY = date(2026, 11, 23)


def _user(db: Session, email: str = "ada@example.com") -> User:
    user = User(email=email)
    db.add(user)
    db.flush()
    return user


def _week(db: Session, user_id: int, week_start: date = MONDAY) -> WeeklyPlan:
    week = WeeklyPlan(user_id=user_id, week_start=week_start)
    db.add(week)
    db.flush()
    return week


def _choice(
    weekly_plan_id: int,
    *,
    day: str = "Lunedì",
    meal: str = "Pranzo",
    category: str = "Primi",
    name: str = "Pasta",
    amount: float | None = 80,
    unit: str | None = "g",
) -> WeeklyChoice:
    return WeeklyChoice(
        weekly_plan_id=weekly_plan_id,
        day=day,
        meal=meal,
        category=category,
        name=name,
        amount=amount,
        unit=unit,
    )


def test_a_user_can_have_two_weeks(database: Session) -> None:
    ada = _user(database)
    _week(database, ada.id, MONDAY)
    _week(database, ada.id, NEXT_MONDAY)
    database.commit()

    starts = database.scalars(
        select(WeeklyPlan.week_start)
        .where(WeeklyPlan.user_id == ada.id)
        .order_by(WeeklyPlan.week_start)
    ).all()
    assert starts == [MONDAY, NEXT_MONDAY]


def test_two_users_can_plan_the_same_week(database: Session) -> None:
    ada = _user(database)
    grace = _user(database, "grace@example.com")
    _week(database, ada.id)
    _week(database, grace.id)
    database.commit()

    assert len(database.scalars(select(WeeklyPlan)).all()) == 2


def test_a_user_cannot_have_the_same_week_twice(database: Session) -> None:
    ada = _user(database)
    _week(database, ada.id)
    database.commit()

    database.add(WeeklyPlan(user_id=ada.id, week_start=MONDAY))
    with pytest.raises(IntegrityError):
        database.commit()
    database.rollback()


def test_choices_store_the_copied_values(database: Session) -> None:
    ada = _user(database)
    week = _week(database, ada.id)
    database.add_all(
        [
            _choice(week.id),
            _choice(
                week.id,
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
            WeeklyChoice.meal,
            WeeklyChoice.category,
            WeeklyChoice.name,
            WeeklyChoice.amount,
            WeeklyChoice.unit,
        ).order_by(WeeklyChoice.id)
    ).all()
    assert [tuple(row) for row in rows] == [
        ("Pranzo", "Primi", "Pasta", 80, "g"),
        ("Colazione", "Contorni", "Insalata mista", None, None),
    ]


def test_a_week_has_one_choice_per_day_meal_and_category(database: Session) -> None:
    ada = _user(database)
    week = _week(database, ada.id)
    database.add(_choice(week.id))
    database.commit()

    database.add(_choice(week.id, name="Riso", amount=70))
    with pytest.raises(IntegrityError):
        database.commit()
    database.rollback()


def test_the_same_slot_can_be_picked_in_another_day_or_week(
    database: Session,
) -> None:
    ada = _user(database)
    week = _week(database, ada.id, MONDAY)
    next_week = _week(database, ada.id, NEXT_MONDAY)
    database.add_all(
        [
            _choice(week.id),
            _choice(week.id, day="Martedì"),
            _choice(week.id, category="Secondi", name="Pesce", amount=150),
            _choice(next_week.id),
        ]
    )
    database.commit()

    assert len(database.scalars(select(WeeklyChoice)).all()) == 4


def _options_url(week_start: str = MONDAY.isoformat()) -> str:
    return f"/api/weeks/{week_start}/options"


def test_options_are_the_active_plan_grouped_in_order(client: TestClient) -> None:
    sign_in(client)
    assert client.post("/api/diet-plans", json=sample_document()).status_code == 201

    response = client.get(_options_url())

    assert response.status_code == 200
    assert response.json() == sample_document()


def test_options_follow_the_newly_active_plan(client: TestClient) -> None:
    sign_in(client)
    assert client.post("/api/diet-plans", json=sample_document()).status_code == 201
    assert (
        client.post("/api/diet-plans", json=replacement_document()).status_code == 201
    )

    response = client.get(_options_url())

    assert response.json() == replacement_document()


def test_options_without_an_active_plan_are_not_found(client: TestClient) -> None:
    sign_in(client)

    response = client.get(_options_url())

    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["code"] == "NOT_FOUND"


@pytest.mark.parametrize(
    ("week_start", "detail"),
    [
        ("2026-11-17", "week_start must be a Monday"),
        ("2026-11-22", "week_start must be a Monday"),
        ("not-a-date", "week_start"),
        ("2026-02-30", "week_start"),
    ],
)
def test_options_reject_a_week_start_that_is_not_a_monday(
    client: TestClient, week_start: str, detail: str
) -> None:
    sign_in(client)
    assert client.post("/api/diet-plans", json=sample_document()).status_code == 201

    response = client.get(_options_url(week_start))

    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["code"] == "VALIDATION_ERROR"
    assert detail in response.json()["detail"]


def test_options_require_a_session(client: TestClient) -> None:
    response = client.get(_options_url())

    assert response.status_code == 401
    assert response.json()["code"] == "UNAUTHORIZED"


def _week_url(week_start: date | str = MONDAY) -> str:
    start = week_start.isoformat() if isinstance(week_start, date) else week_start
    return f"/api/weeks/{start}"


DRINK = {
    "day": "Lunedì",
    "meal": "Colazione",
    "category": "Bevande",
    "name": "Bevanda a base di avena con calcio e vitamine agg.",
    "amount": 250,
    "unit": "ml",
}
SALAD = {
    "day": "Lunedì",
    "meal": "Colazione",
    "category": "Contorni",
    "name": "Insalata mista",
    "amount": None,
    "unit": None,
}
PASTA = {
    "day": "Lunedì",
    "meal": "Pranzo",
    "category": "Primi",
    "name": "Pasta",
    "amount": 80,
    "unit": "g",
}
FISH = {
    "day": "Martedì",
    "meal": "Cena",
    "category": "Secondi",
    "name": "Pesce",
    "amount": 150,
    "unit": "g",
}
TEA = {
    "day": "Mercoledì",
    "meal": "Colazione",
    "category": "Bevande",
    "name": "Tè",
    "amount": 200,
    "unit": "ml",
}


def _signed_in_with_plan(client: TestClient) -> None:
    sign_in(client)
    assert client.post("/api/diet-plans", json=sample_document()).status_code == 201


def test_a_week_that_was_never_saved_has_no_choices(client: TestClient) -> None:
    sign_in(client)

    response = client.get(_week_url())

    assert response.status_code == 200
    assert response.json() == {"week_start": "2026-11-16", "choices": []}


def test_saved_choices_come_back_with_their_amounts(client: TestClient) -> None:
    _signed_in_with_plan(client)
    choices = [DRINK, SALAD, PASTA, FISH]

    saved = client.put(_week_url(), json={"choices": choices})

    assert saved.status_code == 200
    assert saved.json() == {"week_start": "2026-11-16", "choices": choices}
    assert client.get(_week_url()).json() == saved.json()


def test_a_partial_week_can_be_saved(client: TestClient) -> None:
    _signed_in_with_plan(client)

    saved = client.put(_week_url(), json={"choices": [PASTA]})

    assert saved.status_code == 200
    assert client.get(_week_url()).json()["choices"] == [PASTA]


def test_saving_a_week_again_replaces_its_choices(
    client: TestClient, database: Session
) -> None:
    _signed_in_with_plan(client)
    assert client.put(_week_url(), json={"choices": [DRINK, PASTA]}).status_code == 200

    saved = client.put(_week_url(), json={"choices": [FISH]})

    assert saved.status_code == 200
    assert client.get(_week_url()).json()["choices"] == [FISH]
    assert len(database.scalars(select(WeeklyPlan)).all()) == 1
    assert len(database.scalars(select(WeeklyChoice)).all()) == 1


def test_two_weeks_are_saved_side_by_side(client: TestClient) -> None:
    _signed_in_with_plan(client)

    assert client.put(_week_url(MONDAY), json={"choices": [PASTA]}).status_code == 200
    assert (
        client.put(_week_url(NEXT_MONDAY), json={"choices": [FISH]}).status_code == 200
    )

    assert client.get(_week_url(MONDAY)).json()["choices"] == [PASTA]
    assert client.get(_week_url(NEXT_MONDAY)).json() == {
        "week_start": "2026-11-23",
        "choices": [FISH],
    }


def test_another_users_week_stays_private(
    client: TestClient, database: Session
) -> None:
    grace = _user(database, "grace@example.com")
    week = _week(database, grace.id)
    database.add(_choice(week.id, name="Riso", amount=70))
    database.commit()
    _signed_in_with_plan(client)

    assert client.get(_week_url()).json()["choices"] == []
    assert client.put(_week_url(), json={"choices": [PASTA]}).status_code == 200

    grace_choices = database.scalars(
        select(WeeklyChoice.name).where(WeeklyChoice.weekly_plan_id == week.id)
    ).all()
    assert grace_choices == ["Riso"]


def test_reloading_a_week_returns_the_copied_amount(
    client: TestClient, database: Session
) -> None:
    _signed_in_with_plan(client)
    assert client.put(_week_url(), json={"choices": [PASTA]}).status_code == 200

    source = database.scalar(select(DietOption).where(DietOption.name == "Pasta"))
    assert source is not None
    source.amount = 120
    source.unit = "kg"
    database.commit()

    assert client.get(_week_url()).json()["choices"] == [PASTA]


@pytest.mark.parametrize(
    "choice",
    [
        {**PASTA, "amount": 500},
        {**PASTA, "unit": "kg"},
        {**PASTA, "name": "Pizza"},
        {**PASTA, "day": "Martedì"},
        {**SALAD, "amount": 1},
    ],
)
def test_a_choice_must_match_an_option_of_the_active_plan(
    client: TestClient, choice: dict[str, object]
) -> None:
    _signed_in_with_plan(client)

    response = client.put(_week_url(), json={"choices": [DRINK, choice]})

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"
    assert response.json()["detail"] == (
        "choices.1: not an option of the active diet plan"
    )
    assert client.get(_week_url()).json()["choices"] == []


def test_choices_need_an_active_plan(client: TestClient) -> None:
    sign_in(client)

    response = client.put(_week_url(), json={"choices": [PASTA]})

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


def test_an_empty_week_can_be_saved_without_an_active_plan(
    client: TestClient,
) -> None:
    sign_in(client)

    response = client.put(_week_url(), json={"choices": []})

    assert response.status_code == 200
    assert response.json() == {"week_start": "2026-11-16", "choices": []}


def test_two_choices_for_the_same_slot_are_rejected(client: TestClient) -> None:
    _signed_in_with_plan(client)

    response = client.put(
        _week_url(), json={"choices": [PASTA, {**PASTA, "name": "Riso"}]}
    )

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"
    assert (
        "Lunedì / Pranzo / Primi has more than one choice"
        in (response.json()["detail"])
    )


def test_a_saved_choice_can_be_kept_after_the_plan_changes(
    client: TestClient,
) -> None:
    _signed_in_with_plan(client)
    assert client.put(_week_url(), json={"choices": [PASTA]}).status_code == 200
    assert (
        client.post("/api/diet-plans", json=replacement_document()).status_code == 201
    )

    saved = client.put(_week_url(), json={"choices": [PASTA, TEA]})

    assert saved.status_code == 200
    assert saved.json()["choices"] == [PASTA, TEA]


def test_a_failed_save_keeps_the_previous_choices(
    client: TestClient, database: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _signed_in_with_plan(client)
    assert client.put(_week_url(), json={"choices": [PASTA]}).status_code == 200

    def fail_commit(self: Session) -> None:
        raise RuntimeError("commit failed")

    monkeypatch.setattr(Session, "commit", fail_commit)
    with pytest.raises(RuntimeError, match="commit failed"):
        client.put(_week_url(), json={"choices": [FISH]})
    monkeypatch.undo()

    database.expire_all()
    assert client.get(_week_url()).json()["choices"] == [PASTA]


@pytest.mark.parametrize("method", ["get", "put"])
def test_a_week_start_must_be_a_monday(client: TestClient, method: str) -> None:
    sign_in(client)

    response = client.request(method, _week_url("2026-11-17"), json={"choices": []})

    assert response.status_code == 422
    assert response.json()["detail"] == "week_start must be a Monday"


@pytest.mark.parametrize("method", ["get", "put"])
def test_week_routes_require_a_session(client: TestClient, method: str) -> None:
    response = client.request(method, _week_url(), json={"choices": []})

    assert response.status_code == 401
    assert response.json()["code"] == "UNAUTHORIZED"
