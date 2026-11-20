FROM node:22-bookworm-slim AS frontend
WORKDIR /src
COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install --frozen-lockfile
COPY frontend/ ./
RUN yarn build

FROM python:3.13-slim-bookworm
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
WORKDIR /app/backend
COPY backend/pyproject.toml backend/uv.lock backend/.python-version ./
RUN uv sync --frozen --no-dev
COPY backend/ ./
COPY --from=frontend /src/dist /srv/frontend
COPY backend/start.sh /app/start.sh
RUN chmod +x /app/start.sh
ENV PATH="/app/backend/.venv/bin:$PATH" \
    STATIC_DIR=/srv/frontend
EXPOSE 8000
CMD ["/app/start.sh"]
