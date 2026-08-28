"""add category image_data

Revision ID: add_category_image_data
Revises: add_paybill_short_code
Create Date: 2026-08-28
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_category_image_data'
down_revision = 'add_paybill_short_code'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('categories', sa.Column('image_data', sa.LargeBinary, nullable=True))

def downgrade():
    op.drop_column('categories', 'image_data')
