"""add primary_thumbnail_url to order_items

Revision ID: add_order_item_thumb
Revises: add_paybill_short_code
Create Date: 2026-08-12
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_order_item_thumb'
down_revision = 'add_paybill_short_code'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('order_items', sa.Column('primary_thumbnail_url', sa.String(), nullable=True))

def downgrade():
    op.drop_column('order_items', 'primary_thumbnail_url')
