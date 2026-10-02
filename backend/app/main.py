from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.handlers import register_error_handlers

app = FastAPI(
    title="Template Project API",
    description="API for the Template Project",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # TODO: add the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_error_handlers(app)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)


@app.get("/")
def home():
    return {"message": "API Home"}


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
