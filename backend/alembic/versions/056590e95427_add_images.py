"""add images

Revision ID: 002_add_images
Revises: 001_add_slug
Create Date: 2026-07-01
"""
from alembic import op
import sqlalchemy as sa

revision = '002_add_images'
down_revision = '001_add_slug'

def upgrade():
    op.add_column('businesses', sa.Column('logo_data', sa.LargeBinary(), nullable=True))
    op.add_column('businesses', sa.Column('cover_data', sa.LargeBinary(), nullable=True))
    op.add_column('businesses', sa.Column('logo_updated_at', sa.TIMESTAMP(), nullable=True))
    op.add_column('businesses', sa.Column('cover_updated_at', sa.TIMESTAMP(), nullable=True))
    
    op.create_table('product_images',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('product_id', sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey('products.id', ondelete='CASCADE'), nullable=False),
        sa.Column('image_data', sa.LargeBinary(), nullable=False),
        sa.Column('position', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('NOW()')),
        sa.UniqueConstraint('product_id', 'position', name='uq_product_image_position'),
        sa.CheckConstraint('position BETWEEN 1 AND 3', name='ck_product_image_position')
    )

def downgrade():
    op.drop_table('product_images')
    op.drop_column('businesses', 'cover_updated_at')
    op.drop_column('businesses', 'logo_updated_at')
    op.drop_column('businesses', 'cover_data')
    op.drop_column('businesses', 'logo_data')
