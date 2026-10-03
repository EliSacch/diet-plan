from typing import Annotated

from pydantic import BaseModel, Field


class PlanOption(BaseModel):
    name: str = Field(min_length=1)
    amount: float | None = None
    unit: Annotated[str, Field(min_length=1)] | None = None
    position: int = Field(ge=0)


class PlanCategory(BaseModel):
    category: str = Field(min_length=1)
    options: list[PlanOption] = Field(min_length=1)


class PlanMeal(BaseModel):
    meal: str = Field(min_length=1)
    categories: list[PlanCategory] = Field(min_length=1)


class PlanDay(BaseModel):
    day: str = Field(min_length=1)
    meals: list[PlanMeal] = Field(min_length=1)


class PlanDocument(BaseModel):
    days: list[PlanDay] = Field(min_length=1)
