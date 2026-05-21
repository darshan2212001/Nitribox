Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   ZyaeL NutriBox - MOBILE APPLICATION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Navigate to the correct directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host ""
Write-Host "📁 Working Directory: $(Get-Location)" -ForegroundColor Yellow
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found" -ForegroundColor Red
    Write-Host "Please ensure this script is in the correct location" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-Path "mobile\package.json")) {
    Write-Host "❌ Error: Mobile app not found" -ForegroundColor Red
    Write-Host "Please ensure this script is in the correct location" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ Found mobile application files" -ForegroundColor Green
Write-Host ""

# Clean up any existing processes
Write-Host "🧹 Cleaning up any existing processes..." -ForegroundColor Yellow
# Note: Cannot filter by CommandLine in PowerShell, so kill all node processes
# Expo processes will be killed along with other node processes
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing root dependencies..." -ForegroundColor Green
    npm install --legacy-peer-deps
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install root dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "✅ Root dependencies installed" -ForegroundColor Green
}

if (-not (Test-Path "mobile\node_modules")) {
    Write-Host "📦 Installing mobile dependencies..." -ForegroundColor Green
    npm --workspace mobile install --legacy-peer-deps
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install mobile dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "✅ Mobile dependencies installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "🚀 Starting ZyaeL NutriBox Mobile App..." -ForegroundColor Green
Write-Host "📱 QR CODE WILL APPEAR BELOW - SCAN IT WITH EXPO GO!" -ForegroundColor Cyan
Write-Host "🌐 Web version: http://localhost:8085" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  IMPORTANT: Look for the QR code in this terminal window" -ForegroundColor Yellow
Write-Host "⚠️  Download Expo Go app on your phone and scan the QR code" -ForegroundColor Yellow
Write-Host "⚠️  Press Ctrl+C to stop the mobile app" -ForegroundColor Yellow
Write-Host ""

# Start the mobile app from the mobile directory
Set-Location mobile
npx expo start --port 8085 --clear
