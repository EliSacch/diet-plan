from datetime import date

from sqlalchemy import Date, Float, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DailyChoice(Base):
    __tablename__ = "daily_choices"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "date",
            "meal",
            "category",
            name="uq_daily_choices_user_date_meal_category",
        ),
        Index("ix_daily_choices_user_date", "user_id", "date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    date: Mapped[date] = mapped_column(Date)
    meal: Mapped[str] = mapped_column(String)
    category: Mapped[str] = mapped_column(String)
    name: Mapped[str] = mapped_column(String)
    amount: Mapped[float | None] = mapped_column(Float)
    unit: Mapped[str | None] = mapped_column(String)
