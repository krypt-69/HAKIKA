"""add settlement payout_reference

Revision ID: add_settlement_payout_reference
Revises: add_order_notifications
Create Date: 2026-08-28
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_settlement_payout_reference'
down_revision = 'add_order_notifications'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('settlements', sa.Column('payout_reference', sa.String(100), nullable=True))
    op.create_unique_constraint('uq_settlements_payout_reference', 'settlements', ['payout_reference'])

def downgrade():
    op.drop_constraint('uq_settlements_payout_reference', 'settlements', type_='unique')
    op.drop_column('settlements', 'payout_reference')
