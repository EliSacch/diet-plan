from fastapi import APIRouter

from app.auth.deps import CurrentUser, DbSession
from app.diet.service import active_plan_document
from app.schemas.diet_plan import PlanDocument
from app.weeks.deps import WeekStart

router = APIRouter(prefix="/api", tags=["weeks"])


@router.get("/weeks/{week_start}/options", response_model=PlanDocument)
def get_week_options(
    user: CurrentUser,
    _week_start: WeekStart,
    db: DbSession,
) -> PlanDocument:
    """Return the options a week can pick from, grouped by day, meal and category.

    The options come from the active diet plan. Without one this returns 404
    with code NOT_FOUND.
    A week_start that is not a Monday returns 422 with code VALIDATION_ERROR.
    """
    return active_plan_document(db, user.id)
