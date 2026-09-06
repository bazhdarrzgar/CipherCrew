@echo off
setlocal enabledelayedexpansion
title CipherCrew - Backend

echo ========================================================
echo             CIPHERCREW - BACKEND SERVER
echo ========================================================
echo.

cd /d "%~dp0"

:: Check backend virtualenv
if not exist "fruit-web\venv\Scripts\uvicorn.exe" (
    echo [ERROR] Backend virtual environment not found in fruit-web\venv!
    echo Please run: py -3.11 -m venv fruit-web\venv
    pause
    exit /b 1
)

:: Check and destroy any existing process on port 8000
echo [PORT CHECK] Verifying port 8000 availability...
set "FREED=0"
set "LAST_PID="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":8000  *.*LISTENING"') do (
    if not "%%a"=="0" (
        if not "%%a"=="!LAST_PID!" (
            echo [PORT CONFLICT] Found process PID %%a occupying port 8000. Terminating...
            taskkill /F /T /PID %%a >nul 2>&1
            set "LAST_PID=%%a"
            set "FREED=1"
        )
    )
)
if "!FREED!"=="1" (
    timeout /t 1 /nobreak >nul 2>&1
    echo [PORT STATUS] Port 8000 freed successfully.
) else (
    echo [PORT STATUS] Port 8000 is ready.
)
echo.

echo Starting CipherCrew - Backend (FastAPI on http://127.0.0.1:8000)...
cd fruit-web
call venv\Scripts\activate.bat
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
pause
