#!/bin/bash

echo "🛑 Stopping Medical Notetaking APIs..."

# Stop transcription API
if [ -f "logs/transcription.pid" ]; then
    PID=$(cat logs/transcription.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo "✅ Transcription API stopped (PID: $PID)"
    else
        echo "⚠️  Transcription API was not running"
    fi
    rm -f logs/transcription.pid
fi

# Stop summarization API
if [ -f "logs/summarization.pid" ]; then
    PID=$(cat logs/summarization.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo "✅ Summarization API stopped (PID: $PID)"
    else
        echo "⚠️  Summarization API was not running"
    fi
    rm -f logs/summarization.pid
fi

echo "🏁 All APIs stopped"
