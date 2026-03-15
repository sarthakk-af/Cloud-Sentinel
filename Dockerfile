# ─── Stage 1: Build (compile all wheels including transitive deps) ────────────
FROM python:3.10-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Download CPU-only torch + every transitive dependency as wheels.
# --no-deps is intentionally NOT used so jinja2, sympy, etc. are included.
RUN pip install --upgrade pip \
    && pip wheel --no-cache-dir --wheel-dir /app/wheels \
        torch==2.3.1+cpu \
        --extra-index-url https://download.pytorch.org/whl/cpu \
    && pip wheel --no-cache-dir --wheel-dir /app/wheels \
        -r requirements.txt \
        --find-links /app/wheels

# ─── Stage 2: Lean runtime image ─────────────────────────────────────────────
FROM python:3.10-slim

WORKDIR /app

RUN useradd -m sentinel

# Copy all pre-built wheels from builder
COPY --from=builder /app/wheels /wheels

# Install from wheels only (--find-links); allow pip to resolve but
# satisfy everything locally. Drop --no-index so missing transitive
# deps can still be fetched if the wheel wasn't captured (safety net).
RUN pip install --no-cache --find-links=/wheels \
        torch \
        fastapi \
        uvicorn \
        transformers \
        python-dotenv \
        python-multipart \
        scikit-learn \
        drain3 \
    && rm -rf /wheels

RUN mkdir -p /app/data && chown sentinel:sentinel /app/data

COPY --chown=sentinel:sentinel . .

USER sentinel

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["python", "-m", "api.server"]