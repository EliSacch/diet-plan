from datetime import UTC, datetime, timedelta

from app.core.exceptions import AppError
from app.diet.limits import POSTS_PER_HOUR, RATE_LIMIT_DETAIL


class DietPlanPostLimit:
    def __init__(self) -> None:
        self._hits: dict[int, list[datetime]] = {}

    def clear(self) -> None:
        self._hits.clear()

    def check(self, user_id: int) -> None:
        now = datetime.now(UTC)
        cutoff = now - timedelta(hours=1)
        recent = [hit for hit in self._hits.get(user_id, []) if hit > cutoff]
        if len(recent) >= POSTS_PER_HOUR:
            self._hits[user_id] = recent
            raise AppError(429, "rate_limited", RATE_LIMIT_DETAIL)
        recent.append(now)
        self._hits[user_id] = recent


diet_plan_posts = DietPlanPostLimit()
