FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --default-timeout=100 --upgrade pip && \
    pip install --no-cache-dir --default-timeout=100 -r requirements.txt || \
    pip install --no-cache-dir --default-timeout=200 -r requirements.txt

COPY . .

RUN pip install -q sentence-transformers faiss-cpu || \
    pip install --default-timeout=200 -q sentence-transformers faiss-cpu

RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8007

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8007/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8007"]