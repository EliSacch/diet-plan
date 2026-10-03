import logging
from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from app.core.exceptions import AppError
from app.schemas.problem import Problem

logger = logging.getLogger(__name__)

DEFAULT_CODES = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    413: "PAYLOAD_TOO_LARGE",
    422: "VALIDATION_ERROR",
    429: "RATE_LIMITED",
}


def title_for(status: int) -> str:
    try:
        return HTTPStatus(status).phrase
    except ValueError:
        return "Error"


def problem_response(status: int, code: str, detail: str) -> JSONResponse:
    body = Problem(
        title=title_for(status),
        status=status,
        code=code.strip().upper(),
        detail=detail,
    )
    return JSONResponse(
        status_code=status,
        content=body.model_dump(),
        media_type="application/problem+json",
    )


def code_for_status(status: int) -> str:
    return DEFAULT_CODES.get(status, "HTTP_ERROR")


async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
    return problem_response(exc.status_code, exc.code, exc.detail)


async def http_error_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail if isinstance(exc.detail, str) else "Request failed"
    return problem_response(exc.status_code, code_for_status(exc.status_code), detail)


def validation_detail(exc: RequestValidationError) -> str:
    parts: list[str] = []
    for error in exc.errors():
        location = ".".join(str(item) for item in error.get("loc", ()))
        message = str(error.get("msg", "Invalid value"))
        parts.append(f"{location}: {message}" if location else message)
    return "; ".join(parts) if parts else "Request body or query is invalid"


async def validation_error_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    return problem_response(422, "VALIDATION_ERROR", validation_detail(exc))


async def unexpected_error_handler(_request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error", exc_info=exc)
    return problem_response(500, "INTERNAL_ERROR", "Something went wrong")


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(HTTPException, http_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(Exception, unexpected_error_handler)
