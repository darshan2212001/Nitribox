@echo off
echo ========================================
echo   ZyaeL NutriBox - START ALL SERVICES
echo ========================================
echo.

REM Kill existing processes
echo [1/3] Stopping existing processes...
taskkill /F /IM python.exe /T 2>nul
taskkill /F /IM node.exe /T 2>nul
timeout /t 2 /nobreak >nul

echo [2/3] Starting services in separate terminals...
echo.

REM Start Backend API Server in new CMD window
echo Starting Backend API Server (Port 8000)...
start "ZyaeL NutriBox - Backend API" cmd /k "cd /d %~dp0 && python run_api.py || uvicorn api.main:app --reload --host 0.0.0.0 --port 8000"

REM Wait a bit for backend to start
timeout /t 5 /nobreak >nul

REM Start Frontend Web App in new CMD window
echo Starting Frontend Web App (Port 5000)...
start "ZyaeL NutriBox - Frontend Web" cmd /k "cd /d %~dp0\client && npm run dev"

REM Wait a bit more
timeout /t 3 /nobreak >nul

echo.
echo [3/3] Services starting...
echo.
echo ========================================
echo   SERVICES STATUS
echo ========================================
echo   Backend API:  http://localhost:8000
echo   API Docs:     http://localhost:8000/docs
echo   WebSocket:    ws://localhost:8000/ws
echo   Frontend Web: http://localhost:5000
echo ========================================
echo.
echo Services are starting in separate windows.
echo Check the terminal windows for status.
echo.
echo Press any key to exit this window...
echo (The services will continue running in their own windows)
pause >nul

