from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.auth.deps import as_utc
from app.core.exceptions import AppError
from app.models.user import UserSession
from app.schemas.session import SessionInfo, SessionList


def list_sessions(
    db: Session, user_id: int, current_session_id: UUID | None
) -> SessionList:
    now = datetime.now(UTC)
    rows = db.scalars(
        select(UserSession)
        .where(UserSession.user_id == user_id, UserSession.expires_at > now)
        .order_by(UserSession.last_seen_at.desc(), UserSession.created_at.desc())
    ).all()
    return SessionList(
        sessions=[
            SessionInfo(
                id=row.id,
                is_current=current_session_id is not None and row.id == current_session_id,
                device=row.device_label or "Unknown device",
                location=row.location_label,
                created_at=as_utc(row.created_at),
                last_seen_at=as_utc(row.last_seen_at),
            )
            for row in rows
        ]
    )


def revoke_session(
    db: Session, user_id: int, session_id: UUID, current_session_id: UUID | None
) -> None:
    if current_session_id is not None and session_id == current_session_id:
        raise AppError(
            400,
            "bad_request",
            "Sign out to end this device's session",
        )
    row = db.get(UserSession, session_id)
    if row is None or row.user_id != user_id:
        raise AppError(404, "not_found", "Session not found")
    db.delete(row)
    db.commit()


def revoke_other_sessions(
    db: Session, user_id: int, current_session_id: UUID | None
) -> int:
    if current_session_id is None:
        raise AppError(401, "unauthorized", "Sign in required")
    result = db.execute(
        delete(UserSession).where(
            UserSession.user_id == user_id,
            UserSession.id != current_session_id,
        )
    )
    db.commit()
    return result.rowcount or 0


def revoke_all_sessions(db: Session, user_id: int) -> int:
    result = db.execute(delete(UserSession).where(UserSession.user_id == user_id))
    db.commit()
    return result.rowcount or 0
