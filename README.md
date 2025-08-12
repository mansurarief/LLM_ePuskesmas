# Medical Notetaking for ePuskesmas

Advanced medical audio recording, transcription, and AI-powered summarization for healthcare professionals.

## Features

### 🎙️ Audio Recording
- High-quality audio recording with noise cancellation
- Support for multiple audio formats (WebM, MP3, WAV, M4A)
- Configurable recording quality and duration limits
- Audio playback and volume control

### 🤖 AI Transcription & Summarization
- **Multiple AI Providers**: Support for OpenAI and Google Gemini
- **Flexible Configuration**: Mix and match providers for transcription and summarization
- **Advanced Models**: 
  - OpenAI: Whisper-1, GPT-4o Transcribe, GPT-4o Mini Transcribe
  - Gemini: 2.5 Flash Lite, 2.0 Flash, 2.0 Flash Lite
  - Google Cloud Speech-to-Text for Indonesian language

### 📋 Medical Form Integration
- Automatic field population in healthcare systems
- Support for Indonesian medical terminology
- Structured JSON output for medical documentation
- Real-time form field detection and highlighting

### 🔧 Advanced Settings
- Separate model selection for transcription and summarization
- Mixed provider configurations (e.g., OpenAI for transcription, Gemini for summarization)
- Configurable retry mechanisms and error handling
- Local recording storage options

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension folder
5. Grant microphone permissions when prompted

## Configuration

### API Setup

1. **OpenAI Configuration**:
   - Get an API key from [OpenAI Platform](https://platform.openai.com/)
   - Add the key in extension settings

2. **Google Gemini Configuration**:
   - Get an API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Add the key in extension settings

### Provider Configuration

Configure your preferred providers for transcription and summarization:

- **OpenAI Only**: Select OpenAI for both transcription and summarization
- **Gemini Only**: Select Gemini for both transcription and summarization  
- **Mixed**: Combine providers for optimal performance:
  - **Gemini Transcription + OpenAI Summarization**: Use Gemini's speech-to-text with OpenAI's medical summarization
  - **OpenAI Transcription + Gemini Summarization**: Use OpenAI's speech-to-text with Gemini's medical summarization

### Model Selection

**Transcription Models**:
- OpenAI: Whisper-1, GPT-4o Transcribe, GPT-4o Mini Transcribe
- Gemini: Google Cloud Speech-to-Text (Indonesian)

**Summarization Models**:
- OpenAI: GPT-3.5 Turbo, GPT-5 Nano, GPT-5 Mini, GPT-4o Mini
- Gemini: 2.5 Flash Lite, 2.0 Flash, 2.0 Flash Lite

## Usage

1. **Open the Extension**: Click the extension icon in your browser
2. **Grant Permissions**: Allow microphone access when prompted
3. **Record Audio**: Click "Start Recording" to capture medical consultations
4. **Transcribe**: Click "Transcribe" to convert audio to text
5. **Edit**: Review and edit the transcript if needed
6. **Summarize**: Generate structured medical summaries
7. **Auto-Populate**: Summary automatically fills medical form fields

## Medical Form Integration

The extension automatically detects and populates common medical form fields:

- **Keluhan Utama** (Main Complaint)
- **Keluhan Tambahan** (Additional Complaints)  
- **RPS** (Riwayat Penyakit Sekarang - Current Medical History)
- **RPD** (Riwayat Penyakit Dahulu - Past Medical History)
- **RPK** (Riwayat Penyakit Keluarga - Family Medical History)
- **Terapi Obat** (Pharmacological Therapy)
- **Terapi Non Obat** (Non-Pharmacological Therapy)
- **Edukasi** (Patient Education)

## Privacy & Security

- All audio processing happens securely via API calls
- No audio data is permanently stored without user consent
- API keys are stored locally and encrypted
- Configurable data retention settings

## Technical Details

### Supported Audio Formats
- WebM (Opus codec)
- MP3
- WAV
- M4A/AAC
- OGG

### API Endpoints
- OpenAI: `https://api.openai.com/v1/`
- Google Gemini: `https://generativelanguage.googleapis.com/`

### Browser Compatibility
- Chrome 88+
- Edge 88+
- Other Chromium-based browsers

## Development

### Project Structure
```
med-notetaking-ePuskesmas/
├── manifest.json          # Extension manifest
├── popup.html/js          # Main extension interface
├── options.html/js        # Settings page
├── background.js          # Background service worker
├── content.js             # Content script for form integration
├── welcome.html/js        # Welcome/onboarding page
└── example-form.html      # Test form for development
```

### Adding New Providers

To add a new AI provider:

1. Update `options.html` with new provider options
2. Add provider configuration in `options.js`
3. Implement transcription/summarization methods in `popup.js`
4. Update `manifest.json` with required permissions
5. Add provider-specific API handling

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and feature requests, please create an issue in the repository.
