#!/usr/bin/env python3
"""
When MySQL already has ORM tables (from create_all / older installs) but Alembic is
still at revision 71c04a590a2b, `alembic upgrade head` fails with "Table X already exists".

This script stamps the schema revision `df2496c74ef0` (tables assumed to match that
migration) and runs `alembic upgrade head` for incremental fixes (e8, f0, ...).

Only runs if DATABASE_URL is mysql and alembic_version is the empty baseline.

Usage (repo root):
  python scripts/alembic_fix_stuck_mysql.py
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")


def main() -> int:
    raw = os.getenv("DATABASE_URL", "").strip()
    if not raw.startswith("mysql"):
        print("DATABASE_URL must be MySQL for this helper.")
        return 1

    from sqlalchemy import create_engine, text

    engine = create_engine(raw, pool_pre_ping=True)
    with engine.connect() as conn:
        try:
            rev = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
        except Exception as e:
            print(f"Could not read alembic_version: {e}")
            return 1
        if rev != "71c04a590a2b":
            print(f"Alembic revision is {rev!r}, not the empty baseline. Nothing to do.")
            print("If you still cannot upgrade, inspect migrations manually.")
            return 0
        r = conn.execute(
            text(
                "SELECT COUNT(*) FROM information_schema.tables "
                "WHERE table_schema = DATABASE() AND table_name = 'addresses'"
            )
        ).scalar()
        if not r:
            print("DB is at baseline revision but `addresses` table is missing.")
            print("Use a normal empty DB: alembic upgrade head")
            return 1

    print("Detected: baseline revision + existing tables. Stamping df2496c74ef0, then upgrading to head...")
    env = {**os.environ, "DATABASE_URL": raw}
    for cmd in (
        [sys.executable, "-m", "alembic", "stamp", "df2496c74ef0"],
        [sys.executable, "-m", "alembic", "upgrade", "head"],
    ):
        p = subprocess.run(cmd, cwd=str(ROOT), env=env)
        if p.returncode != 0:
            return p.returncode
    print("Done. Run: alembic current")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
