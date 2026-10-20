@echo off
setlocal enabledelayedexpansion

title AI Voice Interview Setup and Launcher

echo ================================================================
echo        AI VOICE INTERVIEW - AUTOMATED SETUP AND LAUNCHER
echo ================================================================
echo.

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

:: -------------------------------------------------------------
:: 1. Check Prerequisites
:: -------------------------------------------------------------
echo [*] Checking system prerequisites...

where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python 3 is not found in PATH!
    echo Please install Python 3.10+ from https://python.org and add it to PATH.
    pause
    exit /b 1
)

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not found in PATH!
    echo Please install Node.js 18+ from https://nodejs.org.
    pause
    exit /b 1
)

where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm is not found in PATH!
    pause
    exit /b 1
)

echo [OK] Python and Node.js detected.
echo.

:: -------------------------------------------------------------
:: 2. Check MongoDB Status
:: -------------------------------------------------------------
echo [*] Checking MongoDB connection...
python -c "import socket; s = socket.socket(); s.settimeout(1); exit(0 if s.connect_ex(('127.0.0.1', 27017)) == 0 else 1)" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] MongoDB is running on port 27017.
) else (
    echo [WARNING] Could not connect to MongoDB on port 27017.
    echo Please make sure MongoDB is started if you encounter database errors.
)
echo.

:: -------------------------------------------------------------
:: 3. Setup Backend
:: -------------------------------------------------------------
echo [*] Setting up Backend...
cd /d "%ROOT_DIR%backend"

if not exist ".env" (
    if exist ".env.example" (
        echo [*] Creating backend\.env from .env.example...
        copy ".env.example" ".env" >nul
    ) else (
        echo [!] Warning: .env.example not found in backend directory.
    )
)

if not exist "venv" (
    echo [*] Creating Python virtual environment...
    python -m venv venv
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to create Python virtual environment.
        pause
        exit /b 1
    )
)

echo [*] Activating virtual environment and verifying dependencies...
call "%ROOT_DIR%backend\venv\Scripts\activate.bat"
python -m pip install --upgrade pip >nul 2>&1
pip install -r requirements.txt
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install backend requirements.
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed.
echo.

:: -------------------------------------------------------------
:: 4. Setup Frontend
:: -------------------------------------------------------------
echo [*] Setting up Frontend...
cd /d "%ROOT_DIR%frontend"

if not exist "node_modules" (
    echo [*] Installing frontend npm packages - this may take a minute...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to install frontend npm packages.
        pause
        exit /b 1
    )
) else (
    echo [OK] Frontend node_modules found.
)
echo.

:: -------------------------------------------------------------
:: 5. Detect Host IP for Phone / LAN Access
:: -------------------------------------------------------------
set "HOST_IP=localhost"
for /f "tokens=*" %%i in ('python -c "import socket; s=socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('8.8.8.8', 80)); print(s.getsockname()[0]); s.close()" 2^>nul') do (
    set "HOST_IP=%%i"
)
if "%HOST_IP%"=="" (
    for /f "tokens=*" %%i in ('python -c "import socket; print(socket.gethostbyname(socket.gethostname()))" 2^>nul') do (
        set "HOST_IP=%%i"
    )
)

:: -------------------------------------------------------------
:: 6. Launch Applications
:: -------------------------------------------------------------
echo ================================================================
echo                   ALL SYSTEMS READY!
echo ================================================================
echo.
echo   Local Web App [Desktop]:  https://localhost:5173
if not "%HOST_IP%"=="localhost" (
    echo   Phone / Network Web App:  https://%HOST_IP%:5173
    echo   [Note] Accept the self-signed cert on mobile to unlock Microphone
)
echo   Backend API Documentation: http://localhost:8000/docs
echo.
echo ================================================================
echo.

echo [*] Launching Backend API server in background window...
start "AI Voice Interview - Backend" cmd /k "cd /d "%ROOT_DIR%backend" && call venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [*] Launching Frontend dev server in background window...
start "AI Voice Interview - Frontend" cmd /k "cd /d "%ROOT_DIR%frontend" && npm run dev"

echo.
echo [*] Both servers are starting up.
echo [*] Opening https://localhost:5173 in your default browser in 3 seconds...
timeout /t 3 /nobreak >nul
start https://localhost:5173

echo.
echo ================================================================
echo Servers are running. You can close this window at any time.
echo To stop the servers, close the Backend and Frontend windows.
echo ================================================================
echo.
pause
