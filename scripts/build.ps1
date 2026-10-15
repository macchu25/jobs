# scripts/build.ps1 - Production Build for Windows
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Building Production Warehouse HMI Executable" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

$RootDir = (Get-Item $PSScriptRoot).Parent.FullName

# 1. Build Frontend
Write-Host "`n[1/3] Building Frontend Web App (PWA)..." -ForegroundColor Yellow
Set-Location "$RootDir\frontend"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Frontend build failed!"
    exit 1
}

# 2. Prepare Release Directory
Write-Host "`n[2/3] Setting up release bundle directory..." -ForegroundColor Yellow
$ReleaseDir = "$RootDir\release"
if (-not (Test-Path $ReleaseDir)) {
    New-Item -ItemType Directory -Path $ReleaseDir | Out-Null
}
$ReleaseDist = "$ReleaseDir\dist"
if (Test-Path $ReleaseDist) {
    Remove-Item -Recurse -Force $ReleaseDist
}
Copy-Item -Recurse -Force "$RootDir\frontend\dist" $ReleaseDist

# Copy configs
if (-not (Test-Path "$ReleaseDir\configs")) {
    New-Item -ItemType Directory -Path "$ReleaseDir\configs" | Out-Null
}
Copy-Item -Force "$RootDir\configs\plc-map.yaml" "$ReleaseDir\configs\plc-map.yaml"
Copy-Item -Force "$RootDir\.env.example" "$ReleaseDir\.env"

# 3. Build Go Backend Binary
Write-Host "`n[3/3] Building Go Server Binary (warehouse-hmi.exe)..." -ForegroundColor Yellow
Set-Location "$RootDir\backend"
go build -ldflags "-s -w" -o "$ReleaseDir\warehouse-hmi.exe" cmd/server/main.go
if ($LASTEXITCODE -ne 0) {
    Write-Error "Backend build failed!"
    exit 1
}

Set-Location $RootDir
Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " BUILD SUCCESSFUL!" -ForegroundColor Green
Write-Host " Release Output: $ReleaseDir" -ForegroundColor Cyan
Write-Host " Executable:     $ReleaseDir\warehouse-hmi.exe" -ForegroundColor Cyan
Write-Host " Run script:     .\scripts\run.ps1" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
