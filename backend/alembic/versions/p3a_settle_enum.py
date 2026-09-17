"""P3a — add waiting_for_funds to settlement_status enum

Revision ID: p3a_settle_enum
Revises: p2_uq_settle_pmt_id
Create Date: 2026-09-17

Split into its own migration because Postgres does not allow a newly
added enum value to be used in the same transaction that adds it.
"""
from alembic import op

revision = 'p3a_settle_enum'
down_revision = 'p2_uq_settle_pmt_id'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TYPE settlement_status ADD VALUE IF NOT EXISTS 'waiting_for_funds'")


def downgrade():
    # Postgres does not support removing enum values cleanly.
    # Leaving the value in place on downgrade is safe.
    pass
