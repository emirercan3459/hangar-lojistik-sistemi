@echo off
chcp 65001 >nul
title Hangar Lojistik Yönetim Sistemi

echo.
echo  ============================================
echo   HANGAR LOJİSTİK YÖNETİM SİSTEMİ
echo  ============================================
echo.

:: Proje kök dizinini al
set ROOT=%~dp0

:: ---- BACKEND ----
echo  [1/2] Backend başlatılıyor (FastAPI)...
start "Backend - FastAPI" cmd /k "cd /d "%ROOT%" && venv\Scripts\activate && python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000"

:: Kısa bekleme (backend hazır olsun)
timeout /t 3 /nobreak >nul

:: ---- FRONTEND ----
echo  [2/2] Frontend başlatılıyor (React)...
start "Frontend - React" cmd /k "cd /d "%ROOT%frontend" && npm start"

echo.
echo  ============================================
echo   Sunucular başlatıldı!
echo   Backend  : http://127.0.0.1:8000
echo   Frontend : http://localhost:3000
echo   API Docs : http://127.0.0.1:8000/docs
echo  ============================================
echo.
echo  Bu pencereyi kapatabilirsiniz.
pause
