from collections.abc import Generator
from dataclasses import dataclass

import httpx

from app.core.config import settings
from app.core.exceptions import AppError

AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"


@dataclass(frozen=True)
class GoogleProfile:
    provider_user_id: str
    email: str


class GoogleOAuth:
    def __init__(self, client: httpx.Client | None = None) -> None:
        self._client = client or httpx.Client(timeout=10.0)

    def close(self) -> None:
        self._client.close()

    def authorization_url(self, state: str) -> str:
        query = httpx.QueryParams(
            {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "response_type": "code",
                "scope": "openid email",
                "state": state,
                "prompt": "select_account",
            }
        )
        return f"{AUTHORIZE_URL}?{query}"

    def fetch_profile(self, code: str) -> GoogleProfile:
        try:
            token = self._json_object(
                self._client.post(
                    TOKEN_URL,
                    data={
                        "code": code,
                        "client_id": settings.GOOGLE_CLIENT_ID,
                        "client_secret": settings.GOOGLE_CLIENT_SECRET,
                        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                        "grant_type": "authorization_code",
                    },
                )
            )
            access_token = token.get("access_token")
            if not isinstance(access_token, str) or not access_token:
                raise AppError(400, "oauth_failed", "Google sign-in failed")
            profile = self._json_object(
                self._client.get(
                    USERINFO_URL,
                    headers={"Authorization": f"Bearer {access_token}"},
                )
            )
        except httpx.HTTPError as exc:
            raise AppError(400, "oauth_failed", "Google sign-in failed") from exc

        provider_user_id = profile.get("sub")
        email = profile.get("email")
        if (
            not isinstance(provider_user_id, str)
            or not isinstance(email, str)
            or not provider_user_id
            or not email
        ):
            raise AppError(400, "oauth_failed", "Google sign-in failed")
        return GoogleProfile(provider_user_id=provider_user_id, email=email)

    def _json_object(self, response: httpx.Response) -> dict[str, object]:
        if response.status_code != 200:
            raise AppError(400, "oauth_failed", "Google sign-in failed")
        body = response.json()
        if not isinstance(body, dict):
            raise AppError(400, "oauth_failed", "Google sign-in failed")
        return body


def get_google_oauth() -> Generator[GoogleOAuth]:
    oauth = GoogleOAuth()
    try:
        yield oauth
    finally:
        oauth.close()
