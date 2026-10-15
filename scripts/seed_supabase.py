"""Copy backend/demo_data.json into the Supabase demo_snapshots table."""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client


PROJECT_DIR = Path(__file__).resolve().parents[1]
DATA_FILE = PROJECT_DIR / "backend" / "demo_data.json"
ENV_FILE = PROJECT_DIR / ".env"


def required_environment_variable(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise SystemExit(f"Missing {name}. Add it to {ENV_FILE} and try again.")
    return value


def main() -> None:
    load_dotenv(ENV_FILE)

    url = required_environment_variable("SUPABASE_URL")
    secret_key = required_environment_variable("SUPABASE_SECRET_KEY")
    slug = os.getenv("SUPABASE_DEMO_SLUG", "nusantara-supply").strip()

    with DATA_FILE.open(encoding="utf-8") as data_file:
        payload = json.load(data_file)

    if not isinstance(payload, dict):
        raise SystemExit(f"{DATA_FILE} must contain a JSON object.")

    client = create_client(url, secret_key)
    client.table("demo_snapshots").upsert(
        {
            "slug": slug,
            "payload": payload,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="slug",
    ).execute()

    print(f"Seeded Supabase demo snapshot: {slug}")


if __name__ == "__main__":
    main()
