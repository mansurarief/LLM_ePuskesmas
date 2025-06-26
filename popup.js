// popup.js - Enhanced version with all improvements
class MedicalAudioRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.recordingStartTime = null;
    this.timerInterval = null;
    this.audioBlob = null;
    this.settings = {};
    this.retryCount = 0;
    this.maxRetries = 3;
    
    this.initializeElements();
    this.initializeEventListeners();
    this.loadSettings();
    this.checkMicrophoneAccess();
  }

  initializeElements() {
    this.elements = {
      startRecording: document.getElementById('startRecording'),
      stopRecording: document.getElementById('stopRecording'),
      playRecording: document.getElementById('playRecording'),
      processAudio: document.getElementById('processAudio'),
      clearRecording: document.getElementById('clearRecording'),
      openWelcomePage: document.getElementById('openWelcomePage'),
      openSettings: document.getElementById('openSettings'),
      statusBar: document.getElementById('statusBar'),
      statusText: document.getElementById('statusText'),
      timer: document.getElementById('timer'),
      templateSelect: document.getElementById('templateSelect'),
      audioControls: document.getElementById('audioControls'),
      audioPlayback: document.getElementById('audioPlayback'),
      volumeSlider: document.getElementById('volumeSlider'),
      volumeValue: document.getElementById('volumeValue'),
      progressBar: document.getElementById('progressBar'),
      progressFill: document.getElementById('progressFill'),
      result: document.getElementById('result')
    };
  }

  initializeEventListeners() {
    this.elements.startRecording.addEventListener('click', () => this.startRecording());
    this.elements.stopRecording.addEventListener('click', () => this.stopRecording());
    this.elements.playRecording.addEventListener('click', () => this.playRecording());
    this.elements.processAudio.addEventListener('click', () => this.processAudio());
    this.elements.clearRecording.addEventListener('click', () => this.clearRecording());
    this.elements.openWelcomePage.addEventListener('click', () => this.openWelcomePage());
    this.elements.openSettings.addEventListener('click', () => this.openSettings());
    
    this.elements.volumeSlider.addEventListener('input', () => this.updateVolume());
    this.elements.audioPlayback.addEventListener('loadedmetadata', () => this.updateAudioControls());
  }

  async loadSettings() {
    this.settings = await chrome.storage.local.get([
      'apiKey', 'language', 'gptModel', 'audioQuality', 'maxRecordingTime',
      'enableRetry', 'saveRecordings', 'enableOfflineMode', 'medicalTemplates',
      'apiProvider', 'transcriptionUrl', 'summarizationUrl'
    ]);
    
    // Set defaults
    this.settings.apiProvider = this.settings.apiProvider || 'openai';
    this.settings.transcriptionUrl = this.settings.transcriptionUrl || 'http://localhost:5001';
    this.settings.summarizationUrl = this.settings.summarizationUrl || 'http://localhost:5002';
    this.settings.language = this.settings.language || 'id';
    this.settings.gptModel = this.settings.gptModel || 'gpt-3.5-turbo';
    this.settings.audioQuality = this.settings.audioQuality || 'medium';
    this.settings.maxRecordingTime = this.settings.maxRecordingTime || 10;
    this.settings.enableRetry = this.settings.enableRetry !== false;
    
    this.loadTemplates();
  }

  loadTemplates() {
    const defaultTemplates = [
      {
        name: "General Consultation",
        prompt: "Summarize this medical consultation focusing on: chief complaint, symptoms, physical examination findings, diagnosis, and treatment plan. Format in Indonesian."
      },
      {
        name: "Follow-up Visit", 
        prompt: "Summarize this follow-up visit focusing on: current condition, response to previous treatment, any new symptoms, and adjusted treatment plan. Format in Indonesian."
      },
      {
        name: "Emergency Case",
        prompt: "Summarize this emergency case focusing on: presenting complaint, vital signs, immediate interventions, diagnosis, and urgent treatment required. Format in Indonesian."
      }
    ];
    
    const templates = this.settings.medicalTemplates || defaultTemplates;
    this.elements.templateSelect.innerHTML = '<option value="">Select template...</option>';
    
    templates.forEach((template, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = template.name;
      this.elements.templateSelect.appendChild(option);
    });
  }

  async checkMicrophoneAccess() {
    const { microphoneAccess } = await chrome.storage.local.get('microphoneAccess');
    
    if (microphoneAccess) {
      this.elements.startRecording.disabled = false;
      this.elements.openWelcomePage.style.display = 'none';
    } else {
      this.updateStatus('Please grant microphone access to continue', 'warning');
      this.elements.openWelcomePage.style.display = 'block';
    }

    // Check API configuration based on provider
    if (this.settings.apiProvider === 'openai' || this.settings.apiProvider === 'hybrid') {
      if (!this.settings.apiKey) {
        this.showMessage('Please configure your OpenAI API key in settings', 'error');
      }
    }
    
    if (this.settings.apiProvider === 'local' || this.settings.apiProvider === 'hybrid') {
      this.checkLocalApiStatus();
    }
  }

  updateStatus(message, type = 'normal') {
    this.elements.statusText.textContent = message;
    this.elements.statusBar.className = 'status-bar';
    
    if (type === 'recording') {
      this.elements.statusBar.classList.add('recording');
      this.elements.statusText.innerHTML = `<span class="recording-indicator"></span>${message}`;
    } else if (type === 'processing') {
      this.elements.statusBar.classList.add('processing');
    }
  }

  async startRecording() {
    try {
      const constraints = this.getAudioConstraints();
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: this.getSupportedMimeType()
      });

      this.audioChunks = [];
      this.recordingStartTime = Date.now();

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.onRecordingStop();
      };

      this.mediaRecorder.start(1000); // Collect data every second
      
      this.elements.startRecording.disabled = true;
      this.elements.stopRecording.disabled = false;
      this.elements.clearRecording.disabled = true;
      
      this.updateStatus('Recording in progress...', 'recording');
      this.startTimer();
      
      // Auto-stop after max recording time
      setTimeout(() => {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
          this.stopRecording();
        }
      }, this.settings.maxRecordingTime * 60 * 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      this.updateStatus('Error: Could not access microphone');
      this.showMessage('Microphone access denied. Please check permissions.', 'error');
      this.elements.openWelcomePage.style.display = 'block';
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  }

  onRecordingStop() {
    this.elements.startRecording.disabled = false;
    this.elements.stopRecording.disabled = true;
    this.elements.playRecording.disabled = false;
    this.elements.processAudio.disabled = false;
    this.elements.clearRecording.disabled = false;
    
    this.stopTimer();
    this.updateStatus('Recording completed');
    this.elements.audioControls.style.display = 'block';
    
    this.audioBlob = new Blob(this.audioChunks, { 
      type: this.getSupportedMimeType() 
    });
    
    // Create audio URL for playback
    const audioUrl = URL.createObjectURL(this.audioBlob);
    this.elements.audioPlayback.src = audioUrl;
    this.elements.audioPlayback.style.display = 'block';
    
    // Save recording locally if enabled
    if (this.settings.saveRecordings) {
      this.saveRecordingLocally();
    }
  }

  playRecording() {
    if (this.elements.audioPlayback.src) {
      this.elements.audioPlayback.play();
    }
  }

  clearRecording() {
    this.audioChunks = [];
    this.audioBlob = null;
    this.elements.playRecording.disabled = true;
    this.elements.processAudio.disabled = true;
    this.elements.clearRecording.disabled = true;
    this.elements.audioControls.style.display = 'none';
    this.elements.result.style.display = 'none';
    
    if (this.elements.audioPlayback.src) {
      URL.revokeObjectURL(this.elements.audioPlayback.src);
      this.elements.audioPlayback.src = '';
    }
    
    this.updateStatus('Ready to start recording');
    this.hideProgress();
  }

  async processAudio() {
    if (!this.audioBlob) {
      this.showMessage('No audio to process', 'error');
      return;
    }

    // Validate API configuration based on provider
    if (this.settings.apiProvider === 'openai') {
      if (!this.settings.apiKey) {
        this.showMessage('Please configure your OpenAI API key in settings', 'error');
        this.openSettings();
        return;
      }
    } else if (this.settings.apiProvider === 'local') {
      // For local APIs, we'll check during the actual API calls
    } else if (this.settings.apiProvider === 'hybrid') {
      if (!this.settings.apiKey) {
        this.showMessage('Hybrid mode requires OpenAI API key for fallback', 'error');
        this.openSettings();
        return;
      }
    }

    this.retryCount = 0;
    await this.processWithRetry();
  }

  async processWithRetry() {
    try {
      this.updateStatus('Processing audio...', 'processing');
      this.showProgress();
      
      // Step 1: Transcribe audio
      this.updateProgress(20, 'Transcribing audio...');
      let transcription = await this.transcribeAudio();
      console.log('Transcription result:', transcription);
      
      if (!transcription) {
        throw new Error('Transcription failed');
      }

      // Keep the original transcription for display
      const originalTranscription = transcription;
      
      // Step 1.5: Translate transcription to English for summary generation
      let transcriptionForSummary = transcription;
      if (this.settings.language !== 'en') {
        this.updateProgress(30, 'Translating transcription to English...');
        try {
          const translatedTranscription = await this.translateTranscription(transcription);
          if (translatedTranscription && translatedTranscription.trim() !== transcription.trim()) {
            transcriptionForSummary = translatedTranscription;
            console.log('Using translated transcription for summary generation');
          } else {
            console.log('Translation failed or returned same text, using original');
          }
        } catch (translateError) {
          console.warn('Translation failed, using original transcription:', translateError);
        }
        this.updateProgress(35, 'Translation completed...');
      }
      
      // Step 2: Generate summary using the English transcription
      this.updateProgress(60, 'Generating medical summary...');
      console.log('Generating summary for:', transcriptionForSummary);
      
      let summary;
      try {
        summary = await this.generateSummary(transcriptionForSummary);
        console.log('Summary result:', summary);
      } catch (summaryError) {
        console.warn('Summary generation failed:', summaryError);
        // If summary fails (e.g., text too short), use a simple fallback
        if (summaryError.message && summaryError.message.includes('too short')) {
          summary = `Summary: ${transcriptionForSummary}`;
          console.log('Used fallback summary for short text');
        } else {
          // Re-throw other types of errors
          throw summaryError;
        }
      }
      
      // Step 3: Insert into webpage
      this.updateProgress(90, 'Inserting summary...');
      await this.insertSummary(summary);
      
      this.updateProgress(100, 'Complete!');
      this.updateStatus('Processing completed successfully');
      
      console.log('Showing results - Original:', originalTranscription, 'Summary:', summary);
      this.showResult(`
        <strong>Transcription:</strong><br>
        ${originalTranscription}<br><br>
        <strong>Summary:</strong><br>
        ${summary}
      `);
      
      setTimeout(() => this.hideProgress(), 2000);
      
    } catch (error) {
      console.error('Processing error:', error);
      console.error('Error stack:', error.stack);
      
      if (this.settings.enableRetry && this.retryCount < this.maxRetries) {
        this.retryCount++;
        this.updateStatus(`Retrying... (${this.retryCount}/${this.maxRetries})`);
        setTimeout(() => this.processWithRetry(), 2000);
      } else {
        this.updateStatus('Processing failed');
        this.showMessage(`Processing failed: ${error.message}`, 'error');
        this.hideProgress();
      }
    }
  }

  async transcribeAudio() {
    // Try local API first for local/hybrid modes
    if (this.settings.apiProvider === 'local' || this.settings.apiProvider === 'hybrid') {
      try {
        return await this.transcribeWithLocalAPI();
      } catch (error) {
        console.warn('Local transcription failed:', error);
        
        // If hybrid mode, fallback to OpenAI
        if (this.settings.apiProvider === 'hybrid' && this.settings.apiKey) {
          console.log('Falling back to OpenAI API');
          return await this.transcribeWithOpenAI();
        }
        
        // If local mode, re-throw the error
        throw error;
      }
    }
    
    // Use OpenAI API for openai mode
    return await this.transcribeWithOpenAI();
  }

  async translateTranscription(transcription) {
    const response = await fetch(`${this.settings.transcriptionUrl}/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        text: transcription, 
        source_language: this.settings.language,
        target_language: 'en'
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Translation API error: ${errorData.error || 'HTTP ' + response.status}`);
    }

    const data = await response.json();
    console.log('Translation response:', data);
    
    // Validate the translation response
    if (!data.translated_text) {
      throw new Error('Translation response missing translated_text field');
    }
    
    // Check if translation seems valid (not just returning the prompt)
    const translation = data.translated_text.trim();
    if (translation.toLowerCase().includes('translate') && translation.includes(':')) {
      // Likely the model returned the prompt, try to extract the actual translation
      const parts = translation.split(':');
      if (parts.length > 1) {
        return parts[parts.length - 1].trim();
      }
    }
    
    return translation;
  }

  async transcribeWithLocalAPI() {
    const formData = new FormData();
    formData.append('file', this.audioBlob, 'recording.webm');
    
    if (this.settings.language !== 'auto') {
      formData.append('language', this.settings.language);
    }

    const response = await fetch(`${this.settings.transcriptionUrl}/transcribe`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Local API: ${errorData.error || 'HTTP ' + response.status}`);
    }

    const data = await response.json();
    return data.text;
  }

  async transcribeWithOpenAI() {
    const formData = new FormData();
    formData.append('file', this.audioBlob, 'recording.webm');
    formData.append('model', 'whisper-1');
    
    if (this.settings.language !== 'auto') {
      formData.append('language', this.settings.language);
    }

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.settings.apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API: ${errorData.error?.message || 'HTTP ' + response.status}`);
    }

    const data = await response.json();
    return data.text;
  }

  async generateSummary(transcription) {
    // Try local API first for local/hybrid modes
    if (this.settings.apiProvider === 'local' || this.settings.apiProvider === 'hybrid') {
      try {
        return await this.generateSummaryWithLocalAPI(transcription);
      } catch (error) {
        console.warn('Local summarization failed:', error);
        
        // If hybrid mode, fallback to OpenAI
        if (this.settings.apiProvider === 'hybrid' && this.settings.apiKey) {
          console.log('Falling back to OpenAI API');
          return await this.generateSummaryWithOpenAI(transcription);
        }
        
        // If local mode, re-throw the error
        throw error;
      }
    }
    
    // Use OpenAI API for openai mode
    return await this.generateSummaryWithOpenAI(transcription);
  }

  async generateSummaryWithLocalAPI(transcription) {
    const templates = this.settings.medicalTemplates || [];
    const selectedTemplateIndex = this.elements.templateSelect.value;
    
    let templatePrompt = '';
    if (selectedTemplateIndex !== '' && templates[selectedTemplateIndex]) {
      templatePrompt = templates[selectedTemplateIndex].prompt;
    }

    const requestBody = {
      text: transcription,
      template_prompt: templatePrompt,
      max_length: 150,
      min_length: 50
    };

    const response = await fetch(`${this.settings.summarizationUrl}/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Local API: ${errorData.error || 'HTTP ' + response.status}`);
    }

    const data = await response.json();
    
    // Check if there's an error in the response body (even with 200 status)
    if (data.error) {
      throw new Error(data.error + (data.details ? ': ' + data.details : ''));
    }
    
    return data.summary;
  }

  async generateSummaryWithOpenAI(transcription) {
    const templates = this.settings.medicalTemplates || [];
    const selectedTemplateIndex = this.elements.templateSelect.value;
    
    let systemPrompt = "You are a helpful medical assistant that summarizes medical consultations in Indonesian.";
    let userPrompt = `Please summarize the following medical consultation:\n\n${transcription}`;
    
    if (selectedTemplateIndex !== '' && templates[selectedTemplateIndex]) {
      systemPrompt = "You are a medical assistant specialized in creating structured medical summaries.";
      userPrompt = `${templates[selectedTemplateIndex].prompt}\n\nTranscription:\n${transcription}`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.settings.apiKey}`
      },
      body: JSON.stringify({
        model: this.settings.gptModel,
        messages: [
          { "role": "system", "content": systemPrompt },
          { "role": "user", "content": userPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API: ${errorData.error?.message || 'HTTP ' + response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  async insertSummary(summary) {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "updateSummary",
          summary: summary
        }, () => {
          if (chrome.runtime.lastError) {
            console.warn('Could not insert summary into page:', chrome.runtime.lastError.message);
          }
          resolve();
        });
      });
    });
  }

  // Audio utility methods
  getAudioConstraints() {
    const quality = this.settings.audioQuality;
    const constraints = { audio: true };
    
    if (quality === 'high') {
      constraints.audio = {
        sampleRate: 48000,
        channelCount: 2,
        echoCancellation: true,
        noiseSuppression: true
      };
    } else if (quality === 'medium') {
      constraints.audio = {
        sampleRate: 44100,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true
      };
    } else {
      constraints.audio = {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true
      };
    }
    
    return constraints;
  }

  getSupportedMimeType() {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/wav'
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    
    return 'audio/webm'; // fallback
  }

  // Timer methods
  startTimer() {
    this.elements.timer.style.display = 'block';
    this.timerInterval = setInterval(() => {
      const elapsed = Date.now() - this.recordingStartTime;
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      this.elements.timer.textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
  }

  stopTimer() {
    this.elements.timer.style.display = 'none';
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // Progress methods
  showProgress() {
    this.elements.progressBar.style.display = 'block';
  }

  hideProgress() {
    this.elements.progressBar.style.display = 'none';
    this.elements.progressFill.style.width = '0%';
  }

  updateProgress(percentage, message) {
    this.elements.progressFill.style.width = `${percentage}%`;
    if (message) {
      this.updateStatus(message, 'processing');
    }
  }

  // UI helper methods
  updateVolume() {
    const volume = this.elements.volumeSlider.value;
    this.elements.volumeValue.textContent = `${volume}%`;
    this.elements.audioPlayback.volume = volume / 100;
  }

  updateAudioControls() {
    this.elements.audioControls.style.display = 'block';
  }

  showResult(content) {
    this.elements.result.innerHTML = content;
    this.elements.result.style.display = 'block';
  }

  showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'error' ? 'error-message' : 'success-message';
    messageDiv.textContent = message;
    
    // Remove existing messages
    document.querySelectorAll('.error-message, .success-message').forEach(el => el.remove());
    
    this.elements.result.appendChild(messageDiv);
    this.elements.result.style.display = 'block';
    
    setTimeout(() => messageDiv.remove(), 5000);
  }

  async saveRecordingLocally() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const result = await chrome.storage.local.get('savedRecordings');
    const recordings = result.savedRecordings || [];
    
    recordings.push({
      timestamp: timestamp,
      blob: this.audioBlob,
      duration: this.elements.timer.textContent
    });
    
    // Keep only last 10 recordings
    if (recordings.length > 10) {
      recordings.splice(0, recordings.length - 10);
    }
    
    await chrome.storage.local.set({ savedRecordings: recordings });
  }

  // API status check method
  async checkLocalApiStatus() {
    try {
      const promises = [
        fetch(`${this.settings.transcriptionUrl}/health`).then(r => ({ transcription: r.ok })),
        fetch(`${this.settings.summarizationUrl}/health`).then(r => ({ summarization: r.ok }))
      ];
      
      const results = await Promise.allSettled(promises);
      
      let transcriptionOk = false;
      let summarizationOk = false;
      
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          if (result.value.transcription !== undefined) {
            transcriptionOk = result.value.transcription;
          }
          if (result.value.summarization !== undefined) {
            summarizationOk = result.value.summarization;
          }
        }
      });
      
      if (!transcriptionOk || !summarizationOk) {
        const missingServices = [];
        if (!transcriptionOk) missingServices.push('Transcription');
        if (!summarizationOk) missingServices.push('Summarization');
        
        this.showMessage(
          `Local ${missingServices.join(' and ')} API${missingServices.length > 1 ? 's are' : ' is'} not responding. Please start the APIs.`,
          'error'
        );
      }
    } catch (error) {
      console.warn('Local API status check failed:', error);
    }
  }

  // Navigation methods
  openWelcomePage() {
    chrome.tabs.create({
      url: chrome.runtime.getURL("welcome.html"),
      active: true
    });
  }

  openSettings() {
    chrome.runtime.openOptionsPage();
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new MedicalAudioRecorder();
});