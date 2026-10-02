from datetime import UTC, datetime, timedelta
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.google import GoogleProfile
from app.core.config import settings
from app.core.exceptions import AppError
from app.models.user import OAuthAccount, User, UserSession

GOOGLE_PROVIDER = "google"


def find_or_create_user(db: Session, profile: GoogleProfile) -> User:
    user = user_for_google_account(db, profile.provider_user_id)
    if user is not None:
        return sync_email(user, profile.email)
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
        return sync_email(user, profile.email)


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


def sync_email(user: User, email: str) -> User:
    if user.email != email:
        user.email = email
    return user


def create_session(db: Session, user: User) -> UserSession:
    session = UserSession(
        id=uuid4(),
        user_id=user.id,
        expires_at=datetime.now(UTC) + timedelta(seconds=settings.SESSION_TTL_SECONDS),
    )
    db.add(session)
    db.commit()
    return session
