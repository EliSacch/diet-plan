from fastapi import FastAPI, Query
from fastapi.testclient import TestClient

from app.core.exceptions import AppError
from app.core.handlers import register_error_handlers, title_for
from app.main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_home() -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {"message": "API Home"}


def test_missing_route_uses_problem_response() -> None:
    response = client.get("/api/missing")
    body = response.json()

    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/problem+json")
    assert body["code"] == "NOT_FOUND"
    assert body["status"] == 404
    assert body["type"] == "about:blank"
    assert body["detail"]


def _error_client() -> TestClient:
    api = FastAPI()
    register_error_handlers(api)

    @api.get("/items")
    def items(name: str = Query()) -> dict[str, str]:
        return {"name": name}

    @api.get("/items/{item_id}")
    def item(item_id: int) -> None:
        raise AppError(404, "item_not_found", f"Item {item_id} not found")

    @api.get("/boom")
    def boom() -> None:
        raise RuntimeError("secret database password")

    return TestClient(api, raise_server_exceptions=False)


def test_validation_error() -> None:
    response = _error_client().get("/items")
    body = response.json()

    assert response.status_code == 422
    assert body["code"] == "VALIDATION_ERROR"
    assert "name" in body["detail"]


def test_app_error_code_is_uppercase() -> None:
    response = _error_client().get("/items/42")
    body = response.json()

    assert response.status_code == 404
    assert body["code"] == "ITEM_NOT_FOUND"
    assert body["detail"] == "Item 42 not found"


def test_title_for_unknown_status() -> None:
    assert title_for(999) == "Error"


def test_unexpected_error_hides_exception_text() -> None:
    response = _error_client().get("/boom")
    body = response.json()

    assert response.status_code == 500
    assert body["code"] == "INTERNAL_ERROR"
    assert body["detail"] == "Something went wrong"
    assert "secret" not in body["detail"]
