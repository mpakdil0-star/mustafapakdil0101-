@echo off
title Supabase Database Kurulumu
color 0E
echo ========================================
echo   SUPABASE DATABASE KURULUMU
echo ========================================
echo.
echo 1. Tarayicida acin: https://supabase.com
echo 2. Hesap olusturun veya giris yapin
echo 3. "New Project" tiklayin
echo 4. Name: elektrikciler
echo 5. Database password belirleyin (kaydedin!)
echo 6. Region secin
echo 7. "Create new project" tiklayin
echo.
echo Proje olustuktan sonra:
echo 8. Settings ^> Database ^> Connection string (URI)
echo 9. Connection string'i kopyalayin
echo.
echo Connection string'i aldiniz mi? (E/H)
set /p answer="[E/H]: "

if /i "%answer%"=="E" (
    echo.
    echo .env dosyasini acmak icin ENTER'a basin...
    pause >nul
    echo.
    echo Connection string'i backend\.env dosyasina asagidaki formatta ekleyin:
    echo.
    echo DATABASE_URL=postgresql://postgres:[SIFRENIZ]@db.xxxxx.supabase.co:5432/postgres
    echo.
    echo [SIFRENIZ] yerine gercekten database sifrenizi yazin!
    echo.
    echo .env dosyasini kaydettikten sonra ENTER'a basin...
    pause >nul
    
    echo.
    echo Migration calistiriliyor...
    cd backend
    call npm run prisma:migrate
    
    echo.
    echo ========================================
    echo   KURULUM TAMAMLANDI!
    echo ========================================
    echo.
    echo Backend'i yeniden baslatin:
    echo   cd backend
    echo   npm run dev
    echo.
) else (
    echo.
    echo Lutfen once Supabase'de proje olusturun!
    echo Detayli adimlar icin SUPABASE_KURULUM.md dosyasina bakin.
    echo.
)

pause

