"""merge three heads

Revision ID: merge_three_heads
Revises: add_category_image_data, add_order_item_thumb, add_rider_profile_picture
Create Date: 2026-08-28
"""
from alembic import op
import sqlalchemy as sa

revision = 'merge_three_heads'
down_revision = (
    'add_category_image_data',
    'add_order_item_thumb',
    'add_rider_profile_picture',
)
branch_labels = None
depends_on = None

def upgrade():
    pass

def downgrade():
    pass
