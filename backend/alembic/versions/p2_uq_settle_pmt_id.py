"""add unique settlements payment_id

Revision ID: add_unique_settlements_payment_id
Revises: add_prepaid_flag
Create Date: 2026-09-15
"""
from alembic import op
import sqlalchemy as sa

revision = 'p2_uq_settle_pmt_id'
down_revision = 'add_credit_allocations'
branch_labels = None
depends_on = None


def upgrade():
    op.create_unique_constraint(
        'uq_settlements_payment_id',
        'settlements',
        ['payment_id']
    )


def downgrade():
    op.drop_constraint('uq_settlements_payment_id', 'settlements', type_='unique')
