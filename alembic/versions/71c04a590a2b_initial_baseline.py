"""initial_baseline

Revision ID: 71c04a590a2b
Revises:
Create Date: 2026-04-08 07:00:37.663750

Empty placeholder revision. The first material schema is ``df2496c74ef0``
(orm_schema_from_models).

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '71c04a590a2b'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
