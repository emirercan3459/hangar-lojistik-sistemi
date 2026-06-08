#!/bin/bash

echo ""
echo " ============================================"
echo "  HANGAR LOJİSTİK YÖNETİM SİSTEMİ"
echo " ============================================"
echo ""

# Proje kök dizinini al
ROOT="$(cd "$(dirname "$0")" && pwd)"

# ---- BACKEND ----
echo " [1/2] Backend başlatılıyor (FastAPI)..."
cd "$ROOT"

# Venv aktif et ve backend başlat (arka planda)
source venv/bin/activate 2>/dev/null || python3 -m venv venv && source venv/bin/activate
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

# Kısa bekleme (backend hazır olsun)
sleep 3

# ---- FRONTEND ----
echo " [2/2] Frontend başlatılıyor (React)..."
cd "$ROOT/frontend"
npm start &
FRONTEND_PID=$!

echo ""
echo " ============================================"
echo "  Sunucular başlatıldı!"
echo "  Backend  : http://127.0.0.1:8000"
echo "  Frontend : http://localhost:3000"
echo "  API Docs : http://127.0.0.1:8000/docs"
echo " ============================================"
echo ""
echo " Durdurmak için CTRL+C'ye basın..."

# Her iki process bitene kadar bekle
wait $BACKEND_PID $FRONTEND_PID
