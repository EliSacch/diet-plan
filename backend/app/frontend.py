from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse

_BACKEND_ROOTS = {"api", "auth", "docs", "redoc", "openapi.json"}
_MEDIA_TYPES = {".webmanifest": "application/manifest+json"}


def is_backend_path(path: str) -> bool:
    root, _, _ = path.partition("/")
    return root in _BACKEND_ROOTS


def file_for(static_dir: Path, path: str) -> FileResponse:
    if is_backend_path(path):
        raise HTTPException(status_code=404, detail="Not found")

    root = static_dir.resolve()
    candidate = (root / path).resolve()
    if candidate.is_relative_to(root) and candidate.is_file():
        return FileResponse(candidate, media_type=_MEDIA_TYPES.get(candidate.suffix))

    index = root / "index.html"
    if "." not in Path(path).name and index.is_file():
        return FileResponse(index)

    raise HTTPException(status_code=404, detail="Not found")


def register_frontend(app: FastAPI, static_dir: str) -> None:
    if not static_dir:

        @app.get("/", include_in_schema=False)
        def home() -> dict[str, str]:
            return {"message": "API Home"}

        return

    directory = Path(static_dir)

    @app.get("/", include_in_schema=False)
    def frontend_index() -> FileResponse:
        return file_for(directory, "")

    @app.get("/{full_path:path}", include_in_schema=False)
    def frontend_path(full_path: str) -> FileResponse:
        return file_for(directory, full_path)
