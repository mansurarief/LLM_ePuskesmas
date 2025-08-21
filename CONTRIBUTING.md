# Contributing to Medical Audio Recorder for ePuskesmas

Thank you for your interest in contributing to this project! We welcome contributions from the community to help improve medical documentation in Indonesian healthcare facilities.

## 🤝 Ways to Contribute

- **Bug Reports**: Report issues and bugs
- **Feature Requests**: Suggest new features or improvements
- **Code Contributions**: Submit pull requests with fixes or enhancements
- **Documentation**: Improve documentation and guides
- **Translation**: Help translate the interface to other languages
- **Testing**: Test the extension in different environments

## 🚀 Getting Started

### Prerequisites

- Google Chrome 88+ with Developer Mode enabled
- Basic knowledge of JavaScript and Chrome Extensions
- API key from OpenAI or Google Gemini for testing
- Understanding of medical terminology (helpful but not required)

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/[your-username]/LLM_ePuskesmas.git
   cd LLM_ePuskesmas
   ```

2. **Load Extension**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `src/extension` folder

3. **Test Changes**
   - Make your changes
   - Click reload button in Chrome extensions page
   - Test with provided simulation forms

## 📋 Development Guidelines

### Code Style

- **JavaScript**: Use ES6+ features, consistent naming conventions
- **Comments**: Add JSDoc comments for all functions and classes
- **Error Handling**: Include comprehensive try-catch blocks
- **Logging**: Use descriptive console.log messages with class prefixes

### File Structure

```
src/extension/
├── manifest.json       # Extension configuration
├── popup.js           # Main interface (MedicalAudioRecorder)
├── popup.html         # Main interface HTML
├── options.js         # Settings management (OptionsManager)
├── options.html       # Settings page HTML
├── content.js         # Form integration (ContentIntegrator)
├── background.js      # Service worker (BackgroundService)
├── welcome.js         # Onboarding (WelcomeManager)
└── welcome.html       # Welcome page HTML
```

### Medical Context

- **Language**: Primary focus on Bahasa Indonesia, secondary English
- **Terminology**: Use proper medical terms for Indonesian healthcare
- **Privacy**: Always consider patient data protection
- **Accuracy**: Medical information must be accurate and validated

## 🐛 Reporting Bugs

### Bug Report Template

```markdown
**Bug Description**
A clear description of the bug

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What should have happened

**Actual Behavior**
What actually happened

**Environment**
- Chrome Version: [e.g. 119.0.6045.105]
- Extension Version: [e.g. 1.0.0]
- OS: [e.g. Windows 11]
- AI Provider: [e.g. OpenAI/Gemini]

**Console Logs**
Include any relevant console error messages

**Screenshots**
If applicable, add screenshots
```

## ✨ Feature Requests

### Feature Request Template

```markdown
**Feature Description**
Clear description of the proposed feature

**Use Case**
Why is this feature needed? What problem does it solve?

**Proposed Solution**
How should this feature work?

**Alternative Solutions**
Any alternative approaches considered?

**Additional Context**
Any other relevant information
```

## 🔧 Pull Request Process

### Before Submitting

1. **Check Issues**: Look for existing issues or create one
2. **Branch Naming**: Use descriptive branch names
   - `feature/add-new-ai-provider`
   - `fix/transcription-error`
   - `docs/update-readme`

3. **Testing**: Test your changes thoroughly
   - Test with both OpenAI and Gemini APIs
   - Test form integration with simulation files
   - Verify microphone permissions

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work)
- [ ] Documentation update

## Testing
- [ ] Tested with OpenAI API
- [ ] Tested with Gemini API
- [ ] Tested form integration
- [ ] Tested microphone functionality
- [ ] Verified no console errors

## Checklist
- [ ] Code follows project style guidelines
- [ ] Added JSDoc comments for new functions
- [ ] Updated documentation if needed
- [ ] No sensitive data in commits
- [ ] Tested in Chrome Developer Mode
```

### Review Process

1. **Automated Checks**: Ensure code quality
2. **Maintainer Review**: Code review by project maintainers
3. **Testing**: Functional testing in different environments
4. **Medical Review**: Validation of medical accuracy (if applicable)

## 🌐 Internationalization

### Adding New Languages

1. **Language Files**: Add translations to appropriate files
2. **Medical Terms**: Include medical terminology translations
3. **Testing**: Test with native speakers when possible
4. **Documentation**: Update language support documentation

### Current Language Support

- **Indonesian** (Bahasa Indonesia) - Primary
- **English** - Secondary
- **Mixed** - Code-switching support

## 🔒 Security Guidelines

### Sensitive Data

- **Never commit API keys or credentials**
- **No patient data in repository**
- **Use secure Chrome storage APIs**
- **Validate all user inputs**

### Privacy Considerations

- **Data Processing**: Audio processed locally when possible
- **API Communications**: Use HTTPS only
- **User Consent**: Clear consent for data processing
- **Compliance**: Consider HIPAA and local regulations

## 📚 Documentation

### Requirements

- **Code Documentation**: JSDoc for all public methods
- **User Documentation**: Clear guides for end users
- **API Documentation**: Complete API reference
- **Examples**: Working code examples

### Documentation Structure

```
docs/
├── api/                # API documentation
├── guides/             # User and developer guides
├── examples/           # Code examples
└── README.md           # Documentation overview
```

## 🧪 Testing

### Manual Testing

1. **Extension Installation**: Test fresh installation process
2. **API Integration**: Test with real API keys
3. **Form Integration**: Test with ePuskesmas simulation
4. **Audio Recording**: Test different microphone setups
5. **Edge Cases**: Test error conditions and recovery

### Test Cases

Create test cases for:
- Different audio formats and quality
- Network interruptions during API calls
- Invalid API keys and quotas
- Various medical form structures
- Different Chrome versions

## 🏥 Medical Accuracy

### Requirements

- **Terminology**: Use correct medical terminology
- **Translations**: Accurate medical term translations
- **Validation**: Cross-check medical information
- **Healthcare Professional Review**: Get medical professional input

### Medical Categories

Ensure accuracy in these ePuskesmas categories:
- Keluhan Utama (Chief Complaint)
- Riwayat Penyakit (Medical History)
- Pemeriksaan Fisik (Physical Examination)
- Diagnosa (Diagnosis)
- Terapi (Treatment)
- Edukasi (Patient Education)

## 🎯 Project Goals

### Short-term Goals

- Improve transcription accuracy for Indonesian medical terms
- Enhance form integration with more medical systems
- Add offline functionality for basic features
- Improve user interface and user experience

### Long-term Goals

- Support for multiple Indonesian languages/dialects
- Integration with national health information systems
- Advanced AI models for specialized medical domains
- Mobile app version for tablets

## 📞 Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General discussions and questions
- **Pull Requests**: Code contributions and reviews

### Code of Conduct

Please note that this project is released with a [Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project, you agree to abide by its terms.

## 🙏 Recognition

Contributors will be recognized in:
- GitHub contributors list
- Release notes for significant contributions
- Documentation acknowledgments
- Academic publications (for substantial contributions)

## 📄 License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

## 💡 Questions?

If you have questions about contributing:

1. Check existing [GitHub Issues](https://github.com/naimackerman/LLM_ePuskesmas/issues)
2. Start a [GitHub Discussion](https://github.com/naimackerman/LLM_ePuskesmas/discussions)
3. Contact maintainers through their GitHub profiles

Thank you for contributing to improving healthcare documentation in Indonesia! 🇮🇩