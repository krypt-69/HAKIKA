"""add provider_payout_reference

Revision ID: add_provider_payout_reference
Revises: add_settlement_payout_reference
Create Date: 2026-08-28
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_provider_payout_reference'
down_revision = 'merge_settlement_heads'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('settlements', sa.Column('provider_payout_reference', sa.String(100), nullable=True))

def downgrade():
    op.drop_column('settlements', 'provider_payout_reference')
