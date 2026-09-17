"""P3b — settlement retry columns and indexes

Revision ID: p3b_settle_columns
Revises: p3a_settle_enum
Create Date: 2026-09-17
"""
from alembic import op
import sqlalchemy as sa

revision = 'p3b_settle_columns'
down_revision = 'p3a_settle_enum'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('settlements', sa.Column('next_retry_at',    sa.TIMESTAMP(), nullable=True))
    op.add_column('settlements', sa.Column('submitted_at',     sa.TIMESTAMP(), nullable=True))
    op.add_column('settlements', sa.Column('first_waiting_at', sa.TIMESTAMP(), nullable=True))
    op.add_column('settlements', sa.Column('escalated_at',     sa.TIMESTAMP(), nullable=True))
    op.add_column('settlements', sa.Column('failure_reason',   sa.String(255), nullable=True))

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
