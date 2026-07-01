"""add business slug

Revision ID: 001_add_slug
Revises: b9a7c76bc6f7
Create Date: 2026-07-01
"""
from alembic import op
import sqlalchemy as sa
import re

revision = '001_add_slug'
down_revision = 'b9a7c76bc6f7'
branch_labels = None
depends_on = None

def generate_slug(name: str) -> str:
    slug = name.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'\s+', '-', slug).strip('-')
    slug = re.sub(r'-+', '-', slug)
    return slug[:100]

def upgrade():
    op.add_column('businesses', sa.Column('slug', sa.String(100), nullable=True))
    conn = op.get_bind()
    result = conn.execute(sa.text("SELECT id, name FROM businesses"))
    for row in result:
        base_slug = generate_slug(row.name)
        slug = base_slug
        counter = 2
        while True:
            check = conn.execute(
                sa.text("SELECT id FROM businesses WHERE slug = :slug AND id != :id"),
                {"slug": slug, "id": row.id}
            ).fetchone()
            if not check:
                break
            slug = f"{base_slug}-{counter}"
            counter += 1
        conn.execute(
            sa.text("UPDATE businesses SET slug = :slug WHERE id = :id"),
            {"slug": slug, "id": row.id}
        )
    op.alter_column('businesses', 'slug', nullable=False)
    op.create_unique_constraint('uq_businesses_slug', 'businesses', ['slug'])

def downgrade():
    op.drop_constraint('uq_businesses_slug', 'businesses', type_='unique')
    op.drop_column('businesses', 'slug')
