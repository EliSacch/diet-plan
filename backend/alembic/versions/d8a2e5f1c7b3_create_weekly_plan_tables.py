"""create weekly plan tables

Revision ID: d8a2e5f1c7b3
Revises: b7e4c1a9d2f6
Create Date: 2026-11-16 21:15:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "d8a2e5f1c7b3"
down_revision: str | Sequence[str] | None = "b7e4c1a9d2f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "weekly_plans",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("week_start", sa.Date(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "week_start",
            name="uq_weekly_plans_user_week_start",
        ),
    )
    op.create_table(
        "weekly_choices",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("weekly_plan_id", sa.Integer(), nullable=False),
        sa.Column("day", sa.String(), nullable=False),
        sa.Column("meal", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("amount", sa.Float(), nullable=True),
        sa.Column("unit", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["weekly_plan_id"], ["weekly_plans.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "weekly_plan_id",
            "day",
            "meal",
            "category",
            name="uq_weekly_choices_plan_day_meal_category",
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("weekly_choices")
    op.drop_table("weekly_plans")
