# API

The API is build using FastAPI 

## Table of content

- [Documentation](#documentation)

- [Response format](#response-format)

- [Deployment](#deployment)
  - [Live Website](#live-website)
  - [Local Deployment](#local-deployment)

- [Formatting and linting](#formatting-and-linting)
  - [Linting](#linting)
  - [Formatting](#formatting)

- [Testing](#testing)
  - [Unit Tests](#unit-test)
  - [Coverage](#coverage)


## Documentation

API endpoints are documented at http://localhost:8000/docs or http://localhost:8000/redoc

These endoints are provided by FastAPI

## Response format

A successful response is the resource itself. The HTTP status carries the outcome. For example, `GET /api/health` returns `200` and `{"status": "ok"}`.

An error response is a problem document with `Content-Type: application/problem+json`:

```json
{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404,
  "code": "NOT_FOUND",
  "detail": "Meal not found"
}
```

`code` is always uppercase snake case, such as `NOT_FOUND` or `VALIDATION_ERROR`. Clients use `code` to choose the message they show. `detail` is extra information about that specific failure. If the client does not know the code, it can show `detail`.

## Deployment

### Local Deployment

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

[Back to the top](#api)


## Formatting and linting

[Ruff](https://docs.astral.sh/ruff/) lints and formats the code. It is a dev dependency, installed with `uv sync`.

### Linting

```bash
uv run ruff check .
```

`uv run ruff check --fix .` applies the fixes Ruff can make automatically.

### Formatting

```bash
uv run ruff format .
```

[Back to the top](#api)


## Testing

### Unit test

Run unit tests with `uv run pytest`

### Coverage

[pytest-cov](https://pytest-cov.readthedocs.io/) reports how much of `app` the tests exercise. It is a dev dependency, installed with `uv sync`.

```bash
uv run pytest --cov=app --cov-report=term-missing
```

`--cov-report=term-missing` prints the percentage and the lines the tests do not cover.

[Back to the top](#api)