from fastapi import APIRouter

from app.auth.deps import CurrentUser
from app.schemas.profile import Profile

router = APIRouter(prefix="/api", tags=["profile"])


@router.get("/profile", response_model=Profile)
def profile(user: CurrentUser) -> Profile:
    return Profile(id=user.id, email=user.email)
