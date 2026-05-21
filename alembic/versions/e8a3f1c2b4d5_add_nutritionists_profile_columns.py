"""add_nutritionists_profile_columns

Older MySQL databases may lack columns that exist in the ORM (city, tagline,
qualifications, available_slots). Adds them when missing.

Revision ID: e8a3f1c2b4d5
Revises: df2496c74ef0
Create Date: 2026-04-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "e8a3f1c2b4d5"
down_revision: Union[str, Sequence[str], None] = "df2496c74ef0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    if "nutritionists" not in insp.get_table_names():
        return
    existing = {c["name"] for c in insp.get_columns("nutritionists")}

    if "city" not in existing:
        op.add_column(
            "nutritionists",
            sa.Column("city", sa.String(length=255), nullable=True),
        )
    if "tagline" not in existing:
        op.add_column(
            "nutritionists",
            sa.Column("tagline", sa.Text(), nullable=True),
        )
    if "qualifications" not in existing:
        op.add_column(
            "nutritionists",
            sa.Column("qualifications", sa.Text(), nullable=True),
        )
    if "available_slots" not in existing:
        op.add_column(
            "nutritionists",
            sa.Column("available_slots", sa.Text(), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    if "nutritionists" not in insp.get_table_names():
        return
    existing = {c["name"] for c in insp.get_columns("nutritionists")}
    for col in ("available_slots", "qualifications", "tagline", "city"):
        if col in existing:
            op.drop_column("nutritionists", col)
