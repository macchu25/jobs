# scripts/dev.ps1 - Start Development Environment
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Starting Warehouse HMI Development Environment" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

$CurrentDir = Get-Location

# 1. Start Go Backend in a background process / job
Write-Host "Starting Go Backend on http://localhost:8080 ..." -ForegroundColor Yellow
$backendJob = Start-Process -FilePath "go" -ArgumentList "run", "cmd/server/main.go" -WorkingDirectory "$CurrentDir\backend" -PassThru

# Wait briefly for backend to initialize
Start-Sleep -Seconds 2

# 2. Start Vite Frontend
Write-Host "Starting Vite Dev Server on http://localhost:5173 ..." -ForegroundColor Yellow
Set-Location "$CurrentDir\frontend"
try {
    npm run dev
}
finally {
    Write-Host "Stopping backend process (PID $($backendJob.Id))..." -ForegroundColor Red
    Stop-Process -Id $backendJob.Id -Force -ErrorAction SilentlyContinue
    Set-Location $CurrentDir
}
