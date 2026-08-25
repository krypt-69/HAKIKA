"""seed payment policies

Revision ID: 19ad7670f662
Revises: 1f3091d404ab
Create Date: 2026-07-26 19:20:22.712212

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '19ad7670f662'
down_revision: Union[str, None] = '1f3091d404ab'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
