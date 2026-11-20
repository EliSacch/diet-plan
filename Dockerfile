# syntax=docker/dockerfile:1

# node:22-bookworm-slim
FROM node:22-bookworm-slim@sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee AS frontend
WORKDIR /src
COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install --frozen-lockfile
COPY frontend/ ./
RUN yarn build

# python:3.13-slim-bookworm + uv:0.13.9 (install only; not copied to runtime)
FROM python:3.15-slim-bookworm@sha256:96599df822d0e1c6bb700014a05c7f3c8cabc6e0f7ff3c4f9f69cee033b4b5d9 AS backend
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
FROM python:3.15-slim-bookworm@sha256:96599df822d0e1c6bb700014a05c7f3c8cabc6e0f7ff3c4f9f69cee033b4b5d9 AS runtime
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
