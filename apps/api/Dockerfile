FROM python:3.12-slim

WORKDIR /app

# Install uv for fast dependency resolution
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency files first for layer caching
COPY apps/api/pyproject.toml ./
RUN uv pip install --system --no-cache -r pyproject.toml

# Copy application code
COPY apps/api/ ./

EXPOSE 8000

# Render free tier: 1 worker, limited concurrency to stay within 512MB RAM
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--limit-concurrency", "10"]
