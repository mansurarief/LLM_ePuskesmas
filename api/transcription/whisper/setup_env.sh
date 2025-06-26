#!/bin/bash

# Medical Transcription API Setup Script
# This script sets up the virtual environment and installs dependencies

set -e  # Exit on any error

echo "🎙️ Setting up Medical Transcription API Environment..."

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check Python version
python_version=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
required_version="3.8"

if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" != "$required_version" ]; then
    echo "❌ Python 3.8 or higher is required. Current version: $python_version"
    exit 1
fi

echo "✅ Python version check passed: $python_version"

# Create virtual environment
echo "📦 Creating virtual environment..."
if [ -d "venv" ]; then
    echo "⚠️  Virtual environment already exists. Removing..."
    rm -rf venv
fi

python3 -m venv venv
echo "✅ Virtual environment created"

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Verify installation
echo "🔍 Verifying installation..."
python -c "
import flask
import transformers
import torch
import librosa
print('✅ All major dependencies installed successfully')
print(f'   - Flask: {flask.__version__}')
print(f'   - Transformers: {transformers.__version__}')
print(f'   - PyTorch: {torch.__version__}')
print(f'   - Librosa: {librosa.__version__}')
"

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "To start the transcription API:"
echo "1. Activate the environment: source venv/bin/activate"
echo "2. Run the app: python app.py"
echo ""
echo "The API will be available at: http://localhost:5001"
echo ""
echo "Endpoints:"
echo "  - GET  /health     - Health check"
echo "  - POST /transcribe - Transcribe audio file"
echo "  - GET  /models     - Available models"
echo "" 