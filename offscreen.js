/**
 * Offline Processor - Chrome Extension
 * Handles offline speech recognition functionality
 */
class OfflineProcessor {
  constructor() {
    this.recognition = null;
    this.setupMessageListener();
    this.initializeSpeechRecognition();
  }

  // ============================================================================
  // INITIALIZATION METHODS
  // ============================================================================

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'startOfflineRecognition') {
        this.startRecognition(message.language);
        sendResponse({ started: true });
      } else if (message.action === 'stopOfflineRecognition') {
        this.stopRecognition();
        sendResponse({ stopped: true });
      }
    });
  }

  initializeSpeechRecognition() {
    if (this.isSpeechRecognitionSupported()) {
      this.setupRecognition();
    } else {
      console.warn('Speech recognition not supported in this browser');
    }
  }

  isSpeechRecognitionSupported() {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  setupRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    this.configureRecognition();
    this.setupRecognitionEventHandlers();
  }

  configureRecognition() {
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
  }

  setupRecognitionEventHandlers() {
    this.recognition.onresult = (event) => this.handleSpeechResult(event);
    this.recognition.onerror = (event) => this.handleSpeechError(event);
    this.recognition.onend = () => this.handleSpeechEnd();
  }

  // ============================================================================
  // RECOGNITION CONTROL METHODS
  // ============================================================================

  startRecognition(language = 'id-ID') {
    if (this.recognition) {
      this.recognition.lang = language;
      this.recognition.start();
      console.log('Offline speech recognition started');
    }
  }

  stopRecognition() {
    if (this.recognition) {
      this.recognition.stop();
      console.log('Offline speech recognition stopped');
    }
  }

  // ============================================================================
  // SPEECH EVENT HANDLERS
  // ============================================================================

  handleSpeechResult(event) {
    const transcripts = this.extractTranscripts(event);
    
    chrome.runtime.sendMessage({
      action: 'offlineTranscriptionResult',
      finalTranscript: transcripts.final,
      interimTranscript: transcripts.interim
    });
  }

  extractTranscripts(event) {
    let interimTranscript = '';
    let finalTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }
    
    return { final: finalTranscript, interim: interimTranscript };
  }

  handleSpeechError(event) {
    console.error('Speech recognition error:', event.error);
    chrome.runtime.sendMessage({
      action: 'offlineTranscriptionError',
      error: event.error
    });
  }

  handleSpeechEnd() {
    chrome.runtime.sendMessage({
      action: 'offlineTranscriptionEnded'
    });
  }
}

// Initialize offline processor
new OfflineProcessor();