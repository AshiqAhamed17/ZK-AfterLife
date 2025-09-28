#!/bin/bash

echo "🛑 Stopping ZK-AfterLife PDF Backend Service..."

# Kill any running instances
pkill -f "zk-afterlife-backend" 2>/dev/null

# Wait a moment
sleep 1

# Check if any processes are still running on port 3002
if lsof -Pi :3002 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Force killing processes on port 3002..."
    lsof -ti:3002 | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# Verify the server is stopped
if ! lsof -Pi :3002 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✅ Server stopped successfully"
else
    echo "❌ Failed to stop server completely"
    exit 1
fi
