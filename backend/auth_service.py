"""Small Supabase Auth adapter for the TunaiPintar prototype.

The browser sends credentials to Flask over the site's HTTPS connection. Flask
passes them to Supabase Auth and never stores the plaintext password.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any


class AuthConfigurationError(RuntimeError):
    """Raised when the Supabase Auth environment is incomplete."""


@dataclass(frozen=True)
class AuthResult:
    user_id: str
    email: str
    full_name: str
    company_name: str
    has_session: bool


def auth_configured() -> bool:
    return bool(
        os.getenv("SUPABASE_URL", "").strip()
        and os.getenv("SUPABASE_PUBLISHABLE_KEY", "").strip()
    )


def _client():
    if not auth_configured():
        raise AuthConfigurationError(
            "Supabase Auth is not configured. Add SUPABASE_URL and "
            "SUPABASE_PUBLISHABLE_KEY to the server environment."
        )

    # A new client is used for every auth request so one visitor's auth state is
    # never shared with another visitor inside the Flask process.
    from supabase import create_client

    return create_client(
        os.environ["SUPABASE_URL"].strip(),
        os.environ["SUPABASE_PUBLISHABLE_KEY"].strip(),
    )


def _normalise_response(response: Any) -> AuthResult:
    user = getattr(response, "user", None)
    if user is None:
        raise ValueError("Supabase did not return a user account.")

    metadata = getattr(user, "user_metadata", None) or {}
    return AuthResult(
        user_id=str(getattr(user, "id", "")),
        email=str(getattr(user, "email", "") or ""),
        full_name=str(metadata.get("full_name", "") or ""),
        company_name=str(metadata.get("company_name", "") or ""),
        has_session=getattr(response, "session", None) is not None,
    )


def register_user(email: str, password: str, full_name: str, company_name: str) -> AuthResult:
    response = _client().auth.sign_up(
        {
            "email": email,
            "password": password,
            "options": {
                "data": {
                    "full_name": full_name,
                    "company_name": company_name,
                    "workspace_role": "Owner",
                }
            },
        }
    )
    return _normalise_response(response)


def sign_in_user(email: str, password: str) -> AuthResult:
    response = _client().auth.sign_in_with_password(
        {"email": email, "password": password}
    )
    return _normalise_response(response)
