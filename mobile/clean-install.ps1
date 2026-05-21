# Clean Install Script for Mobile App
# This script clears all caches and performs a clean reinstall

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   MOBILE APP - CLEAN INSTALL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "📁 Working Directory: $(Get-Location)" -ForegroundColor Yellow
Write-Host ""

# Step 1: Clear Metro bundler cache
Write-Host "Step 1/5 - Clearing Metro bundler cache..." -ForegroundColor Yellow
if (Test-Path "$env:TEMP\metro-*") {
    Remove-Item "$env:TEMP\metro-*" -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path "$env:TEMP\haste-map-*") {
    Remove-Item "$env:TEMP\haste-map-*" -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Host "✅ Metro cache cleared" -ForegroundColor Green
Write-Host ""

# Step 2: Clear npm cache
Write-Host "Step 2/5 - Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force
Write-Host "✅ npm cache cleared" -ForegroundColor Green
Write-Host ""

# Step 3: Remove node_modules
Write-Host "Step 3/5 - Removing node_modules..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Local node_modules removed" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No local node_modules found" -ForegroundColor Gray
}

# Also remove parent node_modules if in mobile directory
$parentNodeModules = "..\node_modules"
if (Test-Path $parentNodeModules) {
    Write-Host "⚠️  Parent node_modules found. Skipping removal (too large)." -ForegroundColor Yellow
    Write-Host "   Run from root: Remove-Item node_modules -Recurse -Force" -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Remove lock files (will be regenerated)
Write-Host "Step 4/5 - Removing lock files..." -ForegroundColor Yellow
if (Test-Path "package-lock.json") {
    Remove-Item "package-lock.json" -Force -ErrorAction SilentlyContinue
    Write-Host "✅ package-lock.json removed" -ForegroundColor Green
}
if (Test-Path "yarn.lock") {
    Remove-Item "yarn.lock" -Force -ErrorAction SilentlyContinue
    Write-Host "✅ yarn.lock removed" -ForegroundColor Green
}
Write-Host ""

# Step 5: Clean install
Write-Host "Step 5/5 - Installing dependencies..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Gray
npm install --legacy-peer-deps

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "   ✅ CLEAN INSTALL COMPLETE!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Run: npm start" -ForegroundColor White
    Write-Host "  2. Or use: npx expo start --clear" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "   ❌ INSTALLATION FAILED" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check the error messages above." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

