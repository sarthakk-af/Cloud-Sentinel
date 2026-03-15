# ─── Stage 1: Build wheels ────────────────────────────────────────────────────
FROM python:3.10-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --upgrade pip \
    # Step A: Download CPU-only torch + ALL its transitive deps (jinja2, sympy, etc.)
    # --extra-index-url means: use PyPI for general deps, PyTorch index for torch itself
    && pip wheel --no-cache-dir --wheel-dir /app/wheels \
        "torch==2.3.1+cpu" \
        --extra-index-url https://download.pytorch.org/whl/cpu \
    # Step B: Download wheels for the rest of requirements.txt.
    # --find-links reuses the torch we just grabbed so it is not re-downloaded.
    && pip wheel --no-cache-dir --wheel-dir /app/wheels \
        -r requirements.txt \
        --find-links /app/wheels

# ─── Stage 2: Lean runtime image ─────────────────────────────────────────────
FROM python:3.10-slim

WORKDIR /app

RUN useradd -m sentinel

COPY --from=builder /app/wheels /wheels

# --no-index  → pip CANNOT reach PyPI or the PyTorch index.
#               This is critical: without it, pip ignores the CPU wheel and
#               pulls torch 2.10.0 CUDA (3+ GB of nvidia-* packages).
# --find-links → pip resolves everything from the /wheels folder built above.
# Pinning "torch==2.3.1+cpu" tells pip exactly which local wheel to match.
RUN pip install --no-cache --no-index --find-links=/wheels \
        "torch==2.3.1+cpu" \
        "fastapi==0.111.0" \
        "uvicorn[standard]==0.30.1" \
        "transformers==4.41.2" \
        "python-dotenv==1.0.1" \
        "python-multipart==0.0.9" \
        "scikit-learn==1.4.2" \
        "drain3==0.9.11" \
    && rm -rf /wheels

RUN mkdir -p /app/data && chown sentinel:sentinel /app/data

COPY --chown=sentinel:sentinel . .

USER sentinel

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["python", "-m", "api.server"]