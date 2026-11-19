"""create custom options table

Revision ID: f2c8a4d6b1e9
Revises: e4b9c2d7a1f0
Create Date: 2026-11-19 23:50:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "f2c8a4d6b1e9"
down_revision: str | Sequence[str] | None = "e4b9c2d7a1f0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "custom_options",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("meal", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("amount", sa.Float(), nullable=True),
        sa.Column("unit", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_custom_options_user_meal_category",
        "custom_options",
        ["user_id", "meal", "category"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_custom_options_user_meal_category", table_name="custom_options")
    op.drop_table("custom_options")
