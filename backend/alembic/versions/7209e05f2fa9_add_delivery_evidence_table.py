"""add delivery_evidence table

Revision ID: 003_delivery_evidence
Revises: 002_add_images
Create Date: 2026-07-02
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = '003_delivery_evidence'
down_revision = '002_add_images'

def upgrade():
    op.create_table(
        'delivery_evidence',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('delivery_attempt_id', UUID(as_uuid=True), sa.ForeignKey('delivery_attempts.id'), nullable=False),
        sa.Column('image_data', sa.LargeBinary(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('NOW()')),
    )

def downgrade():
    op.drop_table('delivery_evidence')
