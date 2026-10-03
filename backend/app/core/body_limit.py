import json
from collections.abc import Awaitable, Callable

from app.core.handlers import title_for
from app.diet.limits import BODY_TOO_LARGE_DETAIL, MAX_BODY_BYTES
from app.schemas.problem import Problem

Receive = Callable[[], Awaitable[dict]]
Send = Callable[[dict], Awaitable[None]]
BODY_METHODS = frozenset({"POST", "PUT", "PATCH"})


class BodySizeLimitMiddleware:
    def __init__(self, app: Callable, max_bytes: int = MAX_BODY_BYTES) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: dict, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope.get("method") not in BODY_METHODS:
            await self.app(scope, receive, send)
            return

        chunks: list[bytes] = []
        size = 0
        while True:
            message = await receive()
            if message["type"] != "http.request":
                return
            chunk = message.get("body", b"")
            size += len(chunk)
            if size > self.max_bytes:
                await _send_too_large(send)
                return
            chunks.append(chunk)
            if not message.get("more_body", False):
                break

        body = b"".join(chunks)
        replayed = False

        async def replay() -> dict:
            nonlocal replayed
            if replayed:
                return await receive()
            replayed = True
            return {"type": "http.request", "body": body, "more_body": False}

        await self.app(scope, replay, send)


async def _send_too_large(send: Send) -> None:
    payload = json.dumps(
        Problem(
            title=title_for(413),
            status=413,
            code="PAYLOAD_TOO_LARGE",
            detail=BODY_TOO_LARGE_DETAIL,
        ).model_dump()
    ).encode()
    await send(
        {
            "type": "http.response.start",
            "status": 413,
            "headers": [
                (b"content-type", b"application/problem+json"),
                (b"content-length", str(len(payload)).encode()),
            ],
        }
    )
    await send({"type": "http.response.body", "body": payload})
