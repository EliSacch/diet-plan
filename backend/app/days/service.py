from datetime import date

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.diet.service import active_plan_document
from app.models.day import DailyChoice
from app.schemas.day import Day, DayChoice
from app.schemas.diet_plan import PlanDay

type ChoiceValues = tuple[str, str, str, float | None, str | None]


def get_day_options(db: Session, user_id: int, target_date: date) -> PlanDay:
    document = active_plan_document(db, user_id)
    weekday = target_date.weekday()
    if weekday >= len(document.days):
        raise AppError(
            404, "not_found", "No options for this day in the active diet plan"
        )
    return document.days[weekday]


def get_day(db: Session, user_id: int, target_date: date) -> Day:
    rows = db.scalars(
        select(DailyChoice)
        .where(DailyChoice.user_id == user_id, DailyChoice.date == target_date)
        .order_by(DailyChoice.id)
    ).all()
    return Day(
        date=target_date,
        choices=[
            DayChoice(
                meal=row.meal,
                category=row.category,
                name=row.name,
                amount=row.amount,
                unit=row.unit,
            )
            for row in rows
        ],
    )


def save_day(
    db: Session,
    user_id: int,
    target_date: date,
    choices: list[DayChoice],
) -> Day:
    try:
        allowed = _allowed_values(db, user_id, target_date) | _saved_values(
            db, user_id, target_date
        )

        picked: list[ChoiceValues] = []
        for index, choice in enumerate(choices):
            values = _values(choice)
            if values not in allowed:
                raise AppError(
                    422,
                    "validation_error",
                    f"choices.{index}: not an option of the active diet plan",
                )
            picked.append(values)

        db.execute(
            delete(DailyChoice).where(
                DailyChoice.user_id == user_id,
                DailyChoice.date == target_date,
            )
        )
        db.add_all(
            DailyChoice(
                user_id=user_id,
                date=target_date,
                meal=meal,
                category=category,
                name=name,
                amount=amount,
                unit=unit,
            )
            for meal, category, name, amount, unit in picked
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    return get_day(db, user_id, target_date)


def _allowed_values(db: Session, user_id: int, target_date: date) -> set[ChoiceValues]:
    try:
        plan_day = get_day_options(db, user_id, target_date)
    except AppError:
        return set()
    return {
        (meal.meal, category.category, option.name, option.amount, option.unit)
        for meal in plan_day.meals
        for category in meal.categories
        for option in category.options
    }


def _saved_values(db: Session, user_id: int, target_date: date) -> set[ChoiceValues]:
    saved = db.scalars(
        select(DailyChoice).where(
            DailyChoice.user_id == user_id,
            DailyChoice.date == target_date,
        )
    ).all()
    return {_values(choice) for choice in saved}


def _values(row: DailyChoice | DayChoice) -> ChoiceValues:
    return (row.meal, row.category, row.name, row.amount, row.unit)
