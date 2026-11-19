from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.custom_option import CustomOption
from app.models.diet import DietOption
from app.models.user import User


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
