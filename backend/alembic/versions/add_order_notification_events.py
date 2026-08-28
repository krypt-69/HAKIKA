"""add order_notification_events

Revision ID: add_order_notification_events
Revises: add_order_status_version
Create Date: 2026-08-28
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_order_notification_events'
down_revision = 'add_order_status_version'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'order_notification_events',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('order_id', sa.UUID(as_uuid=True), sa.ForeignKey('orders.id'), nullable=False),
        sa.Column('status_version', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('order_id', 'status_version', name='uq_order_notification_events_order_version')
    )
    op.create_index('ix_order_notification_events_order_id', 'order_notification_events', ['order_id'])

def downgrade():
    op.drop_table('order_notification_events')
