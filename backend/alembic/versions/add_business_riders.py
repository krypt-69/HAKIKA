"""add business_riders association table

Revision ID: add_business_riders
Revises: make_rider_business_nullable
Create Date: 2026-08-27
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_business_riders'
down_revision = 'make_rider_business_nullable'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'business_riders',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('business_id', sa.UUID(as_uuid=True), sa.ForeignKey('businesses.id'), nullable=False),
        sa.Column('rider_id', sa.UUID(as_uuid=True), sa.ForeignKey('riders.id'), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=False, server_default=sa.text('now()')),
        sa.Column('status', sa.VARCHAR(20), nullable=False, server_default='pending'),
        sa.UniqueConstraint('business_id', 'rider_id', name='uq_business_rider')
    )
    op.execute("""
        INSERT INTO business_riders (id, business_id, rider_id, status)
        SELECT uuid_generate_v4(), business_id, id, status
        FROM riders
        WHERE business_id IS NOT NULL
        ON CONFLICT (business_id, rider_id) DO NOTHING
    """)

def downgrade():
    op.drop_table('business_riders')
