#!/usr/bin/env bash

# ================================================================
#        AI VOICE INTERVIEW - AUTOMATED SETUP & LAUNCHER (UNIX)
# ================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "================================================================"
echo "       AI VOICE INTERVIEW - AUTOMATED SETUP & LAUNCHER"
echo "================================================================"
echo ""

# -------------------------------------------------------------
# 1. Check Prerequisites
# -------------------------------------------------------------
echo "[*] Checking system prerequisites..."

# Python check
if command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD="python3"
elif command -v python >/dev/null 2>&1; then
    PYTHON_CMD="python"
else
    echo "[ERROR] Python 3 is not installed or not in PATH!"
    echo "Please install Python 3.10+."
    exit 1
fi

# Node.js check
if ! command -v node >/dev/null 2>&1; then
    echo "[ERROR] Node.js is not installed or not in PATH!"
    echo "Please install Node.js 18+ from https://nodejs.org."
    exit 1
fi

# npm check
if ! command -v npm >/dev/null 2>&1; then
    echo "[ERROR] npm is not installed or not in PATH!"
    exit 1
fi

echo "[OK] Found $PYTHON_CMD and $(node -v)."
echo ""

# -------------------------------------------------------------
# 2. Check MongoDB Status
# -------------------------------------------------------------
echo "[*] Checking MongoDB status..."
if command -v nc >/dev/null 2>&1 && nc -z 127.0.0.1 27017 2>/dev/null; then
    echo "[OK] MongoDB is running on port 27017."
else
    # Python fallback check
    if $PYTHON_CMD -c "import socket; s = socket.socket(); s.settimeout(1); exit(0 if s.connect_ex(('127.0.0.1', 27017)) == 0 else 1)" 2>/dev/null; then
        echo "[OK] MongoDB is running on port 27017."
    else
        echo "[WARNING] MongoDB does not appear to be running on port 27017."
        echo "Make sure mongod is running if you encounter database errors."
    fi
fi
echo ""

# -------------------------------------------------------------
# 3. Setup Backend
# -------------------------------------------------------------
echo "[*] Setting up Backend..."
cd "$SCRIPT_DIR/backend"

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "[*] Creating backend/.env from .env.example..."
        cp .env.example .env
    else
        echo "[!] Warning: .env.example not found."
    fi
fi

if [ ! -d "venv" ]; then
    echo "[*] Creating Python virtual environment (venv)..."
    $PYTHON_CMD -m venv venv
fi

echo "[*] Activating virtual environment & installing requirements..."
# shellcheck source=/dev/null
source venv/bin/activate
pip install --upgrade pip >/dev/null 2>&1 || true
pip install -r requirements.txt
echo "[OK] Backend dependencies installed."
echo ""

# -------------------------------------------------------------
# 4. Setup Frontend
# -------------------------------------------------------------
echo "[*] Setting up Frontend..."
cd "$SCRIPT_DIR/frontend"

if [ ! -d "node_modules" ]; then
    echo "[*] Installing frontend npm packages (this may take a minute)..."
    npm install
else
    echo "[OK] Frontend node_modules found."
fi
echo ""

# -------------------------------------------------------------
# 5. Detect LAN IP for Mobile Access
# -------------------------------------------------------------
HOST_IP="localhost"
if command -v hostname >/dev/null 2>&1 && hostname -I >/dev/null 2>&1; then
    HOST_IP=$(hostname -I | awk '{print $1}')
elif command -v ipconfig >/dev/null 2>&1; then
    HOST_IP=$(ipconfig getifaddr en0 2>/dev/null || echo "localhost")
fi

# -------------------------------------------------------------
# 6. Concurrently Launch Servers
# -------------------------------------------------------------
echo "================================================================"
echo "                   ALL SYSTEMS READY!"
echo "================================================================"
echo ""
echo "   Local Web App (Desktop):  https://localhost:5173"
if [ "$HOST_IP" != "localhost" ] && [ -n "$HOST_IP" ]; then
    echo "   Phone / Mobile Web App:   https://$HOST_IP:5173"
    echo "   (Accept the self-signed cert on mobile to unlock Microphone)"
fi
echo "   Backend API Docs:         http://localhost:8000/docs"
echo ""
echo "================================================================"
echo "Press [Ctrl+C] at any time to shut down both servers cleanly."
echo "================================================================"
echo ""

# Process management cleanup
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo ""
    echo "[*] Shutting down AI Voice Interview servers..."
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    echo "[OK] Shutdown complete."
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Start Backend
cd "$SCRIPT_DIR/backend"
# shellcheck source=/dev/null
source venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "[*] Backend running with PID $BACKEND_PID"

# Start Frontend
cd "$SCRIPT_DIR/frontend"
npm run dev -- --host &
FRONTEND_PID=$!
echo "[*] Frontend running with PID $FRONTEND_PID"

# Try to open browser automatically if open or xdg-open exists
sleep 2
if command -v xdg-open >/dev/null 2>&1; then
    xdg-open https://localhost:5173 2>/dev/null || true
elif command -v open >/dev/null 2>&1; then
    open https://localhost:5173 2>/dev/null || true
fi

# Wait on background processes
wait $BACKEND_PID $FRONTEND_PID
