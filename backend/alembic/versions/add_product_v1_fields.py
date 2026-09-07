"""add product v1 fields

Revision ID: add_product_v1_fields
Revises: add_provider_payout_reference
Create Date: 2026-09-06
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_product_v1_fields'
down_revision = 'add_provider_payout_reference'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('products', sa.Column('currency', sa.VARCHAR(3), nullable=False, server_default='KES'))
    op.add_column('products', sa.Column('selling_unit', sa.VARCHAR(50), nullable=False, server_default='Piece'))
    op.add_column('products', sa.Column('track_inventory', sa.BOOLEAN(), nullable=False, server_default=sa.text('false')))
    op.add_column('products', sa.Column('stock_quantity', sa.INTEGER(), nullable=True))
    op.add_column('products', sa.Column('min_order_quantity', sa.INTEGER(), nullable=False, server_default='1'))
    op.add_column('products', sa.Column('max_order_quantity', sa.INTEGER(), nullable=True))

def downgrade():
    op.drop_column('products', 'max_order_quantity')
    op.drop_column('products', 'min_order_quantity')
    op.drop_column('products', 'stock_quantity')
    op.drop_column('products', 'track_inventory')
    op.drop_column('products', 'selling_unit')
    op.drop_column('products', 'currency')
