import asyncio
import json
from collections.abc import Generator
from datetime import UTC, datetime
from urllib.parse import parse_qs, urlparse

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth.google import GoogleOAuth, get_google_oauth
from app.core.body_limit import BodySizeLimitMiddleware
from app.db.base import Base
from app.db.session import get_db
from app.diet.limits import MAX_BODY_BYTES, POSTS_PER_HOUR
from app.diet.rate_limit import diet_plan_posts
from app.main import app
from app.models.diet import DietOption, DietPlan
from app.models.user import User
from app.schemas.diet_plan import PlanDocument
from tests.test_auth import ScriptedGoogleHttp


@pytest.fixture(autouse=True)
def _reset_post_limit() -> None:
    diet_plan_posts.clear()


@pytest.fixture
def database() -> Generator[Session]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False)
    db = factory()
    try:
        yield db
    finally:
        db.close()
        engine.dispose()


@pytest.fixture
def scripted() -> ScriptedGoogleHttp:
    return ScriptedGoogleHttp([{"sub": "google-sub", "email": "ada@example.com"}])


@pytest.fixture
def client(database: Session, scripted: ScriptedGoogleHttp) -> Generator[TestClient]:
    def override_db() -> Generator[Session]:
        yield database

    def override_google() -> GoogleOAuth:
        return GoogleOAuth(client=scripted)  # type: ignore[arg-type]

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_google_oauth] = override_google
    try:
        with TestClient(app, base_url="https://testserver") as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()


def sign_in(client: TestClient) -> None:
    start = client.get("/auth/google", follow_redirects=False)
    state = parse_qs(urlparse(start.headers["location"]).query)["state"][0]
    response = client.get(
        "/auth/google/callback",
        params={"code": "code", "state": state},
        follow_redirects=False,
    )
    assert response.status_code == 302


def sample_document() -> dict[str, object]:
    return {
        "days": [
            {
                "day": "Lunedì",
                "meals": [
                    {
                        "meal": "Colazione",
                        "categories": [
                            {
                                "category": "Bevande",
                                "options": [
                                    {
                                        "name": (
                                            "Bevanda a base di avena con "
                                            "calcio e vitamine agg."
                                        ),
                                        "amount": 250,
                                        "unit": "ml",
                                        "position": 0,
                                    }
                                ],
                            },
                            {
                                "category": "Contorni",
                                "options": [
                                    {
                                        "name": "Insalata mista",
                                        "amount": None,
                                        "unit": None,
                                        "position": 0,
                                    }
                                ],
                            },
                        ],
                    },
                    {
                        "meal": "Pranzo",
                        "categories": [
                            {
                                "category": "Primi",
                                "options": [
                                    {
                                        "name": "Pasta",
                                        "amount": 80,
                                        "unit": "g",
                                        "position": 0,
                                    }
                                ],
                            }
                        ],
                    },
                ],
            },
            {
                "day": "Martedì",
                "meals": [
                    {
                        "meal": "Cena",
                        "categories": [
                            {
                                "category": "Secondi",
                                "options": [
                                    {
                                        "name": "Pesce",
                                        "amount": 150,
                                        "unit": "g",
                                        "position": 0,
                                    }
                                ],
                            }
                        ],
                    }
                ],
            },
        ]
    }


def replacement_document() -> dict[str, object]:
    return {
        "days": [
            {
                "day": "Mercoledì",
                "meals": [
                    {
                        "meal": "Colazione",
                        "categories": [
                            {
                                "category": "Bevande",
                                "options": [
                                    {
                                        "name": "Tè",
                                        "amount": 200,
                                        "unit": "ml",
                                        "position": 0,
                                    }
                                ],
                            }
                        ],
                    }
                ],
            }
        ]
    }


def test_post_stores_the_document_and_get_returns_it(
    client: TestClient, database: Session
) -> None:
    sign_in(client)
    payload = sample_document()

    created = client.post("/api/diet-plans", json=payload)

    assert created.status_code == 201
    assert created.json() == payload
    stored = PlanDocument.model_validate(payload).model_dump()
    plans = database.scalars(select(DietPlan)).all()
    assert len(plans) == 1
    plan = plans[0]
    assert plan.is_active is True
    assert plan.source_filename is None
    assert plan.uploaded_at is not None
    assert plan.extracted_json == stored
    options = database.scalars(select(DietOption).order_by(DietOption.id)).all()
    assert len(options) == 4
    contorno = next(option for option in options if option.category == "Contorni")
    assert contorno.amount is None
    assert contorno.unit is None
    assert contorno.name == "Insalata mista"

    active = client.get("/api/diet-plans/active")

    assert active.status_code == 200
    body = active.json()
    assert body == payload
    assert [day["day"] for day in body["days"]] == ["Lunedì", "Martedì"]
    assert [meal["meal"] for meal in body["days"][0]["meals"]] == [
        "Colazione",
        "Pranzo",
    ]
    assert [
        category["category"] for category in body["days"][0]["meals"][0]["categories"]
    ] == ["Bevande", "Contorni"]
    side = body["days"][0]["meals"][0]["categories"][1]["options"][0]
    assert side["amount"] is None
    assert side["unit"] is None


def test_second_post_leaves_one_active_plan(
    client: TestClient, database: Session
) -> None:
    sign_in(client)
    first = client.post("/api/diet-plans", json=sample_document())
    assert first.status_code == 201

    second = client.post("/api/diet-plans", json=replacement_document())

    assert second.status_code == 201
    assert second.json() == replacement_document()
    database.expire_all()
    plans = database.scalars(select(DietPlan).order_by(DietPlan.id)).all()
    assert [plan.is_active for plan in plans] == [False, True]
    assert client.get("/api/diet-plans/active").json() == replacement_document()


def test_failed_replace_keeps_the_previous_plan(
    client: TestClient, database: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    sign_in(client)
    payload = sample_document()
    assert client.post("/api/diet-plans", json=payload).status_code == 201

    def fail_commit(self: Session) -> None:
        raise RuntimeError("commit failed")

    monkeypatch.setattr(Session, "commit", fail_commit)
    with pytest.raises(RuntimeError, match="commit failed"):
        client.post("/api/diet-plans", json=replacement_document())

    database.expire_all()
    plans = database.scalars(select(DietPlan).order_by(DietPlan.id)).all()
    assert len(plans) == 1
    assert plans[0].is_active is True
    assert plans[0].extracted_json == PlanDocument.model_validate(payload).model_dump()


def test_get_active_without_a_plan_is_not_found(client: TestClient) -> None:
    sign_in(client)

    response = client.get("/api/diet-plans/active")

    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["code"] == "NOT_FOUND"


def test_diet_plan_routes_require_a_session(client: TestClient) -> None:
    created = client.post("/api/diet-plans", json=sample_document())
    active = client.get("/api/diet-plans/active")

    assert created.status_code == 401
    assert created.json()["code"] == "UNAUTHORIZED"
    assert active.status_code == 401
    assert active.json()["code"] == "UNAUTHORIZED"


def test_partial_unique_index_allows_one_active_plan_per_user(
    database: Session,
) -> None:
    ada = User(email="ada@example.com")
    grace = User(email="grace@example.com")
    database.add_all([ada, grace])
    database.flush()
    database.add(_plan(ada.id, active=True))
    database.commit()

    database.add(_plan(ada.id, active=False))
    database.commit()
    database.add(_plan(grace.id, active=True))
    database.commit()

    database.add(_plan(ada.id, active=True))
    with pytest.raises(IntegrityError):
        database.commit()
    database.rollback()


def _plan(user_id: int, *, active: bool) -> DietPlan:
    return DietPlan(
        user_id=user_id,
        uploaded_at=sample_uploaded_at(),
        source_filename=None,
        is_active=active,
        extracted_json={"days": []},
    )


def sample_uploaded_at() -> datetime:
    return datetime(2026, 10, 3, tzinfo=UTC)


def one_option(name: str, amount: float | None = 1) -> dict[str, object]:
    return {
        "days": [
            {
                "day": "Lunedì",
                "meals": [
                    {
                        "meal": "Colazione",
                        "categories": [
                            {
                                "category": "Bevande",
                                "options": [
                                    {
                                        "name": name,
                                        "amount": amount,
                                        "unit": "ml",
                                        "position": 0,
                                    }
                                ],
                            }
                        ],
                    }
                ],
            }
        ]
    }


def many_options(count: int) -> dict[str, object]:
    categories: list[dict[str, object]] = []
    remaining = count
    while remaining:
        size = min(50, remaining)
        categories.append(
            {
                "category": f"C{len(categories)}",
                "options": [
                    {
                        "name": f"Food {len(categories)}-{index}",
                        "amount": 1,
                        "unit": "g",
                        "position": index,
                    }
                    for index in range(size)
                ],
            }
        )
        remaining -= size
    meals: list[dict[str, object]] = []
    while categories:
        meals.append({"meal": f"M{len(meals)}", "categories": categories[:20]})
        categories = categories[20:]
    days: list[dict[str, object]] = []
    while meals:
        days.append({"day": f"D{len(days)}", "meals": meals[:8]})
        meals = meals[8:]
    return {"days": days}


def test_plan_document_rejects_values_outside_the_limits(
    client: TestClient, database: Session
) -> None:
    sign_in(client)
    long_name = one_option("n" * 301)
    zero_amount = one_option("Tè", amount=0)
    too_many = many_options(2_001)

    for payload in (long_name, zero_amount, too_many):
        response = client.post("/api/diet-plans", json=payload)
        assert response.status_code == 422
        assert response.json()["code"] == "VALIDATION_ERROR"

    assert database.scalars(select(DietPlan)).all() == []


def test_post_body_over_one_megabyte_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/diet-plans",
        content=b"x" * (MAX_BODY_BYTES + 1),
        headers={"content-type": "application/json"},
    )

    assert response.status_code == 413
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["code"] == "PAYLOAD_TOO_LARGE"
    assert response.json()["detail"] == "The request body is larger than 1 MB."


def test_chunked_body_over_the_limit_is_rejected_without_content_length() -> None:
    async def exercise(method: str) -> None:
        chunks = [
            {"type": "http.request", "body": b"12345", "more_body": True},
            {"type": "http.request", "body": b"67890", "more_body": False},
        ]
        messages: list[dict] = []
        called = False

        async def downstream(scope: dict, receive, send) -> None:  # type: ignore[no-untyped-def]
            nonlocal called
            called = True

        async def receive() -> dict:
            return chunks.pop(0)

        async def send(message: dict) -> None:
            messages.append(message)

        await BodySizeLimitMiddleware(downstream, max_bytes=8)(
            {"type": "http", "method": method},
            receive,
            send,
        )
        assert called is False
        body = json.loads(messages[1]["body"])
        assert body["code"] == "PAYLOAD_TOO_LARGE"

    for method in ("POST", "PUT", "PATCH"):
        asyncio.run(exercise(method))


def test_body_limit_stops_when_the_stream_is_not_a_request() -> None:
    async def exercise() -> None:
        called = False

        async def downstream(scope: dict, receive, send) -> None:  # type: ignore[no-untyped-def]
            nonlocal called
            called = True

        async def receive() -> dict:
            return {"type": "http.disconnect"}

        async def send(message: dict) -> None:
            raise AssertionError(message)

        await BodySizeLimitMiddleware(downstream)(
            {"type": "http", "method": "POST"},
            receive,
            send,
        )
        assert called is False

    asyncio.run(exercise())


def test_replay_reads_the_original_stream_after_the_body() -> None:
    async def exercise() -> None:
        messages = [
            {"type": "http.request", "body": b"hi", "more_body": False},
            {"type": "http.disconnect"},
        ]
        seen: list[dict] = []

        async def downstream(scope: dict, receive, send) -> None:  # type: ignore[no-untyped-def]
            seen.append(await receive())
            seen.append(await receive())

        async def receive() -> dict:
            return messages.pop(0)

        async def send(message: dict) -> None:
            return None

        await BodySizeLimitMiddleware(downstream, max_bytes=8)(
            {"type": "http", "method": "POST"},
            receive,
            send,
        )
        assert seen == [
            {"type": "http.request", "body": b"hi", "more_body": False},
            {"type": "http.disconnect"},
        ]

    asyncio.run(exercise())


def test_post_past_the_hourly_limit_is_rate_limited(
    client: TestClient, database: Session
) -> None:
    sign_in(client)
    for index in range(POSTS_PER_HOUR):
        created = client.post("/api/diet-plans", json=one_option(f"Item {index}"))
        assert created.status_code == 201

    rejected = client.post("/api/diet-plans", json=one_option("Over the limit"))

    assert rejected.status_code == 429
    assert rejected.json()["code"] == "RATE_LIMITED"
    assert rejected.json()["detail"] == (
        "Too many diet plans were posted. Try again later."
    )
    active = client.get("/api/diet-plans/active")
    assert active.status_code == 200
    assert (
        active.json()["days"][0]["meals"][0]["categories"][0]["options"][0]["name"]
        == f"Item {POSTS_PER_HOUR - 1}"
    )
    database.expire_all()
    names = database.scalars(select(DietOption.name)).all()
    assert "Over the limit" not in names


def test_replace_keeps_only_the_two_newest_inactive_plans(
    client: TestClient, database: Session
) -> None:
    sign_in(client)
    user = database.scalar(select(User).where(User.email == "ada@example.com"))
    assert user is not None
    stale = DietPlan(
        user_id=user.id,
        uploaded_at=datetime(2020, 1, 1, tzinfo=UTC),
        source_filename=None,
        is_active=False,
        extracted_json={"days": []},
    )
    database.add(stale)
    database.flush()
    database.add(
        DietOption(
            diet_plan_id=stale.id,
            day="Lunedì",
            meal="Colazione",
            category="Bevande",
            name="Stale",
            amount=1,
            unit="ml",
            position=0,
        )
    )
    database.commit()
    stale_id = stale.id

    for index in range(POSTS_PER_HOUR):
        created = client.post("/api/diet-plans", json=one_option(f"Plan {index}"))
        assert created.status_code == 201

    database.expire_all()
    plans = database.scalars(select(DietPlan).order_by(DietPlan.id)).all()
    assert stale_id not in {plan.id for plan in plans}
    assert [plan.is_active for plan in plans] == [False, False, True]
    option_plan_ids = set(database.scalars(select(DietOption.diet_plan_id)).all())
    assert option_plan_ids == {plan.id for plan in plans}
    names = database.scalars(select(DietOption.name)).all()
    assert "Stale" not in names


def test_openapi_documents_the_post_limits(client: TestClient) -> None:
    schema = client.get("/openapi.json").json()
    operation = schema["paths"]["/api/diet-plans"]["post"]

    assert "2,000" in operation["description"]
    for status, code in (("413", "PAYLOAD_TOO_LARGE"), ("429", "RATE_LIMITED")):
        example = operation["responses"][status]["content"]["application/problem+json"][
            "example"
        ]
        assert example["code"] == code
