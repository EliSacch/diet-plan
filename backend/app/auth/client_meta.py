import ipaddress
import logging

import httpx
from fastapi import Request

logger = logging.getLogger(__name__)

_LOCATION_TIMEOUT = 1.5


def client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        first = forwarded.split(",", 1)[0].strip()
        if first:
            return first
    if request.client is not None and request.client.host:
        return request.client.host
    return None


def client_user_agent(request: Request) -> str | None:
    value = request.headers.get("user-agent")
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def device_label(user_agent: str | None) -> str:
    if not user_agent:
        return "Unknown device"

    browser = "Browser"
    if "Edg/" in user_agent:
        browser = "Edge"
    elif "OPR/" in user_agent or "Opera" in user_agent:
        browser = "Opera"
    elif "Chrome/" in user_agent and "Chromium" not in user_agent:
        browser = "Chrome"
    elif "Firefox/" in user_agent:
        browser = "Firefox"
    elif "Safari/" in user_agent and "Chrome" not in user_agent:
        browser = "Safari"

    system = "unknown OS"
    if "iPhone" in user_agent:
        system = "iPhone"
    elif "iPad" in user_agent:
        system = "iPad"
    elif "Android" in user_agent:
        system = "Android"
    elif "Mac OS X" in user_agent or "Macintosh" in user_agent:
        system = "macOS"
    elif "Windows" in user_agent:
        system = "Windows"
    elif "CrOS" in user_agent:
        system = "ChromeOS"
    elif "Linux" in user_agent:
        system = "Linux"

    return f"{browser} on {system}"


def approximate_location(ip: str | None) -> str | None:
    if ip is None:
        return None
    try:
        address = ipaddress.ip_address(ip)
    except ValueError:
        return None
    if address.is_private or address.is_loopback or address.is_link_local:
        return "Local network"
    return lookup_public_location(ip)


def lookup_public_location(ip: str) -> str | None:
    """Best-effort city/region/country from IP. Fail open on errors/timeouts."""
    try:
        response = httpx.get(
            f"https://ipapi.co/{ip}/json/",
            timeout=_LOCATION_TIMEOUT,
            headers={"User-Agent": "diet-plan/1.0"},
        )
        if response.status_code != 200:
            return None
        body = response.json()
        if not isinstance(body, dict) or body.get("error"):
            return None
        parts = [
            value
            for key in ("city", "region", "country_name")
            if isinstance((value := body.get(key)), str) and value.strip()
        ]
        if not parts:
            return None
        # Drop duplicate region/city when identical.
        unique: list[str] = []
        for part in parts:
            if not unique or unique[-1].casefold() != part.casefold():
                unique.append(part)
        return ", ".join(unique)
    except (httpx.HTTPError, ValueError, TypeError):
        logger.debug("Could not resolve location for session IP", exc_info=True)
        return None
