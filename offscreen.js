// offscreen.js - For offline speech recognition (experimental)
class OfflineProcessor {
    constructor() {
      this.recognition = null;
      this.setupMessageListener();
      this.initializeSpeechRecognition();
    }
  
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
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
        
        this.recognition.onresult = (event) => {
          this.handleSpeechResult(event);
        };
        
        this.recognition.onerror = (event) => {
          this.handleSpeechError(event);
        };
        
        this.recognition.onend = () => {
          this.handleSpeechEnd();
        };
      }
    }
  
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
  
    handleSpeechResult(event) {
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
      
      // Send results back to popup
      chrome.runtime.sendMessage({
        action: 'offlineTranscriptionResult',
        finalTranscript: finalTranscript,
        interimTranscript: interimTranscript
      });
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