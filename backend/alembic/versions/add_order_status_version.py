"""add order status_version

Revision ID: add_order_status_version
Revises: add_order_notifications
Create Date: 2026-08-28
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_order_status_version'
down_revision = 'add_order_notifications'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('orders', sa.Column('status_version', sa.Integer(), nullable=False, server_default='0'))

def downgrade():
    op.drop_column('orders', 'status_version')
