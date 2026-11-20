"""add session metadata

Revision ID: h4c9e2a7b1d0
Revises: a6d3f8b2c5e1
Create Date: 2026-11-20 22:40:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "h4c9e2a7b1d0"
down_revision: str | Sequence[str] | None = "a6d3f8b2c5e1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "sessions",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )
    op.add_column(
        "sessions",
        sa.Column(
            "last_seen_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )
    op.add_column("sessions", sa.Column("user_agent", sa.String(), nullable=True))
    op.add_column("sessions", sa.Column("ip_address", sa.String(), nullable=True))
    op.add_column("sessions", sa.Column("device_label", sa.String(), nullable=True))
    op.add_column("sessions", sa.Column("location_label", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("sessions", "location_label")
    op.drop_column("sessions", "device_label")
    op.drop_column("sessions", "ip_address")
    op.drop_column("sessions", "user_agent")
    op.drop_column("sessions", "last_seen_at")
    op.drop_column("sessions", "created_at")
