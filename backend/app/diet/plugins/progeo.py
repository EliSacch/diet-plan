import re
from typing import BinaryIO

import pymupdf
from pydantic import ValidationError

from app.core.exceptions import AppError
from app.schemas.diet_plan import (
    PlanCategory,
    PlanDay,
    PlanDocument,
    PlanMeal,
    PlanOption,
)

_UNREADABLE = "The file is not a readable diet plan"
_DAY_TITLE = re.compile(r"^Piano alimentare - (.+)$")
_CONTINUA = "...continua"
_GRAM = re.compile(r"^([A-Za-z]+)\s+(\d+(?:[.,]\d+)?)$")
_COUNTED = re.compile(r"^(\d+(?:[.,]\d+)?)\s+(\S.*)$")
_SAME_LINE = 2.0
_WRAP_GAP = 20.0
_FOOTER_MARGIN = 72.0
_LEFT_AMOUNT_X = 200.0
_RIGHT_AMOUNT_X = 450.0


class ProgeoExtractor:
    def extract(self, file: BinaryIO) -> PlanDocument:
        payload = file.read()
        try:
            pdf = pymupdf.open(stream=payload, filetype="pdf")
        except Exception as exc:
            raise AppError(422, "validation_error", _UNREADABLE) from exc
        try:
            builder = _PlanBuilder()
            for index in range(pdf.page_count):
                _read_page(pdf.load_page(index), builder)
            return builder.document()
        finally:
            pdf.close()


class _Category:
    def __init__(self, name: str) -> None:
        self.name = name
        self.options: list[PlanOption] = []


class _Meal:
    def __init__(self, name: str) -> None:
        self.name = name
        self.categories: list[_Category] = []


class _Day:
    def __init__(self, name: str) -> None:
        self.name = name
        self.meals: list[_Meal] = []


class _PlanBuilder:
    def __init__(self) -> None:
        self.days: list[_Day] = []
        self.day: _Day | None = None
        self.meal: _Meal | None = None
        self.category: _Category | None = None

    def ensure_day(self, name: str) -> None:
        if self.day is not None and self.day.name == name:
            return
        self.day = _Day(name)
        self.days.append(self.day)
        self.meal = None
        self.category = None

    def start_meal(self, name: str) -> None:
        if self.day is None:
            return
        self.meal = _Meal(name)
        self.day.meals.append(self.meal)
        self.category = None

    def start_category(self, label: str) -> None:
        name = label
        if name.startswith(_CONTINUA):
            name = name.removeprefix(_CONTINUA).strip()
            existing = self._latest_category(name)
            if existing is not None:
                self.category = existing
                return
        if self.meal is None or not name:
            return
        self.category = _Category(name)
        self.meal.categories.append(self.category)

    def add_option(self, name: str, amount_text: str | None) -> None:
        if self.category is None or not name:
            return
        amount, unit = _parse_amount(amount_text)
        self.category.options.append(
            PlanOption(
                name=name,
                amount=amount,
                unit=unit,
                position=len(self.category.options),
            )
        )

    def document(self) -> PlanDocument:
        days: list[PlanDay] = []
        for day in self.days:
            meals: list[PlanMeal] = []
            for meal in day.meals:
                categories = [
                    PlanCategory(
                        category=category.name,
                        options=category.options,
                    )
                    for category in meal.categories
                    if category.options
                ]
                if categories:
                    meals.append(PlanMeal(meal=meal.name, categories=categories))
            if meals:
                days.append(PlanDay(day=day.name, meals=meals))
        try:
            return PlanDocument(days=days)
        except ValidationError as exc:
            raise AppError(422, "validation_error", _UNREADABLE) from exc

    def _latest_category(self, name: str) -> _Category | None:
        if self.day is None:
            return None
        found: _Category | None = None
        for meal in self.day.meals:
            for category in meal.categories:
                if category.name == name:
                    found = category
        return found


class _Span:
    def __init__(self, x: float, y: float, role: str, text: str) -> None:
        self.x = x
        self.y = y
        self.role = role
        self.text = text


class _Line:
    def __init__(
        self,
        y: float,
        kind: str,
        text: str,
        amount: str | None = None,
    ) -> None:
        self.y = y
        self.kind = kind
        self.text = text
        self.amount = amount


def _read_page(page: pymupdf.Page, builder: _PlanBuilder) -> None:
    title = _day_title(page)
    if title is None:
        return
    day_name, day_y = title
    builder.ensure_day(day_name)
    midpoint = page.rect.width / 2
    footer = page.rect.height - _FOOTER_MARGIN
    spans = [
        span for span in _spans(page) if day_y < span.y < footer and span.role != "day"
    ]
    _consume(
        _lines([span for span in spans if span.x < midpoint], _LEFT_AMOUNT_X), builder
    )
    _consume(
        _lines([span for span in spans if span.x >= midpoint], _RIGHT_AMOUNT_X),
        builder,
    )


def _day_title(page: pymupdf.Page) -> tuple[str, float] | None:
    for span in _spans(page):
        if span.role != "day":
            continue
        match = _DAY_TITLE.match(span.text)
        if match:
            return match.group(1).strip(), span.y
    return None


def _spans(page: pymupdf.Page) -> list[_Span]:
    spans: list[_Span] = []
    for block in page.get_text("dict")["blocks"]:
        if block.get("type") != 0:
            continue
        for line in block["lines"]:
            for span in line["spans"]:
                text = " ".join(span["text"].split())
                role = _role(span["color"])
                if not text or role is None:
                    continue
                x, y = span["origin"]
                spans.append(_Span(x, y, role, text))
    return spans


def _role(color: int) -> str | None:
    red = (color >> 16) & 255
    green = (color >> 8) & 255
    blue = color & 255
    if red > 240 and green > 240 and blue > 240:
        return "meal"
    if green > 100 and red < 40 and blue < 40:
        return "category"
    if blue > 180 and red < 160 and green < 200 and red < blue:
        return "day"
    if red < 30 and green < 30 and blue < 30:
        return "food"
    return None


def _lines(spans: list[_Span], amount_x: float) -> list[_Line]:
    ordered = sorted(spans, key=lambda span: (span.y, span.x))
    groups: list[list[_Span]] = []
    for span in ordered:
        if groups and abs(span.y - groups[-1][0].y) <= _SAME_LINE:
            groups[-1].append(span)
        else:
            groups.append([span])
    lines: list[_Line] = []
    for group in groups:
        group.sort(key=lambda span: span.x)
        roles = {span.role for span in group}
        y = group[0].y
        if "meal" in roles:
            lines.append(_Line(y, "meal", _join(group, "meal")))
        elif "category" in roles:
            lines.append(_Line(y, "category", _join(group, "category")))
        else:
            names = [span.text for span in group if span.x < amount_x]
            amounts = [span.text for span in group if span.x >= amount_x]
            name = " ".join(names).strip()
            amount = " ".join(amounts).strip()
            if name and amount:
                lines.append(_Line(y, "food", name, amount))
            elif name:
                lines.append(_Line(y, "name", name))
            elif amount:
                lines.append(_Line(y, "amount", amount))
    return lines


def _join(group: list[_Span], role: str) -> str:
    return " ".join(span.text for span in group if span.role == role).strip()


def _consume(lines: list[_Line], builder: _PlanBuilder) -> None:
    index = 0
    while index < len(lines):
        line = lines[index]
        wrapped = _wrapped_name(lines, index)
        if line.kind == "meal":
            builder.start_meal(line.text)
        elif line.kind == "category":
            builder.start_category(line.text)
        elif wrapped is not None:
            builder.add_option(wrapped[0], wrapped[1])
            index += 3
            continue
        elif line.kind == "food":
            builder.add_option(line.text, line.amount)
        elif line.kind == "name":
            builder.add_option(line.text, None)
        index += 1


def _wrapped_name(lines: list[_Line], index: int) -> tuple[str, str] | None:
    if index + 2 >= len(lines):
        return None
    first, amount, second = lines[index], lines[index + 1], lines[index + 2]
    if first.kind != "name" or amount.kind != "amount" or second.kind != "name":
        return None
    if not (first.y < amount.y < second.y):
        return None
    if second.y - first.y > _WRAP_GAP:
        return None
    return f"{first.text} {second.text}", amount.text


def _parse_amount(text: str | None) -> tuple[float | None, str | None]:
    if text is None:
        return None, None
    gram = _GRAM.match(text)
    if gram:
        return float(gram.group(2).replace(",", ".")), gram.group(1)
    counted = _COUNTED.match(text)
    if counted:
        return float(counted.group(1).replace(",", ".")), counted.group(2).strip()
    return None, None
