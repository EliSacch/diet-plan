from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.security_headers import (
    CONTENT_SECURITY_POLICY,
    HSTS_VALUE,
    PERMISSIONS_POLICY,
    SecurityHeadersMiddleware,
)
from app.main import app

client = TestClient(app)


def test_api_responses_include_security_headers() -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.headers["Content-Security-Policy"] == CONTENT_SECURITY_POLICY
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Permissions-Policy"] == PERMISSIONS_POLICY
    assert "fonts.googleapis.com" not in response.headers["Content-Security-Policy"]
    assert "fonts.gstatic.com" not in response.headers["Content-Security-Policy"]


def test_hsts_follows_cookie_secure_setting() -> None:
    # Tests set COOKIE_SECURE=true, so the app middleware enables HSTS.
    response = client.get("/api/health")

    assert response.headers["Strict-Transport-Security"] == HSTS_VALUE


def test_hsts_can_be_disabled() -> None:
    api = FastAPI()
    api.add_middleware(SecurityHeadersMiddleware, enable_hsts=False)

    @api.get("/ping")
    def ping() -> dict[str, str]:
        return {"ok": "yes"}

    response = TestClient(api).get("/ping")

    assert "strict-transport-security" not in response.headers
    assert response.headers["X-Content-Type-Options"] == "nosniff"


def test_security_headers_skip_non_http_scopes() -> None:
    calls: list[str] = []

    async def inner(scope: dict, receive, send) -> None:  # type: ignore[no-untyped-def]
        calls.append(scope["type"])

    middleware = SecurityHeadersMiddleware(inner, enable_hsts=False)

    async def run() -> None:
        async def receive() -> dict:
            return {"type": "websocket.connect"}

        async def send(message: dict) -> None:
            return None

        await middleware({"type": "websocket"}, receive, send)

    import asyncio

    asyncio.run(run())
    assert calls == ["websocket"]
