@echo off
title Backend Server
color 0A
echo ========================================
echo   BACKEND SERVER BASLATILIYOR
echo ========================================
echo.
echo Port: 3000
echo Network: http://192.168.1.59:3000
echo.
echo Lutfen bu pencereyi KAPATMAYIN!
echo.
cd /d "%~dp0\backend"
call npm run dev
pause

