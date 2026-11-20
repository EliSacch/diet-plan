from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.user import User, UserSession
from tests.test_diet_plans import sign_in


@pytest.fixture(autouse=True)
def _stub_location(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "app.auth.client_meta.lookup_public_location",
        lambda ip: "Milan, Italy",
    )


def test_list_sessions_includes_device_and_current_flag(
    client: TestClient, database: Session
) -> None:
    sign_in(client)
    response = client.get(
        "/api/sessions",
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
        },
    )

    # Headers on GET after sign-in don't re-create the session; device was set at login.
    assert response.status_code == 200
    body = response.json()
    assert len(body["sessions"]) == 1
    session = body["sessions"][0]
    assert session["is_current"] is True
    assert "device" in session
    assert "last_seen_at" in session
    assert "created_at" in session


def test_sign_in_records_device_and_local_location(
    client: TestClient, database: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        "app.auth.service.approximate_location",
        lambda ip: "Local network",
    )
    start = client.get(
        "/auth/google",
        follow_redirects=False,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 "
                "Mobile/15E148 Safari/604.1"
            )
        },
    )
    from urllib.parse import parse_qs, urlparse

    state = parse_qs(urlparse(start.headers["location"]).query)["state"][0]
    callback = client.get(
        "/auth/google/callback",
        params={"code": "code", "state": state},
        follow_redirects=False,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 "
                "Mobile/15E148 Safari/604.1"
            )
        },
    )
    assert callback.status_code == 302

    listed = client.get("/api/sessions")
    assert listed.status_code == 200
    session = listed.json()["sessions"][0]
    assert session["device"] == "Safari on iPhone"
    assert session["location"] == "Local network"
    assert session["is_current"] is True

    database.expire_all()
    row = database.scalars(select(UserSession)).one()
    assert row.device_label == "Safari on iPhone"
    assert row.location_label == "Local network"


def test_revoke_other_sessions_keeps_current(
    client: TestClient, database: Session
) -> None:
    sign_in(client)
    user = database.scalars(select(User)).one()
    other = UserSession(
        id=uuid4(),
        user_id=user.id,
        expires_at=datetime.now(UTC) + timedelta(days=1),
        created_at=datetime.now(UTC),
        last_seen_at=datetime.now(UTC),
        device_label="Firefox on Windows",
        location_label="Berlin, Germany",
    )
    database.add(other)
    database.commit()

    response = client.post("/api/sessions/revoke-others")
    assert response.status_code == 204

    listed = client.get("/api/sessions")
    assert listed.status_code == 200
    sessions = listed.json()["sessions"]
    assert len(sessions) == 1
    assert sessions[0]["is_current"] is True
    assert database.scalar(select(func.count()).select_from(UserSession)) == 1


def test_revoke_all_sessions_signs_out(
    client: TestClient, database: Session
) -> None:
    sign_in(client)
    user = database.scalars(select(User)).one()
    database.add(
        UserSession(
            id=uuid4(),
            user_id=user.id,
            expires_at=datetime.now(UTC) + timedelta(days=1),
            created_at=datetime.now(UTC),
            last_seen_at=datetime.now(UTC),
            device_label="Chrome on Android",
        )
    )
    database.commit()

    response = client.post("/api/sessions/revoke-all")
    assert response.status_code == 204
    assert database.scalar(select(func.count()).select_from(UserSession)) == 0
    assert client.get("/api/profile").status_code == 401


def test_delete_other_session(
    client: TestClient, database: Session
) -> None:
    sign_in(client)
    user = database.scalars(select(User)).one()
    other_id = uuid4()
    database.add(
        UserSession(
            id=other_id,
            user_id=user.id,
            expires_at=datetime.now(UTC) + timedelta(days=1),
            created_at=datetime.now(UTC),
            last_seen_at=datetime.now(UTC),
            device_label="Edge on Windows",
        )
    )
    database.commit()

    response = client.delete(f"/api/sessions/{other_id}")
    assert response.status_code == 204
    assert database.get(UserSession, other_id) is None
    assert client.get("/api/profile").status_code == 200


def test_cannot_delete_current_session_via_sessions_api(
    client: TestClient, database: Session
) -> None:
    sign_in(client)
    current_id = database.scalars(select(UserSession)).one().id

    response = client.delete(f"/api/sessions/{current_id}")
    assert response.status_code == 400
    assert response.json()["code"] == "BAD_REQUEST"
    assert database.get(UserSession, current_id) is not None


def test_sessions_require_auth(client: TestClient) -> None:
    assert client.get("/api/sessions").status_code == 401
    assert client.post("/api/sessions/revoke-others").status_code == 401
    assert client.post("/api/sessions/revoke-all").status_code == 401


def test_revoke_other_sessions_requires_current_cookie(
    database: Session,
) -> None:
    from app.core.exceptions import AppError
    from app.sessions.service import revoke_other_sessions

    user = User(email="ada@example.com")
    database.add(user)
    database.commit()

    with pytest.raises(AppError) as caught:
        revoke_other_sessions(database, user.id, None)
    assert caught.value.status_code == 401


def test_delete_unknown_session_is_not_found(
    client: TestClient,
) -> None:
    sign_in(client)
    response = client.delete(f"/api/sessions/{uuid4()}")
    assert response.status_code == 404


def test_touch_session_updates_naive_last_seen(
    database: Session,
) -> None:
    from app.auth.service import touch_session

    user = User(email="ada@example.com")
    database.add(user)
    database.flush()
    session = UserSession(
        id=uuid4(),
        user_id=user.id,
        expires_at=datetime.now(UTC) + timedelta(days=1),
        created_at=datetime.now(UTC) - timedelta(hours=1),
        last_seen_at=datetime.now(UTC).replace(tzinfo=None) - timedelta(hours=1),
        device_label="Chrome on macOS",
    )
    database.add(session)
    database.commit()

    before = datetime.now(UTC) - timedelta(seconds=5)
    touch_session(database, session)
    database.refresh(session)
    last_seen = session.last_seen_at
    if last_seen.tzinfo is None:
        last_seen = last_seen.replace(tzinfo=UTC)
    assert last_seen >= before
