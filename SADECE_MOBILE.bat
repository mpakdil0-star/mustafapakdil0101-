@echo off
echo ========================================
echo  Mobile Baslatiliyor
echo ========================================
echo.
echo QR kod icin:
echo 1. Terminal'de 'm' tusuna basin
echo 2. VEYA tarayicide http://localhost:8081 acin
echo.
cd /d "%~dp0\mobile"
npm start
pause
