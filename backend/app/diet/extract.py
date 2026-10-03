from typing import BinaryIO, Protocol

from app.core.exceptions import AppError
from app.schemas.diet_plan import PlanDocument


class PlanExtractor(Protocol):
    def extract(self, file: BinaryIO) -> PlanDocument: ...


_extractor: PlanExtractor | None = None


def register(extractor: PlanExtractor) -> None:
    global _extractor
    _extractor = extractor


def extract(file: BinaryIO) -> PlanDocument:
    if _extractor is None:
        raise AppError(500, "internal_error", "No diet plan extractor is registered")
    return _extractor.extract(file)
