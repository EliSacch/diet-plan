from fastapi import APIRouter

from app.auth.deps import CurrentUser, DbSession
from app.diet.service import active_plan_document, replace_active_plan
from app.schemas.diet_plan import PlanDocument

router = APIRouter(prefix="/api", tags=["diet-plans"])


@router.post("/diet-plans", response_model=PlanDocument, status_code=201)
def create_diet_plan(
    document: PlanDocument,
    user: CurrentUser,
    db: DbSession,
) -> PlanDocument:
    return replace_active_plan(db, user.id, document)


@router.get("/diet-plans/active", response_model=PlanDocument)
def get_active_diet_plan(user: CurrentUser, db: DbSession) -> PlanDocument:
    return active_plan_document(db, user.id)
