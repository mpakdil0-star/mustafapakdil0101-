@echo off
echo Baslatiliyor...

echo Backend baslatiliyor (Port 3001)...
start "Elektrikciler Backend" cmd /k "npm run start:backend"

echo Mobile baslatiliyor (Port 8082)...
timeout /t 5
start "Elektrikciler Mobile" cmd /k "npm run start:mobile"

echo.
echo ===================================================
echo Backend ve Mobile ayri pencerelerde acildi.
echo Mobile penceresindeki QR kodu taratabilirsiniz.
echo ===================================================
pause
