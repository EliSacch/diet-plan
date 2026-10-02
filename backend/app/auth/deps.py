from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.auth.cookies import OAUTH_STATE_COOKIE
from app.core.config import settings
from app.core.exceptions import AppError
from app.db.session import get_db
from app.models.user import User, UserSession

DbSession = Annotated[Session, Depends(get_db)]


def read_session_id(request: Request) -> UUID | None:
    raw_id = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if raw_id is None:
        return None
    try:
        return UUID(raw_id)
    except ValueError:
        return None


def get_current_user(request: Request, db: DbSession) -> User:
    session = live_session(db, read_session_id(request))
    if session is None:
        raise AppError(401, "unauthorized", "Sign in required")
    user = db.get(User, session.user_id)
    if user is None:
        raise AppError(401, "unauthorized", "Sign in required")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def live_session(db: Session, session_id: UUID | None) -> UserSession | None:
    if session_id is None:
        return None
    row = db.get(UserSession, session_id)
    if row is None or as_utc(row.expires_at) <= datetime.now(UTC):
        return None
    return row


def as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def oauth_state(request: Request) -> str | None:
    return request.cookies.get(OAUTH_STATE_COOKIE)
