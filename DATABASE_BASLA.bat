@echo off
title PostgreSQL Database (Docker)
color 0B
echo ========================================
echo   DATABASE BASLATILIYOR (Docker)
echo ========================================
echo.

echo Docker kontrol ediliyor...
docker --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [HATA] Docker yuklu degil!
    echo.
    echo Docker Desktop'i indirin: https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)

echo.
echo Container kontrol ediliyor...
docker ps -a --filter "name=elektrikciler-db" --format "{{.Names}}" | findstr /C:"elektrikciler-db" >nul 2>&1
if errorlevel 1 (
    echo Container bulunamadi, olusturuluyor...
    echo.
    docker run --name elektrikciler-db ^
      -e POSTGRES_USER=elektrikciler ^
      -e POSTGRES_PASSWORD=elektrikciler123 ^
      -e POSTGRES_DB=elektrikciler ^
      -p 5432:5432 ^
      -d postgres:15
    
    if errorlevel 1 (
        echo.
        echo [HATA] Container olusturulamadi!
        pause
        exit /b 1
    )
    
    echo.
    echo Container olusturuldu, bekleniyor (10 saniye)...
    timeout /t 10 /nobreak >nul
    
    echo.
    echo Migration calistiriliyor...
    cd backend
    call npm run prisma:migrate
    cd ..
) else (
    echo Container bulundu, baslatiliyor...
    docker start elektrikciler-db >nul 2>&1
)

echo.
echo ========================================
echo   DATABASE HAZIR!
echo ========================================
echo.
echo Database: localhost:5432
echo User: elektrikciler
echo Database: elektrikciler
echo.
echo Backend'i baslatabilirsiniz!
echo.
pause

