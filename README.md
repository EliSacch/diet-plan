# Diet plan

Monorepo with a FastAPI backend and a React Vite frontend.

## Backend

```bash
cd backend
uv run uvicorn app.main:app --reload --port 8000
```

uv keeps the virtualenv at `backend/.venv`. You can also activate it with `source .venv/bin/activate`.

## Frontend

```bash
cd frontend
npm run dev
```

The Vite dev server proxies `/api` to `http://localhost:8000`.
