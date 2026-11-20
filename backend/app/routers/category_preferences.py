from fastapi import APIRouter

from app.auth.deps import CurrentUser, DbSession
from app.category_preferences.service import (
    list_category_preferences,
    set_category_preference,
)
from app.schemas.category_preference import CategoryPreference

router = APIRouter(prefix="/api", tags=["category-preferences"])


@router.get("/category-preferences", response_model=list[CategoryPreference])
def get_category_preferences(
    user: CurrentUser, db: DbSession
) -> list[CategoryPreference]:
    """List categories that allow more than one choice.

    A category that is not listed allows one choice. The setting is per
    category name and applies to every meal on every day.
    """
    return list_category_preferences(db, user.id)


@router.put("/category-preferences", response_model=CategoryPreference)
def put_category_preference(
    preference: CategoryPreference,
    user: CurrentUser,
    db: DbSession,
) -> CategoryPreference:
    """Allow or stop multiple choices in a category.

    The setting is per category name, so it applies to every meal with that
    category on every day. Categories allow one choice until this turns
    multi_select on. Turning it off never changes saved days.
    A user can turn it on for at most 500 categories. One more returns 422 with
    code VALIDATION_ERROR.
    """
    return set_category_preference(db, user.id, preference)
