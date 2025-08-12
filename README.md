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

## Next TODO
1.  **Patient Demographics (if explicitly mentioned):** Age, gender. [unused yet]
2.  **Chief Complaint (CC):** The primary reason for the visit in the patient's own words, and how long it has been present.
3.  **Additional Complaint (Additional Complaint):** Any secondary or additional complaints mentioned by the patient, including those that occurred simultaneously or prior to the main chief complaint. Avoid repeating the chief complaint in this section.
4.  **History of Present Illness (HPI):** Detailed description of the chief complaint, including onset, duration, character, location, radiation, aggravating/alleviating factors, and associated symptoms.
5.  **Past Medical History (PMH):** Relevant pre-existing conditions, significant illnesses, surgeries, or hospitalizations.
6.  **Medications:** Current medications, dosages, and frequency. [unused yet]
7.  **Allergies:** Any known allergies to medications, food, or environment. [unused yet]
8.  **Social History (SH):** Relevant lifestyle factors (e.g., smoking, alcohol, occupation). [unused yet]
9.  **Family History (FH):** Significant medical conditions in immediate family members.
10. **Review of Systems (ROS):** Any other relevant symptoms or body system complaints. [unused yet]
11. **Physical Examination Findings (PE):** Objective findings noted by the doctor. [unused yet]
12. **Assessment:** The doctor's differential diagnoses or preliminary diagnosis. [unused yet]
13. **Plan:** The recommended course of action, including investigations (labs, imaging), referrals, and follow-up instructions. [unused yet]
14. **Recommended Medication Therapy (Terapi Obat yang dianjurkan):** Specific medication treatments advised by the doctor. For each medication, include the drug name, dosage, frequency, route of administration, and duration of use. Mention the indication if relevant. Identify and convert any layman's terms or general descriptions of medications (e.g., "obat demam", "obat pereda nyeri", "obat sakit perut") into their correct pharmacological drug classes or specific drug names.
15. **Recommended Non-Medication Therapy (Terapi Non Obat yang dianjurkan):** Non-pharmacological treatments or lifestyle changes advised (e.g., diet, exercise, physiotherapy).
16. **Education (Edukasi):** Key information or advice given to the patient for understanding their condition or managing their health.
17. **Patient Questions/Concerns:** Any specific questions or concerns raised by the patient. [unused yet]