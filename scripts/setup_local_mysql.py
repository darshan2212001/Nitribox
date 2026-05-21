"""
Create the MySQL database if missing, then run all Alembic migrations.

Expects DATABASE_URL in .env to point at local MySQL, e.g.:
  mysql+pymysql://root:PASSWORD@localhost:3306/nutribox
(URL-encode special characters in the password, e.g. @ -> %40)

Usage (repo root):
  python scripts/setup_local_mysql.py
"""
from __future__ import annotations

import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")


def _safe_db_name(name: str) -> str:
    if not name or not re.match(r"^[a-zA-Z0-9_]+$", name):
        raise ValueError(f"Invalid database name: {name!r}")
    return name


def main() -> int:
    raw = os.getenv("DATABASE_URL", "").strip()
    if not raw:
        print("DATABASE_URL is not set. Set it in .env to local MySQL, e.g.:")
        print("  mysql+pymysql://root:YOUR_PASSWORD@localhost:3306/nutribox")
        return 1

    if not raw.startswith("mysql"):
        print("This script is for MySQL only. DATABASE_URL must start with mysql (e.g. mysql+pymysql://).")
        print("For SQLite, use: alembic upgrade head")
        return 1

    from sqlalchemy import create_engine, text
    from sqlalchemy.engine.url import URL, make_url

    url = make_url(raw)
    db_name = url.database
    if not db_name:
        print("DATABASE_URL must include a database name, e.g. .../nutribox")
        return 1

    db_name = _safe_db_name(db_name)

    admin = URL.create(
        drivername=url.drivername,
        username=url.username,
        password=url.password,
        host=url.host,
        port=url.port,
        query=url.query,
    )

    print(f"Ensuring MySQL database `{db_name}` exists on {url.host}:{url.port or 3306}...")
    try:
        engine = create_engine(admin, pool_pre_ping=True, connect_args={"connect_timeout": 15})
        with engine.connect() as conn:
            conn.execute(
                text(
                    f"CREATE DATABASE IF NOT EXISTS `{db_name}` "
                    "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                )
            )
            conn.commit()
    except Exception as e:
        print(f"Failed to connect or create database: {type(e).__name__}: {e}")
        print("Check MySQL is running, user/password/host in DATABASE_URL, and that the user can CREATE DATABASE.")
        return 1

    print("Database ready. Running: alembic upgrade head")
    try:
        subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            cwd=str(ROOT),
            check=True,
            env={**os.environ, "DATABASE_URL": raw},
        )
    except subprocess.CalledProcessError:
        print(
            "\nIf `alembic upgrade` failed with 'already exists', your DB was created outside Alembic.\n"
            "Run (MySQL, baseline revision + tables already present):\n"
            "  python scripts/alembic_fix_stuck_mysql.py\n"
            "Or manually:\n"
            "  alembic stamp df2496c74ef0\n"
            "  alembic upgrade head\n"
        )
        return 1

    print("Done. Schema is at Alembic head. Start the API with: npm run start:api  (or npm run dev)")
    print("Optional: python -c \"from api.seed_data import seed_database; seed_database()\"  if you need seed data.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
