from secrets import token_urlsafe
from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import RedirectResponse

from app.auth.cookies import (
    clear_session_cookie,
    clear_state_cookie,
    set_session_cookie,
    set_state_cookie,
)
from app.auth.deps import DbSession, oauth_state, read_session_id
from app.auth.google import GoogleOAuth, get_google_oauth
from app.auth.service import create_session, find_or_create_user
from app.core.exceptions import AppError
from app.models.user import UserSession

router = APIRouter(prefix="/auth", tags=["auth"])

GoogleClient = Annotated[GoogleOAuth, Depends(get_google_oauth)]


@router.get("/google", include_in_schema=False)
def google_login(google: GoogleClient) -> RedirectResponse:
    state = token_urlsafe(32)
    redirect = RedirectResponse(google.authorization_url(state), status_code=302)
    set_state_cookie(redirect, state)
    return redirect


@router.get("/google/callback", include_in_schema=False)
def google_callback(
    code: str,
    state: str,
    request: Request,
    db: DbSession,
    google: GoogleClient,
) -> RedirectResponse:
    saved = oauth_state(request)
    if saved is None or saved != state:
        raise AppError(
            400, "oauth_state_invalid", "Google sign-in could not be verified"
        )
    user = find_or_create_user(db, google.fetch_profile(code))
    session = create_session(db, user)
    redirect = RedirectResponse("/", status_code=302)
    clear_state_cookie(redirect)
    set_session_cookie(redirect, str(session.id))
    return redirect


@router.post("/logout", status_code=204)
def logout(
    request: Request,
    response: Response,
    db: DbSession,
) -> None:
    session_id = read_session_id(request)
    if session_id is not None:
        row = db.get(UserSession, session_id)
        if row is not None:
            db.delete(row)
            db.commit()
    clear_session_cookie(response)
