from datetime import UTC, datetime, timedelta
from uuid import uuid4

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.client_meta import (
    approximate_location,
    client_ip,
    client_user_agent,
    device_label,
)
from app.auth.google import GoogleProfile
from app.core.config import settings
from app.core.exceptions import AppError
from app.models.user import OAuthAccount, User, UserSession

GOOGLE_PROVIDER = "google"
LAST_SEEN_MIN_INTERVAL = timedelta(minutes=5)


def find_or_create_user(db: Session, profile: GoogleProfile) -> User:
    user = user_for_google_account(db, profile.provider_user_id)
    if user is not None:
        return sync_email(db, user, profile.email)
    try:
        return insert_google_user(db, profile)
    except IntegrityError:
        db.rollback()
        user = user_for_google_account(db, profile.provider_user_id)
        if user is None:
            raise AppError(
                409,
                "oauth_account_conflict",
                "Could not sign in with Google",
            ) from None
        return sync_email(db, user, profile.email)


def user_for_google_account(db: Session, provider_user_id: str) -> User | None:
    account = db.scalar(
        select(OAuthAccount).where(
            OAuthAccount.provider == GOOGLE_PROVIDER,
            OAuthAccount.provider_user_id == provider_user_id,
        )
    )
    if account is None:
        return None
    return db.get(User, account.user_id)


def insert_google_user(db: Session, profile: GoogleProfile) -> User:
    user = User(email=profile.email)
    db.add(user)
    db.flush()
    db.add(
        OAuthAccount(
            user_id=user.id,
            provider=GOOGLE_PROVIDER,
            provider_user_id=profile.provider_user_id,
        )
    )
    db.flush()
    return user


def sync_email(db: Session, user: User, email: str) -> User:
    if user.email == email:
        return user
    user.email = email
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise AppError(
            409,
            "oauth_account_conflict",
            "Could not sign in with Google",
        ) from None
    return user


def create_session(db: Session, user: User, request: Request) -> UserSession:
    now = datetime.now(UTC)
    user_agent = client_user_agent(request)
    ip = client_ip(request)
    session = UserSession(
        id=uuid4(),
        user_id=user.id,
        expires_at=now + timedelta(seconds=settings.SESSION_TTL_SECONDS),
        created_at=now,
        last_seen_at=now,
        user_agent=user_agent,
        ip_address=ip,
        device_label=device_label(user_agent),
        location_label=approximate_location(ip),
    )
    db.add(session)
    db.commit()
    return session


def touch_session(db: Session, session: UserSession) -> None:
    now = datetime.now(UTC)
    last_seen = session.last_seen_at
    if last_seen.tzinfo is None:
        last_seen = last_seen.replace(tzinfo=UTC)
    if now - last_seen < LAST_SEEN_MIN_INTERVAL:
        return
    session.last_seen_at = now
    db.commit()
