from collections.abc import Generator
from datetime import UTC, datetime, timedelta, timezone
from unittest.mock import MagicMock
from urllib.parse import parse_qs, urlparse
from uuid import uuid4

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth.deps import as_utc
from app.auth.google import GoogleOAuth, GoogleProfile, get_google_oauth
from app.auth.service import find_or_create_user
from app.core.config import settings
from app.core.exceptions import AppError
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.user import OAuthAccount, User, UserSession


class ScriptedGoogleHttp:
    def __init__(self, profiles: list[dict[str, str]]) -> None:
        self.profiles = profiles
        self.index = 0

    def post(self, url: str, data: dict[str, str]) -> httpx.Response:
        return httpx.Response(200, json={"access_token": "token"})

    def get(self, url: str, headers: dict[str, str]) -> httpx.Response:
        profile = self.profiles[self.index]
        self.index += 1
        return httpx.Response(200, json=profile)


class RejectingGoogleHttp:
    def __init__(
        self,
        token_status: int = 200,
        token_body: object | None = None,
        userinfo_status: int = 200,
        userinfo_body: dict[str, str] | None = None,
    ) -> None:
        self.token_status = token_status
        self.token_body = (
            {"access_token": "token"} if token_body is None else token_body
        )
        self.userinfo_status = userinfo_status
        self.userinfo_body = userinfo_body or {"sub": "sub", "email": "ada@example.com"}

    def post(self, url: str, data: dict[str, str]) -> httpx.Response:
        return httpx.Response(self.token_status, json=self.token_body)

    def get(self, url: str, headers: dict[str, str]) -> httpx.Response:
        return httpx.Response(self.userinfo_status, json=self.userinfo_body)


class FailingGoogleHttp:
    def post(self, url: str, data: dict[str, str]) -> httpx.Response:
        raise httpx.ConnectError("Google is unreachable")


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
    return ScriptedGoogleHttp([{"sub": "google-sub", "email": "ada@example.com"}])


@pytest.fixture
def client(database: Session, scripted: ScriptedGoogleHttp) -> Generator[TestClient]:
    def override_db() -> Generator[Session]:
        yield database

    def override_google() -> GoogleOAuth:
        return GoogleOAuth(client=scripted)  # type: ignore[arg-type]

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_google_oauth] = override_google
    try:
        # CI has DEBUG=false, so cookies are Secure and only travel over HTTPS.
        with TestClient(app, base_url="https://testserver") as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()


def google_state(client: TestClient) -> str:
    response = client.get("/auth/google", follow_redirects=False)
    assert response.status_code == 302
    location = urlparse(response.headers["location"])
    params = parse_qs(location.query)
    assert location.netloc == "accounts.google.com"
    assert params["client_id"] == [settings.GOOGLE_CLIENT_ID]
    assert params["redirect_uri"] == [settings.GOOGLE_REDIRECT_URI]
    assert params["response_type"] == ["code"]
    assert params["scope"] == ["openid email"]
    state = params["state"][0]
    set_cookie = response.headers["set-cookie"]
    assert f"oauth_state={state}" in set_cookie
    assert "HttpOnly" in set_cookie
    assert "Path=/auth/google/callback" in set_cookie
    assert "Max-Age=600" in set_cookie
    assert "SameSite=lax" in set_cookie
    return state


def test_google_login_redirects_with_state(client: TestClient) -> None:
    google_state(client)


def test_callback_rejects_a_missing_state(
    client: TestClient, database: Session
) -> None:
    response = client.get(
        "/auth/google/callback",
        params={"code": "code", "state": "missing"},
        follow_redirects=False,
    )

    assert response.status_code == 400
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["code"] == "OAUTH_STATE_INVALID"
    assert database.scalar(select(func.count()).select_from(User)) == 0


def test_callback_rejects_a_mismatched_state(
    client: TestClient, database: Session
) -> None:
    google_state(client)

    response = client.get(
        "/auth/google/callback",
        params={"code": "code", "state": "other-state"},
        follow_redirects=False,
    )

    assert response.status_code == 400
    assert response.json()["code"] == "OAUTH_STATE_INVALID"
    assert database.scalar(select(func.count()).select_from(User)) == 0


def test_callback_signs_in_and_a_second_login_keeps_the_user(
    client: TestClient,
    database: Session,
    scripted: ScriptedGoogleHttp,
) -> None:
    first = client.get(
        "/auth/google/callback",
        params={"code": "first", "state": google_state(client)},
        follow_redirects=False,
    )
    assert first.status_code == 302
    assert urlparse(first.headers["location"]).path == "/"
    session_cookie = _set_cookie(first, settings.SESSION_COOKIE_NAME)
    assert "HttpOnly" in session_cookie
    assert "Path=/" in session_cookie
    assert f"Max-Age={settings.SESSION_TTL_SECONDS}" in session_cookie

    profile = client.get("/api/profile")
    assert profile.status_code == 200
    body = profile.json()
    assert body["email"] == "ada@example.com"

    scripted.profiles.append({"sub": "google-sub", "email": "ada.new@example.com"})
    second = client.get(
        "/auth/google/callback",
        params={"code": "second", "state": google_state(client)},
        follow_redirects=False,
    )
    assert second.status_code == 302

    again = client.get("/api/profile")
    assert again.status_code == 200
    assert again.json()["id"] == body["id"]
    assert again.json()["email"] == "ada.new@example.com"
    database.expire_all()
    assert database.scalar(select(func.count()).select_from(User)) == 1
    assert database.scalar(select(func.count()).select_from(OAuthAccount)) == 1
    assert database.scalar(select(func.count()).select_from(UserSession)) == 2


def test_profile_requires_a_session(client: TestClient) -> None:
    response = client.get("/api/profile")

    assert response.status_code == 401
    assert response.json()["code"] == "UNAUTHORIZED"


def test_profile_rejects_an_invalid_session_cookie(client: TestClient) -> None:
    client.cookies.set(settings.SESSION_COOKIE_NAME, "not-a-uuid")

    response = client.get("/api/profile")

    assert response.status_code == 401
    assert response.json()["code"] == "UNAUTHORIZED"


def test_profile_rejects_an_unknown_session(client: TestClient) -> None:
    client.cookies.set(settings.SESSION_COOKIE_NAME, str(uuid4()))

    response = client.get("/api/profile")

    assert response.status_code == 401


def test_profile_rejects_an_expired_session(
    client: TestClient, database: Session
) -> None:
    user = User(email="ada@example.com")
    database.add(user)
    database.flush()
    session = UserSession(
        id=uuid4(),
        user_id=user.id,
        expires_at=datetime.now(UTC) - timedelta(days=1),
    )
    database.add(session)
    database.commit()
    client.cookies.set(settings.SESSION_COOKIE_NAME, str(session.id))

    response = client.get("/api/profile")

    assert response.status_code == 401


def test_profile_rejects_a_session_without_a_user(
    client: TestClient, database: Session
) -> None:
    session = UserSession(
        id=uuid4(),
        user_id=999,
        expires_at=datetime.now(UTC) + timedelta(days=1),
    )
    database.add(session)
    database.commit()
    client.cookies.set(settings.SESSION_COOKIE_NAME, str(session.id))

    response = client.get("/api/profile")

    assert response.status_code == 401


def test_logout_deletes_the_session(client: TestClient, database: Session) -> None:
    client.get(
        "/auth/google/callback",
        params={"code": "first", "state": google_state(client)},
        follow_redirects=False,
    )
    session = database.scalar(select(UserSession))
    assert session is not None

    response = client.post("/auth/logout")

    assert response.status_code == 204
    assert "Max-Age=0" in _set_cookie(response, settings.SESSION_COOKIE_NAME)
    database.expire_all()
    assert database.get(UserSession, session.id) is None
    assert client.get("/api/profile").status_code == 401


def test_logout_clears_a_missing_session(client: TestClient) -> None:
    response = client.post("/auth/logout")

    assert response.status_code == 204
    assert "Max-Age=0" in _set_cookie(response, settings.SESSION_COOKIE_NAME)


def test_logout_ignores_an_unknown_session(client: TestClient) -> None:
    client.cookies.set(settings.SESSION_COOKIE_NAME, str(uuid4()))

    response = client.post("/auth/logout")

    assert response.status_code == 204


def test_fetch_profile_rejects_a_failed_token_exchange() -> None:
    oauth = GoogleOAuth(
        client=RejectingGoogleHttp(token_status=400, token_body={"error": "bad"})
    )  # type: ignore[arg-type]

    with pytest.raises(AppError) as caught:
        oauth.fetch_profile("code")

    assert caught.value.code == "OAUTH_FAILED"


def test_fetch_profile_rejects_a_token_response_that_is_not_an_object() -> None:
    oauth = GoogleOAuth(client=RejectingGoogleHttp(token_body=["nope"]))  # type: ignore[arg-type]

    with pytest.raises(AppError) as caught:
        oauth.fetch_profile("code")

    assert caught.value.code == "OAUTH_FAILED"


def test_fetch_profile_rejects_a_missing_access_token() -> None:
    oauth = GoogleOAuth(client=RejectingGoogleHttp(token_body={}))  # type: ignore[arg-type]

    with pytest.raises(AppError) as caught:
        oauth.fetch_profile("code")

    assert caught.value.code == "OAUTH_FAILED"


def test_fetch_profile_rejects_a_profile_without_an_email() -> None:
    oauth = GoogleOAuth(  # type: ignore[arg-type]
        client=RejectingGoogleHttp(userinfo_body={"sub": "google-sub"})
    )

    with pytest.raises(AppError) as caught:
        oauth.fetch_profile("code")

    assert caught.value.code == "OAUTH_FAILED"


def test_fetch_profile_rejects_a_network_error() -> None:
    oauth = GoogleOAuth(client=FailingGoogleHttp())  # type: ignore[arg-type]

    with pytest.raises(AppError) as caught:
        oauth.fetch_profile("code")

    assert caught.value.code == "OAUTH_FAILED"


def test_get_google_oauth_closes_the_client() -> None:
    generator = get_google_oauth()
    oauth = next(generator)
    url = oauth.authorization_url("abc")

    assert url.startswith("https://accounts.google.com/o/oauth2/v2/auth?")
    assert "state=abc" in url

    with pytest.raises(StopIteration):
        next(generator)


def test_as_utc_adds_a_timezone_to_naive_values() -> None:
    value = datetime(2026, 1, 1, 12, 0, 0, tzinfo=UTC).replace(tzinfo=None)

    assert as_utc(value) == datetime(2026, 1, 1, 12, 0, 0, tzinfo=UTC)


def test_as_utc_converts_aware_values_to_utc() -> None:
    value = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone(timedelta(hours=2)))

    assert as_utc(value) == datetime(2026, 1, 1, 10, 0, 0, tzinfo=UTC)


def test_find_or_create_user_rereads_after_a_unique_conflict(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    existing = User(email="ada@example.com")
    existing.id = 3
    lookups = iter([None, existing])
    monkeypatch.setattr(
        "app.auth.service.user_for_google_account",
        lambda db, provider_user_id: next(lookups),
    )

    def insert(db: Session, profile: GoogleProfile) -> User:
        raise IntegrityError("INSERT", {}, Exception("duplicate"))

    monkeypatch.setattr("app.auth.service.insert_google_user", insert)
    db = MagicMock()

    user = find_or_create_user(db, GoogleProfile("google-sub", "ada@example.com"))

    assert user is existing
    db.rollback.assert_called_once()


def test_find_or_create_user_raises_when_the_conflict_row_is_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "app.auth.service.user_for_google_account",
        lambda db, provider_user_id: None,
    )

    def insert(db: Session, profile: GoogleProfile) -> User:
        raise IntegrityError("INSERT", {}, Exception("duplicate"))

    monkeypatch.setattr("app.auth.service.insert_google_user", insert)

    with pytest.raises(AppError) as caught:
        find_or_create_user(MagicMock(), GoogleProfile("google-sub", "ada@example.com"))

    assert caught.value.status_code == 409
    assert caught.value.code == "OAUTH_ACCOUNT_CONFLICT"


def _set_cookie(response: httpx.Response, name: str) -> str:
    matches = [
        value
        for value in response.headers.get_list("set-cookie")
        if value.startswith(f"{name}=")
    ]
    assert matches
    return matches[0]
