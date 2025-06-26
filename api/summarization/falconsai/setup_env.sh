#!/bin/bash

# Falconsai Medical Summarization API Setup Script
# Specifically for macOS with sentencepiece compilation fixes

set -e  # Exit on any error

echo "🏥 Setting up Falconsai Medical Summarization API..."

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check Python version and warn about 3.13
python_version=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
python_major=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1)
python_minor=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f2)

if [ "$python_major" -eq 3 ] && [ "$python_minor" -ge 13 ]; then
    echo "⚠️  Python 3.13+ detected. Trying compatibility mode for sentencepiece..."
fi

echo "✅ Python version: $python_version"

# Check for macOS and required dependencies
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 macOS detected, checking dependencies..."
    
    # Check for required dependencies
    missing_deps=()
    
    if ! brew list protobuf &>/dev/null; then
        missing_deps+=("protobuf")
    fi
    
    if ! brew list protobuf-c &>/dev/null; then
        missing_deps+=("protobuf-c")
    fi
    
    if ! brew list coreutils &>/dev/null; then
        missing_deps+=("coreutils")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        echo "⚠️  Missing dependencies: ${missing_deps[*]}"
        echo "Installing with Homebrew..."
        brew install "${missing_deps[@]}"
    fi
    
    echo "✅ All dependencies installed"
fi

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

# Upgrade pip and install build tools
echo "⬆️  Upgrading pip and installing build tools..."
pip install --upgrade pip wheel setuptools

# Set environment variables for macOS compilation
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🔧 Setting up compilation environment for macOS..."
    
    # Set paths for protobuf
    export PKG_CONFIG_PATH="/opt/homebrew/lib/pkgconfig:$PKG_CONFIG_PATH"
    export PATH="/opt/homebrew/opt/coreutils/libexec/gnubin:$PATH"
    
    # Set architecture
    export CMAKE_OSX_ARCHITECTURES="$(uname -m)"
    export ARCHFLAGS="-arch $(uname -m)"
    
    # Set C++ compiler flags
    export CPPFLAGS="-I/opt/homebrew/include"
    export LDFLAGS="-L/opt/homebrew/lib"
    
    echo "✅ Environment variables set"
fi

# Install core dependencies first
echo "📥 Installing core dependencies..."
pip install flask>=2.0.0 flask-cors>=3.0.0 numpy>=1.21.0 protobuf>=3.19.0

# Try to install sentencepiece with different strategies
echo "🔧 Installing sentencepiece (this may take several minutes)..."

# Strategy 1: Direct installation
if pip install sentencepiece>=0.1.97; then
    echo "✅ Sentencepiece installed successfully"
    SENTENCEPIECE_SUCCESS=true
else
    echo "⚠️  Direct installation failed, trying compatibility mode..."
    SENTENCEPIECE_SUCCESS=false
    
    # Strategy 2: Use older version
    if pip install sentencepiece==0.1.99; then
        echo "✅ Sentencepiece 0.1.99 installed successfully"
        SENTENCEPIECE_SUCCESS=true
    else
        echo "⚠️  Version 0.1.99 failed, trying 0.1.98..."
        
        # Strategy 3: Even older version
        if pip install sentencepiece==0.1.98; then
            echo "✅ Sentencepiece 0.1.98 installed successfully"
            SENTENCEPIECE_SUCCESS=true
        else
            echo "❌ All sentencepiece installations failed"
            SENTENCEPIECE_SUCCESS=false
        fi
    fi
fi

# Install remaining dependencies
echo "📥 Installing remaining dependencies..."
pip install transformers>=4.30.0 torch>=2.0.0 accelerate>=0.20.0

# Verify installation
echo "🔍 Verifying installation..."
python -c "
import flask
import transformers
import torch
print('✅ Core dependencies installed successfully')
print(f'   - Flask: {flask.__version__}')
print(f'   - Transformers: {transformers.__version__}')
print(f'   - PyTorch: {torch.__version__}')

try:
    import sentencepiece
    print(f'   - SentencePiece: {sentencepiece.__version__}')
    print('✅ Falconsai model will work correctly')
except ImportError:
    print('   - SentencePiece: NOT INSTALLED')
    print('❌ Falconsai model requires sentencepiece')
    exit(1)
"

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Falconsai setup completed successfully!"
    echo ""
    echo "To start the summarization API:"
    echo "1. Activate the environment: source venv/bin/activate"
    echo "2. Run the app: python app.py"
    echo ""
    echo "The API will be available at: http://localhost:5002"
    echo ""
    echo "🏥 Using Falconsai/medical_summarization model"
else
    echo "❌ Setup failed. Please check the error messages above."
    exit 1
fi 