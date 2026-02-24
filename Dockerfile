FROM python:3.10

WORKDIR /app

COPY requirements.txt .

# Install basic deps
RUN pip install --no-cache-dir fastapi uvicorn pandas scikit-learn

# 🔥 Install CPU-only torch (IMPORTANT)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Then install sentence-transformers
RUN pip install --no-cache-dir sentence-transformers

COPY . .

EXPOSE 8000

CMD ["python", "-m", "api.server"]