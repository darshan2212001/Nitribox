Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   ZyaeL NutriBox - WEB APPLICATION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Navigate to the correct directory with fallback resolution
$scriptPath = $null
if ($MyInvocation.MyCommand.Path) {
    $scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
} elseif ($PSScriptRoot) {
    $scriptPath = $PSScriptRoot
} else {
    # Fallback: try to get from current location
    $scriptPath = Get-Location
    Write-Host "WARNING - Using current directory as script path. Some operations may fail." -ForegroundColor Yellow
}

# Verify script path exists
if (-not $scriptPath -or -not (Test-Path $scriptPath)) {
    Write-Host "ERROR - Could not determine script directory" -ForegroundColor Red
    exit 1
}

Set-Location $scriptPath

Write-Host ""
Write-Host "Working Directory: $(Get-Location)" -ForegroundColor Yellow
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR - package.json not found" -ForegroundColor Red
    Write-Host "Please ensure this script is in the correct location" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-Path "client\package.json")) {
    Write-Host "ERROR - Web client not found" -ForegroundColor Red
    Write-Host "Please ensure this script is in the correct location" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Found web application files" -ForegroundColor Green
Write-Host ""

# Clean up any existing processes
Write-Host "Cleaning up any existing processes" -ForegroundColor Yellow
Get-Process -Name "python" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "Starting Web Application" -ForegroundColor Green
Write-Host "Web Frontend: http://localhost:5000" -ForegroundColor White
Write-Host ""
Write-Host "WARNING - Press Ctrl+C to stop the service" -ForegroundColor Yellow
Write-Host ""

# Start only the web client
Set-Location client
npm run dev