"""TunaiPintar assignment prototype server.

One Flask process serves the vanilla frontend and simulated dashboard API.
Dashboard data can come from local JSON or an optional Supabase demo snapshot.
"""

from __future__ import annotations

import json
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory

try:
    from .auth_service import (
        AuthConfigurationError,
        auth_configured,
        register_user,
        sign_in_user,
    )
    from .data_provider import configured_data_source, load_dashboard_data
except ImportError:  # Supports running this file directly during local development.
    from auth_service import (
        AuthConfigurationError,
        auth_configured,
        register_user,
        sign_in_user,
    )
    from data_provider import configured_data_source, load_dashboard_data


BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"

load_dotenv(BASE_DIR.parent / ".env")

app = Flask(__name__, static_folder=None)


@app.get("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.get("/style.css")
def stylesheet():
    return send_from_directory(FRONTEND_DIR, "style.css")


@app.get("/script.js")
def script():
    return send_from_directory(FRONTEND_DIR, "script.js")


@app.get("/assets/<path:filename>")
def assets(filename: str):
    return send_from_directory(FRONTEND_DIR / "assets", filename)


@app.get("/api/dashboard")
def dashboard_data():
    try:
        data, source = load_dashboard_data()
    except (OSError, json.JSONDecodeError, ValueError):
        app.logger.exception("Unable to load the dashboard demo data")
        return (
            jsonify(
                {
                    "error": "Demo data is temporarily unavailable.",
                    "help": "Check backend/demo_data.json and try again.",
                }
            ),
            500,
        )

    response = jsonify(data)
    response.headers["X-Demo-Data-Source"] = source
    return response


def _auth_error_message(error: Exception) -> str:
    message = str(error).strip()
    lowered = message.lower()
    if "invalid login credentials" in lowered:
        return "The email or password is incorrect."
    if "user already registered" in lowered or "already been registered" in lowered:
        return "An account with this email already exists. Sign in instead."
    if "password" in lowered and ("weak" in lowered or "characters" in lowered):
        return "Choose a stronger password with at least 8 characters."
    if "rate limit" in lowered or "too many" in lowered:
        return "Too many attempts. Wait a moment and try again."
    return message or "Supabase could not complete the request."


@app.post("/api/auth/register")
def register():
    payload = request.get_json(silent=True) or {}
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))
    full_name = str(payload.get("full_name", "")).strip()
    company_name = str(payload.get("company_name", "")).strip()

    if not email or "@" not in email:
        return jsonify({"error": "Enter a valid work email address."}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must contain at least 8 characters."}), 400
    if not full_name or not company_name:
        return jsonify({"error": "Enter your name and company name."}), 400

    try:
        result = register_user(email, password, full_name, company_name)
    except AuthConfigurationError as error:
        return jsonify({"error": str(error)}), 503
    except Exception as error:
        app.logger.warning("Supabase registration failed: %s", type(error).__name__)
        return jsonify({"error": _auth_error_message(error)}), 400

    return jsonify(
        {
            "user": {
                "id": result.user_id,
                "email": result.email or email,
                "full_name": result.full_name or full_name,
                "company_name": result.company_name or company_name,
            },
            "authenticated": result.has_session,
            "requires_email_confirmation": not result.has_session,
        }
    )


@app.post("/api/auth/login")
def login():
    payload = request.get_json(silent=True) or {}
    email = str(payload.get("email", "")).strip().lower()
    password = str(payload.get("password", ""))

    if not email or not password:
        return jsonify({"error": "Enter your email and password."}), 400

    try:
        result = sign_in_user(email, password)
    except AuthConfigurationError as error:
        return jsonify({"error": str(error)}), 503
    except Exception as error:
        app.logger.warning("Supabase sign-in failed: %s", type(error).__name__)
        return jsonify({"error": _auth_error_message(error)}), 401

    return jsonify(
        {
            "user": {
                "id": result.user_id,
                "email": result.email or email,
                "full_name": result.full_name,
                "company_name": result.company_name,
            },
            "authenticated": result.has_session,
        }
    )


@app.get("/health")
def health():
    return jsonify(
        {
            "status": "ok",
            "service": "TunaiPintar demo",
            "configured_data_source": configured_data_source(),
            "supabase_auth_configured": auth_configured(),
        }
    )


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
