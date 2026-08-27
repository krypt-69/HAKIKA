"""make rider business_id nullable

Revision ID: make_rider_business_nullable
Revises: add_rider_username
Create Date: 2026-08-27
"""
from alembic import op
import sqlalchemy as sa

revision = 'make_rider_business_nullable'
down_revision = 'add_rider_username'
branch_labels = None
depends_on = None

def upgrade():
    op.alter_column('riders', 'business_id', existing_type=sa.UUID(), nullable=True)

def downgrade():
    op.alter_column('riders', 'business_id', existing_type=sa.UUID(), nullable=False)
