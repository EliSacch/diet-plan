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
  "detail": "Item not found"
}
```

`code` is always uppercase snake case, such as `NOT_FOUND` or `VALIDATION_ERROR`. Clients use `code` to choose the message they show. `detail` is extra information about that specific failure. If the client does not know the code, it can show `detail`.

## Deployment

### Local Deployment

#### Prerequisites

- [uv](https://docs.astral.sh/uv/). Install it with the official installer:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

- Python 3.13 or newer, as pinned in `.python-version`. `uv sync` downloads that Python when it is not already installed.

PostgreSQL is only needed for the database sections below. The API starts without it.

#### Run the application

From `backend`, install the dependencies. This creates `.venv` from `uv.lock`, including the dev tools:

```bash
cd backend
uv sync
```

`uv run` uses that environment. Activate it when you want `python` and `pytest` directly in the shell:

```bash
source .venv/bin/activate
```

Copy the environment file and update it with the correct local values.

```bash
cp .env.example .env
```

Then start the API:

```bash
uv run python -m app.main
```

or

```bash
uv run uvicorn app.main:app --reload --port 8000
```

#### Local database

The first time, create a local Postgres database. These paths are for Apple Silicon Homebrew.

1. Install PostgreSQL if it is not already installed, then start it:

```bash
brew install postgresql@18
brew services start postgresql@18
```

2. Log in as the admin role. Homebrew creates this as your macOS user, and a new cluster accepts local connections without a password:

```bash
/opt/homebrew/opt/postgresql@18/bin/psql -d postgres
```

3. Confirm the admin role, then create the application role and database:

```sql
SELECT current_user;
\du+
CREATE ROLE <user_name> LOGIN PASSWORD 'choose-a-new-password';
CREATE DATABASE <db_name> OWNER <user_name>;
```

4. Set a password on the admin role from `current_user` before password checks are turned on. That role needs a password once `trust` is no longer allowed:

```sql
ALTER ROLE <current_user> WITH PASSWORD 'choose-an-admin-password';
```

5. Exit with `\q`.

6. In `/opt/homebrew/var/postgresql@18/pg_hba.conf`, set `scram-sha-256` on the three lines whose database is `all`:

```
local   all             all                                     scram-sha-256
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256
```

Leave the `replication` lines unchanged.

7. Restart Postgres so the authentication change is loaded:

```bash
brew services restart postgresql@18
```

8. Log in as the new user. `-W` prompts for the password from step 3:

```bash
/opt/homebrew/opt/postgresql@18/bin/psql -U <user_name> -d <db_name> -W
```

9. In `backend/.env`, set `DATABASE_URL` to the same role, password, and database. Copy `backend/.env.example` to that file first if it does not exist yet:

```
DATABASE_URL=postgresql+psycopg://<user_name>:<password>@localhost:5432/<db_name>
```

#### Add a role and database

Use this when PostgreSQL is already installed and running, including when another database already exists. Leave `pg_hba.conf` unchanged.

1. Log in with the admin role you already use. `-W` prompts for that role's password. If this cluster still allows local connections without a password, omit `-W`:

```bash
/opt/homebrew/opt/postgresql@18/bin/psql -d postgres -W
```

2. Create the application role and database:

```sql
CREATE ROLE <user_name> LOGIN PASSWORD 'choose-a-new-password';
CREATE DATABASE <db_name> OWNER <user_name>;
```

3. Exit with `\q`, then confirm the new role can log in:

```bash
/opt/homebrew/opt/postgresql@18/bin/psql -U <user_name> -d <db_name> -W
```

4. In `backend/.env`, set `DATABASE_URL` to the same role, password, and database. Copy `backend/.env.example` to that file first if it does not exist yet:

```
DATABASE_URL=postgresql+psycopg://<user_name>:<password>@localhost:5432/<db_name>
```

#### Migrations

From `backend`, apply migrations after `DATABASE_URL` points at the local database:

```bash
uv run alembic upgrade head
uv run alembic revision --autogenerate -m "describe the change"
```

`upgrade head` does nothing until the first revision exists. Create that revision when you add a model. Postgres is required for these commands. The health check does not open a connection.

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
uv run ruff format --check
```
Then to apply fixes

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