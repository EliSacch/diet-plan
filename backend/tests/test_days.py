from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.custom_option import CustomOption
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


def test_a_day_can_store_multiple_choices_for_the_same_slot(
    database: Session,
) -> None:
    ada = _user(database)
    database.add_all([_choice(ada.id), _choice(ada.id, name="Riso", amount=70)])
    database.commit()

    rows = database.scalars(
        select(DailyChoice.name)
        .where(DailyChoice.user_id == ada.id)
        .order_by(DailyChoice.id)
    ).all()
    assert rows == ["Pasta", "Riso"]


def _options_url(target_date: date | str = MONDAY) -> str:
    value = target_date.isoformat() if isinstance(target_date, date) else target_date
    return f"/api/days/{value}/options"


def _with_empty_extras(plan_day: object) -> dict[str, object]:
    day = dict(plan_day)  # type: ignore[call-overload]
    day["meals"] = [
        {
            **meal,
            "categories": [
                {
                    **category,
                    "custom_options": [],
                    "current": [],
                    "multi_select": False,
                }
                for category in meal["categories"]
            ],
        }
        for meal in day["meals"]
    ]
    return day


def _category(
    options: dict[str, object], meal: str, category: str
) -> dict[str, object]:
    for meal_entry in options["meals"]:  # type: ignore[union-attr]
        if meal_entry["meal"] == meal:
            for category_entry in meal_entry["categories"]:
                if category_entry["category"] == category:
                    return category_entry
    raise AssertionError(f"{meal} / {category} not in options")


def _custom_option(
    user_id: int,
    *,
    meal: str = "Pranzo",
    category: str = "Primi",
    name: str = "Pasta di farro",
    amount: float | None = 70,
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


def _signed_in_user(client: TestClient, database: Session) -> User:
    sign_in(client)
    assert client.post("/api/diet-plans", json=sample_document()).status_code == 201
    return database.scalars(select(User).where(User.email == "ada@example.com")).one()


def test_options_return_the_matching_weekday_from_the_active_plan(
    client: TestClient,
) -> None:
    sign_in(client)
    assert client.post("/api/diet-plans", json=sample_document()).status_code == 201

    monday = client.get(_options_url(MONDAY))
    tuesday = client.get(_options_url(TUESDAY))
    next_monday = client.get(_options_url(NEXT_MONDAY))

    assert monday.status_code == 200
    assert monday.json() == _with_empty_extras(sample_document()["days"][0])  # type: ignore[index]
    assert tuesday.status_code == 200
    assert tuesday.json() == _with_empty_extras(sample_document()["days"][1])  # type: ignore[index]
    assert next_monday.json() == monday.json()


def test_options_follow_the_newly_active_plan(client: TestClient) -> None:
    sign_in(client)
    assert client.post("/api/diet-plans", json=sample_document()).status_code == 201
    assert (
        client.post("/api/diet-plans", json=replacement_document()).status_code == 201
    )

    response = client.get(_options_url(MONDAY))

    assert response.json() == _with_empty_extras(replacement_document()["days"][0])  # type: ignore[index]


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


def test_options_list_the_users_custom_options_for_each_category(
    client: TestClient, database: Session
) -> None:
    ada = _signed_in_user(client, database)
    farro = _custom_option(ada.id)
    salad = _custom_option(
        ada.id,
        meal="Colazione",
        category="Contorni",
        name="Rucola",
        amount=None,
        unit=None,
    )
    database.add_all([farro, salad])
    database.commit()

    options = client.get(_options_url(MONDAY)).json()

    assert _category(options, "Pranzo", "Primi")["custom_options"] == [
        {"id": farro.id, "name": "Pasta di farro", "amount": 70, "unit": "g"}
    ]
    assert _category(options, "Colazione", "Contorni")["custom_options"] == [
        {"id": salad.id, "name": "Rucola", "amount": None, "unit": None}
    ]
    assert _category(options, "Colazione", "Bevande")["custom_options"] == []


def test_options_offer_a_custom_option_on_any_weekday_with_that_meal_and_category(
    client: TestClient, database: Session
) -> None:
    ada = _signed_in_user(client, database)
    database.add(_custom_option(ada.id, meal="Cena", category="Secondi"))
    database.commit()

    monday = client.get(_options_url(MONDAY)).json()
    tuesday = client.get(_options_url(TUESDAY)).json()

    assert all(
        category["custom_options"] == []
        for meal in monday["meals"]
        for category in meal["categories"]
    )
    assert [
        option["name"]
        for option in _category(tuesday, "Cena", "Secondi")["custom_options"]
    ] == ["Pasta di farro"]


def test_options_exclude_other_users_custom_options(
    client: TestClient, database: Session
) -> None:
    grace = _user(database, "grace@example.com")
    database.add(_custom_option(grace.id))
    database.commit()
    _signed_in_user(client, database)

    options = client.get(_options_url(MONDAY)).json()

    assert _category(options, "Pranzo", "Primi")["custom_options"] == []


def test_options_exclude_custom_options_of_another_meal_or_category(
    client: TestClient, database: Session
) -> None:
    ada = _signed_in_user(client, database)
    database.add_all(
        [
            _custom_option(ada.id, meal="Cena"),
            _custom_option(ada.id, category="Secondi"),
        ]
    )
    database.commit()

    options = client.get(_options_url(MONDAY)).json()

    assert _category(options, "Pranzo", "Primi")["custom_options"] == []


def test_options_return_an_edited_saved_pick_as_current(
    client: TestClient, database: Session
) -> None:
    ada = _signed_in_user(client, database)
    database.add(_choice(ada.id, name="Pasta", amount=100, unit="g"))
    database.commit()

    options = client.get(_options_url(MONDAY)).json()

    primi = _category(options, "Pranzo", "Primi")
    assert primi["current"] == [{"name": "Pasta", "amount": 100, "unit": "g"}]
    assert primi["multi_select"] is False
    assert primi["options"] == [
        {"name": "Pasta", "amount": 80, "unit": "g", "position": 0}
    ]


def test_options_current_is_only_for_that_date(
    client: TestClient, database: Session
) -> None:
    ada = _signed_in_user(client, database)
    database.add(
        _choice(ada.id, target_date=NEXT_MONDAY, name="Pasta", amount=100, unit="g")
    )
    database.commit()

    options = client.get(_options_url(MONDAY)).json()

    assert _category(options, "Pranzo", "Primi")["current"] == []


def test_options_current_is_empty_when_the_saved_pick_is_a_diet_option(
    client: TestClient, database: Session
) -> None:
    ada = _signed_in_user(client, database)
    database.add(_choice(ada.id, name="Pasta", amount=80, unit="g"))
    database.commit()

    options = client.get(_options_url(MONDAY)).json()

    assert _category(options, "Pranzo", "Primi")["current"] == []


def test_options_current_is_empty_when_the_saved_pick_is_a_custom_option(
    client: TestClient, database: Session
) -> None:
    ada = _signed_in_user(client, database)
    database.add_all(
        [
            _custom_option(ada.id),
            _choice(ada.id, name="Pasta di farro", amount=70, unit="g"),
        ]
    )
    database.commit()

    options = client.get(_options_url(MONDAY)).json()

    primi = _category(options, "Pranzo", "Primi")
    assert primi["current"] == []
    assert [option["name"] for option in primi["custom_options"]] == ["Pasta di farro"]


def test_options_return_a_pick_whose_custom_option_was_deleted_as_current(
    client: TestClient, database: Session
) -> None:
    ada = _signed_in_user(client, database)
    farro = _custom_option(ada.id)
    database.add_all(
        [farro, _choice(ada.id, name="Pasta di farro", amount=70, unit="g")]
    )
    database.commit()
    assert client.delete(f"/api/custom-options/{farro.id}").status_code == 204

    options = client.get(_options_url(MONDAY)).json()

    primi = _category(options, "Pranzo", "Primi")
    assert primi["custom_options"] == []
    assert primi["current"] == [{"name": "Pasta di farro", "amount": 70, "unit": "g"}]


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
    "choice",
    [
        {**PASTA, "amount": 500},
        {**PASTA, "unit": "kg"},
        {**PASTA, "name": "Pizza"},
        {**PASTA, "amount": None, "unit": None},
        {**SALAD, "amount": 1},
    ],
)
def test_a_choice_can_have_any_values_for_a_meal_and_category_of_the_plan(
    client: TestClient, choice: dict[str, object]
) -> None:
    _signed_in_with_plan(client)

    response = client.put(_day_url(MONDAY), json={"choices": [choice]})

    assert response.status_code == 200
    assert client.get(_day_url(MONDAY)).json()["choices"] == [choice]


@pytest.mark.parametrize(
    ("target_date", "choice"),
    [
        (MONDAY, FISH),
        (MONDAY, {**PASTA, "category": "Secondi"}),
        (MONDAY, {**PASTA, "meal": "Cena"}),
        (TUESDAY, PASTA),
        (WEDNESDAY, PASTA),
    ],
)
def test_a_choice_must_be_for_a_meal_and_category_of_that_weekday(
    client: TestClient, target_date: date, choice: dict[str, object]
) -> None:
    _signed_in_with_plan(client)

    response = client.put(_day_url(target_date), json={"choices": [choice]})

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"
    assert response.json()["detail"] == (
        "choices.0: not a meal and category of the active diet plan"
    )
    assert client.get(_day_url(target_date)).json()["choices"] == []


def test_an_edited_amount_is_saved_for_that_date_only(
    client: TestClient, database: Session
) -> None:
    _signed_in_with_plan(client)
    diet_options_before = [
        (row.name, row.amount, row.unit)
        for row in database.scalars(select(DietOption).order_by(DietOption.id))
    ]
    assert client.put(_day_url(MONDAY), json={"choices": [PASTA]}).status_code == 200
    assert (
        client.put(_day_url(NEXT_MONDAY), json={"choices": [PASTA]}).status_code == 200
    )

    edited = {**PASTA, "amount": 100}
    saved = client.put(_day_url(MONDAY), json={"choices": [edited]})

    assert saved.status_code == 200
    assert saved.json()["choices"] == [edited]
    assert client.get(_day_url(NEXT_MONDAY)).json()["choices"] == [PASTA]
    next_monday_primi = _category(
        client.get(_options_url(NEXT_MONDAY)).json(), "Pranzo", "Primi"
    )
    assert next_monday_primi["options"] == [
        {"name": "Pasta", "amount": 80, "unit": "g", "position": 0}
    ]
    assert next_monday_primi["current"] == []
    assert next_monday_primi["multi_select"] is False
    diet_options_after = [
        (row.name, row.amount, row.unit)
        for row in database.scalars(select(DietOption).order_by(DietOption.id))
    ]
    assert diet_options_after == diet_options_before


def test_a_custom_option_can_be_saved_as_a_choice(
    client: TestClient, database: Session
) -> None:
    _signed_in_with_plan(client)
    farro = {**PASTA, "name": "Pasta di farro", "amount": 70}
    created = client.post(
        "/api/custom-options",
        json={
            key: farro[key] for key in ("meal", "category", "name", "amount", "unit")
        },
    )
    assert created.status_code == 201

    saved = client.put(_day_url(MONDAY), json={"choices": [farro]})

    assert saved.status_code == 200
    assert saved.json()["choices"] == [farro]
    assert len(database.scalars(select(CustomOption)).all()) == 1
    assert "Pasta di farro" not in {
        row.name for row in database.scalars(select(DietOption))
    }


def test_a_saved_choice_can_be_edited_after_the_plan_drops_its_slot(
    client: TestClient,
) -> None:
    _signed_in_with_plan(client)
    assert client.put(_day_url(MONDAY), json={"choices": [PASTA]}).status_code == 200
    assert (
        client.post("/api/diet-plans", json=replacement_document()).status_code == 201
    )

    edited = {**PASTA, "amount": 90}
    saved = client.put(_day_url(MONDAY), json={"choices": [edited]})

    assert saved.status_code == 200
    assert saved.json()["choices"] == [edited]


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


def test_two_choices_for_the_same_slot_are_saved(client: TestClient) -> None:
    _signed_in_with_plan(client)
    riso = {**PASTA, "name": "Riso", "amount": 70}

    response = client.put(_day_url(MONDAY), json={"choices": [PASTA, riso]})

    assert response.status_code == 200
    assert response.json()["choices"] == [PASTA, riso]


def test_the_same_choice_twice_is_rejected(client: TestClient) -> None:
    _signed_in_with_plan(client)

    response = client.put(_day_url(MONDAY), json={"choices": [PASTA, PASTA]})

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"
    assert "Pranzo / Primi has Pasta twice" in response.json()["detail"]


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
