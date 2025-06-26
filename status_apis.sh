#!/bin/bash

echo "📊 Medical Notetaking APIs Status"
echo "=================================="

# Check transcription API
echo "🎙️ Transcription API (Port 5001):"
if [ -f "logs/transcription.pid" ]; then
    PID=$(cat logs/transcription.pid)
    if kill -0 $PID 2>/dev/null; then
        echo "   Status: ✅ Running (PID: $PID)"
        if command -v curl &> /dev/null; then
            response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/health 2>/dev/null || echo "000")
            if [ "$response" = "200" ]; then
                echo "   Health: ✅ Healthy"
            else
                echo "   Health: ❌ Unhealthy (HTTP: $response)"
            fi
        fi
    else
        echo "   Status: ❌ Not running (stale PID file)"
        rm -f logs/transcription.pid
    fi
else
    echo "   Status: ❌ Not running"
fi

echo ""

# Check summarization API
echo "📋 Summarization API (Port 5002):"
if [ -f "logs/summarization.pid" ]; then
    PID=$(cat logs/summarization.pid)
    if kill -0 $PID 2>/dev/null; then
        echo "   Status: ✅ Running (PID: $PID)"
        if command -v curl &> /dev/null; then
            response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5002/health 2>/dev/null || echo "000")
            if [ "$response" = "200" ]; then
                echo "   Health: ✅ Healthy"
            else
                echo "   Health: ❌ Unhealthy (HTTP: $response)"
            fi
        fi
    else
        echo "   Status: ❌ Not running (stale PID file)"
        rm -f logs/summarization.pid
    fi
else
    echo "   Status: ❌ Not running"
fi

echo ""
echo "💡 Commands:"
echo "   Start APIs: ./start_apis.sh"
echo "   Stop APIs:  ./stop_apis.sh"
echo "   View logs:  tail -f logs/transcription.log"
echo "              tail -f logs/summarization.log"
