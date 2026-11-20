import os

# Settings() runs at import. CI has no .env file.
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://user:password@localhost:5432/test",
)
os.environ.setdefault("GOOGLE_CLIENT_ID", "test-client-id")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test-client-secret")
os.environ.setdefault(
    "GOOGLE_REDIRECT_URI",
    "http://localhost:5173/auth/google/callback",
)
# OpenAPI is only mounted when DEBUG is true; keep Secure cookies under TestClient HTTPS.
os.environ.setdefault("DEBUG", "true")
os.environ.setdefault("COOKIE_SECURE", "true")

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth.google import GoogleOAuth, get_google_oauth
from app.db.base import Base
from app.db.session import get_db
from app.diet.rate_limit import diet_plan_posts
from app.main import app
from tests.test_auth import ScriptedGoogleHttp


@pytest.fixture(autouse=True)
def _reset_post_limit() -> None:
    diet_plan_posts.clear()


@pytest.fixture
def database() -> Generator[Session]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False)
    db = factory()
    try:
        yield db
    finally:
        db.close()
        engine.dispose()


@pytest.fixture
def scripted() -> ScriptedGoogleHttp:
    return ScriptedGoogleHttp(
        [{"sub": "google-sub", "email": "ada@example.com", "email_verified": True}]
    )


@pytest.fixture
def client(
    database: Session,
    scripted: ScriptedGoogleHttp,
    monkeypatch: pytest.MonkeyPatch,
) -> Generator[TestClient]:
    engine = database.get_bind()
    monkeypatch.setattr(
        "app.db.session.SessionLocal",
        sessionmaker(bind=engine, autoflush=False),
    )

    def override_db() -> Generator[Session]:
        yield database

    def override_google() -> GoogleOAuth:
        return GoogleOAuth(client=scripted)  # type: ignore[arg-type]

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_google_oauth] = override_google
    try:
        with TestClient(app, base_url="https://testserver") as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()
