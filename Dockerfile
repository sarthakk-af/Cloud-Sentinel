# --- Stage 1: Build Stage ---
FROM python:3.10-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install dependencies into a wheels directory
RUN pip install --upgrade pip \
    && pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt \
    && pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels torch --index-url https://download.pytorch.org/whl/cpu

# --- Stage 2: Final Stage ---
FROM python:3.10-slim

WORKDIR /app

# Add a non-root user
RUN useradd -m sentinel

# Copy wheels from builder and install
COPY --from=builder /app/wheels /wheels
RUN pip install --no-cache /wheels/* \
    && rm -rf /wheels

# Create data directory and set permissions
RUN mkdir -p /app/data && chown -m sentinel:sentinel /app/data

COPY --chown=sentinel:sentinel . .

USER sentinel

EXPOSE 8000

# Ensure the app uses the consolidated entry point
CMD ["python", "-m", "api.server"]