@echo off
setlocal enabledelayedexpansion
title CipherCrew - Frontend

echo ========================================================
echo             CIPHERCREW - FRONTEND SERVER
echo ========================================================
echo.

cd /d "%~dp0"

:: Check frontend node_modules
if not exist "frontend\node_modules" (
    echo [INFO] node_modules not found. Installing packages...
    cd frontend
    call npm install
    cd ..
)

:: Check and destroy any existing process on port 3000
echo [PORT CHECK] Verifying port 3000 availability...
set "FREED=0"
set "LAST_PID="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":3000  *.*LISTENING"') do (
    if not "%%a"=="0" (
        if not "%%a"=="!LAST_PID!" (
            echo [PORT CONFLICT] Found process PID %%a occupying port 3000. Terminating...
            taskkill /F /T /PID %%a >nul 2>&1
            set "LAST_PID=%%a"
            set "FREED=1"
        )
    )
)
if "!FREED!"=="1" (
    timeout /t 1 /nobreak >nul 2>&1
    echo [PORT STATUS] Port 3000 freed successfully.
) else (
    echo [PORT STATUS] Port 3000 is ready.
)
echo.

echo Starting CipherCrew - Frontend (Next.js on http://localhost:3000)...
cd frontend
npm run dev
pause
