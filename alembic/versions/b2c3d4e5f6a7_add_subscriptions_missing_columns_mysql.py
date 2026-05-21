"""add_subscriptions_missing_columns_mysql

Legacy MySQL may have an older `subscriptions` table without columns the ORM expects
(allocation_status, checkout_data_id, health_inputs, meal_timing, updated_at).

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    if "subscriptions" not in insp.get_table_names():
        return
    existing = {c["name"] for c in insp.get_columns("subscriptions")}

    def add(name: str, col: sa.Column) -> None:
        if name not in existing:
            op.add_column("subscriptions", col)
            existing.add(name)

    add("allocation_status", sa.Column("allocation_status", sa.String(length=255), nullable=True))
    add("checkout_data_id", sa.Column("checkout_data_id", sa.String(length=255), nullable=True))
    add("health_inputs", sa.Column("health_inputs", sa.Text(), nullable=True))
    add("meal_timing", sa.Column("meal_timing", sa.Text(), nullable=True))
    add("updated_at", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    if "subscriptions" not in insp.get_table_names():
        return
    existing = {c["name"] for c in insp.get_columns("subscriptions")}
    for name in ("updated_at", "meal_timing", "health_inputs", "checkout_data_id", "allocation_status"):
        if name in existing:
            try:
                op.drop_column("subscriptions", name)
            except Exception:
                pass
