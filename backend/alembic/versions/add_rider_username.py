"""add rider username

Revision ID: add_rider_username
Revises: add_paybill_short_code
Create Date: 2026-08-27
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_rider_username'
down_revision = 'add_paybill_short_code'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('riders', sa.Column('username', sa.String(50), nullable=True))
    op.create_unique_constraint('uq_riders_username', 'riders', ['username'])

def downgrade():
    op.drop_constraint('uq_riders_username', 'riders', type_='unique')
    op.drop_column('riders', 'username')
