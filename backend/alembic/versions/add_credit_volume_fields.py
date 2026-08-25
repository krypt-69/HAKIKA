"""add credit volume fields

Revision ID: add_credit_volume_fields
Revises: add_payments_provider
Create Date: 2026-08-02
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_credit_volume_fields'
down_revision = 'add_payments_provider'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('businesses', sa.Column('remaining_credit_volume', sa.DECIMAL(12,2), nullable=False, server_default='0'))
    op.add_column('credit_plans', sa.Column('credit_volume', sa.DECIMAL(12,2), nullable=False, server_default='0'))

def downgrade():
    op.drop_column('businesses', 'remaining_credit_volume')
    op.drop_column('credit_plans', 'credit_volume')
