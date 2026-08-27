"""add rider profile_picture_data

Revision ID: add_rider_profile_picture
Revises: add_business_riders
Create Date: 2026-08-27
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_rider_profile_picture'
down_revision = 'add_business_riders'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('riders', sa.Column('profile_picture_data', sa.LargeBinary(), nullable=True))

def downgrade():
    op.drop_column('riders', 'profile_picture_data')
