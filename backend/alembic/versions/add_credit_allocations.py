"""add credit_allocations

Revision ID: add_credit_allocations
Revises: add_home_snippet
Create Date: 2026-09-08
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'add_credit_allocations'
down_revision = 'add_home_snippet'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'credit_allocations',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('business_id', UUID(as_uuid=True), sa.ForeignKey('businesses.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('merchant_credit_order_id', UUID(as_uuid=True), sa.ForeignKey('merchant_credit_orders.id', ondelete='RESTRICT'), nullable=True),
        sa.Column('credit_plan_id', UUID(as_uuid=True), sa.ForeignKey('credit_plans.id', ondelete='RESTRICT'), nullable=True),
        sa.Column('type', sa.String(20), nullable=False),
        sa.Column('original_credit', sa.DECIMAL(12,2), nullable=False),
        sa.Column('remaining_credit', sa.DECIMAL(12,2), nullable=False),
        sa.Column('original_volume', sa.DECIMAL(12,2), nullable=False),
        sa.Column('remaining_volume', sa.DECIMAL(12,2), nullable=False),
        sa.Column('granted_at', sa.TIMESTAMP(), nullable=False),
        sa.Column('expires_at', sa.TIMESTAMP(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('merchant_credit_order_id', name='uq_credit_allocations_mco'),
    )
    op.create_index('ix_credit_allocations_business_id', 'credit_allocations', ['business_id'])

def downgrade():
    op.drop_table('credit_allocations')
