"""add home snippet foundation

Revision ID: add_home_snippet
Revises: add_product_categories
Create Date: 2026-09-06
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_home_snippet'
down_revision = 'add_product_categories'
branch_labels = None
depends_on = None


def upgrade():
    # Product created_at
    op.add_column('products', sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('NOW()'), nullable=True))
    op.execute("UPDATE products SET created_at = NOW() WHERE created_at IS NULL")

    # BusinessHomeSnippet
    op.create_table(
        'business_home_snippets',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('business_id', sa.UUID(as_uuid=True), sa.ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.VARCHAR(255), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('business_id', name='uq_business_home_snippets_business_id'),
    )

    # HomeSnippetProduct
    op.create_table(
        'business_home_snippet_products',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('snippet_id', sa.UUID(as_uuid=True), sa.ForeignKey('business_home_snippets.id', ondelete='CASCADE'), nullable=False),
        sa.Column('product_id', sa.UUID(as_uuid=True), sa.ForeignKey('products.id', ondelete='CASCADE'), nullable=False),
        sa.Column('position', sa.Integer(), nullable=False),
        sa.UniqueConstraint('snippet_id', 'position', name='uq_snippet_position'),
        sa.UniqueConstraint('snippet_id', 'product_id', name='uq_snippet_product'),
        sa.CheckConstraint('position BETWEEN 1 AND 5', name='ck_snippet_position_1_5'),
    )

    op.create_index('ix_snippet_products_snippet_id', 'business_home_snippet_products', ['snippet_id'])
    op.create_index('ix_snippet_products_product_id', 'business_home_snippet_products', ['product_id'])


def downgrade():
    op.drop_table('business_home_snippet_products')
    op.drop_table('business_home_snippets')
    op.drop_column('products', 'created_at')
