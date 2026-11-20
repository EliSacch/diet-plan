from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.diet.limits import MAX_CUSTOM_OPTIONS
from app.models.custom_option import CustomOption as CustomOptionRow
from app.schemas.custom_option import CustomOption, CustomOptionInput


def create_custom_option(
    db: Session, user_id: int, option: CustomOptionInput
) -> CustomOption:
    try:
        count = db.scalar(
            select(func.count())
            .select_from(CustomOptionRow)
            .where(CustomOptionRow.user_id == user_id)
        )
        if count is not None and count >= MAX_CUSTOM_OPTIONS:
            raise AppError(
                422,
                "validation_error",
                f"A user can have at most {MAX_CUSTOM_OPTIONS} custom options",
            )
        if _find_duplicate(db, user_id, option) is not None:
            raise AppError(409, "conflict", "This custom option already exists")

        row = CustomOptionRow(user_id=user_id, **option.model_dump())
        db.add(row)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return _to_schema(row)


def delete_custom_option(db: Session, user_id: int, option_id: int) -> None:
    row = db.get(CustomOptionRow, option_id)
    if row is None or row.user_id != user_id:
        raise AppError(404, "not_found", "Custom option not found")
    try:
        db.delete(row)
        db.commit()
    except Exception:
        db.rollback()
        raise


def _find_duplicate(
    db: Session, user_id: int, option: CustomOptionInput
) -> CustomOptionRow | None:
    return db.scalar(
        select(CustomOptionRow).where(
            CustomOptionRow.user_id == user_id,
            CustomOptionRow.meal == option.meal,
            CustomOptionRow.category == option.category,
            CustomOptionRow.name == option.name,
            CustomOptionRow.amount.is_not_distinct_from(option.amount),
            CustomOptionRow.unit.is_not_distinct_from(option.unit),
        )
    )


def _to_schema(row: CustomOptionRow) -> CustomOption:
    return CustomOption(
        id=row.id,
        meal=row.meal,
        category=row.category,
        name=row.name,
        amount=row.amount,
        unit=row.unit,
    )
