# ─── Stage 1: Build (compile wheels) ────────────────────────────────────────
FROM python:3.10-slim AS builder

WORKDIR /app

# Build tools needed by some packages (e.g. scikit-learn C extensions)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# 1. Upgrade pip
# 2. Download CPU-only PyTorch wheel first (explicit index keeps CUDA out)
# 3. Build wheels for the rest of requirements.txt using the cached torch
#    NOTE: requirements.txt must NOT contain "torch" – it is installed here.
RUN pip install --upgrade pip \
    && pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels \
        torch==2.3.1+cpu \
        --extra-index-url https://download.pytorch.org/whl/cpu \
    && pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels \
        -r requirements.txt \
        --find-links /app/wheels

# ─── Stage 2: Lean runtime image ─────────────────────────────────────────────
FROM python:3.10-slim

WORKDIR /app

# Non-root user for security
RUN useradd -m sentinel

# Copy pre-built wheels and install – no internet needed at this stage
COPY --from=builder /app/wheels /wheels

# Install everything from the wheels directory we built in stage 1.
# Use --no-index + --find-links so pip never tries to go to PyPI.
RUN pip install --no-cache --no-index --find-links=/wheels \
        torch \
        fastapi \
        uvicorn \
        transformers \
        python-dotenv \
        python-multipart \
        scikit-learn \
        drain3 \
    && rm -rf /wheels

# Prepare data directory (no -m flag on chown – that was a typo in original)
RUN mkdir -p /app/data && chown sentinel:sentinel /app/data

# Copy application source
COPY --chown=sentinel:sentinel . .

USER sentinel

EXPOSE 8000

# Lightweight healthcheck so Docker/systemd can restart on crash
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["python", "-m", "api.server"]