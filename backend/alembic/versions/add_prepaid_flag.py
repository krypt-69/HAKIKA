"""add collect_payment_before_delivery

Revision ID: add_collect_payment_before_delivery
Revises: add_credit_volume_fields
Create Date: 2026-08-02
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_prepaid_flag'
down_revision = 'add_credit_volume_fields'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('businesses', sa.Column('collect_payment_before_delivery', sa.Boolean(), nullable=False, server_default=sa.text('false')))

def downgrade():
    op.drop_column('businesses', 'collect_payment_before_delivery')
