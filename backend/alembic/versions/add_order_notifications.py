"""add order_notifications

Revision ID: add_order_notifications
Revises: merge_three_heads
Create Date: 2026-08-28
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_order_notifications'
down_revision = 'merge_three_heads'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'order_notifications',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('customer_id', sa.UUID(as_uuid=True), sa.ForeignKey('customers.id'), nullable=False),
        sa.Column('order_id', sa.UUID(as_uuid=True), sa.ForeignKey('orders.id'), nullable=False),
        sa.Column('unread_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('read_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('customer_id', 'order_id', name='uq_order_notifications_customer_order')
    )
    op.create_index('ix_order_notifications_customer_id', 'order_notifications', ['customer_id'])
    op.create_index('ix_order_notifications_order_id', 'order_notifications', ['order_id'])

def downgrade():
    op.drop_table('order_notifications')
