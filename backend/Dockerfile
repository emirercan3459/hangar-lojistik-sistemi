FROM python:3.10-slim

WORKDIR /app

# Sadece backend gereksinimlerini kopyalayıp kuruyoruz
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Tüm projeyi kopyalıyoruz (backend.main:app şeklinde çalıştığı için)
COPY . .

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
