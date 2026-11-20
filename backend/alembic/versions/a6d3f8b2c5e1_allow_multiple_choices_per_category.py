"""allow multiple choices per category

Revision ID: a6d3f8b2c5e1
Revises: f2c8a4d6b1e9
Create Date: 2026-11-20 17:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "a6d3f8b2c5e1"
down_revision: str | Sequence[str] | None = "f2c8a4d6b1e9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint(
        "uq_daily_choices_user_date_meal_category",
        "daily_choices",
        type_="unique",
    )
    op.create_table(
        "category_preferences",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "category",
            name="uq_category_preferences_user_category",
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("category_preferences")
    op.create_unique_constraint(
        "uq_daily_choices_user_date_meal_category",
        "daily_choices",
        ["user_id", "date", "meal", "category"],
    )
