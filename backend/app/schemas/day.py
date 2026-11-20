from datetime import date
from typing import Annotated, Self

from pydantic import BaseModel, Field, model_validator

from app.diet.limits import MAX_AMOUNT, MAX_LABEL_LENGTH, MAX_NAME_LENGTH, MAX_OPTIONS
from app.schemas.diet_plan import PlanOption


class DayChoice(BaseModel):
    meal: str = Field(min_length=1, max_length=MAX_LABEL_LENGTH)
    category: str = Field(min_length=1, max_length=MAX_LABEL_LENGTH)
    name: str = Field(min_length=1, max_length=MAX_NAME_LENGTH)
    amount: Annotated[float, Field(gt=0, le=MAX_AMOUNT)] | None = None
    unit: Annotated[str, Field(min_length=1, max_length=MAX_LABEL_LENGTH)] | None = None


class DayInput(BaseModel):
    choices: list[DayChoice] = Field(max_length=MAX_OPTIONS)

    @model_validator(mode="after")
    def no_duplicate_choices(self) -> Self:
        seen: set[tuple[str, str, str, float | None, str | None]] = set()
        for choice in self.choices:
            values = (
                choice.meal,
                choice.category,
                choice.name,
                choice.amount,
                choice.unit,
            )
            if values in seen:
                raise ValueError(
                    f"{choice.meal} / {choice.category} has {choice.name} twice"
                )
            seen.add(values)
        return self


class Day(BaseModel):
    date: date
    choices: list[DayChoice]


class OptionValues(BaseModel):
    name: str
    amount: float | None
    unit: str | None


class CustomOptionValues(OptionValues):
    id: int


class DayOptionsCategory(BaseModel):
    category: str
    options: list[PlanOption]
    custom_options: list[CustomOptionValues]
    current: list[OptionValues]
    multi_select: bool


class DayOptionsMeal(BaseModel):
    meal: str
    categories: list[DayOptionsCategory]


class DayOptions(BaseModel):
    day: str
    meals: list[DayOptionsMeal]
