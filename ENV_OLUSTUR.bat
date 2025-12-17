@echo off
title .env Dosyasi Olusturma
color 0A
echo ========================================
echo   .env DOSYASI OLUSTURULUYOR
echo ========================================
echo.

cd backend

if exist .env (
    echo .env dosyasi zaten var!
    echo Mevcut dosyayi guncellemek ister misiniz? (E/H)
    set /p update="[E/H]: "
    if /i not "%update%"=="E" (
        echo Iptal edildi.
        pause
        exit /b
    )
)

echo Connection string'i buraya yapistirin:
echo (postgresql://postgres:[SIFRE]@db.xxxxx.supabase.co:5432/postgres)
echo.
set /p db_url="DATABASE_URL: "

if "%db_url%"=="" (
    echo Hata: Connection string bos olamaz!
    pause
    exit /b
)

echo.
echo .env dosyasi olusturuluyor...

(
echo # Database
echo DATABASE_URL=%db_url%
echo.
echo # Server
echo NODE_ENV=development
echo PORT=3000
echo API_VERSION=v1
echo.
echo # JWT
echo JWT_SECRET=your-secret-key-change-in-production
echo JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
echo JWT_EXPIRES_IN=15m
echo JWT_REFRESH_EXPIRES_IN=7d
echo.
echo # Redis ^(optional^)
echo REDIS_URL=redis://localhost:6379
echo REDIS_TTL=3600
echo.
echo # CORS
echo FRONTEND_URL=http://localhost:8081
echo.
echo # File Upload
echo MAX_FILE_SIZE=10485760
echo ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp,application/pdf
echo.
echo # Rate Limiting
echo RATE_LIMIT_WINDOW_MS=3600000
echo RATE_LIMIT_MAX_REQUESTS=1000
) > .env

echo.
echo .env dosyasi olusturuldu!
echo.
echo Simdi migration calistiriliyor...
call npm run prisma:migrate

echo.
echo ========================================
echo   HAZIR!
echo ========================================
echo.
echo Backend'i baslatabilirsiniz:
echo   npm run dev
echo.
pause

