"""create diet plan tables

Revision ID: b7e4c1a9d2f6
Revises: c3f1a9b2d4e6
Create Date: 2026-10-03 11:44:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "b7e4c1a9d2f6"
down_revision: str | Sequence[str] | None = "c3f1a9b2d4e6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "diet_plans",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("source_filename", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("extracted_json", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "uq_diet_plans_one_active_per_user",
        "diet_plans",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("is_active"),
        sqlite_where=sa.text("is_active"),
    )
    op.create_table(
        "diet_options",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("diet_plan_id", sa.Integer(), nullable=False),
        sa.Column("day", sa.String(), nullable=False),
        sa.Column("meal", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("amount", sa.Float(), nullable=True),
        sa.Column("unit", sa.String(), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["diet_plan_id"], ["diet_plans.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_diet_options_plan_day_meal_category",
        "diet_options",
        ["diet_plan_id", "day", "meal", "category"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_diet_options_plan_day_meal_category", table_name="diet_options")
    op.drop_table("diet_options")
    op.drop_index("uq_diet_plans_one_active_per_user", table_name="diet_plans")
    op.drop_table("diet_plans")
