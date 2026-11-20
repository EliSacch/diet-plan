from datetime import date

from fastapi import APIRouter

from app.auth.deps import CurrentUser, DbSession
from app.days.service import get_day, get_day_options, save_day
from app.schemas.day import Day, DayInput, DayOptions

router = APIRouter(prefix="/api", tags=["days"])


@router.get("/days/{target_date}/options", response_model=DayOptions)
def read_day_options(
    target_date: date,
    user: CurrentUser,
    db: DbSession,
) -> DayOptions:
    """Return the options a day can pick from, grouped by meal and category.

    The meals and categories come from the weekday of the active diet plan
    matching target_date. Each category lists:

    - options: the diet plan options.
    - custom_options: the user's custom options for that meal and category.
    - current: the choice saved for this date when it matches neither list,
      for example after its amount was edited. Otherwise null.

    Without an active plan or when the plan has no entry for that weekday, this
    returns 404 with code NOT_FOUND.
    """
    return get_day_options(db, user.id, target_date)


@router.get("/days/{target_date}", response_model=Day)
def read_day(target_date: date, user: CurrentUser, db: DbSession) -> Day:
    """Return the choices saved for a day.

    A day that was never saved returns an empty list of choices.
    """
    return get_day(db, user.id, target_date)


@router.put("/days/{target_date}", response_model=Day)
def put_day(
    target_date: date,
    day: DayInput,
    user: CurrentUser,
    db: DbSession,
) -> Day:
    """Replace the choices saved for a day.

    A partial day is allowed. Each choice must match an option of that weekday
    in the active diet plan, or a choice already saved for this date. Its name,
    amount and unit are copied, so later plan changes do not change the saved day.
    A choice that matches neither, or two choices for the same meal and category,
    return 422 with code VALIDATION_ERROR.
    """
    return save_day(db, user.id, target_date, day.choices)
