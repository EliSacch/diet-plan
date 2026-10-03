from typing import Annotated, Self

from pydantic import BaseModel, Field, model_validator

from app.diet.limits import (
    MAX_AMOUNT,
    MAX_CATEGORIES_PER_MEAL,
    MAX_DAYS,
    MAX_LABEL_LENGTH,
    MAX_MEALS_PER_DAY,
    MAX_NAME_LENGTH,
    MAX_OPTIONS,
    MAX_OPTIONS_PER_CATEGORY,
    MAX_POSITION,
)


class PlanOption(BaseModel):
    name: str = Field(min_length=1, max_length=MAX_NAME_LENGTH)
    amount: Annotated[float, Field(gt=0, le=MAX_AMOUNT)] | None = None
    unit: Annotated[str, Field(min_length=1, max_length=MAX_LABEL_LENGTH)] | None = None
    position: int = Field(ge=0, le=MAX_POSITION)


class PlanCategory(BaseModel):
    category: str = Field(min_length=1, max_length=MAX_LABEL_LENGTH)
    options: list[PlanOption] = Field(min_length=1, max_length=MAX_OPTIONS_PER_CATEGORY)


class PlanMeal(BaseModel):
    meal: str = Field(min_length=1, max_length=MAX_LABEL_LENGTH)
    categories: list[PlanCategory] = Field(
        min_length=1, max_length=MAX_CATEGORIES_PER_MEAL
    )


class PlanDay(BaseModel):
    day: str = Field(min_length=1, max_length=MAX_LABEL_LENGTH)
    meals: list[PlanMeal] = Field(min_length=1, max_length=MAX_MEALS_PER_DAY)


class PlanDocument(BaseModel):
    days: list[PlanDay] = Field(min_length=1, max_length=MAX_DAYS)

    @model_validator(mode="after")
    def limit_option_count(self) -> Self:
        count = sum(
            len(category.options)
            for day in self.days
            for meal in day.meals
            for category in meal.categories
        )
        if count > MAX_OPTIONS:
            raise ValueError(f"A document can contain at most {MAX_OPTIONS} options")
        return self
