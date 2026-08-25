"""make password_hash nullable

Revision ID: 56db5c439b28
Revises: 003_delivery_evidence
Create Date: 2026-07-06 10:37:05.820120

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '56db5c439b28'
down_revision: Union[str, None] = '003_delivery_evidence'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
