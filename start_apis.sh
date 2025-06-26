#!/bin/bash

echo "🚀 Starting Medical Notetaking APIs..."

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $port is already in use"
        return 1
    fi
    return 0
}

# Start transcription API
echo "Starting Transcription API on port 5001..."
if check_port 5001; then
    cd api/transcription/whisper
    source venv/bin/activate
    nohup python app.py > ../../../logs/transcription.log 2>&1 &
    echo $! > ../../../logs/transcription.pid
    cd ../../..
    echo "✅ Transcription API started (PID: $(cat logs/transcription.pid))"
else
    echo "❌ Cannot start Transcription API - port 5001 in use"
fi

# Start summarization API
echo "Starting Summarization API on port 5002..."
if check_port 5002; then
    cd api/summarization/falconsai
    source venv/bin/activate
    nohup python app.py > ../../../logs/summarization.log 2>&1 &
    echo $! > ../../../logs/summarization.pid
    cd ../../..
    echo "✅ Summarization API started (PID: $(cat logs/summarization.pid))"
else
    echo "❌ Cannot start Summarization API - port 5002 in use"
fi

echo ""
echo "🎉 APIs started successfully!"
echo "Transcription API: http://localhost:5001"
echo "Summarization API: http://localhost:5002"
echo ""
echo "To stop the APIs, run: ./stop_apis.sh"
echo "To view logs: tail -f logs/transcription.log or logs/summarization.log"
