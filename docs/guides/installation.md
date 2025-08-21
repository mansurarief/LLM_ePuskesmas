# Installation Guide

## Prerequisites

- Google Chrome browser (version 88 or higher)
- API key from OpenAI or Google Gemini
- Microphone access for audio recording

## Installation Steps

### 1. Download the Extension

Clone the repository or download as ZIP:

```bash
git clone https://github.com/naimackerman/LLM_ePuskesmas.git
cd LLM_ePuskesmas
```

### 2. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `src/extension` folder from the cloned repository
5. The extension icon should appear in your toolbar

### 3. Initial Setup

When you first install the extension:

1. **Welcome Page**: Automatically opens to guide you through setup
2. **Microphone Permission**: Click "Grant Microphone Access" and allow permission
3. **Test Microphone**: Verify your microphone is working
4. **Configure API**: Click "Open Settings" to add your API key

### 4. API Configuration

1. Click the extension icon and select "Settings"
2. Choose your AI provider:
   - **OpenAI**: Enter your OpenAI API key
   - **Google Gemini**: Enter your Gemini API key
3. Select models for transcription and summarization
4. Click "Test Connection" to verify
5. Save settings

## Updating the Extension

To update to the latest version:

1. Pull latest changes: `git pull origin main`
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Verify the version number has updated

## Troubleshooting

### Extension Not Loading
- Ensure you're in Developer mode
- Check that you selected the correct folder (`src/extension`)
- Look for error messages in the extension card

### Microphone Permission Issues
- Check Chrome site settings: `chrome://settings/content/microphone`
- Ensure no other application is using the microphone
- Try restarting Chrome

### API Connection Failed
- Verify your API key is correct
- Check your internet connection
- Ensure you have credits/quota in your API account
- Try the "Test Connection" button in settings

## System Requirements

- **Operating System**: Windows 10+, macOS 10.14+, Linux (Ubuntu 18.04+)
- **Chrome Version**: 88 or higher
- **RAM**: Minimum 4GB recommended
- **Network**: Stable internet connection for API calls
- **Microphone**: Any standard microphone or headset

## Security Notes

- API keys are stored locally in Chrome's secure storage
- Audio recordings are processed in memory and not permanently stored
- All API communications use HTTPS encryption
- No patient data is sent to third parties without explicit action

## Next Steps

After successful installation:
1. Read the [User Guide](./user-guide.md) to learn how to use the extension
2. Configure your settings following the [Configuration Guide](./configuration.md)
3. Test with the sample forms in the `src/tests` folder