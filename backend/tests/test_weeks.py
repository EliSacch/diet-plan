from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

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
