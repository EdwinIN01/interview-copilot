@echo off
chcp 65001 >nul
echo ========================================
echo   Interview Copilot - Startup
echo ========================================
echo.

echo [1/2] Starting backend...
cd /d "%~dp0backend"
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)
call venv\Scripts\activate.bat
pip install -r requirements.txt -q
start "Backend" cmd /k "uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
cd /d "%~dp0"

echo [2/2] Starting frontend...
cd /d "%~dp0frontend"
if not exist node_modules (
    echo Installing frontend dependencies...
    pnpm install
)
start "Frontend" cmd /k "pnpm dev"
cd /d "%~dp0"

echo.
echo ========================================
echo   Startup complete!
echo   Backend API:  http://localhost:8000/docs
echo   Frontend:     http://localhost:5173
echo ========================================
echo.
pause
