"""replace weekly plan tables with daily choices

Revision ID: e4b9c2d7a1f0
Revises: d8a2e5f1c7b3
Create Date: 2026-11-19 22:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "e4b9c2d7a1f0"
down_revision: str | Sequence[str] | None = "d8a2e5f1c7b3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_table("weekly_choices")
    op.drop_table("weekly_plans")
    op.create_table(
        "daily_choices",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("meal", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("amount", sa.Float(), nullable=True),
        sa.Column("unit", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "date",
            "meal",
            "category",
            name="uq_daily_choices_user_date_meal_category",
        ),
    )
    op.create_index(
        "ix_daily_choices_user_date",
        "daily_choices",
        ["user_id", "date"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_daily_choices_user_date", table_name="daily_choices")
    op.drop_table("daily_choices")
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
