"""add_orders_missing_columns_mysql

Legacy MySQL installs may have an older `orders` table without ORM columns
(e.g. subscription_id). Adds missing columns idempotently.

Revision ID: a1b2c3d4e5f6
Revises: f0a1b2c3d4e6
Create Date: 2026-04-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "f0a1b2c3d4e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    if "orders" not in insp.get_table_names():
        return
    existing = {c["name"] for c in insp.get_columns("orders")}

    def add(name: str, col: sa.Column) -> None:
        if name not in existing:
            op.add_column("orders", col)
            existing.add(name)

    # Match api/models.py Order + df2496c74ef0_orm_schema_from_models
    add("subscription_id", sa.Column("subscription_id", sa.String(length=255), nullable=True))
    add("daily_meal_schedule_id", sa.Column("daily_meal_schedule_id", sa.String(length=255), nullable=True))
    add("version", sa.Column("version", sa.Integer(), nullable=False, server_default="1"))
    add("idempotency_key", sa.Column("idempotency_key", sa.String(length=255), nullable=True))
    add("area_id", sa.Column("area_id", sa.String(length=255), nullable=True))
    add("batch_id", sa.Column("batch_id", sa.String(length=255), nullable=True))
    add("timeslot_start", sa.Column("timeslot_start", sa.DateTime(timezone=True), nullable=True))
    add("timeslot_end", sa.Column("timeslot_end", sa.DateTime(timezone=True), nullable=True))
    add("label_printed", sa.Column("label_printed", sa.Boolean(), nullable=True, server_default=sa.text("0")))
    add("label_scanned_at", sa.Column("label_scanned_at", sa.DateTime(timezone=True), nullable=True))
    add("prepared_at", sa.Column("prepared_at", sa.DateTime(timezone=True), nullable=True))
    add("packed_at", sa.Column("packed_at", sa.DateTime(timezone=True), nullable=True))
    add("assigned_at", sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=True))
    add("picked_up_at", sa.Column("picked_up_at", sa.DateTime(timezone=True), nullable=True))
    add("delivered_at", sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True))
    add("estimated_delivery_time", sa.Column("estimated_delivery_time", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    if "orders" not in insp.get_table_names():
        return
    existing = {c["name"] for c in insp.get_columns("orders")}

    for name in (
        "estimated_delivery_time",
        "delivered_at",
        "picked_up_at",
        "assigned_at",
        "packed_at",
        "prepared_at",
        "label_scanned_at",
        "label_printed",
        "timeslot_end",
        "timeslot_start",
        "batch_id",
        "area_id",
        "idempotency_key",
        "version",
        "daily_meal_schedule_id",
        "subscription_id",
    ):
        if name in existing:
            try:
                op.drop_column("orders", name)
            except Exception:
                pass
