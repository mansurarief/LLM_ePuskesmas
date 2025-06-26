#!/bin/bash

# Medical Notetaking APIs Setup Script
# This script sets up both transcription and summarization APIs

set -e  # Exit on any error

echo "🏥 Medical Notetaking APIs Setup"
echo "================================="
echo ""

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "success")
            echo -e "✅ $message"
            ;;
        "error")
            echo -e "❌ $message"
            ;;
        "info")
            echo -e "ℹ️  $message"
            ;;
        "warning")
            echo -e "⚠️  $message"
            ;;
    esac
}

# Check system requirements
check_requirements() {
    echo "🔍 Checking system requirements..."
    
    # Check Python 3
    if ! command -v python3 &> /dev/null; then
        print_status "error" "Python 3 is not installed. Please install Python 3.8 or higher."
        exit 1
    fi
    
    # Check Python version
    python_version=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
    required_version="3.8"
    
    if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" != "$required_version" ]; then
        print_status "error" "Python 3.8 or higher is required. Current version: $python_version"
        exit 1
    fi
    
    print_status "success" "Python version check passed: $python_version"
    
    # Check available disk space (at least 5GB recommended)
    available_space=$(df -h . | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "${available_space%.*}" -lt 5 ]; then
        print_status "warning" "Low disk space detected. At least 5GB recommended for model downloads."
    fi
    
    print_status "success" "System requirements check completed"
    echo ""
}

# Setup transcription API
setup_transcription() {
    echo "🎙️ Setting up Transcription API..."
    cd api/transcription/whisper
    
    if [ -f "setup_env.sh" ]; then
        ./setup_env.sh
        print_status "success" "Transcription API setup completed"
    else
        print_status "error" "setup_env.sh not found in transcription directory"
        exit 1
    fi
    
    cd ../../..
    echo ""
}

# Setup summarization API
setup_summarization() {
    echo "📋 Setting up Summarization API..."
    cd api/summarization/falconsai
    
    if [ -f "setup_env.sh" ]; then
        ./setup_env.sh
        print_status "success" "Summarization API setup completed"
    else
        print_status "error" "setup_env.sh not found in summarization directory"
        exit 1
    fi
    
    cd ../../..
    echo ""
}

# Create service management scripts
create_service_scripts() {
    echo "📝 Creating service management scripts..."
    
    # Create start script
    cat > start_apis.sh << 'EOF'
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
EOF

    # Create stop script
    cat > stop_apis.sh << 'EOF'
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
EOF

    # Create status script
    cat > status_apis.sh << 'EOF'
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
EOF

    # Make scripts executable
    chmod +x start_apis.sh stop_apis.sh status_apis.sh
    
    # Create logs directory
    mkdir -p logs
    
    print_status "success" "Service management scripts created"
    echo ""
}

# Main setup function
main() {
    echo "This script will set up both the transcription and summarization APIs."
    echo "It will download large ML models (several GB). Continue? (y/N)"
    read -r response
    
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
    
    echo ""
    
    check_requirements
    setup_transcription
    setup_summarization
    create_service_scripts
    
    echo "🎉 All APIs setup completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Start the APIs: ./start_apis.sh"
    echo "2. Check status: ./status_apis.sh"
    echo "3. Configure Chrome extension to use local APIs in settings"
    echo ""
    echo "📚 API Endpoints:"
    echo "Transcription API: http://localhost:5001"
    echo "  - POST /transcribe - Upload audio file"
    echo "  - GET  /health     - Health check"
    echo ""
    echo "Summarization API: http://localhost:5002"
    echo "  - POST /summarize  - Summarize text"
    echo "  - GET  /health     - Health check"
    echo "  - GET  /templates  - Available templates"
    echo ""
    echo "⚠️  Note: First run will download models and may take 10-15 minutes"
}

# Run main function
main "$@" 