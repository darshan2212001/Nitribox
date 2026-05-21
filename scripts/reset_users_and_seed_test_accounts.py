#!/usr/bin/env python3
"""
Delete ALL rows in `users` and dependent data, then create one test user per role.

Confirmation (either):
  --yes
  or env NUTRIBOX_CONFIRM_RESET_USERS=1

Uses DATABASE_URL from project .env (same as the API).

Roles: admin, nutritionist, client, kitchen, delivery
Shared password (meets API rules): NutriTest1
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

# Project root
_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from sqlalchemy import inspect, text

from api.database import SessionLocal, engine
from api import models
from api.simple_auth import get_password_hash


TEST_PASSWORD = "NutriTest1"

# username, email, display name, role
TEST_ACCOUNTS: list[tuple[str, str, str, str]] = [
    ("test_admin", "test_admin@example.com", "Test Admin", "admin"),
    ("test_nutritionist", "test_nutritionist@example.com", "Test Nutritionist", "nutritionist"),
    ("test_client", "test_client@example.com", "Test Client", "client"),
    ("test_kitchen", "test_kitchen@example.com", "Test Kitchen", "kitchen"),
    ("test_delivery", "test_delivery@example.com", "Test Delivery", "delivery"),
]


def _ensure_users_auth_columns() -> None:
    """Add username/password columns if the DB predates current models (common on partial MySQL setups)."""
    insp = inspect(engine)
    cols = {c["name"] for c in insp.get_columns("users")}
    if "username" in cols and "password" in cols:
        return
    dialect = engine.dialect.name
    with engine.begin() as conn:
        if "username" not in cols:
            if dialect == "mysql":
                conn.execute(text("ALTER TABLE users ADD COLUMN username VARCHAR(255) NULL"))
            else:
                conn.execute(text("ALTER TABLE users ADD COLUMN username VARCHAR(255)"))
        if "password" not in cols:
            if dialect == "mysql":
                conn.execute(text("ALTER TABLE users ADD COLUMN password VARCHAR(255) NULL"))
            else:
                conn.execute(text("ALTER TABLE users ADD COLUMN password VARCHAR(255) NULL"))
    if dialect == "mysql":
        with engine.begin() as conn:
            try:
                conn.execute(text("ALTER TABLE users ADD UNIQUE INDEX uq_users_username (username)"))
            except Exception:
                pass


def _clear_dependent_rows(db) -> None:
    """Remove rows that reference users or block deleting users/clients."""
    # Order: children first (same family as seed_data + user-linked tables)
    db.query(models.Refund).delete()
    db.query(models.Payment).delete()
    db.query(models.BatchMeal).delete()
    db.query(models.Batch).delete()
    db.query(models.Notification).delete()
    db.query(models.DeviceToken).delete()
    db.query(models.Address).delete()
    db.query(models.WeeklyReport).delete()
    db.query(models.UserActivity).delete()
    db.query(models.CheckoutData).delete()
    db.query(models.ProgressLog).delete()
    db.query(models.Consultation).delete()
    db.query(models.Session).delete()
    db.query(models.DailyMealSchedule).delete()
    db.query(models.DeliveryTracking).delete()
    db.query(models.KitchenQueue).delete()
    db.query(models.Order).delete()
    db.query(models.Subscription).delete()
    db.query(models.AuditLog).delete()
    db.query(models.Event).delete()
    db.query(models.Client).delete()

    db.query(models.Nutritionist).update(
        {models.Nutritionist.user_id: None},
        synchronize_session=False,
    )

    db.query(models.BlacklistedToken).delete()
    db.query(models.User).delete()
    db.commit()


def main() -> int:
    parser = argparse.ArgumentParser(description="Reset all users and seed role test accounts.")
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Confirm destructive reset (required unless NUTRIBOX_CONFIRM_RESET_USERS=1).",
    )
    args = parser.parse_args()
    if not args.yes and os.getenv("NUTRIBOX_CONFIRM_RESET_USERS") != "1":
        print(
            "Refusing to run: pass --yes or set NUTRIBOX_CONFIRM_RESET_USERS=1\n"
            "This deletes ALL users and related client/order/checkout data."
        )
        return 1

    print(f"Database URL (no secrets): {engine.url.render_as_string(hide_password=True)}")
    _ensure_users_auth_columns()
    db = SessionLocal()
    try:
        print("Clearing user-linked data and all users...")
        _clear_dependent_rows(db)

        pwd_hash = get_password_hash(TEST_PASSWORD)
        rows = []
        for username, email, name, role in TEST_ACCOUNTS:
            rows.append(
                models.User(
                    username=username,
                    email=email,
                    password=pwd_hash,
                    name=name,
                    phone="+919999999999",
                    role=role,
                )
            )
        db.add_all(rows)
        db.commit()

        print("\nDone. Test accounts (password for all: %s):" % TEST_PASSWORD)
        for username, email, _, role in TEST_ACCOUNTS:
            print(f"  - {role:14}  username={username!r}  email={email!r}")
        return 0
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
