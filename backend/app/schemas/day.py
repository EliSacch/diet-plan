from datetime import date
from typing import Annotated, Self

from pydantic import BaseModel, Field, model_validator

from app.diet.limits import MAX_AMOUNT, MAX_LABEL_LENGTH, MAX_NAME_LENGTH, MAX_OPTIONS


class DayChoice(BaseModel):
    meal: str = Field(min_length=1, max_length=MAX_LABEL_LENGTH)
    category: str = Field(min_length=1, max_length=MAX_LABEL_LENGTH)
    name: str = Field(min_length=1, max_length=MAX_NAME_LENGTH)
    amount: Annotated[float, Field(gt=0, le=MAX_AMOUNT)] | None = None
    unit: Annotated[str, Field(min_length=1, max_length=MAX_LABEL_LENGTH)] | None = None


class DayInput(BaseModel):
    choices: list[DayChoice] = Field(max_length=MAX_OPTIONS)

    @model_validator(mode="after")
    def one_choice_per_slot(self) -> Self:
        seen: set[tuple[str, str]] = set()
        for choice in self.choices:
            slot = (choice.meal, choice.category)
            if slot in seen:
                raise ValueError(
                    f"{choice.meal} / {choice.category} has more than one choice"
                )
            seen.add(slot)
        return self


class Day(BaseModel):
    date: date
    choices: list[DayChoice]
