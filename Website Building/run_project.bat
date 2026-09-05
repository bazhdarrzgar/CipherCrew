@echo off
setlocal enabledelayedexpansion
title CipherCrew - Launcher

echo ========================================================
echo             CIPHERCREW - ONE-CLICK LAUNCHER
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

:: Check frontend node_modules
if not exist "frontend\node_modules" (
    echo [INFO] frontend\node_modules not found. Installing packages...
    cd frontend
    call npm install
    cd ..
)

:: Free occupied ports (8000 for Backend, 3000 for Frontend)
echo [PORT CHECK] Ensuring ports 8000 and 3000 are available...
call :FreePort 8000 "Backend"
call :FreePort 3000 "Frontend"
echo.

echo [1/3] Starting Backend Server (FastAPI on http://127.0.0.1:8000)...
start "CipherCrew - Backend" cmd /k "title CipherCrew - Backend && cd /d "%~dp0fruit-web" && call venv\Scripts\activate.bat && uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/3] Starting Frontend Server (Next.js on http://localhost:3000)...
start "CipherCrew - Frontend" cmd /k "title CipherCrew - Frontend && cd /d "%~dp0frontend" && npm run dev"

echo.
echo [3/3] Waiting for servers to initialize...
timeout /t 5 /nobreak >nul

echo.
echo Opening browser to http://localhost:3000 ...
start http://localhost:3000

echo.
echo ========================================================
echo  Both services are now running!
echo  - Frontend: http://localhost:3000
echo  - Backend:  http://127.0.0.1:8000
echo  - API Docs: http://127.0.0.1:8000/docs
echo.
echo  To stop the servers, simply close both opened command windows.
echo ========================================================
echo.
pause
goto :eof

:FreePort
set "PORT=%~1"
set "SERVICE=%~2"
set "FREED=0"
set "LAST_PID="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":%PORT%  *.*LISTENING"') do (
    if not "%%a"=="0" (
        if not "%%a"=="!LAST_PID!" (
            echo [PORT CONFLICT] Found process PID %%a occupying port %PORT% for %SERVICE%. Terminating...
            taskkill /F /T /PID %%a >nul 2>&1
            set "LAST_PID=%%a"
            set "FREED=1"
        )
    )
)
if "!FREED!"=="1" (
    timeout /t 1 /nobreak >nul 2>&1
    echo [PORT STATUS] Port %PORT% for %SERVICE% freed successfully.
) else (
    echo [PORT STATUS] Port %PORT% for %SERVICE% is ready.
)
exit /b 0
