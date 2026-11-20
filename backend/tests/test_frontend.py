from pathlib import Path

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.core.handlers import register_error_handlers
from app.frontend import file_for, is_backend_path, register_frontend


def test_is_backend_path() -> None:
    assert is_backend_path("api/health")
    assert is_backend_path("auth/google")
    assert is_backend_path("docs")
    assert is_backend_path("openapi.json")
    assert not is_backend_path("diet-plan")
    assert not is_backend_path("")


def test_file_for_serves_a_built_file_and_client_routes(tmp_path: Path) -> None:
    (tmp_path / "index.html").write_text("<p>app</p>", encoding="utf-8")
    assets = tmp_path / "assets"
    assets.mkdir()
    (assets / "app.js").write_text("console.log(1)", encoding="utf-8")

    index = file_for(tmp_path, "")
    script = file_for(tmp_path, "assets/app.js")
    route = file_for(tmp_path, "diet-plan")

    assert Path(index.path) == (tmp_path / "index.html").resolve()
    assert Path(script.path) == (assets / "app.js").resolve()
    assert Path(route.path) == (tmp_path / "index.html").resolve()


def test_file_for_rejects_backend_paths_missing_assets_and_traversal(
    tmp_path: Path,
) -> None:
    (tmp_path / "index.html").write_text("<p>app</p>", encoding="utf-8")
    outside = tmp_path.parent / "secret.txt"
    outside.write_text("secret", encoding="utf-8")

    with pytest.raises(HTTPException) as missing_api:
        file_for(tmp_path, "api/missing")
    with pytest.raises(HTTPException) as missing_asset:
        file_for(tmp_path, "assets/missing.js")
    with pytest.raises(HTTPException) as escaped:
        file_for(tmp_path, "../secret.txt")

    assert missing_api.value.status_code == 404
    assert missing_asset.value.status_code == 404
    assert escaped.value.status_code == 404
    outside.unlink()


def test_file_for_missing_index_is_not_found(tmp_path: Path) -> None:
    with pytest.raises(HTTPException) as exc:
        file_for(tmp_path, "profile")

    assert exc.value.status_code == 404


def test_frontend_is_served_when_static_dir_is_set(tmp_path: Path) -> None:
    (tmp_path / "index.html").write_text("<p>app</p>", encoding="utf-8")
    app = FastAPI()
    register_error_handlers(app)

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    register_frontend(app, str(tmp_path))
    client = TestClient(app)

    (tmp_path / "manifest.webmanifest").write_text("{}", encoding="utf-8")

    assert client.get("/").text == "<p>app</p>"
    assert client.get("/diet-plan").text == "<p>app</p>"
    manifest = client.get("/manifest.webmanifest")
    assert manifest.status_code == 200
    assert manifest.headers["content-type"].startswith("application/manifest+json")
    assert client.get("/api/health").json() == {"status": "ok"}
    missing = client.get("/api/missing")
    assert missing.status_code == 404
    assert missing.headers["content-type"].startswith("application/problem+json")
