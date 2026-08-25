"""add order_number sequence

Revision ID: 003
Revises: 002
Create Date: 2026-06-30
"""
from alembic import op

revision = '003'
down_revision = '002'

def upgrade():
    op.execute("CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;")

def downgrade():
    op.execute("DROP SEQUENCE IF EXISTS order_number_seq;")
