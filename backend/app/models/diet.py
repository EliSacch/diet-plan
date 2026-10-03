from datetime import datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    String,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.db.base import Base


class DietPlan(Base):
    __tablename__ = "diet_plans"
    __table_args__ = (
        Index(
            "uq_diet_plans_one_active_per_user",
            "user_id",
            unique=True,
            postgresql_where=text("is_active"),
            sqlite_where=text("is_active"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    source_filename: Mapped[str | None] = mapped_column(String)
    is_active: Mapped[bool] = mapped_column(Boolean)
    extracted_json: Mapped[dict[str, Any]] = mapped_column(JSON)


class DietOption(Base):
    __tablename__ = "diet_options"
    __table_args__ = (
        Index(
            "ix_diet_options_plan_day_meal_category",
            "diet_plan_id",
            "day",
            "meal",
            "category",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    diet_plan_id: Mapped[int] = mapped_column(ForeignKey("diet_plans.id"))
    day: Mapped[str] = mapped_column(String)
    meal: Mapped[str] = mapped_column(String)
    category: Mapped[str] = mapped_column(String)
    name: Mapped[str] = mapped_column(String)
    amount: Mapped[float | None] = mapped_column(Float)
    unit: Mapped[str | None] = mapped_column(String)
    position: Mapped[int]
