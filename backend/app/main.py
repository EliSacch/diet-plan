from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.body_limit import BodySizeLimitMiddleware
from app.core.config import settings
from app.core.handlers import register_error_handlers
from app.diet.extract import register
from app.diet.plugins.progeo import ProgeoExtractor
from app.routers.auth import router as auth_router
from app.routers.diet_plans import router as diet_plans_router
from app.routers.profile import router as profile_router


@asynccontextmanager
async def _lifespan(_app: FastAPI) -> AsyncIterator[None]:
    register(ProgeoExtractor())
    yield


app = FastAPI(
    title="Diet Plan API",
    description="API for the Diet Plan Application",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=_lifespan,
)

app.add_middleware(BodySizeLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_error_handlers(app)
app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(diet_plans_router)

if __name__ == "__main__":  # pragma: no cover
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)


@app.get("/", include_in_schema=False)
def home():
    return {"message": "API Home"}


@app.get("/api/health", include_in_schema=False)
def health() -> dict[str, str]:
    return {"status": "ok"}
