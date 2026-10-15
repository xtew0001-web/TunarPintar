"""Dashboard data sources for the TunaiPintar prototype.

The checked-in JSON file remains the reliable default and fallback. Supabase is
an optional hosted copy of that same fictional dataset.
"""

from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

from flask import current_app


DATA_FILE = Path(__file__).resolve().parent / "demo_data.json"
DEFAULT_DEMO_SLUG = "nusantara-supply"


def configured_data_source() -> str:
    """Return the requested provider, defaulting safely to local JSON."""

    return os.getenv("DATA_SOURCE", "json").strip().lower()


def load_json_dashboard() -> dict[str, Any]:
    """Load the canonical fictional dataset stored in the repository."""

    with DATA_FILE.open(encoding="utf-8") as data_file:
        data = json.load(data_file)

    if not isinstance(data, dict):
        raise ValueError("backend/demo_data.json must contain a JSON object")

    return data


@lru_cache(maxsize=1)
def _supabase_client(url: str, publishable_key: str):
    # Import lazily so JSON mode can still run before optional dependencies are
    # installed or when Supabase is deliberately disabled.
    from supabase import create_client

    return create_client(url, publishable_key)


def load_supabase_dashboard() -> dict[str, Any]:
    """Load the seeded dashboard snapshot using the read-only public policy."""

    url = os.environ["SUPABASE_URL"]
    publishable_key = os.environ["SUPABASE_PUBLISHABLE_KEY"]
    slug = os.getenv("SUPABASE_DEMO_SLUG", DEFAULT_DEMO_SLUG)

    response = (
        _supabase_client(url, publishable_key)
        .table("demo_snapshots")
        .select("payload")
        .eq("slug", slug)
        .limit(1)
        .execute()
    )

    if not response.data:
        raise LookupError(f"No Supabase demo snapshot found for slug {slug!r}")

    payload = response.data[0].get("payload")
    if not isinstance(payload, dict):
        raise ValueError("The Supabase demo snapshot payload must be a JSON object")

    return payload


def load_dashboard_data() -> tuple[dict[str, Any], str]:
    """Load dashboard data and report the provider that supplied it."""

    if configured_data_source() != "supabase":
        return load_json_dashboard(), "json"

    try:
        return load_supabase_dashboard(), "supabase"
    except Exception:
        current_app.logger.exception(
            "Unable to load the Supabase demo snapshot; using local JSON fallback"
        )
        return load_json_dashboard(), "json-fallback"
