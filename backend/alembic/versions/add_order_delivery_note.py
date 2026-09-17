"""add orders.delivery_note

Revision ID: add_order_delivery_note
Revises: p3b_settle_columns
Create Date: 2026-09-17
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_order_delivery_note'
down_revision = 'p3b_settle_columns'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('orders', sa.Column('delivery_note', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('orders', 'delivery_note')
