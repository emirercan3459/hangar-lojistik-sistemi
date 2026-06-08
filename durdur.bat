@echo off
chcp 65001 >nul
title Sunucuları Durdur

echo  Sunucular durduruluyor...

:: 8000 portunu kullanan process'i öldür (Backend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    echo  Backend (PID: %%a) durduruluyor...
    taskkill /PID %%a /F >nul 2>&1
)

:: 3000 portunu kullanan process'i öldür (Frontend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    echo  Frontend (PID: %%a) durduruluyor...
    taskkill /PID %%a /F >nul 2>&1
)

echo.
echo  Sunucular durduruldu.
pause
