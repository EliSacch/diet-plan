from datetime import date
from typing import Annotated

from fastapi import Depends

from app.core.exceptions import AppError


def monday_week_start(week_start: date) -> date:
    if week_start.weekday() != 0:
        raise AppError(422, "validation_error", "week_start must be a Monday")
    return week_start


WeekStart = Annotated[date, Depends(monday_week_start)]
