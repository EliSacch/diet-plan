from fastapi import Response

from app.core.config import settings

OAUTH_STATE_COOKIE = "oauth_state"
OAUTH_STATE_MAX_AGE = 600


def set_session_cookie(response: Response, session_id: str) -> None:
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=session_id,
        max_age=settings.SESSION_TTL_SECONDS,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        path="/",
    )


def set_state_cookie(response: Response, state: str) -> None:
    response.set_cookie(
        key=OAUTH_STATE_COOKIE,
        value=state,
        max_age=OAUTH_STATE_MAX_AGE,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        path="/auth/google/callback",
    )


def clear_state_cookie(response: Response) -> None:
    response.delete_cookie(
        key=OAUTH_STATE_COOKIE,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        path="/auth/google/callback",
    )
