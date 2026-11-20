from typing import Annotated

from pydantic import BaseModel, Field

from app.diet.limits import MAX_AMOUNT, MAX_LABEL_LENGTH, MAX_NAME_LENGTH


class CustomOptionInput(BaseModel):
    meal: str = Field(min_length=1, max_length=MAX_LABEL_LENGTH)
    category: str = Field(min_length=1, max_length=MAX_LABEL_LENGTH)
    name: str = Field(min_length=1, max_length=MAX_NAME_LENGTH)
    amount: Annotated[float, Field(gt=0, le=MAX_AMOUNT)] | None = None
    unit: Annotated[str, Field(min_length=1, max_length=MAX_LABEL_LENGTH)] | None = None


class CustomOption(CustomOptionInput):
    id: int
