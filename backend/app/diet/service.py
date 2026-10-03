from collections.abc import Sequence
from datetime import UTC, datetime

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.diet.limits import INACTIVE_PLANS_KEPT
from app.models.diet import DietOption, DietPlan
from app.schemas.diet_plan import (
    PlanCategory,
    PlanDay,
    PlanDocument,
    PlanMeal,
    PlanOption,
)


def replace_active_plan(
    db: Session,
    user_id: int,
    document: PlanDocument,
    source_filename: str | None = None,
) -> PlanDocument:
    try:
        db.execute(
            update(DietPlan)
            .where(DietPlan.user_id == user_id, DietPlan.is_active.is_(True))
            .values(is_active=False)
        )
        plan = DietPlan(
            user_id=user_id,
            uploaded_at=datetime.now(UTC),
            source_filename=source_filename,
            is_active=True,
            extracted_json=document.model_dump(),
        )
        db.add(plan)
        db.flush()
        for day in document.days:
            for meal in day.meals:
                for category in meal.categories:
                    for option in category.options:
                        db.add(
                            DietOption(
                                diet_plan_id=plan.id,
                                day=day.day,
                                meal=meal.meal,
                                category=category.category,
                                name=option.name,
                                amount=option.amount,
                                unit=option.unit,
                                position=option.position,
                            )
                        )
        _drop_old_plans(db, user_id)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return active_plan_document(db, user_id)


def _drop_old_plans(db: Session, user_id: int) -> None:
    inactive_ids = db.scalars(
        select(DietPlan.id)
        .where(DietPlan.user_id == user_id, DietPlan.is_active.is_(False))
        .order_by(DietPlan.uploaded_at.desc(), DietPlan.id.desc())
    ).all()
    stale_ids = list(inactive_ids)[INACTIVE_PLANS_KEPT:]
    if not stale_ids:
        return
    db.execute(delete(DietOption).where(DietOption.diet_plan_id.in_(stale_ids)))
    db.execute(delete(DietPlan).where(DietPlan.id.in_(stale_ids)))


def active_plan_document(db: Session, user_id: int) -> PlanDocument:
    plan = db.scalar(
        select(DietPlan).where(
            DietPlan.user_id == user_id,
            DietPlan.is_active.is_(True),
        )
    )
    if plan is None:
        raise AppError(404, "not_found", "No active diet plan")
    options = db.scalars(
        select(DietOption)
        .where(DietOption.diet_plan_id == plan.id)
        .order_by(DietOption.id)
    ).all()
    return _document_from_options(options)


def _document_from_options(options: Sequence[DietOption]) -> PlanDocument:
    days: list[PlanDay] = []
    day_by_name: dict[str, PlanDay] = {}
    meal_by_key: dict[tuple[str, str], PlanMeal] = {}
    category_by_key: dict[tuple[str, str, str], PlanCategory] = {}

    for row in options:
        day = day_by_name.get(row.day)
        if day is None:
            day = PlanDay.model_construct(day=row.day, meals=[])
            day_by_name[row.day] = day
            days.append(day)

        meal_key = (row.day, row.meal)
        meal = meal_by_key.get(meal_key)
        if meal is None:
            meal = PlanMeal.model_construct(meal=row.meal, categories=[])
            meal_by_key[meal_key] = meal
            day.meals.append(meal)

        category_key = (row.day, row.meal, row.category)
        category = category_by_key.get(category_key)
        if category is None:
            category = PlanCategory.model_construct(category=row.category, options=[])
            category_by_key[category_key] = category
            meal.categories.append(category)

        category.options.append(
            PlanOption(
                name=row.name,
                amount=row.amount,
                unit=row.unit,
                position=row.position,
            )
        )

    return PlanDocument(days=days)
