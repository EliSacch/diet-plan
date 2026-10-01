# Diet plan

Monorepo with a FastAPI backend and a React Vite frontend.

## Backend

Install the Python dependencies with uv. This creates `backend/.venv` from `uv.lock`, including the dev tools.

```bash
cd backend
uv sync
```

Then start the API:

```bash
uv run uvicorn app.main:app --reload --port 8000
```

You can also activate the virtualenv with `source .venv/bin/activate`.

## Frontend

Install the Node dependencies with yarn:

```bash
cd frontend
yarn install
```

Then start the app:

```bash
yarn start
```

The Vite dev server proxies `/api` to `http://localhost:8000`.
