"""add payments.provider

Revision ID: add_payments_provider
Revises: 19ad7670f662
Create Date: 2026-08-01
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_payments_provider'
down_revision = '19ad7670f662'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('payments', sa.Column('provider', sa.VARCHAR(20), nullable=True))
    op.execute("UPDATE payments SET provider = 'mock'")
    op.alter_column('payments', 'provider', nullable=False)

def downgrade():
    op.drop_column('payments', 'provider')
