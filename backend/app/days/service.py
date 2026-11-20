from datetime import date

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.category_preferences.service import multi_select_categories
from app.core.exceptions import AppError
from app.diet.service import active_plan_document
from app.models.custom_option import CustomOption
from app.models.day import DailyChoice
from app.schemas.day import (
    CustomOptionValues,
    Day,
    DayChoice,
    DayOptions,
    DayOptionsCategory,
    DayOptionsMeal,
    OptionValues,
)
from app.schemas.diet_plan import PlanDay, PlanOption

type ChoiceValues = tuple[str, str, str, float | None, str | None]
type Slot = tuple[str, str]
type Values = tuple[str, float | None, str | None]


def get_day_options(db: Session, user_id: int, target_date: date) -> DayOptions:
    plan_day = _plan_day(db, user_id, target_date)

    custom_by_slot: dict[Slot, list[CustomOptionValues]] = {}
    for row in db.scalars(
        select(CustomOption)
        .where(CustomOption.user_id == user_id)
        .order_by(CustomOption.id)
    ):
        custom_by_slot.setdefault((row.meal, row.category), []).append(
            CustomOptionValues(
                id=row.id, name=row.name, amount=row.amount, unit=row.unit
            )
        )

    saved_by_slot: dict[Slot, list[DailyChoice]] = {}
    for row in db.scalars(
        select(DailyChoice)
        .where(
            DailyChoice.user_id == user_id,
            DailyChoice.date == target_date,
        )
        .order_by(DailyChoice.id)
    ):
        saved_by_slot.setdefault((row.meal, row.category), []).append(row)

    multi_select = multi_select_categories(db, user_id)

    meals: list[DayOptionsMeal] = []
    for meal in plan_day.meals:
        categories: list[DayOptionsCategory] = []
        for category in meal.categories:
            slot = (meal.meal, category.category)
            custom_options = custom_by_slot.get(slot, [])
            offered = {_option_values(option) for option in category.options} | {
                _option_values(option) for option in custom_options
            }
            current = [
                OptionValues(name=saved.name, amount=saved.amount, unit=saved.unit)
                for saved in saved_by_slot.get(slot, [])
                if _option_values(saved) not in offered
            ]
            categories.append(
                DayOptionsCategory(
                    category=category.category,
                    options=category.options,
                    custom_options=custom_options,
                    current=current,
                    multi_select=category.category in multi_select,
                )
            )
        meals.append(DayOptionsMeal(meal=meal.meal, categories=categories))
    return DayOptions(day=plan_day.day, meals=meals)


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
        allowed = _plan_slots(db, user_id, target_date) | _saved_slots(
            db, user_id, target_date
        )

        picked: list[ChoiceValues] = []
        for index, choice in enumerate(choices):
            if (choice.meal, choice.category) not in allowed:
                raise AppError(
                    422,
                    "validation_error",
                    f"choices.{index}: not a meal and category of the active diet plan",
                )
            picked.append(_values(choice))

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


def _plan_day(db: Session, user_id: int, target_date: date) -> PlanDay:
    document = active_plan_document(db, user_id)
    weekday = target_date.weekday()
    if weekday >= len(document.days):
        raise AppError(
            404, "not_found", "No options for this day in the active diet plan"
        )
    return document.days[weekday]


def _plan_slots(db: Session, user_id: int, target_date: date) -> set[Slot]:
    try:
        plan_day = _plan_day(db, user_id, target_date)
    except AppError:
        return set()
    return {
        (meal.meal, category.category)
        for meal in plan_day.meals
        for category in meal.categories
    }


def _saved_slots(db: Session, user_id: int, target_date: date) -> set[Slot]:
    saved = db.execute(
        select(DailyChoice.meal, DailyChoice.category).where(
            DailyChoice.user_id == user_id,
            DailyChoice.date == target_date,
        )
    ).all()
    return {(meal, category) for meal, category in saved}


def _values(row: DailyChoice | DayChoice) -> ChoiceValues:
    return (row.meal, row.category, row.name, row.amount, row.unit)


def _option_values(
    option: PlanOption | CustomOptionValues | DailyChoice,
) -> Values:
    return (option.name, option.amount, option.unit)
