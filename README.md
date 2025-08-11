# Medical Notetaking for ePuskesmas

A powerful Chrome extension designed specifically for Indonesian healthcare professionals using ePuskesmas and other medical management systems. This extension provides AI-powered audio recording, transcription, and medical summarization capabilities.

## 🌟 Features

### Core Functionality
- **🎙️ High-Quality Audio Recording** - Crystal clear audio capture with noise cancellation
- **🤖 AI-Powered Transcription** - Uses OpenAI Whisper for accurate speech-to-text conversion
- **📋 Medical Summarization** - Intelligent summaries using specialized medical models
- **🏥 Healthcare System Integration** - Seamless integration with ePuskesmas and other medical systems

### Advanced Features
- **🌐 Multi-Language Support** - Indonesian, English, Malay, and auto-detection
- **⚙️ OpenAI Integration** - Cloud-based processing with reliable API
- **🔄 Automatic Retry & Fallback** - Robust error handling with automatic retry
- **💾 Local Storage** - Option to save recordings locally for review
- **🔒 Privacy-First** - Secure API communication with user control
- **💰 Cost-Effective** - Optimized API usage with configurable settings

## 🚀 Installation

1. **Download** or clone this repository
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** (toggle in top-right corner)
4. **Click "Load unpacked"** and select the extension directory
5. **Pin the extension** to your toolbar for easy access

## 🔧 Initial Setup

### OpenAI Cloud API Setup (Required)

1. **Grant Microphone Permission**
   - Click the extension icon and select "Grant Microphone Access"
   - Allow microphone access when prompted by your browser

2. **Configure OpenAI API Key**
   - Click the settings icon in the popup
   - Enter your OpenAI API key (get one from [OpenAI](https://platform.openai.com/api-keys))
   - Test the connection to ensure it's working

### General Configuration
- Choose your preferred language (Indonesian recommended for medical use)
- Configure audio quality based on your needs
- Set up advanced settings for your workflow

## 📖 Usage Guide

### Basic Recording Workflow
1. **Navigate** to any ePuskesmas or medical system page
2. **Click** the extension icon to open the popup
3. **Click "Start Recording"** to begin audio capture
4. **Speak clearly** during the medical consultation
5. **Click "Stop Recording"** when finished
6. **Review** the audio using the play button (optional)
7. **Click "Transcribe"** to generate transcription
8. **Edit** the transcript if necessary
9. **Click "Summarize"** to generate medical summary
10. **Review** the results and insert into medical forms

### Integration with Healthcare Systems
The extension automatically detects and integrates with:
- ePuskesmas systems
- SIMRS (Hospital Information Systems)
- Generic medical forms and text areas

The AI-generated summary is automatically inserted into appropriate form fields including:
- Keluhan Utama (Main Complaint)
- Keluhan Tambahan (Additional Complaints)
- RPS (Riwayat Penyakit Sekarang - Current Medical History)
- RPD (Riwayat Penyakit Dahulu - Past Medical History)
- RPSos (Riwayat Penyakit Sosial - Social History)
- RPK (Riwayat Penyakit Keluarga - Family Medical History)
- Terapi Obat (Pharmacological Treatment)
- Edukasi (Patient Education)
- Main Diagnosis
- Differential Diagnosis
- Recommended Treatment

## ⚙️ Configuration Options

### OpenAI Settings
- **OpenAI API Key** - Required for transcription and summarization
- **GPT Model** - Choose between GPT-3.5 Turbo, GPT-4, or GPT-4 Turbo

### Audio Settings
- **Quality** - Low (faster), Medium (balanced), High (best accuracy)
- **Max Recording Time** - Set limits to prevent accidental long recordings
- **Volume Control** - Adjust playback volume
- **Language** - Primary language for transcription (Indonesian, English, Malay, Auto)

### Advanced Settings
- **Automatic Retry** - Enable retry on API failures
- **Save Recordings** - Keep local copies for review

## 🔒 Privacy & Security

- **Secure API Communication** - All API calls use HTTPS encryption
- **No Permanent Storage** - Recordings are not stored permanently unless explicitly enabled
- **User Control** - You control what data is saved and where
- **OpenAI Privacy** - Audio is only sent to OpenAI for transcription and summarization

## 🛠️ Technical Details

### System Requirements
- Chrome browser (version 88+)
- Microphone access
- Internet connection for OpenAI API
- OpenAI API key

### Supported File Formats
- WebM (primary)
- OGG with Opus codec
- WAV (fallback)
- MP3, MP4, M4A (for uploaded files)

### API Usage
#### OpenAI APIs
- **Whisper API** - For audio transcription
- **GPT API** - For medical summarization
- **Chrome Storage API** - For settings and preferences

### Extension Architecture
- **Popup Interface** - Main user interface for recording and processing
- **Content Script** - Handles integration with healthcare systems
- **Background Service** - Manages extension lifecycle and storage
- **Options Page** - Settings configuration

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

**Integration not working**
- Make sure you're on a supported healthcare website
- Check that the page has loaded completely
- Try refreshing the page after recording

**Audio quality issues**
- Adjust microphone levels in system settings
- Choose higher audio quality in extension settings
- Ensure stable internet connection for processing

**Summary not inserting**
- Check that the content script is loaded on the page
- Refresh the page and try again
- Verify the page has form fields that match the expected selectors

### Getting Help
If you encounter issues:
1. Check the browser console for error messages
2. Verify all settings are configured correctly
3. Test with a simple recording first
4. Contact support with specific error details

## 📝 Version History

### v2.1.0 (Current)
- **🆕 Code Cleanup** - Removed unused features and simplified codebase
- **🆕 Enhanced UI/UX** - Improved user interface and experience
- **🆕 Better Error Handling** - More robust error handling and user feedback
- **🆕 Optimized Performance** - Reduced bundle size and improved efficiency
- **🆕 Medical Field Integration** - Enhanced automatic field detection and population
- **🆕 Simplified Setup** - Streamlined configuration process

### v2.0.0 (Previous)
- Complete rewrite with enhanced UI/UX
- Added multi-language support
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
