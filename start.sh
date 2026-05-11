#!/bin/bash
# 多Agent协同运营自动化系统 - 启动脚本

echo "================================================"
echo "  多Agent协同运营自动化系统"
echo "  Multi-Agent Collaborative Operations System"
echo "================================================"
echo ""

# Check Python
if command -v python3 &> /dev/null; then
    echo "✅ Python3: $(python3 --version)"
else
    echo "❌ Python3 not found"
    exit 1
fi

# Check Node
if command -v bun &> /dev/null; then
    echo "✅ Bun: $(bun --version)"
elif command -v node &> /dev/null; then
    echo "✅ Node: $(node --version)"
else
    echo "❌ Node/Bun not found"
    exit 1
fi

echo ""
echo "Starting services..."
echo ""

# Start Python backend
echo "🐍 Starting Python backend (FastAPI) on port 8000..."
cd /home/z/my-project/python-backend
python3 server.py &
PY_PID=$!
echo "   PID: $PY_PID"

# Wait for Python backend to start
sleep 3

# Start Next.js frontend
echo "🌐 Starting Next.js frontend on port 3000..."
cd /home/z/my-project
bun run dev &
NX_PID=$!
echo "   PID: $NX_PID"

echo ""
echo "================================================"
echo "  System is running!"
echo ""
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo "  WebSocket: ws://localhost:8000/ws"
echo ""
echo "  Press Ctrl+C to stop all services"
echo "================================================"

# Handle shutdown
cleanup() {
    echo ""
    echo "Shutting down..."
    kill $PY_PID 2>/dev/null
    kill $NX_PID 2>/dev/null
    echo "Services stopped."
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait
wait
