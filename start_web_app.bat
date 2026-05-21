@echo off
echo ========================================
echo    ZyaeL NutriBox - WEB APPLICATION
echo ========================================
echo.
echo Starting PowerShell script...
echo.

REM Run the PowerShell script
powershell -ExecutionPolicy Bypass -File "%~dp0start_web_app.ps1"

pause
