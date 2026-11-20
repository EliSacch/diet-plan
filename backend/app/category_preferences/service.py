from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.diet.limits import MAX_MULTI_SELECT_CATEGORIES
from app.models.category_preference import CategoryPreference as CategoryPreferenceRow
from app.schemas.category_preference import CategoryPreference


def multi_select_categories(db: Session, user_id: int) -> set[str]:
    return set(
        db.scalars(
            select(CategoryPreferenceRow.category).where(
                CategoryPreferenceRow.user_id == user_id
            )
        )
    )


def set_category_preference(
    db: Session, user_id: int, preference: CategoryPreference
) -> CategoryPreference:
    try:
        enabled = preference.category in multi_select_categories(db, user_id)
        if preference.multi_select and not enabled:
            count = db.scalar(
                select(func.count())
                .select_from(CategoryPreferenceRow)
                .where(CategoryPreferenceRow.user_id == user_id)
            )
            if count is not None and count >= MAX_MULTI_SELECT_CATEGORIES:
                raise AppError(
                    422,
                    "validation_error",
                    f"At most {MAX_MULTI_SELECT_CATEGORIES} categories can allow "
                    "multiple choices",
                )
            db.add(CategoryPreferenceRow(user_id=user_id, category=preference.category))
        elif not preference.multi_select and enabled:
            db.execute(
                delete(CategoryPreferenceRow).where(
                    CategoryPreferenceRow.user_id == user_id,
                    CategoryPreferenceRow.category == preference.category,
                )
            )
        db.commit()
    except Exception:
        db.rollback()
        raise
    return preference
