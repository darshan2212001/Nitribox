"""ensure_users_username_password

Legacy MySQL / partial installs may lack username and password on users.
Adds them when missing (idempotent).

Revision ID: f0a1b2c3d4e6
Revises: e8a3f1c2b4d5
Create Date: 2026-04-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text


revision: str = "f0a1b2c3d4e6"
down_revision: Union[str, Sequence[str], None] = "e8a3f1c2b4d5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    if "users" not in insp.get_table_names():
        return
    existing = {c["name"] for c in insp.get_columns("users")}
    dialect = bind.dialect.name

    if "username" not in existing:
        op.add_column("users", sa.Column("username", sa.String(length=255), nullable=True))
    if "password" not in existing:
        op.add_column("users", sa.Column("password", sa.String(length=255), nullable=True))

    if dialect == "mysql":
        try:
            n = bind.execute(
                text(
                    """
                    SELECT COUNT(*) FROM information_schema.statistics
                    WHERE table_schema = DATABASE()
                      AND table_name = 'users'
                      AND index_name = 'uq_users_username'
                    """
                )
            ).scalar()
            if n == 0:
                bind.execute(text("ALTER TABLE users ADD UNIQUE INDEX uq_users_username (username)"))
        except Exception:
            pass


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    if "users" not in insp.get_table_names():
        return
    dialect = bind.dialect.name
    if dialect == "mysql":
        try:
            bind.execute(text("ALTER TABLE users DROP INDEX uq_users_username"))
        except Exception:
            pass
    existing = {c["name"] for c in insp.get_columns("users")}
    if "password" in existing:
        op.drop_column("users", "password")
    if "username" in existing:
        op.drop_column("users", "username")
