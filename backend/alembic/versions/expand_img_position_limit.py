"""expand product image position limit from 3 to 5

Revision ID: expand_img_position_limit
Revises: add_product_v1_fields
Create Date: 2026-09-06
"""
from alembic import op
import sqlalchemy as sa

revision = 'expand_img_position_limit'
down_revision = 'add_product_v1_fields'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_constraint('ck_product_image_position', 'product_images', type_='check')
    op.create_check_constraint(
        'ck_product_image_position',
        'product_images',
        'position BETWEEN 1 AND 5'
    )


def downgrade():
    conn = op.get_bind()
    count = conn.execute(
        sa.text("SELECT count(*) FROM product_images WHERE position > 3")
    ).scalar()
    if count and count > 0:
        raise RuntimeError(
            "Cannot downgrade: product_images contains positions greater than 3. "
            "Manually address these rows before downgrading."
        )
    op.drop_constraint('ck_product_image_position', 'product_images', type_='check')
    op.create_check_constraint(
        'ck_product_image_position',
        'product_images',
        'position BETWEEN 1 AND 3'
    )
