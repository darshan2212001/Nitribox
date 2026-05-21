Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   ZyaeL NutriBox - START ALL SERVICES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get script directory with fallback resolution
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
Write-Host "Working Directory: $(Get-Location)" -ForegroundColor Cyan

# Function to stop process using a port with verification
function Stop-PortProcess {
    param([int]$Port, [int]$MaxRetries = 3)
    
    for ($retry = 1; $retry -le $MaxRetries; $retry++) {
        $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        
        if (-not $connections) {
            return $true
        }
        
        Write-Host "Attempt $retry/$MaxRetries - Port $Port is in use. Stopping process..." -ForegroundColor Yellow
        
        foreach ($conn in $connections) {
            if ($conn.OwningProcess) {
                try {
                    $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
                    if ($process) {
                        Write-Host "  Stopping process PID $($conn.OwningProcess) ($($process.ProcessName))" -ForegroundColor Yellow
                        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
                    }
                } catch {
                    # Ignore errors
                }
            }
        }
        
        Start-Sleep -Seconds (2 * $retry)  # Exponential backoff
        
        # Verify port is now free
        $stillInUse = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if (-not $stillInUse) {
            Write-Host "Port $Port is now free" -ForegroundColor Green
            return $true
        }
    }
    
    Write-Host "WARNING - Port $Port may still be in use after $MaxRetries attempts" -ForegroundColor Yellow
    return $false
}

# Step 1: Kill existing processes
Write-Host "Step 1 of 4 - Stopping existing processes" -ForegroundColor Yellow
Get-Process -Name "python" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "Processes stopped successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Check and free ports
Write-Host "Step 2 of 4 - Checking and freeing ports" -ForegroundColor Yellow
$port8000Free = Stop-PortProcess -Port 8000
$port5000Free = Stop-PortProcess -Port 5000

if ($port8000Free -and $port5000Free) {
    Write-Host "Ports checked and freed successfully" -ForegroundColor Green
} else {
    Write-Host "WARNING - Some ports may still be in use. Services may fail to start." -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Verify ports are free before starting
Write-Host "Step 3 of 5 - Verifying ports are available" -ForegroundColor Yellow
$port8000Check = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
$port5000Check = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue

if ($port8000Check) {
    Write-Host "ERROR - Port 8000 is still in use! Cannot start backend." -ForegroundColor Red
    Write-Host "Please manually stop the process using port 8000 and try again." -ForegroundColor Yellow
    exit 1
}

if ($port5000Check) {
    Write-Host "WARNING - Port 5000 is still in use. Frontend may fail to start." -ForegroundColor Yellow
}

Write-Host "Ports verified successfully" -ForegroundColor Green
Write-Host ""

# Step 4: Start Backend API Server
Write-Host "Step 4 of 5 - Starting Backend API Server on Port 8000" -ForegroundColor Green
$backendCommands = @(
    "`$Host.UI.RawUI.WindowTitle = 'ZyaeL NutriBox - Backend API Server'"
    "Set-Location '$scriptPath'"
    "Write-Host '========================================' -ForegroundColor Cyan"
    "Write-Host '   BACKEND API SERVER' -ForegroundColor Cyan"
    "Write-Host '========================================' -ForegroundColor Cyan"
    "Write-Host ''"
    "Write-Host 'Starting on: http://localhost:8000' -ForegroundColor Yellow"
    "Write-Host 'API Docs:    http://localhost:8000/docs' -ForegroundColor Yellow"
    "Write-Host 'WebSocket:   ws://localhost:8000/ws' -ForegroundColor Yellow"
    "Write-Host ''"
    "if (Test-Path 'run_api.py') { python run_api.py } else { uvicorn api.main:app --reload --host 0.0.0.0 --port 8000 }"
)
$backendCommand = $backendCommands -join "; "
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCommand
Write-Host "Backend terminal opened successfully" -ForegroundColor Green
Start-Sleep -Seconds 5

# Step 5: Start Frontend Web App
Write-Host "Step 5 of 5 - Starting Frontend Web App on Port 5000" -ForegroundColor Green
if (Test-Path "$scriptPath\client\package.json") {
    $frontendCommands = @(
        "`$Host.UI.RawUI.WindowTitle = 'ZyaeL NutriBox - Frontend Web App'"
        "Set-Location '$scriptPath\client'"
        "Write-Host '========================================' -ForegroundColor Cyan"
        "Write-Host '   FRONTEND WEB APPLICATION' -ForegroundColor Cyan"
        "Write-Host '========================================' -ForegroundColor Cyan"
        "Write-Host ''"
        "Write-Host 'Starting on: http://localhost:5000' -ForegroundColor Yellow"
        "Write-Host ''"
        "npm run dev"
    )
    $frontendCommand = $frontendCommands -join "; "
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCommand
    Write-Host "Frontend terminal opened successfully" -ForegroundColor Green
} else {
    Write-Host "ERROR - Frontend not found at client/package.json" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   SERVICES STATUS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Backend API:  http://localhost:8000" -ForegroundColor White
Write-Host "   API Docs:     http://localhost:8000/docs" -ForegroundColor White
Write-Host "   WebSocket:    ws://localhost:8000/ws" -ForegroundColor White
Write-Host "   Frontend Web: http://localhost:5000" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services are starting in separate windows" -ForegroundColor Green
Write-Host "Check the terminal windows for detailed status" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit this window..." -ForegroundColor Gray
Write-Host "The services will continue running in their own windows" -ForegroundColor Gray
try {
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
} catch {
    Read-Host "Press Enter to exit"
}

