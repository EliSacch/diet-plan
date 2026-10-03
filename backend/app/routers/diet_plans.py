from fastapi import APIRouter

from app.auth.deps import CurrentUser, DbSession
from app.core.handlers import title_for
from app.diet.limits import BODY_TOO_LARGE_DETAIL, RATE_LIMIT_DETAIL
from app.diet.rate_limit import diet_plan_posts
from app.diet.service import active_plan_document, replace_active_plan
from app.schemas.diet_plan import PlanDocument
from app.schemas.problem import Problem

router = APIRouter(prefix="/api", tags=["diet-plans"])


def _problem_response(status: int, code: str, detail: str, description: str) -> dict:
    return {
        "description": description,
        "content": {
            "application/problem+json": {
                "schema": Problem.model_json_schema(),
                "example": {
                    "type": "about:blank",
                    "title": title_for(status),
                    "status": status,
                    "code": code,
                    "detail": detail,
                },
            }
        },
    }


@router.post(
    "/diet-plans",
    response_model=PlanDocument,
    status_code=201,
    responses={
        413: _problem_response(
            413,
            "PAYLOAD_TOO_LARGE",
            BODY_TOO_LARGE_DETAIL,
            "The request body is larger than 1 MB.",
        ),
        429: _problem_response(
            429,
            "RATE_LIMITED",
            RATE_LIMIT_DETAIL,
            "This user has replaced a plan more than 10 times in the last hour.",
        ),
    },
)
def create_diet_plan(
    document: PlanDocument,
    user: CurrentUser,
    db: DbSession,
) -> PlanDocument:
    """Replace the active diet plan.

    A document can contain at most 2,000 options. More than that returns 422
    with code VALIDATION_ERROR.
    The body can be at most 1 MB. A larger body returns 413 with code
    PAYLOAD_TOO_LARGE.
    Each user can replace a plan at most 10 times per hour. The next request
    returns 429 with code RATE_LIMITED.
    """
    diet_plan_posts.check(user.id)
    return replace_active_plan(db, user.id, document)


@router.get("/diet-plans/active", response_model=PlanDocument)
def get_active_diet_plan(user: CurrentUser, db: DbSession) -> PlanDocument:
    return active_plan_document(db, user.id)
