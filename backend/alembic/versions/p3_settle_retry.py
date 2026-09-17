"""P3 settlement retry fields

Revision ID: p3_settle_retry
Revises: p3b_settle_columns
Create Date: 2026-09-17
"""
from alembic import op
import sqlalchemy as sa

revision = 'p3_settle_retry'
down_revision = 'p3b_settle_columns'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Add new enum value (PG12+ allows this inside a transaction
    #    as long as the new value is not used in the same transaction)
    op.execute("ALTER TYPE settlement_status ADD VALUE IF NOT EXISTS 'waiting_for_funds'")

    # 2. Add retry / quarantine fields
    op.add_column('settlements', sa.Column('next_retry_at',    sa.TIMESTAMP(), nullable=True))
    op.add_column('settlements', sa.Column('submitted_at',     sa.TIMESTAMP(), nullable=True))
    op.add_column('settlements', sa.Column('first_waiting_at', sa.TIMESTAMP(), nullable=True))
    op.add_column('settlements', sa.Column('escalated_at',     sa.TIMESTAMP(), nullable=True))
    op.add_column('settlements', sa.Column('failure_reason',   sa.String(255), nullable=True))

    # 3. Partial indexes
    op.execute("""
        CREATE INDEX ix_settlements_waiting_due
        ON settlements (next_retry_at)
        WHERE status = 'waiting_for_funds'
    """)
    op.execute("""
        CREATE INDEX ix_settlements_pending_due
        ON settlements (next_retry_at)
        WHERE status = 'pending'
    """)
    op.execute("""
        CREATE INDEX ix_settlements_unknown_submission
        ON settlements (submitted_at)
        WHERE submitted_at IS NOT NULL
          AND provider_payout_reference IS NULL
    """)


def downgrade():
    op.execute("DROP INDEX IF EXISTS ix_settlements_unknown_submission")
    op.execute("DROP INDEX IF EXISTS ix_settlements_pending_due")
    op.execute("DROP INDEX IF EXISTS ix_settlements_waiting_due")
    op.drop_column('settlements', 'failure_reason')
    op.drop_column('settlements', 'escalated_at')
    op.drop_column('settlements', 'first_waiting_at')
    op.drop_column('settlements', 'submitted_at')
    op.drop_column('settlements', 'next_retry_at')
    # Note: Postgres does not support removing enum values cleanly.
    # 'waiting_for_funds' is left in place on downgrade.
