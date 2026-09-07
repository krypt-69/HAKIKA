"""add product_categories and products.category_id

Revision ID: add_product_categories
Revises: expand_img_position_limit
Create Date: 2026-09-06
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_product_categories'
down_revision = 'expand_img_position_limit'
branch_labels = None
depends_on = None

SEED_CATEGORIES = [
    "Electronics",
    "Grocery",
    "Clothing",
    "Beauty",
    "Home",
    "Hardware",
    "Agriculture",
    "Health",
    "Services",
    "Other",
]

def upgrade():
    op.create_table(
        'product_categories',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('name', sa.String(), nullable=False, unique=True),
    )
    op.add_column('products', sa.Column('category_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_products_product_category_id',
        'products',
        'product_categories',
        ['category_id'],
        ['id'],
        ondelete='SET NULL',
    )
    op.execute(
        sa.text(
            "INSERT INTO product_categories (name) VALUES "
            + ", ".join([f"('{c}')" for c in SEED_CATEGORIES])
        )
    )

def downgrade():
    op.drop_constraint('fk_products_product_category_id', 'products', type_='foreignkey')
    op.drop_column('products', 'category_id')
    op.drop_table('product_categories')
