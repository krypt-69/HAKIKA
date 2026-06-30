"""merge heads for fresh deployment

Revision ID: b9a7c76bc6f7
Revises: 003, 4ba99569bbd6
Create Date: 2026-07-01 00:16:52.279237

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b9a7c76bc6f7'
down_revision: Union[str, None] = ('003', '4ba99569bbd6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
