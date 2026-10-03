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
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.diet import DietOption, DietPlan
from app.models.user import User
from app.schemas.diet_plan import PlanDocument
from tests.test_auth import ScriptedGoogleHttp


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
