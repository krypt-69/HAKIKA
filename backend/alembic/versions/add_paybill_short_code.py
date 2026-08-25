"""add paybill_short_code

Revision ID: add_paybill_short_code
Revises: add_prepaid_flag
Create Date: 2026-08-02
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_paybill_short_code'
down_revision = 'add_prepaid_flag'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('payment_methods', sa.Column('paybill_short_code', sa.VARCHAR(50), nullable=True))

def downgrade():
    op.drop_column('payment_methods', 'paybill_short_code')
