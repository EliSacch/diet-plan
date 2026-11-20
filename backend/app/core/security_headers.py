from collections.abc import Awaitable, Callable

from starlette.datastructures import MutableHeaders

from app.core.config import settings

Receive = Callable[[], Awaitable[dict]]
Send = Callable[[dict], Awaitable[None]]

# Same-origin SPA + API. React style={{}} needs style-src unsafe-inline.
# Fonts are self-hosted; no Google Fonts origins.
CONTENT_SECURITY_POLICY = "; ".join(
    [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self'",
        "img-src 'self' data:",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'self'",
    ]
)

PERMISSIONS_POLICY = "camera=(), microphone=(), geolocation=()"
HSTS_VALUE = "max-age=63072000; includeSubDomains"


class SecurityHeadersMiddleware:
    def __init__(self, app: Callable, *, enable_hsts: bool | None = None) -> None:
        self.app = app
        self.enable_hsts = (
            settings.cookie_secure if enable_hsts is None else enable_hsts
        )

    async def __call__(self, scope: dict, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message: dict) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers["Content-Security-Policy"] = CONTENT_SECURITY_POLICY
                headers["X-Content-Type-Options"] = "nosniff"
                headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
                headers["X-Frame-Options"] = "DENY"
                headers["Permissions-Policy"] = PERMISSIONS_POLICY
                if self.enable_hsts:
                    headers["Strict-Transport-Security"] = HSTS_VALUE
            await send(message)

        await self.app(scope, receive, send_with_headers)
