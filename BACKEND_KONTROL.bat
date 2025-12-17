@echo off
echo ========================================
echo  Backend Kontrol ve Baslatma
echo ========================================
echo.

echo 1. Port 3000 kontrol ediliyor...
netstat -ano | findstr :3000
echo.

echo 2. Backend baslatiliyor...
cd /d "%~dp0\backend"
npm run dev

pause

