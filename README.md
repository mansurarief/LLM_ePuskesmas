# LLM ePuskesmas

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![arXiv](https://img.shields.io/badge/arXiv-2409.17054-b31b1b.svg)](https://arxiv.org/abs/2409.17054)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)](https://www.javascript.com/)
[![Maintainer](https://img.shields.io/badge/Maintainer-@naimackerman-blue)](https://github.com/naimackerman)
[![Maintainer](https://img.shields.io/badge/Maintainer-@mansurarief-blue)](https://github.com/mansurarief)

A Chrome extension that revolutionizes medical documentation in Indonesian healthcare facilities (Puskesmas) by leveraging AI for audio transcription and intelligent form filling.

## 🌟 Features

- 🎙️ **Audio Recording**: High-quality patient consultation recording
- 🤖 **AI Transcription**: Powered by OpenAI Whisper and Google Gemini
- 📝 **Smart Summarization**: Structured medical summaries in Indonesian
- 📋 **Auto Form Filling**: Seamless ePuskesmas integration

## 📖 Research Paper

This project is based on academic research published on arXiv:

> **Using LLM for Real-Time Transcription and Summarization of Doctor-Patient Interactions into ePuskesmas in Indonesia**
> 
> [Khatim et al. (2025)](https://arxiv.org/abs/2409.17054)
> 
> [Read the full paper on arXiv](https://arxiv.org/abs/2409.17054)

## 🚀 Quick Start

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/naimackerman/LLM_ePuskesmas.git
   cd LLM_ePuskesmas
   ```

2. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `src/extension` folder

3. **Configure API**
   - Click the extension icon
   - Go to Settings
   - Add your OpenAI or Google Gemini API key
   - Test connection

4. **Start Using**
   - Grant microphone permission
   - Record patient consultation
   - Generate transcript and summary
   - Auto-fill medical forms

## 📁 Project Structure

```
LLM_ePuskesmas/
├── src/
│   ├── extension/         # Chrome extension source
│   │   ├── manifest.json  # Extension configuration
│   │   ├── popup.js       # Main recording interface
│   │   ├── content.js     # Form integration
│   │   └── background.js  # Service worker
│   └── tests/            # Test forms and examples
├── docs/                 # Documentation
│   ├── api/             # API documentation
│   ├── guides/          # User and developer guides
│   └── examples/        # Code examples
├── LICENSE              # MIT License
└── README.md           # This file
```

## 🔧 Configuration

### Supported AI Providers

| Provider | Transcription Models | Summarization Models |
|----------|---------------------|---------------------|
| OpenAI | Whisper-1 | GPT-4o, GPT-4o-mini |
| Google Gemini | Gemini 2.0 Flash | Gemini 2.0 Flash, Gemini Exp |

### Medical Form Fields

The extension automatically populates these ePuskesmas fields:

- **Keluhan Utama** - Chief Complaint
- **Keluhan Tambahan** - Additional Complaints  
- **Riwayat Penyakit** - Medical History (RPS, RPD, RPK)
- **Pemeriksaan Fisik** - Physical Examination
- **Diagnosa** - Diagnosis (Working & Differential)
- **Terapi** - Treatment (Medication & Non-medication)
- **Edukasi** - Patient Education

## 💻 Development

### Prerequisites

- Google Chrome 88+
- API key (OpenAI or Google Gemini)
- Basic knowledge of Chrome extensions

### Setup Development Environment

```bash
# Clone repository
git clone https://github.com/naimackerman/LLM_ePuskesmas.git

# Navigate to project
cd LLM_ePuskesmas

# Load extension in Chrome Developer Mode
# No build process required - vanilla JavaScript
```

### Testing

Test the extension with provided simulation forms:
- `src/tests/epuskesmas-simulation.html` - ePuskesmas form simulator
- `src/tests/test-simulation.html` - Generic medical form

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### How to Contribute

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📚 Documentation

- [Installation Guide](docs/guides/installation.md)
- [User Guide](docs/guides/user-guide.md)
- [API Documentation](docs/api/)
- [Developer Guide](docs/guides/developer-guide.md)

## 🔐 Privacy & Security

- **Local Processing**: Audio processed in browser memory
- **Encrypted Communication**: All API calls use HTTPS
- **No Data Storage**: No permanent storage without consent
- **Secure Keys**: API keys stored in Chrome's secure storage
- **HIPAA Considerations**: Designed with patient privacy in mind

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Maintainers

- [@naimackerman](https://github.com/naimackerman) - Naim Ackerman
- [@mansurarief](https://github.com/mansurarief) - Mansur Arief

## 🙏 Acknowledgments

- Indonesian Ministry of Health for ePuskesmas system documentation
- Ikatan Ilmuwan Indonesia Internasional (I-4)
- Healthcare professionals at Puskesmas Tempilang, Bangka Belitung, Indonesia
- Open source community for continuous support


## 🚦 Status

![GitHub last commit](https://img.shields.io/github/last-commit/mansurarief/LLM_ePuskesmas)
![GitHub issues](https://img.shields.io/github/issues/mansurarief/LLM_ePuskesmas)
![GitHub pull requests](https://img.shields.io/github/issues-pr/mansurarief/LLM_ePuskesmas)

---

<p align="center">
  Made with ❤️ for Indonesian Healthcare System
</p>