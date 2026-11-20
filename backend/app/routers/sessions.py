import logging
from uuid import UUID

from fastapi import APIRouter, Request, Response

from app.auth.cookies import clear_session_cookie
from app.auth.deps import CurrentUser, DbSession, read_session_id
from app.core.security_log import log_security_event
from app.schemas.session import SessionList
from app.sessions.service import (
    list_sessions,
    revoke_all_sessions,
    revoke_other_sessions,
    revoke_session,
)

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.get("", response_model=SessionList)
def get_sessions(request: Request, user: CurrentUser, db: DbSession) -> SessionList:
    return list_sessions(db, user.id, read_session_id(request))


@router.delete("/{session_id}", status_code=204)
def delete_session(
    session_id: UUID,
    request: Request,
    user: CurrentUser,
    db: DbSession,
) -> None:
    revoke_session(db, user.id, session_id, read_session_id(request))
    log_security_event(
        "session_revoked",
        request=request,
        user_id=user.id,
        level=logging.INFO,
    )


@router.post("/revoke-others", status_code=204)
def post_revoke_others(
    request: Request,
    user: CurrentUser,
    db: DbSession,
) -> None:
    revoke_other_sessions(db, user.id, read_session_id(request))
    log_security_event(
        "sessions_revoked_others",
        request=request,
        user_id=user.id,
        level=logging.INFO,
    )


@router.post("/revoke-all", status_code=204)
def post_revoke_all(
    request: Request,
    response: Response,
    user: CurrentUser,
    db: DbSession,
) -> None:
    revoke_all_sessions(db, user.id)
    clear_session_cookie(response)
    log_security_event(
        "sessions_revoked_all",
        request=request,
        user_id=user.id,
        level=logging.INFO,
    )
