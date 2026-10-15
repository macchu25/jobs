# scripts/run.ps1 - Run Production Server
$RootDir = (Get-Item $PSScriptRoot).Parent.FullName

$ReleaseExe = "$RootDir\release\warehouse-hmi.exe"
if (-not (Test-Path $ReleaseExe)) {
    Write-Host "Release binary not found. Running build first..." -ForegroundColor Yellow
    & "$RootDir\scripts\build.ps1"
}

Write-Host "`nStarting Warehouse HMI Server..." -ForegroundColor Green
Write-Host "Local:   http://localhost:8080" -ForegroundColor Cyan

# Find local IPv4 address for LAN/Mobile access
$LocalIP = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi*", "Ethernet*" -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike "169.254*" } | Select-Object -First 1).IPAddress
if ($LocalIP) {
    Write-Host "LAN URL: http://${LocalIP}:8080 (Open on Smartphone/Tablet connected to same WiFi)`n" -ForegroundColor Yellow
}

Set-Location "$RootDir\release"
.\warehouse-hmi.exe
