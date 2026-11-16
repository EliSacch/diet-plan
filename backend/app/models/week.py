from datetime import date

from sqlalchemy import Date, Float, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class WeeklyPlan(Base):
    __tablename__ = "weekly_plans"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "week_start",
            name="uq_weekly_plans_user_week_start",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    week_start: Mapped[date] = mapped_column(Date)


class WeeklyChoice(Base):
    __tablename__ = "weekly_choices"
    __table_args__ = (
        UniqueConstraint(
            "weekly_plan_id",
            "day",
            "meal",
            "category",
            name="uq_weekly_choices_plan_day_meal_category",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    weekly_plan_id: Mapped[int] = mapped_column(ForeignKey("weekly_plans.id"))
    day: Mapped[str] = mapped_column(String)
    meal: Mapped[str] = mapped_column(String)
    category: Mapped[str] = mapped_column(String)
    name: Mapped[str] = mapped_column(String)
    amount: Mapped[float | None] = mapped_column(Float)
    unit: Mapped[str | None] = mapped_column(String)
