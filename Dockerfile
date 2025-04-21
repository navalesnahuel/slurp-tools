# Backend
FROM golang:1.24.1 AS backend-builder
WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ .
RUN go build -o server .

# Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Scanner Microservice
FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS python-builder
WORKDIR /app

COPY scanner/pyproject.toml scanner/uv.lock ./ 
RUN uv sync --frozen --no-install-project
COPY scanner/ .
RUN uv sync --frozen --compile-bytecode

# Final image
FROM node:20-slim AS final

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

ENV NODE_ENV=production

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
COPY --from=backend-builder /app/server /bin/backend-server
COPY --from=frontend-builder /app/build /app/frontend-build
COPY --from=python-builder /app /scanner

EXPOSE 2222 8000 3000
WORKDIR /

CMD sh -c "cd /scanner && uv run python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 & \
    PORT=2222 node /app/frontend-build/index.js & \
    /bin/backend-server"
