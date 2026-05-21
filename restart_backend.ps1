# Quick script to restart the backend server
Write-Host "Stopping existing Python processes..." -ForegroundColor Yellow
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "Starting backend server..." -ForegroundColor Green
Set-Location $PSScriptRoot
Start-Process python -ArgumentList "-m", "uvicorn", "api.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000" -NoNewWindow

Write-Host "Server starting... Check http://localhost:8000/api/health in a few seconds" -ForegroundColor Cyan

