# User Guide

## Overview

The Medical Audio Recorder Chrome Extension helps healthcare professionals document patient consultations efficiently by:
- Recording audio from patient interactions
- Transcribing speech to text using AI
- Generating structured medical summaries
- Auto-populating ePuskesmas forms

## Basic Usage

### Starting a Recording

1. **Open the Extension**
   - Click the extension icon in Chrome toolbar
   - The popup window appears with recording interface

2. **Start Recording**
   - Click the "Start Recording" button
   - Speak clearly in Indonesian or English
   - The timer shows recording duration
   - Maximum recording time: 10 minutes

3. **Stop Recording**
   - Click "Stop Recording" when finished
   - Audio is saved temporarily in memory

### Transcribing Audio

1. **Automatic Transcription**
   - After stopping, click "Transcribe"
   - Wait for AI processing (5-30 seconds)
   - Transcript appears in the text area

2. **Manual Editing**
   - Edit the transcript if needed
   - Fix any recognition errors
   - Add missing information

### Generating Medical Summary

1. **Create Summary**
   - Click "Generate Summary" button
   - AI analyzes transcript and creates structured output
   - Summary includes all medical categories

2. **Review Summary**
   - Check each category for accuracy:
     - Keluhan Utama (Chief Complaint)
     - Keluhan Tambahan (Additional Complaints)
     - Riwayat Penyakit (Medical History)
     - Pemeriksaan Fisik (Physical Examination)
     - Diagnosa (Diagnosis)
     - Terapi (Treatment)
     - Edukasi (Patient Education)

### Inserting into Forms

1. **Navigate to Medical Form**
   - Open ePuskesmas or compatible medical form
   - Ensure form fields are visible

2. **Insert Summary**
   - Click "Insert into Form" button
   - Extension automatically fills matching fields
   - Green highlights indicate successful insertion

3. **Manual Adjustments**
   - Review auto-filled data
   - Make necessary corrections
   - Add any missing information

## Advanced Features

### File Upload

Instead of recording, you can upload existing audio files:

1. Click "Upload Audio File"
2. Select file (MP3, WAV, WebM, M4A)
3. Maximum file size: 25MB
4. Continue with transcription process

### Language Settings

The extension supports:
- **Bahasa Indonesia** (primary)
- **English** (secondary)
- **Mixed language** (code-switching)

### Custom Prompts

Advanced users can customize AI prompts:
1. Open Settings
2. Navigate to "Advanced Settings"
3. Modify system prompts for specific needs
4. Test with sample transcripts

## Tips for Best Results

### Recording Quality

- **Environment**: Use a quiet room with minimal background noise
- **Microphone**: Position 15-30cm from mouth
- **Speaking**: Clear, moderate pace, avoid mumbling
- **Pauses**: Brief pauses between topics help AI separation

### Efficient Workflow

1. **Prepare**: Review patient history before recording
2. **Structure**: Follow consistent consultation pattern
3. **Keywords**: Use medical terminology consistently
4. **Summary**: Review before inserting into forms

### Common Scenarios

#### New Patient Consultation
1. Record complete history
2. Include all symptoms and timeline
3. Document examination findings
4. Generate comprehensive summary

#### Follow-up Visit
1. Reference previous diagnosis
2. Focus on changes/progress
3. Update treatment plan
4. Document patient response

#### Emergency Cases
1. Keep recording brief and focused
2. Prioritize critical information
3. Generate summary quickly
4. Complete details later

## Troubleshooting

### Recording Issues

**No audio detected:**
- Check microphone connection
- Verify Chrome microphone permission
- Test microphone in settings

**Poor audio quality:**
- Reduce background noise
- Adjust microphone position
- Check microphone settings

### Transcription Problems

**Inaccurate transcription:**
- Speak more clearly
- Reduce speaking speed
- Use standard medical terms
- Edit transcript manually

**Transcription fails:**
- Check API key validity
- Verify internet connection
- Try smaller audio segments

### Form Integration Issues

**Fields not filling:**
- Ensure form is fully loaded
- Check field compatibility
- Try manual copy-paste
- Report specific form issues

## Keyboard Shortcuts

- `Space`: Start/Stop recording (when focused)
- `Ctrl+T`: Transcribe audio
- `Ctrl+S`: Generate summary
- `Ctrl+I`: Insert into form
- `Esc`: Close popup

## Privacy & Security

- Audio is processed locally first
- API calls use encryption
- No permanent storage without consent
- Patient data remains confidential
- Regular security updates

## Getting Help

- **Documentation**: Check guides in `/docs` folder
- **Issues**: Report bugs on [GitHub](https://github.com/naimackerman/LLM_ePuskesmas/issues)
- **Community**: Join discussions in repository
- **Updates**: Follow repository for new features