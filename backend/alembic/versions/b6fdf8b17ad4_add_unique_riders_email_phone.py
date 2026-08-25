"""add_unique_riders_email_phone

Revision ID: b6fdf8b17ad4
Revises: 56db5c439b28
Create Date: 2026-07-25 00:17:57.937092

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b6fdf8b17ad4'
down_revision: Union[str, None] = '56db5c439b28'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
