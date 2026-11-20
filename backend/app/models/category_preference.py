from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CategoryPreference(Base):
    __tablename__ = "category_preferences"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "category",
            name="uq_category_preferences_user_category",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    category: Mapped[str] = mapped_column(String)
