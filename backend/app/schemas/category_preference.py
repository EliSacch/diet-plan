from pydantic import BaseModel, Field

from app.diet.limits import MAX_LABEL_LENGTH


class CategoryPreference(BaseModel):
    category: str = Field(min_length=1, max_length=MAX_LABEL_LENGTH)
    multi_select: bool
