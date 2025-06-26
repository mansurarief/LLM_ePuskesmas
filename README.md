# Medical Notetaking for ePuskesmas

A powerful Chrome extension designed specifically for Indonesian healthcare professionals using ePuskesmas and other medical management systems. This extension provides AI-powered audio recording, transcription, and medical summarization capabilities.

## 🌟 Features

### Core Functionality
- **🎙️ High-Quality Audio Recording** - Crystal clear audio capture with noise cancellation
- **🤖 AI-Powered Transcription** - Uses OpenAI Whisper or local HuggingFace models
- **📋 Medical Summarization** - Intelligent summaries using specialized medical models
- **🏥 Healthcare System Integration** - Seamless integration with ePuskesmas and other medical systems

### Advanced Features
- **🌐 Multi-Language Support** - Indonesian, English, Malay, and auto-detection
- **📝 Medical Templates** - Pre-defined templates for different medical scenarios
- **⚙️ Flexible API Options** - Choose between OpenAI Cloud, Local Models, or Hybrid approach
- **🔄 Automatic Retry & Fallback** - Robust error handling with automatic retry and API fallback
- **💾 Local Storage** - Option to save recordings locally for review
- **🔒 Privacy-First** - Local processing option for sensitive medical data
- **💰 Cost-Effective** - Local models eliminate per-use API costs

## 🚀 Installation

1. **Download** or clone this repository
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** (toggle in top-right corner)
4. **Click "Load unpacked"** and select the extension directory
5. **Pin the extension** to your toolbar for easy access

## 🔧 Initial Setup

### Option A: Using OpenAI Cloud APIs (Easiest)

1. **Grant Microphone Permission**
   - Click the extension icon and select "Grant Microphone Access"
   - Allow microphone access when prompted by your browser

2. **Configure OpenAI API Key**
   - Click the settings icon in the popup
   - Select "OpenAI (Cloud)" as API Provider
   - Enter your OpenAI API key (get one from [OpenAI](https://platform.openai.com/api-keys))
   - Test the connection to ensure it's working

### Option B: Using Local Models (Privacy-First & Cost-Free)

1. **Setup Local APIs**
   ```bash
   # Run the master setup script
   chmod +x setup_all_apis.sh
   ./setup_all_apis.sh
   
   # Start the APIs
   ./start_apis.sh
   
   # Check status
   ./status_apis.sh
   ```

2. **Configure Extension**
   - Click the settings icon in the popup
   - Select "Local Models (HuggingFace)" as API Provider
   - Verify the API URLs (usually http://localhost:5001 and http://localhost:5002)
   - Test the local APIs connection

### Option C: Hybrid Mode (Best of Both Worlds)

1. **Setup both OpenAI and Local APIs** (follow both Option A and B)
2. **Configure Hybrid Mode**
   - Select "Hybrid (Local + OpenAI Fallback)" as API Provider
   - Local models will be used first, OpenAI as fallback
   - Provides cost savings with reliability backup

### General Configuration
- Choose your preferred language (Indonesian recommended for medical use)
- Configure audio quality based on your needs
- Set up medical templates for your practice

## 📖 Usage Guide

### Basic Recording Workflow
1. **Navigate** to any ePuskesmas or medical system page
2. **Click** the extension icon to open the popup
3. **Select** a medical template (optional but recommended)
4. **Click "Start Recording"** to begin audio capture
5. **Speak clearly** during the medical consultation
6. **Click "Stop Recording"** when finished
7. **Review** the audio using the play button (optional)
8. **Click "Process Audio"** to generate transcription and summary
9. **Review** the results and edit if necessary

### Medical Templates
The extension includes several pre-configured templates:

- **General Consultation** - For routine patient visits
- **Follow-up Visit** - For monitoring existing conditions
- **Emergency Case** - For urgent medical situations

You can create custom templates in the settings page to match your specific practice needs.

### Integration with Healthcare Systems
The extension automatically detects and integrates with:
- ePuskesmas systems
- SIMRS (Hospital Information Systems)
- Generic medical forms and text areas

## ⚙️ Configuration Options

### API Provider Settings
- **OpenAI (Cloud)** - Uses OpenAI's cloud APIs (requires API key)
- **Local Models** - Uses local HuggingFace models (privacy-first, cost-free)
- **Hybrid Mode** - Local first with OpenAI fallback (best of both worlds)

### OpenAI Settings (when using OpenAI or Hybrid)
- **OpenAI API Key** - Required for cloud transcription and summarization
- **GPT Model** - Choose between GPT-3.5 Turbo, GPT-4, or GPT-4 Turbo

### Local API Settings (when using Local or Hybrid)
- **Transcription URL** - Local Whisper API endpoint (default: http://localhost:5001)
- **Summarization URL** - Local medical summarization API endpoint (default: http://localhost:5002)
- **API Health Check** - Test local API connectivity

### Audio Settings
- **Quality** - Low (faster), Medium (balanced), High (best accuracy)
- **Max Recording Time** - Set limits to prevent accidental long recordings
- **Volume Control** - Adjust playback volume
- **Language** - Primary language for transcription (Indonesian, English, Malay, Auto)

### Advanced Settings
- **Automatic Retry** - Enable retry on API failures
- **API Fallback** - Automatic switching between local and cloud APIs (Hybrid mode)
- **Save Recordings** - Keep local copies for review
- **Offline Mode** - Experimental browser-based speech recognition

## 🔒 Privacy & Security

- **Local Processing** - Audio is only sent to OpenAI for transcription
- **No Permanent Storage** - Recordings are not stored permanently unless explicitly enabled
- **Secure API Communication** - All API calls use HTTPS encryption
- **User Control** - You control what data is saved and where

## 🛠️ Technical Details

### System Requirements
- Chrome browser (version 88+)
- Microphone access
- **For OpenAI Mode**: Internet connection + OpenAI API key
- **For Local Mode**: Python 3.8+, 5GB+ disk space, 8GB+ RAM (GPU recommended)
- **For Hybrid Mode**: Both of the above

### Supported File Formats
- WebM (primary)
- OGG with Opus codec
- WAV (fallback)

### API Usage
#### Cloud APIs (OpenAI)
- **Whisper API** - For audio transcription
- **GPT API** - For medical summarization
- **Chrome Storage API** - For settings and preferences

#### Local APIs (HuggingFace)
- **Local Whisper** - OpenAI Whisper Large V3 Turbo model
- **Medical Summarization** - Falconsai medical summarization model
- **Flask REST APIs** - For communication between extension and local models

### Local Model Details
- **Transcription**: `openai/whisper-large-v3-turbo` - High-accuracy multilingual speech recognition
- **Summarization**: `Falconsai/medical_summarization` - Specialized medical text summarization
- **Hardware**: CUDA GPU support for faster processing, CPU fallback available
- **Privacy**: All processing happens locally, no data sent to external servers

## 🔧 Managing Local APIs

### Starting/Stopping APIs
```bash
# Start both APIs
./start_apis.sh

# Stop both APIs  
./stop_apis.sh

# Check status
./status_apis.sh

# View logs
tail -f logs/transcription.log
tail -f logs/summarization.log
```

### API Endpoints
- **Transcription API**: http://localhost:5001
  - `GET /health` - Health check
  - `POST /transcribe` - Upload audio file
  - `GET /models` - Available models
- **Summarization API**: http://localhost:5002
  - `GET /health` - Health check
  - `POST /summarize` - Summarize text
  - `GET /templates` - Available templates

## 🐛 Troubleshooting

### Common Issues

**Microphone not working**
- Check browser permissions in site settings
- Ensure microphone is not being used by another application
- Try refreshing the page and granting permission again

**OpenAI API errors**
- Verify your OpenAI API key is correct and has sufficient credits
- Check your internet connection
- Enable automatic retry in settings

**Local API errors**
- Ensure both APIs are running: `./status_apis.sh`
- Check logs for errors: `tail -f logs/transcription.log`
- Restart APIs: `./stop_apis.sh && ./start_apis.sh`
- Verify Python environment: `cd api/transcription/whisper && source venv/bin/activate && python --version`

**Model download issues**
- Ensure stable internet connection during first setup
- Check available disk space (models require ~3-5GB)
- Clear pip cache: `pip cache purge`
- Try manual download: `python -c "from transformers import pipeline; pipeline('automatic-speech-recognition', model='openai/whisper-large-v3-turbo')"`

**Performance issues**
- Use GPU if available (CUDA/MPS)
- Reduce audio quality for faster processing
- Close other resource-intensive applications
- Consider using OpenAI API for better performance

**Integration not working**
- Make sure you're on a supported healthcare website
- Check that the page has loaded completely
- Try refreshing the page after recording

**Audio quality issues**
- Adjust microphone levels in system settings
- Choose higher audio quality in extension settings
- Ensure stable connection (local or internet) for processing

### Getting Help
If you encounter issues:
1. Check the browser console for error messages
2. Verify all settings are configured correctly
3. Test with a simple recording first
4. Contact support with specific error details

## 📝 Version History

### v2.1.0 (Current)
- **🆕 Local AI Models Support** - HuggingFace Whisper and Medical Summarization models
- **🆕 Hybrid Mode** - Local processing with cloud fallback
- **🆕 Cost-Free Option** - Eliminate per-use API costs with local models
- **🆕 Enhanced Privacy** - Optional local-only processing
- **🆕 Automatic Setup Scripts** - One-click setup for local APIs
- **🆕 API Health Monitoring** - Real-time status checks for local APIs
- Complete rewrite with enhanced UI/UX
- Added medical templates and multi-language support
- Improved error handling and retry mechanisms
- Better healthcare system integration

### v2.0.0 (Previous)
- Complete rewrite with enhanced UI/UX
- Added medical templates and multi-language support
- Improved error handling and retry mechanisms
- Better healthcare system integration
- Enhanced privacy and security features

### v1.4.0 (Legacy)
- Basic audio recording and transcription
- Simple ePuskesmas integration
- OpenAI API integration

## 🤝 Contributing

This project is designed for healthcare professionals and contributions are welcome:

1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your improvements
4. **Test** thoroughly with medical scenarios
5. **Submit** a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This tool is designed to assist healthcare professionals with documentation. Always review and verify AI-generated content before using it in medical records. The accuracy of transcription and summarization may vary depending on audio quality, language, and medical terminology used.

## 🏥 About

Developed specifically for Indonesian healthcare professionals to improve efficiency in medical documentation while maintaining high standards of patient care and data privacy.
