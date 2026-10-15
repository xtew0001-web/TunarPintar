"""TunaiPintar assignment prototype server.

One Flask process serves the vanilla frontend and simulated dashboard API.
Dashboard data can come from local JSON or an optional Supabase demo snapshot.
"""

from __future__ import annotations

import json
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, send_from_directory

try:
    from .data_provider import configured_data_source, load_dashboard_data
except ImportError:  # Supports running this file directly during local development.
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


@app.get("/health")
def health():
    return jsonify(
        {
            "status": "ok",
            "service": "TunaiPintar demo",
            "configured_data_source": configured_data_source(),
        }
    )


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
