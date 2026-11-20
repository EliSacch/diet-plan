# syntax=docker/dockerfile:1

# node:22-bookworm-slim
FROM node:26-bookworm-slim@sha256:5df79989ed685e09f0a98019db4cebfb22fb9df1a53c0161664a011f7ff6b0f1 AS frontend
WORKDIR /src
COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install --frozen-lockfile
COPY frontend/ ./
RUN yarn build

# python:3.13-slim-bookworm + uv:0.13.9 (install only; not copied to runtime)
FROM python:3.13-slim-bookworm@sha256:a5a7017efc5969e00ae2b91c8eb0631049a569652aa4ffc4501769049ae45c72 AS backend
COPY --from=ghcr.io/astral-sh/uv@sha256:d3b601f0c7b118bc1753febf7c41cc80981df678445e0254284eecf84db79a7d /uv /uvx /bin/
WORKDIR /app/backend
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/app/backend/.venv
COPY backend/pyproject.toml backend/uv.lock backend/.python-version ./
RUN uv sync --frozen --no-dev && rm -rf /root/.cache/uv
COPY backend/ ./
RUN chmod +x /app/backend/start.sh

# Runtime: app + venv + static assets only (no uv, no node)
FROM python:3.13-slim-bookworm@sha256:a5a7017efc5969e00ae2b91c8eb0631049a569652aa4ffc4501769049ae45c72 AS runtime
RUN groupadd --gid 1000 app \
    && useradd --uid 1000 --gid app --home-dir /app --shell /usr/sbin/nologin app

COPY --from=backend --chown=app:app /app/backend /app/backend
COPY --from=frontend --chown=app:app /src/dist /srv/frontend
COPY --from=backend --chown=app:app /app/backend/start.sh /app/start.sh

ENV PATH="/app/backend/.venv/bin:$PATH" \
    STATIC_DIR=/srv/frontend \
    PYTHONUNBUFFERED=1

USER app
WORKDIR /app/backend
EXPOSE 8000
CMD ["/app/start.sh"]
