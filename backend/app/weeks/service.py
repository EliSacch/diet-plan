from datetime import date

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.models.diet import DietOption, DietPlan
from app.models.week import WeeklyChoice, WeeklyPlan
from app.schemas.week import Week, WeekChoice

type ChoiceValues = tuple[str, str, str, str, float | None, str | None]


def get_week(db: Session, user_id: int, week_start: date) -> Week:
    plan = _weekly_plan(db, user_id, week_start)
    if plan is None:
        return Week(week_start=week_start, choices=[])
    rows = db.scalars(
        select(WeeklyChoice)
        .where(WeeklyChoice.weekly_plan_id == plan.id)
        .order_by(WeeklyChoice.id)
    ).all()
    return Week(
        week_start=week_start,
        choices=[
            WeekChoice(
                day=row.day,
                meal=row.meal,
                category=row.category,
                name=row.name,
                amount=row.amount,
                unit=row.unit,
            )
            for row in rows
        ],
    )


def save_week(
    db: Session,
    user_id: int,
    week_start: date,
    choices: list[WeekChoice],
) -> Week:
    try:
        plan = _weekly_plan(db, user_id, week_start)
        allowed = _active_plan_values(db, user_id)
        if plan is not None:
            allowed |= _saved_values(db, plan.id)

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

        if plan is None:
            plan = WeeklyPlan(user_id=user_id, week_start=week_start)
            db.add(plan)
            db.flush()
        else:
            db.execute(
                delete(WeeklyChoice).where(WeeklyChoice.weekly_plan_id == plan.id)
            )
        db.add_all(
            WeeklyChoice(
                weekly_plan_id=plan.id,
                day=day,
                meal=meal,
                category=category,
                name=name,
                amount=amount,
                unit=unit,
            )
            for day, meal, category, name, amount, unit in picked
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    return get_week(db, user_id, week_start)


def _weekly_plan(db: Session, user_id: int, week_start: date) -> WeeklyPlan | None:
    return db.scalar(
        select(WeeklyPlan).where(
            WeeklyPlan.user_id == user_id,
            WeeklyPlan.week_start == week_start,
        )
    )


def _active_plan_values(db: Session, user_id: int) -> set[ChoiceValues]:
    options = db.scalars(
        select(DietOption)
        .join(DietPlan, DietOption.diet_plan_id == DietPlan.id)
        .where(DietPlan.user_id == user_id, DietPlan.is_active.is_(True))
    ).all()
    return {_values(option) for option in options}


def _saved_values(db: Session, weekly_plan_id: int) -> set[ChoiceValues]:
    saved = db.scalars(
        select(WeeklyChoice).where(WeeklyChoice.weekly_plan_id == weekly_plan_id)
    ).all()
    return {_values(choice) for choice in saved}


def _values(row: DietOption | WeeklyChoice | WeekChoice) -> ChoiceValues:
    return (row.day, row.meal, row.category, row.name, row.amount, row.unit)
