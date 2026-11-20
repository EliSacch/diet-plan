import logging

from fastapi import Request

logger = logging.getLogger("app.security")

# AppError codes that are worth searching later (auth, abuse, OAuth).
SECURITY_APP_ERROR_CODES = frozenset(
    {
        "UNAUTHORIZED",
        "FORBIDDEN",
        "RATE_LIMITED",
        "OAUTH_STATE_INVALID",
        "OAUTH_FAILED",
        "OAUTH_ACCOUNT_CONFLICT",
    }
)


def log_security_event(
    event: str,
    *,
    request: Request | None = None,
    code: str | None = None,
    user_id: int | None = None,
    level: int = logging.WARNING,
) -> None:
    """Write a plain-text security line that is easy to grep in Render logs.

    Only path/method/user_id/code — never query strings, cookies, tokens, or bodies.
    """
    parts = [f"security_event={event}"]
    if code is not None:
        parts.append(f"code={code.strip().upper()}")
    if request is not None:
        parts.append(f"method={request.method}")
        parts.append(f"path={request.url.path}")
    if user_id is not None:
        parts.append(f"user_id={user_id}")
    logger.log(level, " ".join(parts))
