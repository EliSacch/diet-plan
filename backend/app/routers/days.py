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
    - current: the choices saved for this date that match neither list, for
      example after an amount was edited. Otherwise empty.
    - multi_select: whether the category allows more than one choice.

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

    A partial day is allowed, and a meal and category can have several choices.
    Each choice's meal and category must exist for
    that weekday in the active diet plan, or already be saved for this date.
    Its name, amount and unit are free, so a choice can be a plan option, a
    custom option, or an edited value. They are copied, so later changes to the
    plan or to custom options do not change the saved day, and saving never
    changes them either.
    A choice for any other meal and category, or the same choice twice, return
    422 with code VALIDATION_ERROR.
    """
    return save_day(db, user.id, target_date, day.choices)
