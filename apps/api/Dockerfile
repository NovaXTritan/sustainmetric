FROM python:3.12-slim

WORKDIR /app

# Install uv for fast dependency resolution
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency file first for layer caching
COPY pyproject.toml ./

# Install only the declared dependencies (not the project itself)
RUN uv pip install --system --no-cache \
    "fastapi>=0.115.0" \
    "uvicorn[standard]>=0.30.0" \
    "pydantic>=2.9.0" \
    "pydantic-settings>=2.5.0" \
    "sqlmodel>=0.0.22" \
    "asyncpg>=0.30.0" \
    "httpx>=0.27.0" \
    "jinja2>=3.1.0" \
    "google-genai>=1.0.0" \
    "python-jose[cryptography]>=3.3.0" \
    "upstash-redis>=1.1.0" \
    "sentry-sdk[fastapi]>=2.0.0" \
    "arq>=0.26.0" \
    "sse-starlette>=2.0.0" \
    "supabase>=2.0.0" \
    "structlog>=24.0.0"

# Copy application code
COPY . ./

EXPOSE 8080

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1 --limit-concurrency 20"]
