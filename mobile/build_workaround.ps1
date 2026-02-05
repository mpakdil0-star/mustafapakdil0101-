$sourceDir = $PSScriptRoot
$destDir = "C:\Users\hp\Downloads\TempBuild"
$easTmpDir = "$destDir\eas_tmp"
# ADDED .easignore TO THE LIST
$filesToCopy = @(".easignore", "package.json", "package-lock.json", "app.json", "eas.json", "babel.config.js", "tsconfig.json", "google-services.json", "app", "components", "constants", "data", "hooks", "services", "store", "utils", "assets")

Write-Host "Source Directory: $sourceDir" -ForegroundColor Cyan
Write-Host "Creating temporary build directory at $destDir..." -ForegroundColor Green
if (Test-Path $destDir) {
    Remove-Item -Recurse -Force $destDir -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Force -Path $destDir | Out-Null

Write-Host "Copying specific project files..." -ForegroundColor Green
foreach ($item in $filesToCopy) {
    $srcPath = Join-Path $sourceDir $item
    $dstPath = Join-Path $destDir $item
    if (Test-Path $srcPath) {
        Write-Host "Copying $item..."
        Copy-Item -Path $srcPath -Destination $dstPath -Recurse -Force
    } else {
        Write-Host "Warning: $item not found at $srcPath, skipping." -ForegroundColor Yellow
    }
}

Write-Host "Verifying .easignore..." -ForegroundColor Cyan
if (!(Test-Path "$destDir\.easignore")) {
    Write-Host "ERROR: .easignore not found! This is critical." -ForegroundColor Red
    exit 1
}

Write-Host "Installing dependencies..." -ForegroundColor Green
Set-Location $destDir
npm install

Write-Host "Configuring local SAFE temp directory..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $easTmpDir | Out-Null
$env:TMP = $easTmpDir
$env:TEMP = $easTmpDir
Write-Host "TEMP is now: $env:TEMP"

Write-Host "Starting EAS Build..." -ForegroundColor Green
Set-Location $destDir
$env:EAS_NO_VCS = "1"
# Use npx but ensure it finds the project context
npx eas build --profile development --platform android
