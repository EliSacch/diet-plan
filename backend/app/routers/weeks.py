from fastapi import APIRouter

from app.auth.deps import CurrentUser, DbSession
from app.diet.service import active_plan_document
from app.schemas.diet_plan import PlanDocument
from app.schemas.week import Week, WeekInput
from app.weeks.deps import WeekStart
from app.weeks.service import get_week, save_week

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


@router.get("/weeks/{week_start}", response_model=Week)
def read_week(user: CurrentUser, week_start: WeekStart, db: DbSession) -> Week:
    """Return the choices saved for a week.

    A week that was never saved returns an empty list of choices.
    A week_start that is not a Monday returns 422 with code VALIDATION_ERROR.
    """
    return get_week(db, user.id, week_start)


@router.put("/weeks/{week_start}", response_model=Week)
def put_week(
    week: WeekInput,
    user: CurrentUser,
    week_start: WeekStart,
    db: DbSession,
) -> Week:
    """Replace the choices saved for a week.

    A partial week is allowed. Each choice must match an option of the active
    diet plan, or a choice already saved for this week. Its name, amount and
    unit are copied, so later plan changes do not change the saved week.
    A choice that matches neither, or two choices for the same day, meal and
    category, return 422 with code VALIDATION_ERROR.
    A week_start that is not a Monday returns 422 with code VALIDATION_ERROR.
    """
    return save_week(db, user.id, week_start, week.choices)
