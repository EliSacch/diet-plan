import logging

import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

from app.core.exceptions import AppError
from app.core.handlers import register_error_handlers
from app.core.security_log import log_security_event


def test_log_security_event_message_is_searchable(
    caplog: pytest.LogCaptureFixture,
) -> None:
    request = Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/api/diet-plans",
            "headers": [],
            "query_string": b"code=should-not-appear",
        }
    )

    with caplog.at_level(logging.WARNING, logger="app.security"):
        log_security_event(
            "app_error",
            request=request,
            code="rate_limited",
            user_id=7,
        )

    line = caplog.records[0].getMessage()
    assert line == (
        "security_event=app_error code=RATE_LIMITED method=POST "
        "path=/api/diet-plans user_id=7"
    )
    assert "should-not-appear" not in line
    assert "code=should" not in line


def test_app_error_handler_logs_security_codes(
    caplog: pytest.LogCaptureFixture,
) -> None:
    api = FastAPI()
    register_error_handlers(api)

    @api.get("/secret")
    def secret() -> None:
        raise AppError(401, "unauthorized", "Sign in required")

    @api.get("/missing")
    def missing() -> None:
        raise AppError(404, "not_found", "No active diet plan")

    client = TestClient(api)

    with caplog.at_level(logging.WARNING, logger="app.security"):
        assert client.get("/secret").status_code == 401
        assert client.get("/missing").status_code == 404

    messages = [record.getMessage() for record in caplog.records]
    assert any(
        "security_event=app_error" in message
        and "code=UNAUTHORIZED" in message
        and "path=/secret" in message
        for message in messages
    )
    assert not any("NOT_FOUND" in message for message in messages)


def test_app_error_handler_includes_user_id_when_set(
    caplog: pytest.LogCaptureFixture,
) -> None:
    api = FastAPI()
    register_error_handlers(api)

    @api.get("/limited")
    def limited() -> None:
        raise AppError(429, "rate_limited", "slow down", user_id=42)

    with caplog.at_level(logging.WARNING, logger="app.security"):
        assert TestClient(api).get("/limited").status_code == 429

    assert "user_id=42" in caplog.records[0].getMessage()
    assert "code=RATE_LIMITED" in caplog.records[0].getMessage()
