"""TunaiPintar assignment prototype server.

One Flask process serves the vanilla frontend and the simulated dashboard API.
No authentication, database, financial account, or investment service is used.
"""

from __future__ import annotations

import json
from pathlib import Path

from flask import Flask, jsonify, send_from_directory


BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"
DATA_FILE = BASE_DIR / "demo_data.json"

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
        with DATA_FILE.open(encoding="utf-8") as data_file:
            data = json.load(data_file)
    except (OSError, json.JSONDecodeError):
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

    return jsonify(data)


@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "TunaiPintar demo"})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
