from fastapi import APIRouter, Response

from app.auth.deps import CurrentUser, DbSession
from app.custom_options.service import create_custom_option, delete_custom_option
from app.schemas.custom_option import CustomOption, CustomOptionInput

router = APIRouter(prefix="/api", tags=["custom-options"])


@router.post("/custom-options", response_model=CustomOption, status_code=201)
def post_custom_option(
    option: CustomOptionInput,
    user: CurrentUser,
    db: DbSession,
) -> CustomOption:
    """Add a custom option to a meal and category.

    The option is offered for that meal and category on any day. It is stored
    apart from the diet plan, so the plan's options never change.
    The same meal, category, name, amount and unit a second time returns 409
    with code CONFLICT. A user can have at most 500 custom options. One more
    returns 422 with code VALIDATION_ERROR.
    """
    return create_custom_option(db, user.id, option)


@router.delete(
    "/custom-options/{option_id}",
    status_code=204,
    response_class=Response,
)
def remove_custom_option(option_id: int, user: CurrentUser, db: DbSession) -> None:
    """Delete a custom option.

    Days that already picked it keep their saved choice. An option that does not
    exist or belongs to another user returns 404 with code NOT_FOUND.
    """
    delete_custom_option(db, user.id, option_id)
