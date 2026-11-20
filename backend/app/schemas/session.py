from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SessionInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    is_current: bool
    device: str
    location: str | None
    created_at: datetime
    last_seen_at: datetime


class SessionList(BaseModel):
    sessions: list[SessionInfo] = Field(default_factory=list)
