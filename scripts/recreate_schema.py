"""
Drop all ORM tables and recreate them from current models.

Use when MySQL had partial/failed create_all or you need a clean dev schema.
DESTRUCTIVE: all data in those tables is lost.

Usage (repo root):
  set NUTRIBOX_CONFIRM_DB_RESET=1
  python scripts/recreate_schema.py
  python scripts/recreate_schema.py --seed

Requires DATABASE_URL in .env (same as the API).
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")


def main() -> int:
    parser = argparse.ArgumentParser(description="Drop and recreate all SQLAlchemy tables.")
    parser.add_argument(
        "--seed",
        action="store_true",
        help="Run seed_database() after recreate (if meal plans empty, seed still runs).",
    )
    args = parser.parse_args()

    if os.getenv("NUTRIBOX_CONFIRM_DB_RESET") != "1":
        print(
            "Refusing to run: set environment variable NUTRIBOX_CONFIRM_DB_RESET=1\n"
            "This drops every table defined on Base.metadata and recreates them."
        )
        return 1

    url = os.getenv("DATABASE_URL", "")
    if not url:
        print("DATABASE_URL is not set in .env")
        return 1

    from api.database import engine, Base
    import api.models  # noqa: F401 — register models

    print(f"DATABASE_URL backend: {url.split('://', 1)[0]}")
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("Creating all tables from models...")
    Base.metadata.create_all(bind=engine)
    print("Schema recreate finished.")

    if args.seed:
        from api.seed_data import seed_database

        print("Running seed_database()...")
        seed_database()
        print("Seed step completed.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
