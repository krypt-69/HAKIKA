"""merge settlement heads

Revision ID: merge_settlement_heads
Revises: add_order_notification_events, add_settlement_payout_reference
Create Date: 2026-08-28
"""
from alembic import op
import sqlalchemy as sa

revision = 'merge_settlement_heads'
down_revision = ('add_order_notification_events', 'add_settlement_payout_reference')
branch_labels = None
depends_on = None

def upgrade():
    pass

def downgrade():
    pass
