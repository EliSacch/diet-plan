import httpx
import pytest
from starlette.requests import Request

from app.auth.client_meta import (
    approximate_location,
    client_ip,
    client_user_agent,
    device_label,
    lookup_public_location,
)


def test_device_label_parses_common_agents() -> None:
    chrome_mac = (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
    assert device_label(chrome_mac) == "Chrome on macOS"
    assert device_label(None) == "Unknown device"
    assert device_label("") == "Unknown device"
    assert device_label(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0"
    ) == ("Firefox on Windows")
    assert device_label(
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36"
    ) == ("Chrome on Android")
    assert device_label(
        "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Safari/604.1"
    ) == ("Safari on iPad")
    assert device_label(
        "Mozilla/5.0 (X11; CrOS x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
    ) == ("Chrome on ChromeOS")
    assert device_label(
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
    ) == ("Chrome on Linux")
    assert device_label(
        "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0"
    ) == ("Edge on Windows")
    assert (
        device_label("Opera/9.80 (Windows NT 6.0) Presto/2.12.388 Version/12.14")
        == "Opera on Windows"
    )


def test_approximate_location_for_private_ips(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    called = False

    def fail_lookup(ip: str) -> str | None:
        nonlocal called
        called = True
        return "should not run"

    monkeypatch.setattr("app.auth.client_meta.lookup_public_location", fail_lookup)
    assert approximate_location("127.0.0.1") == "Local network"
    assert approximate_location("192.168.1.10") == "Local network"
    assert called is False


def test_approximate_location_uses_public_lookup(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "app.auth.client_meta.lookup_public_location",
        lambda ip: "Milan, Lombardy, Italy",
    )
    assert approximate_location("8.8.8.8") == "Milan, Lombardy, Italy"


def test_lookup_public_location_builds_label(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fake_get(url: str, timeout: float, headers: dict[str, str]) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "city": "Milan",
                "region": "Lombardy",
                "country_name": "Italy",
            },
            request=httpx.Request("GET", url),
        )

    monkeypatch.setattr("app.auth.client_meta.httpx.get", fake_get)
    assert lookup_public_location("8.8.8.8") == "Milan, Lombardy, Italy"


def test_lookup_public_location_fails_open(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def boom(url: str, timeout: float, headers: dict[str, str]) -> httpx.Response:
        raise httpx.ConnectError("offline")

    monkeypatch.setattr("app.auth.client_meta.httpx.get", boom)
    assert lookup_public_location("8.8.8.8") is None


def test_lookup_public_location_ignores_error_payloads(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def error_status(
        url: str, timeout: float, headers: dict[str, str]
    ) -> httpx.Response:
        return httpx.Response(500, request=httpx.Request("GET", url))

    monkeypatch.setattr("app.auth.client_meta.httpx.get", error_status)
    assert lookup_public_location("8.8.8.8") is None

    def error_body(url: str, timeout: float, headers: dict[str, str]) -> httpx.Response:
        return httpx.Response(
            200,
            json={"error": True},
            request=httpx.Request("GET", url),
        )

    monkeypatch.setattr("app.auth.client_meta.httpx.get", error_body)
    assert lookup_public_location("8.8.8.8") is None

    def empty_body(url: str, timeout: float, headers: dict[str, str]) -> httpx.Response:
        return httpx.Response(
            200,
            json={"city": "", "region": None},
            request=httpx.Request("GET", url),
        )

    monkeypatch.setattr("app.auth.client_meta.httpx.get", empty_body)
    assert lookup_public_location("8.8.8.8") is None


def test_client_ip_and_user_agent_from_request() -> None:
    forwarded = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/",
            "headers": [
                (b"x-forwarded-for", b"203.0.113.9, 10.0.0.1"),
                (b"user-agent", b"  Chrome/120  "),
            ],
            "client": ("10.0.0.1", 12345),
        }
    )
    assert client_ip(forwarded) == "203.0.113.9"
    assert client_user_agent(forwarded) == "Chrome/120"

    direct = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/",
            "headers": [],
            "client": ("198.51.100.2", 12345),
        }
    )
    assert client_ip(direct) == "198.51.100.2"
    assert client_user_agent(direct) is None

    no_client = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/",
            "headers": [(b"x-forwarded-for", b"  ")],
            "client": None,
        }
    )
    assert client_ip(no_client) is None


def test_approximate_location_rejects_invalid_ip() -> None:
    assert approximate_location("not-an-ip") is None
    assert approximate_location(None) is None
