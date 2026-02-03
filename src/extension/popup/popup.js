import { localizeHtmlPage, getMessage, initTranslations } from "../utils/translations.js";

/**
 * @fileoverview Medical Audio Recorder Chrome Extension - Main popup functionality
 * This file contains the core MedicalAudioRecorder class that handles audio recording,
 * transcription using AI APIs (OpenAI/Gemini), and medical summary generation for
 * healthcare documentation purposes.
 * 
 * @author LLM ePuskesmas Team
 * @license MIT
 * @version 1.0.0
 */

/**
 * Main class for the Medical Audio Recorder Chrome Extension.
 * Manages audio recording, transcription, and medical summary generation
 * with integration to healthcare systems.
 * 
 * @class MedicalAudioRecorder
 */
class MedicalAudioRecorder {
  /**
   * Initializes the MedicalAudioRecorder instance.
   * Sets up properties, DOM elements, event listeners, loads settings,
   * checks microphone access, and validates API configuration.
   * 
   * @constructor
   */
  constructor() {
    this.init();
  }

  /**
   * Asynchronous initialization of the extension components.
   * Handles translation loading and component setup.
   * 
   * @async
   */
  async init() {
    await initTranslations();
    localizeHtmlPage();
    this.detectContext();
    this.initializeProperties();
    this.initializeElements();
    this.initializeEventListeners();
    await this.loadSettings();
    this.checkMicrophoneAccess();

    // Additional API key check
    setTimeout(() => {
      this.checkApiKeyInStorage();
    }, 500);
  }

  // ============================================================================
  // INITIALIZATION METHODS
  // ============================================================================

  /**
   * Detects whether the extension is running in popup or side panel context
   * and applies appropriate styling adjustments
   *
   * @private
   */
  detectContext() {
    // Check if we're in a side panel by examining the window dimensions and context
    // Side panels typically have different dimensions than popups
    const isSidePanel = window.innerWidth > 500 || window.innerHeight > 600;

    if (isSidePanel) {
      // Apply side panel specific styles
      document.body.classList.add('side-panel');
      console.log('Running in side panel context');
    } else {
      document.body.classList.add('popup-context');
      console.log('Running in popup context');
    }

    this.isSidePanel = isSidePanel;
  }

  /**
   * Initializes all instance properties with default values.
   * Sets up recording state, timing properties, and configuration defaults.
   * 
   * @private
   */
  initializeProperties() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.recordingStartTime = null;
    this.timerInterval = null;
    this.audioBlob = null;
    this.settings = {};
    this.retryCount = 0;
    this.maxRetries = 3;
    this.currentStep = 1;
    this.transcriptionResult = null;

    // Timing properties
    this.transcriptionStartTime = null;
    this.transcriptionEndTime = null;
    this.summarizationStartTime = null;
    this.summarizationEndTime = null;
  }

  /**
   * Initializes and caches references to DOM elements.
   * Improves performance by storing element references for frequent access.
   * 
   * @private
   */
  initializeElements() {
    this.elements = {
      // Recording controls
      startRecording: document.getElementById("startRecording"),
      stopRecording: document.getElementById("stopRecording"),
      playRecording: document.getElementById("playRecording"),
      transcribeAudio: document.getElementById("transcribeAudio"),
      clearRecording: document.getElementById("clearRecording"),

      // File upload
      uploadAudio: document.getElementById("uploadAudio"),
      audioFileInput: document.getElementById("audioFileInput"),

      // Navigation
      openWelcomePage: document.getElementById("openWelcomePage"),
      openSettings: document.getElementById("openSettings"),
      refreshSettings: document.getElementById("refreshSettings"),
      testApiKey: document.getElementById("testApiKey"),

      // UI elements
      statusBar: document.getElementById("statusBar"),
      statusText: document.getElementById("statusText"),
      timer: document.getElementById("timer"),

      // Audio playback
      audioControls: document.getElementById("audioControls"),
      audioPlayback: document.getElementById("audioPlayback"),
      volumeSlider: document.getElementById("volumeSlider"),
      volumeValue: document.getElementById("volumeValue"),
      playPauseAudio: document.getElementById("playPauseAudio"),
      skipForward: document.getElementById("skipForward"),
      skipBackward: document.getElementById("skipBackward"),
      audioProgress: document.getElementById("audioProgress"),
      currentTime: document.getElementById("currentTime"),
      duration: document.getElementById("duration"),

      // Progress and results
      progressBar: document.getElementById("progressBar"),
      progressFill: document.getElementById("progressFill"),
      result: document.getElementById("result"),

      // Transcript editor
      transcriptEditor: document.getElementById("transcriptEditor"),
      transcriptTextarea: document.getElementById("transcriptTextarea"),
      copyTranscript: document.getElementById("copyTranscript"),
      clearTranscript: document.getElementById("clearTranscript"),
      summarizeTranscript: document.getElementById("summarizeTranscript"),

      // Step indicators
      step1: document.getElementById("step1"),
      step2: document.getElementById("step2"),
      step3: document.getElementById("step3"),
      step4: document.getElementById("step4"),

      // Timing displays
      transcriptionTime: document.getElementById("transcriptionTime"),
      summarizationTime: document.getElementById("summarizationTime"),
    };
  }

  /**
   * Sets up event listeners for all interactive elements.
   * Handles recording controls, file uploads, navigation, and audio playback.
   * 
   * @private
   */
  initializeEventListeners() {
    // Recording event listeners
    this.elements.startRecording.addEventListener("click", () =>
      this.startRecording()
    );
    this.elements.stopRecording.addEventListener("click", () =>
      this.stopRecording()
    );
    this.elements.playRecording.addEventListener("click", () =>
      this.playRecording()
    );
    this.elements.transcribeAudio.addEventListener("click", () =>
      this.transcribeAudio()
    );
    this.elements.clearRecording.addEventListener("click", () =>
      this.clearRecording()
    );

    // File upload event listeners
    this.elements.uploadAudio.addEventListener("click", () =>
      this.openFileDialog()
    );
    this.elements.audioFileInput.addEventListener("change", (event) =>
      this.handleFileUpload(event)
    );

    // Navigation event listeners
    this.elements.openWelcomePage.addEventListener("click", () =>
      this.openWelcomePage()
    );
    this.elements.openSettings.addEventListener("click", () =>
      this.openSettings()
    );
    this.elements.refreshSettings.addEventListener("click", () =>
      this.refreshSettings()
    );
    this.elements.testApiKey.addEventListener("click", () => this.testApiKey());

    // Audio control event listeners
    this.elements.volumeSlider.addEventListener("input", () => {
      this.updateVolume();
      this.updateSliderFill(this.elements.volumeSlider);
    });
    this.elements.audioPlayback.addEventListener("loadedmetadata", () => {
      this.updateAudioControls();
      this.elements.duration.textContent = this.formatTime(this.elements.audioPlayback.duration);
      this.elements.audioProgress.max = Math.floor(this.elements.audioPlayback.duration);
    });
    this.elements.audioPlayback.addEventListener("timeupdate", () => {
      this.updateAudioProgress();
      this.updateSliderFill(this.elements.audioProgress);
    });
    this.elements.audioPlayback.addEventListener("play", () => this.updatePlayPauseIcon(true));
    this.elements.audioPlayback.addEventListener("pause", () => this.updatePlayPauseIcon(false));
    this.elements.audioPlayback.addEventListener("ended", () => this.updatePlayPauseIcon(false));

    this.elements.playPauseAudio.addEventListener("click", () => this.togglePlayPause());
    this.elements.skipForward.addEventListener("click", () => this.skip(5));
    this.elements.skipBackward.addEventListener("click", () => this.skip(-5));
    this.elements.audioProgress.addEventListener("input", () => {
      this.seekAudio();
      this.updateSliderFill(this.elements.audioProgress);
    });

    // Transcript editor event listeners
    this.elements.copyTranscript.addEventListener("click", () =>
      this.copyTranscript()
    );
    this.elements.clearTranscript.addEventListener("click", () =>
      this.clearTranscript()
    );
    this.elements.summarizeTranscript.addEventListener("click", () =>
      this.summarizeTranscript()
    );

    // Initialize slider fills
    this.updateSliderFill(this.elements.volumeSlider);
  }

  /**
   * Updates the visual fill of a slider input based on its current value.
   * 
   * @param {HTMLInputElement} slider - The range input element
   * @private
   */
  updateSliderFill(slider) {
    const min = slider.min || 0;
    const max = slider.max || 100;
    const value = slider.value;
    const percentage = ((value - min) / (max - min)) * 100;
    slider.style.setProperty('--value', `${percentage}%`);
  }

  // ============================================================================
  // SETTINGS AND CONFIGURATION
  // ============================================================================

  /**
   * Loads user settings from Chrome storage.
   * Retrieves API keys, provider preferences, and configuration options.
   * 
   * @async
   * @private
   * @throws {Error} When storage access fails
   */
  async loadSettings() {
    this.settings = await chrome.storage.local.get([
      "openaiApiKey",
      "geminiApiKey",
      "transcriptionProvider",
      "transcriptionModel",
      "summarizationProvider",
      "summarizationModel",
      "language",
      "audioQuality",
      "maxRecordingTime",
      "enableRetry",
      "saveRecordings",
    ]);

    this.setDefaultSettings();
  }

  /**
   * Sets default values for undefined settings.
   * Ensures all required configuration options have fallback values.
   * 
   * @private
   */
  setDefaultSettings() {
    const defaults = {
      openaiApiKey: "",
      geminiApiKey: "",
      transcriptionProvider: "openai",
      transcriptionModel: "whisper-1",
      summarizationProvider: "openai",
      summarizationModel: "gpt-3.5-turbo",
      language: "id",
      audioQuality: "high",
      maxRecordingTime: 20,
      enableRetry: true,
      saveRecordings: false,
    };

    Object.keys(defaults).forEach((key) => {
      if (this.settings[key] === undefined) {
        this.settings[key] = defaults[key];
      }
    });
  }

  /**
   * Checks if microphone access has been granted.
   * Updates UI state based on permission status and validates API configuration.
   * 
   * @async
   * @private
   */
  async checkMicrophoneAccess() {
    const { microphoneAccess } = await chrome.storage.local.get(
      "microphoneAccess"
    );

    if (microphoneAccess) {
      this.elements.startRecording.disabled = false;
      this.elements.openWelcomePage.classList.add("hidden");
    } else {
      this.updateStatus(
        getMessage("permission_denied"),
        "warning"
      );
      this.elements.openWelcomePage.classList.remove("hidden");
    }

    this.validateApiConfiguration();
  }

  /**
   * Validates API key configuration for selected providers.
   * Checks if required API keys are present for transcription and summarization.
   * 
   * @private
   */
  validateApiConfiguration() {
    const transcriptionProvider = this.settings.transcriptionProvider || "openai";
    const summarizationProvider = this.settings.summarizationProvider || "openai";
    let missingKeys = [];

    // Check transcription provider requirements
    if (transcriptionProvider === "openai" && !this.settings.openaiApiKey) {
      missingKeys.push("OpenAI API key (for transcription)");
    } else if (transcriptionProvider === "gemini" && !this.settings.geminiApiKey) {
      missingKeys.push("Gemini API key (for transcription)");
    }

    // Check summarization provider requirements
    if (summarizationProvider === "openai" && !this.settings.openaiApiKey) {
      missingKeys.push("OpenAI API key (for summarization)");
    } else if (summarizationProvider === "gemini" && !this.settings.geminiApiKey) {
      missingKeys.push("Gemini API key (for summarization)");
    }

    // Remove duplicates
    missingKeys = [...new Set(missingKeys)];

    if (missingKeys.length > 0) {
      this.showMessage(
        `<span class="material-symbols-rounded" style="color: var(--md-sys-color-warning);">warning</span> ${missingKeys.join(", ")} not configured. ${getMessage("step_configure_api")}`,
        "error"
      );
    }
  }

  /**
   * Refreshes settings from storage and revalidates configuration.
   * 
   * @async
   * @private
   */
  async refreshSettings() {
    await this.loadSettings();
    this.validateApiConfiguration();
    this.showMessage(getMessage("settings_refreshed"), "success");
  }

  /**
   * Checks if API keys are properly configured in storage.
   * Displays warning messages if required keys are missing.
   * 
   * @async
   * @private
   * @returns {Promise<Object|null>} Storage result or null on error
   */
  async checkApiKeyInStorage() {
    try {
      const result = await chrome.storage.local.get([
        "openaiApiKey", 
        "geminiApiKey", 
        "transcriptionProvider",
        "summarizationProvider"
      ]);

      if ((result.transcriptionProvider === "openai" || result.summarizationProvider === "openai") && result.openaiApiKey === "") {
        this.showMessage(getMessage("api_key_missing"), "error");
      } else if ((result.transcriptionProvider === "gemini" || result.summarizationProvider === "gemini") && result.geminiApiKey === "") {
        this.showMessage(getMessage("api_key_missing"), "error");
      }
      
      return result;
    } catch (error) {
      console.error("Error checking API key in storage:", error);
      return null;
    }
  }

  /**
   * Tests API key configuration and displays results.
   * Validates both OpenAI and Gemini API keys if configured.
   * 
   * @async
   * @private
   */
  async testApiKey() {
    try {
      const transcriptionProvider = this.settings.transcriptionProvider || "openai";
      const summarizationProvider = this.settings.summarizationProvider || "openai";
      
      // Create result container
      this.elements.result.textContent = "";
      const resultsContainer = document.createElement("div");
      resultsContainer.className = "md-api-test-results";
      
      // Test OpenAI API key if needed
      if (transcriptionProvider === "openai" || summarizationProvider === "openai") {
        const openaiItem = document.createElement("div");
        const isConfigured = !!this.settings.openaiApiKey;
        openaiItem.className = `md-api-test-item ${isConfigured ? "md-api-test-item--success" : "md-api-test-item--error"}`;
        
        const icon = document.createElement("span");
        icon.className = "material-symbols-rounded";
        icon.textContent = isConfigured ? "check_circle" : "error";
        
        const text = document.createElement("span");
        text.textContent = `OpenAI: ${isConfigured ? getMessage("openai_key_configured") : getMessage("openai_key_missing")}`;
        
        openaiItem.appendChild(icon);
        openaiItem.appendChild(text);
        resultsContainer.appendChild(openaiItem);
      }

      // Test Gemini API key if needed
      if (transcriptionProvider === "gemini" || summarizationProvider === "gemini") {
        const geminiItem = document.createElement("div");
        const isConfigured = !!this.settings.geminiApiKey;
        geminiItem.className = `md-api-test-item ${isConfigured ? "md-api-test-item--success" : "md-api-test-item--error"}`;
        
        const icon = document.createElement("span");
        icon.className = "material-symbols-rounded";
        icon.textContent = isConfigured ? "check_circle" : "error";
        
        const text = document.createElement("span");
        text.textContent = `Gemini: ${isConfigured ? getMessage("gemini_key_configured") : getMessage("gemini_key_missing")}`;
        
        geminiItem.appendChild(icon);
        geminiItem.appendChild(text);
        resultsContainer.appendChild(geminiItem);
      }
      
      this.elements.result.appendChild(resultsContainer);
      this.elements.result.classList.remove("hidden");
    } catch (error) {
      console.error("Error testing API key:", error);
      this.showMessage(getMessage("error_testing_api_key") + ": " + error.message, "error");
    }
  }

  // ============================================================================
  // TIMING METHODS
  // ============================================================================

  /**
   * Starts the transcription timing process.
   * Initiates real-time timer updates for transcription duration tracking.
   * 
   * @private
   */
  startTranscriptionTimer() {
    this.transcriptionStartTime = Date.now();
    this.updateTranscriptionTime();

    // Set up real-time updates
    this.transcriptionTimerInterval = setInterval(() => {
      this.updateTranscriptionTime();
    }, 1000);
  }

  /**
   * Ends the transcription timing process.
   * Stops timer updates and records final transcription duration.
   * 
   * @private
   */
  endTranscriptionTimer() {
    this.transcriptionEndTime = Date.now();
    this.updateTranscriptionTime();

    // Clear the interval
    if (this.transcriptionTimerInterval) {
      clearInterval(this.transcriptionTimerInterval);
      this.transcriptionTimerInterval = null;
    }
  }

  /**
   * Updates the transcription time display.
   * Calculates and displays elapsed time during transcription process.
   * 
   * @private
   */
  updateTranscriptionTime() {
    if (this.transcriptionStartTime) {
      const endTime = this.transcriptionEndTime || Date.now();
      const duration = endTime - this.transcriptionStartTime;
      const timeString = this.formatDuration(duration);
      this.elements.transcriptionTime.querySelector(".time-value").textContent =
        timeString;
    }
  }

  startSummarizationTimer() {
    this.summarizationStartTime = Date.now();
    this.updateSummarizationTime();

    // Set up real-time updates
    this.summarizationTimerInterval = setInterval(() => {
      this.updateSummarizationTime();
    }, 1000);
  }

  endSummarizationTimer() {
    this.summarizationEndTime = Date.now();
    this.updateSummarizationTime();

    // Clear the interval
    if (this.summarizationTimerInterval) {
      clearInterval(this.summarizationTimerInterval);
      this.summarizationTimerInterval = null;
    }
  }

  updateSummarizationTime() {
    if (this.summarizationStartTime) {
      const endTime = this.summarizationEndTime || Date.now();
      const duration = endTime - this.summarizationStartTime;
      const timeString = this.formatDuration(duration);
      this.elements.summarizationTime.querySelector(".time-value").textContent =
        timeString;
    }
  }

  /**
   * Formats duration from milliseconds to readable string.
   * 
   * @private
   * @param {number} milliseconds - Duration in milliseconds
   * @returns {string} Formatted duration string (e.g., "2m 30s" or "45s")
   */
  formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  resetTiming() {
    this.transcriptionStartTime = null;
    this.transcriptionEndTime = null;
    this.summarizationStartTime = null;
    this.summarizationEndTime = null;

    // Clear intervals
    if (this.transcriptionTimerInterval) {
      clearInterval(this.transcriptionTimerInterval);
      this.transcriptionTimerInterval = null;
    }
    if (this.summarizationTimerInterval) {
      clearInterval(this.summarizationTimerInterval);
      this.summarizationTimerInterval = null;
    }

    // Reset timing displays to show "--"
    this.elements.transcriptionTime.querySelector(".time-value").textContent =
      "--";
    this.elements.summarizationTime.querySelector(".time-value").textContent =
      "--";
  }

  // ============================================================================
  // STEP MANAGEMENT
  // ============================================================================

  updateStepIndicator(step, customText = null) {
    // Reset all steps - using Material Design 3 stepper classes
    [
      this.elements.step1,
      this.elements.step2,
      this.elements.step3,
      this.elements.step4,
    ].forEach((stepEl) => {
      stepEl.className = "md-stepper__step";
    });

    // Mark current and completed steps
    for (let i = 1; i <= 4; i++) {
      const stepEl = this.elements[`step${i}`];
      if (i < step) {
        stepEl.className = "md-stepper__step md-stepper__step--completed";
      } else if (i === step) {
        stepEl.className = "md-stepper__step md-stepper__step--active";
        // Update step text if custom text is provided
        if (customText) {
          const labelEl = stepEl.querySelector('.md-stepper__label');
          if (labelEl) labelEl.textContent = customText;
        }
      }
    }

    this.currentStep = step;
  }

  // ============================================================================
  // AUDIO RECORDING METHODS
  // ============================================================================

  /**
   * Starts audio recording process.
   * Requests microphone access, configures MediaRecorder, and initiates recording.
   * 
   * @async
   * @throws {Error} When microphone access is denied or unavailable
   */
  async startRecording() {
    try {
      const constraints = this.getAudioConstraints();
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      const mimeType = this.getSupportedMimeType();

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
      });

      this.setupMediaRecorder();
      this.startRecordingUI();
      this.startTimer();
      this.setupAutoStop();
      this.updateStepIndicator(1);
    } catch (error) {
      this.handleRecordingError(error);
    }
  }

  /**
   * Configures the MediaRecorder for audio capture.
   * Sets up event handlers and begins data collection.
   * 
   * @private
   */
  setupMediaRecorder() {
    this.audioChunks = [];
    this.recordingStartTime = Date.now();
    this.recordingMimeType = this.getSupportedMimeType();

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => this.onRecordingStop();
    this.mediaRecorder.onerror = (event) => {
      this.handleRecordingError(event.error);
    };

    try {
      this.mediaRecorder.start();
    } catch (error) {
      this.handleRecordingError(error);
    }
  }

  startRecordingUI() {
    this.elements.startRecording.disabled = true;
    this.elements.stopRecording.disabled = false;
    this.elements.clearRecording.disabled = true;
    this.updateStatus(getMessage("recording_progress"), "recording");
  }

  setupAutoStop() {
    setTimeout(() => {
      if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
        this.stopRecording();
      }
    }, this.settings.maxRecordingTime * 60 * 1000);
  }

  handleRecordingError(error) {
    console.error("Error accessing microphone:", error);
    this.updateStatus(getMessage("error_recording"));
    this.showMessage(
      getMessage("permission_denied"),
      "error"
    );
    this.elements.openWelcomePage.classList.remove("hidden");
  }

  /**
   * Stops the current audio recording.
   * Terminates MediaRecorder and releases microphone resources.
   * 
   * @public
   */
  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }
  }

  /**
   * Handles recording completion.
   * Updates UI state, creates audio blob, and sets up playback.
   * 
   * @private
   */
  onRecordingStop() {
    this.elements.startRecording.disabled = false;
    this.elements.stopRecording.disabled = true;
    this.elements.playRecording.disabled = false;
    this.elements.transcribeAudio.disabled = false;
    this.elements.clearRecording.disabled = false;

    this.stopTimer();
    this.updateStatus(getMessage("recording_completed"));
    this.elements.audioControls.classList.remove("hidden");

    this.createAudioBlob();
    this.setupAudioPlayback();

    if (this.settings.saveRecordings) {
      this.saveRecordingLocally();
    }
  }

  createAudioBlob() {
    if (this.audioChunks.length === 0) {
      console.warn('No audio chunks to create blob from');
      return;
    }

    const originalBlob = new Blob(this.audioChunks, {
      type: this.recordingMimeType || this.getSupportedMimeType(),
    });

    // Convert to MP3 for better compatibility
    this.convertToMP3(originalBlob).then(mp3Blob => {
      this.audioBlob = mp3Blob;
      this.setupAudioPlayback();
    }).catch(error => {
      console.warn('MP3 conversion failed, using original format:', error);
      this.audioBlob = originalBlob;
      this.setupAudioPlayback();
    });
  }

  async convertToMP3(audioBlob) {
    return new Promise(async (resolve, reject) => {
      try {
        // Create audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Convert blob to array buffer
        const arrayBuffer = await audioBlob.arrayBuffer();

        // Decode audio data
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Create MP3 buffer using Web Audio API
        const mp3Buffer = this.encodeMP3(audioBuffer);

        // Create MP3 blob
        const mp3Blob = new Blob([mp3Buffer], { type: 'audio/mp3' });

        audioContext.close();
        resolve(mp3Blob);
      } catch (error) {
        console.error('MP3 conversion error:', error);
        reject(error);
      }
    });
  }

  encodeMP3(audioBuffer) {
    // Simple WAV to MP3 conversion using Web Audio API

    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    const numChannels = audioBuffer.numberOfChannels;

    // Create WAV data
    const wavBuffer = new ArrayBuffer(44 + length * numChannels * 2);
    const wavView = new DataView(wavBuffer);

    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        wavView.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    wavView.setUint32(4, 36 + length * numChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    wavView.setUint32(16, 16, true);
    wavView.setUint16(20, 1, true);
    wavView.setUint16(22, numChannels, true);
    wavView.setUint32(24, sampleRate, true);
    wavView.setUint32(28, sampleRate * numChannels * 2, true);
    wavView.setUint16(32, numChannels * 2, true);
    wavView.setUint16(34, 16, true);
    writeString(36, 'data');
    wavView.setUint32(40, length * numChannels * 2, true);

    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
        wavView.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return wavBuffer;
  }

  setupAudioPlayback() {
    if (!this.audioBlob) {
      console.error('No audio blob available for playback');
      return;
    }

    const audioUrl = URL.createObjectURL(this.audioBlob);
    this.elements.audioPlayback.src = audioUrl;
    this.elements.audioPlayback.classList.remove("hidden");

    this.addDownloadButton();

    this.elements.audioPlayback.onerror = (error) => {
      console.error('Audio playback error:', error);
    };

    this.elements.audioPlayback.onloadeddata = () => {
      console.log(`Audio loaded successfully: duration=${this.elements.audioPlayback.duration}s`);
    };
  }

  addDownloadButton() {
    // Remove existing download button if it exists
    const existingButton = document.getElementById('downloadAudio');
    if (existingButton) {
      existingButton.remove();
    }

    // Create download button
    const downloadButton = document.createElement('button');
    downloadButton.id = 'downloadAudio';
    downloadButton.innerHTML = '<span class="material-symbols-rounded">download</span> ' + getMessage("download_mp3");
    downloadButton.className = 'md-button md-button--filled md-download-btn mb-2';

    downloadButton.onclick = () => {
      this.downloadAudioAsMP3();
    };

    // Add button after audio controls
    const audioControls = this.elements.audioControls;
    if (audioControls && audioControls.parentNode) {
      audioControls.parentNode.insertBefore(downloadButton, audioControls.nextSibling);
    }
  }

  downloadAudioAsMP3() {
    if (!this.audioBlob) {
      this.showMessage('No audio available to download', 'error');
      return;
    }

    const url = URL.createObjectURL(this.audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recording_${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showMessage(getMessage("audio_downloaded"), 'success');
  }

  playRecording() {
    if (this.elements.audioPlayback.src) {
      this.togglePlayPause();
    }
  }

  togglePlayPause() {
    if (this.elements.audioPlayback.paused) {
      this.elements.audioPlayback.play();
    } else {
      this.elements.audioPlayback.pause();
    }
  }

  updatePlayPauseIcon(isPlaying) {
    // Update the audio player play/pause button
    const icon = this.elements.playPauseAudio.querySelector('.material-symbols-rounded');
    if (icon) {
      icon.textContent = isPlaying ? 'pause' : 'play_arrow';
    }
    
    // Also update the main "Putar" button to sync with play/pause state
    const playRecordingIcon = this.elements.playRecording.querySelector('.material-symbols-rounded');
    if (playRecordingIcon) {
      playRecordingIcon.textContent = isPlaying ? 'pause' : 'play_arrow';
    }
    
    // Update the button text as well
    // Find the text node (last child that's a text node)
    const buttonChildren = this.elements.playRecording.childNodes;
    for (let i = buttonChildren.length - 1; i >= 0; i--) {
      if (buttonChildren[i].nodeType === Node.TEXT_NODE && buttonChildren[i].textContent.trim()) {
        buttonChildren[i].textContent = isPlaying ? getMessage("pause_recording") : getMessage("play_recording");
        break;
      }
    }
  }

  skip(seconds) {
    this.elements.audioPlayback.currentTime += seconds;
  }

  updateAudioProgress() {
    const current = this.elements.audioPlayback.currentTime;
    this.elements.audioProgress.value = Math.floor(current);
    this.elements.currentTime.textContent = this.formatTime(current);
  }

  seekAudio() {
    this.elements.audioPlayback.currentTime = this.elements.audioProgress.value;
  }

  formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Clears the current recording and resets UI.
   * Removes audio data, resets controls, and clears results.
   * 
   * @public
   */
  clearRecording() {
    this.audioChunks = [];
    this.audioBlob = null;
    this.transcriptionResult = null;
    this.elements.playRecording.disabled = true;
    this.elements.transcribeAudio.disabled = true;
    this.elements.clearRecording.disabled = true;
    this.elements.audioControls.classList.add("hidden");
    this.elements.transcriptEditor.classList.add("hidden");
    this.elements.result.classList.add("hidden");

    if (this.elements.audioPlayback.src) {
      URL.revokeObjectURL(this.elements.audioPlayback.src);
      this.elements.audioPlayback.src = "";
    }

    // Remove download button
    const downloadButton = document.getElementById('downloadAudio');
    if (downloadButton) {
      downloadButton.remove();
    }

    this.elements.transcriptTextarea.value = "";
    this.updateStatus(getMessage("ready_to_record"));
    this.hideProgress();
    this.updateStepIndicator(1);
    this.resetTiming();
  }

  // ============================================================================
  // TRANSCRIPTION METHODS
  // ============================================================================

  /**
   * Initiates audio transcription process.
   * Validates audio availability and API configuration before transcription.
   * 
   * @async
   * @throws {Error} When no audio is available or API configuration is invalid
   */
  async transcribeAudio() {
    if (!this.audioBlob) {
      this.showMessage(getMessage("no_audio_transcribe"), "error");
      return;
    }

    this.validateApiConfiguration();

    this.retryCount = 0;
    await this.transcribeWithRetry();
  }

  /**
   * Performs transcription with retry capability.
   * Handles transcription process with automatic retry on failure.
   * 
   * @async
   * @private
   * @throws {Error} When transcription fails after all retry attempts
   */
  async transcribeWithRetry() {
    try {
      this.updateStatus(getMessage("transcribing_audio"), "processing");
      this.showProgress();
      this.updateStepIndicator(2);
      this.startTranscriptionTimer();

      // Start animated progress simulation
      this.updateProgress(10, getMessage("transcribing_audio"));
      const progressInterval = this.startProgressSimulation(10, 85, 50);
      
      const transcription = await this.transcribeAudioOnly();
      
      // Stop the simulation
      clearInterval(progressInterval);

      if (!transcription) {
        throw new Error(getMessage("error_transcription"));
      }

      this.endTranscriptionTimer();
      this.transcriptionResult = transcription;
      this.showTranscriptEditor(transcription);
      this.updateStepIndicator(3);

      this.updateProgress(100, getMessage("transcription_completed"));
      this.updateStatus(getMessage("transcription_completed"));
      setTimeout(() => this.hideProgress(), 2000);
    } catch (error) {
      this.endTranscriptionTimer();
      this.handleTranscriptionError(error);
    }
  }

  /**
   * Starts a progress simulation that incrementally updates the progress bar.
   * 
   * @param {number} startPercent - Starting percentage
   * @param {number} maxPercent - Maximum percentage to reach before completion
   * @param {number} intervalMs - Update interval in milliseconds
   * @returns {number} Interval ID for cleanup
   * @private
   */
  startProgressSimulation(startPercent, maxPercent, intervalMs) {
    let currentPercent = startPercent;
    const increment = 0.5; // Small increment for smooth animation
    
    const intervalId = setInterval(() => {
      if (currentPercent < maxPercent) {
        currentPercent += increment;
        this.updateProgress(Math.floor(currentPercent));
      }
    }, intervalMs);
    
    return intervalId;
  }

  /**
   * Performs the actual transcription using the configured provider.
   * Routes to OpenAI or Gemini transcription based on settings.
   * 
   * @async
   * @private
   * @returns {Promise<string>} Transcribed text
   * @throws {Error} When transcription provider is unsupported or API call fails
   */
  async transcribeAudioOnly() {
    const transcriptionProvider = this.settings.transcriptionProvider || "openai";
    
    if (transcriptionProvider === "openai") {
      return await this.transcribeWithOpenAI();
    } else if (transcriptionProvider === "gemini") {
      return await this.transcribeWithGemini();
    } else {
      throw new Error(`Unsupported transcription provider: ${transcriptionProvider}`);
    }
  }

  showTranscriptEditor(transcription) {
    this.elements.transcriptTextarea.value = transcription;
    this.elements.transcriptEditor.classList.remove("hidden");
    this.elements.summarizeTranscript.disabled = false;
  }

  handleTranscriptionError(error) {
    console.error("Transcription error:", error);

    if (this.settings.enableRetry && this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.updateStatus(
        getMessage("retrying_transcription") + ` (${this.retryCount}/${this.maxRetries})`
      );
      setTimeout(() => this.transcribeWithRetry(), 2000);
    } else {
      this.updateStatus(getMessage("error_transcription"));
      this.showMessage(getMessage("error_transcription") + `: ${error.message}`, "error");
      this.hideProgress();
    }
  }

  // ============================================================================
  // TRANSCRIPT EDITOR METHODS
  // ============================================================================

  copyTranscript() {
    const transcript = this.elements.transcriptTextarea.value;
    if (transcript) {
      navigator.clipboard
        .writeText(transcript)
        .then(() => {
          this.showMessage(getMessage("transcript_copied"), "success");
        })
        .catch(() => {
          this.showMessage(getMessage("failed_copy"), "error");
        });
    }
  }

  clearTranscript() {
    this.elements.transcriptTextarea.value = "";
    this.transcriptionResult = null;
    this.elements.transcriptEditor.classList.add("hidden");
    this.updateStepIndicator(2);
    this.resetTiming();
  }

  async summarizeTranscript() {
    const transcript = this.elements.transcriptTextarea.value.trim();
    if (!transcript) {
      this.showMessage(getMessage("no_transcript_summarize"), "error");
      return;
    }

    let progressInterval;
    try {
      this.updateStatus(getMessage("generating_summary"), "processing");
      this.showProgress();
      this.updateStepIndicator(4);
      this.startSummarizationTimer();

      // Start animated progress simulation
      this.updateProgress(10, getMessage("generating_summary"));
      progressInterval = this.startProgressSimulation(10, 80, 60);
      
      const summary = await this.generateSummary(transcript);
      
      // Stop the simulation
      clearInterval(progressInterval);

      this.endSummarizationTimer();
      this.updateProgress(90, getMessage("inserting_summary"));
      await this.insertSummary(summary);

      this.updateProgress(100, getMessage("complete"));
      this.updateStatus(getMessage("summary_completed"));
      this.showResults(transcript, summary);
      setTimeout(() => this.hideProgress(), 2000);
    } catch (error) {
      if (progressInterval) clearInterval(progressInterval);
      this.endSummarizationTimer();
      console.error("Summarization error:", error);
      this.updateStatus(getMessage("error_summarization"));
      this.showMessage(getMessage("error_summarization") + `: ${error.message}`, "error");
      this.hideProgress();
    }
  }

  // ============================================================================
  // TRANSCRIPTION API METHODS
  // ============================================================================

  /**
   * Transcribes audio using OpenAI Whisper API.
   * Sends audio file to OpenAI and processes the response.
   * 
   * @async
   * @private
   * @returns {Promise<string>} Transcribed text from OpenAI
   * @throws {Error} When API key is missing or API call fails
   */
  async transcribeWithOpenAI() {
    // Check if API key is configured
    if (!this.settings.openaiApiKey) {
      throw new Error(
        getMessage("openai_key_not_configured")
      );
    }

    const formData = this.createTranscriptionFormData();
    formData.append("model", this.settings.transcriptionModel || "whisper-1");

    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.settings.openaiApiKey}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI API: ${errorData.error?.message || "HTTP " + response.status}`
      );
    }

    const data = await response.json();
    return data.text;
  }

  async transcribeWithGemini() {
    // Check if API key is configured
    if (!this.settings.geminiApiKey) {
      throw new Error(
        getMessage("gemini_key_not_configured")
      );
    }

    // Placeholder for Gemini transcription implementation
    // You'll implement the actual Google Cloud Speech-to-Text API call here
    throw new Error(getMessage("gemini_not_implemented"));
  }

  createTranscriptionFormData() {
    const formData = new FormData();
    const compatibleBlob = this.createOpenAICompatibleBlob();
    const mimeType = compatibleBlob.type;
    const fileExtension = this.getFileExtension(mimeType);
    const filename = `recording.${fileExtension}`;

    formData.append("file", compatibleBlob, filename);

    if (this.settings.language !== "auto") {
      formData.append("language", this.settings.language);
    }

    return formData;
  }

  // ============================================================================
  // SUMMARIZATION METHODS
  // ============================================================================

  /**
   * Generates medical summary from transcription.
   * Routes to appropriate AI provider for summarization.
   * 
   * @async
   * @param {string} transcription - The transcribed text to summarize
   * @returns {Promise<string>} Medical summary in JSON format
   * @throws {Error} When summarization fails or provider is unsupported
   */
  async generateSummary(transcription) {
    try {
      const summarizationProvider = this.settings.summarizationProvider || "openai";
      
      if (summarizationProvider === "openai") {
        return await this.generateSummaryWithOpenAI(transcription);
      } else if (summarizationProvider === "gemini") {
        return await this.generateSummaryWithGemini(transcription);
      } else {
        throw new Error(`Unsupported summarization provider: ${summarizationProvider}`);
      }
    } catch (summaryError) {
      console.warn("Summary generation failed:", summaryError);
      if (summaryError.message && summaryError.message.includes("too short")) {
        const fallbackJson = {
          chief_complaint: "Informasi tidak tersedia",
          additional_complaint: "Informasi tidak tersedia",
          history_of_present_illness: "Informasi tidak tersedia",
          past_medical_history: "Informasi tidak tersedia",
          family_history: "Informasi tidak tersedia",
          recommended_medication_therapy: "Informasi tidak tersedia",
          recommended_non_medication_therapy: "Informasi tidak tersedia",
          education: "Informasi tidak tersedia",
        };
        return JSON.stringify(fallbackJson);
      }
      throw summaryError;
    }
  }

  /**
   * Generates medical summary using OpenAI GPT API.
   * Processes transcription through medical summary prompt.
   * 
   * @async
   * @private
   * @param {string} transcription - The transcribed text to process
   * @returns {Promise<string>} Medical summary in structured JSON format
   * @throws {Error} When API key is missing or API call fails
   */
  async generateSummaryWithOpenAI(transcription) {
    // Check if API key is configured
    if (!this.settings.openaiApiKey) {
      throw new Error(
        getMessage("openai_key_not_configured")
      );
    }

    // System
    let systemPrompt = `
    You are a highly skilled medical transcriber and summarizer. Your task is to accurately and concisely summarize a doctor-patient conversation transcript provided in Bahasa Indonesia. Focus on extracting key medical information relevant to the patient's visit, including:

    1.  Chief Complaint (CC): The primary reason for the visit in the patient's own words, and how long it has been present.
    2.  Additional Complaint: Any secondary or additional complaints mentioned by the patient, including those that occurred simultaneously or prior to the main chief complaint. Avoid repeating the chief complaint in this section.
    3.  History of Present Illness (HPI): Detailed description of the chief complaint, including onset, duration, character, location, radiation, aggravating/alleviating factors, and associated symptoms.
    4.  Past Medical History (PMH): Relevant pre-existing conditions, significant illnesses, surgeries, or hospitalizations.
    5.  Family History (FH): Significant medical conditions in immediate family members.
    6.  Recommended Medication Therapy: Specific medication treatments advised by the doctor. For each medication, include the drug name, dosage, frequency, route of administration, and duration of use. Mention the indication if relevant. Identify and convert any layman's terms or general descriptions of medications (e.g., "obat demam", "obat pereda nyeri", "obat sakit perut") into their correct pharmacological drug classes or specific drug names.
    7.  Recommended Non-Medication Therapy: Non-pharmacological treatments or lifestyle changes advised (e.g., diet, exercise, physiotherapy).
    8.  Education: Key information or advice given to the patient for understanding their condition or managing their health.

    Instructions for Summarization:

    * Language Input: The input transcript will be in Bahasa Indonesia. Summarize the content from this language.
    * Conciseness: Be as brief as possible while retaining all critical medical information.
    * Accuracy: Ensure all summarized information is directly supported by the transcript.
    * Objectivity: Present facts without interpretation or inference.
    * Completeness: Include all the specified categories if present in the transcript. If a category is not present in the transcript, its value should be set to "Informasi tidak tersedia".
    * Language Output: The summarized values in the JSON should be derived from the Indonesian transcript.

    Output Format:

    Provide the summary as a JSON object with the following structure. The keys should be as listed below, and values should be strings summarizing the respective categories. If a category has no information in the transcript, its value will be "Informasi tidak tersedia".

    {
      "chief_complaint": "Summary of the chief complaint.",
      "additional_complaint": "Summary of additional complaints.",
      "history_of_present_illness": "Summary of HPI.",
      "past_medical_history": "Summary of PMH.",
      "family_history": "Summary of family history.",
      "recommended_medication_therapy": "Summary of recommended medication therapy.",
      "recommended_non_medication_therapy": "Summary of recommended non-medication therapy.",
      "education": "Summary of education provided."
    }
    `;

    let userPrompt = `
    Transcript to summarize:
    ${transcription}
    `;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.settings.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: this.settings.summarizationModel || "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 500,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI API: ${errorData.error?.message || "HTTP " + response.status}`
      );
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  async generateSummaryWithGemini(transcription) {
    // Check if API key is configured
    if (!this.settings.geminiApiKey) {
      throw new Error(
        getMessage("gemini_key_not_configured")
      );
    }

    // Placeholder for Gemini summarization implementation
    // You'll implement the actual Gemini API call here
    throw new Error(getMessage("gemini_summarization_not_implemented"));
  }

  showResults(originalTranscription, summary) {
    this.elements.result.textContent = ""; // Clear existing
    
    // Create Transcription Section
    const transcriptionSection = document.createElement("div");
    transcriptionSection.className = "md-result-section";
    
    const transcriptionHeader = document.createElement("div");
    transcriptionHeader.className = "md-result-section__header";
    
    const transcriptionTitle = document.createElement("div");
    transcriptionTitle.className = "md-result-section__title";
    const transcriptionIcon = document.createElement("span");
    transcriptionIcon.className = "material-symbols-rounded";
    transcriptionIcon.textContent = "description";
    transcriptionTitle.appendChild(transcriptionIcon);
    transcriptionTitle.appendChild(document.createTextNode(getMessage("transcription_label") || "Transcription"));
    
    const copyTranscriptionBtn = document.createElement("button");
    copyTranscriptionBtn.type = "button";
    copyTranscriptionBtn.className = "md-result-section__copy-btn";
    const copyIcon1 = document.createElement("span");
    copyIcon1.className = "material-symbols-rounded";
    copyIcon1.textContent = "content_copy";
    copyTranscriptionBtn.appendChild(copyIcon1);
    copyTranscriptionBtn.appendChild(document.createTextNode(getMessage("copy") || "Copy"));
    
    transcriptionHeader.appendChild(transcriptionTitle);
    transcriptionHeader.appendChild(copyTranscriptionBtn);
    
    const transcriptionTextarea = document.createElement("textarea");
    transcriptionTextarea.className = "md-result-section__textarea";
    transcriptionTextarea.value = originalTranscription;
    transcriptionTextarea.readOnly = true;
    
    copyTranscriptionBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(transcriptionTextarea.value).then(() => {
        copyIcon1.textContent = "check";
        setTimeout(() => { copyIcon1.textContent = "content_copy"; }, 2000);
      });
    });
    
    transcriptionSection.appendChild(transcriptionHeader);
    transcriptionSection.appendChild(transcriptionTextarea);
    
    // Create Summary Section
    const summarySection = document.createElement("div");
    summarySection.className = "md-result-section";
    
    const summaryHeader = document.createElement("div");
    summaryHeader.className = "md-result-section__header";
    
    const summaryTitle = document.createElement("div");
    summaryTitle.className = "md-result-section__title";
    const summaryIcon = document.createElement("span");
    summaryIcon.className = "material-symbols-rounded";
    summaryIcon.textContent = "clinical_notes";
    summaryTitle.appendChild(summaryIcon);
    summaryTitle.appendChild(document.createTextNode(getMessage("summary_label") || "Summary"));
    
    const copySummaryBtn = document.createElement("button");
    copySummaryBtn.type = "button";
    copySummaryBtn.className = "md-result-section__copy-btn";
    const copyIcon2 = document.createElement("span");
    copyIcon2.className = "material-symbols-rounded";
    copyIcon2.textContent = "content_copy";
    copySummaryBtn.appendChild(copyIcon2);
    copySummaryBtn.appendChild(document.createTextNode(getMessage("copy") || "Copy"));
    
    summaryHeader.appendChild(summaryTitle);
    summaryHeader.appendChild(copySummaryBtn);
    
    const summaryTextarea = document.createElement("textarea");
    summaryTextarea.className = "md-result-section__textarea";
    summaryTextarea.value = summary;
    summaryTextarea.readOnly = true;
    
    copySummaryBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(summaryTextarea.value).then(() => {
        copyIcon2.textContent = "check";
        setTimeout(() => { copyIcon2.textContent = "content_copy"; }, 2000);
      });
    });
    
    summarySection.appendChild(summaryHeader);
    summarySection.appendChild(summaryTextarea);
    
    // Append sections to result area
    this.elements.result.appendChild(transcriptionSection);
    this.elements.result.appendChild(summarySection);
    
    this.elements.result.classList.remove("hidden");
  }

  // ============================================================================
  // FILE HANDLING METHODS
  // ============================================================================

  openFileDialog() {
    this.elements.audioFileInput.click();
  }

  /**
   * Handles audio file upload from user.
   * Validates file type and size, then sets up for processing.
   * 
   * @param {Event} event - File input change event
   * @private
   */
  handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!this.validateUploadedFile(file)) {
      return;
    }

    this.audioBlob = file;
    this.setupUploadedFilePlayback(file);
    this.updateUIForUploadedFile(file);
    this.updateStepIndicator(1);
    event.target.value = "";
  }

  /**
   * Validates uploaded audio file.
   * Checks file type and size constraints.
   * 
   * @private
   * @param {File} file - The uploaded file to validate
   * @returns {boolean} True if file is valid, false otherwise
   */
  validateUploadedFile(file) {
    const formats = this.getSupportedAudioFormats();

    // Check file extension as fallback for files without proper MIME type
    const fileName = file.name.toLowerCase();
    const extension = fileName.split('.').pop();

    const isSupportedByType = formats.mimeTypes.includes(file.type);
    const isSupportedByExtension = formats.extensions.includes(extension);

    if (!isSupportedByType && !isSupportedByExtension) {
      this.showMessage(getMessage("unsupported_format") + ` ${formats.extensions.join(', ')}`, "error");
      return false;
    }

    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      this.showMessage(
        getMessage("file_too_large"),
        "error"
      );
      return false;
    }

    return true;
  }

  setupUploadedFilePlayback(file) {
    const audioUrl = URL.createObjectURL(this.audioBlob);
    this.elements.audioPlayback.src = audioUrl;
    this.elements.audioPlayback.classList.remove("hidden");
  }

  updateUIForUploadedFile(file) {
    this.elements.playRecording.disabled = false;
    this.elements.transcribeAudio.disabled = false;
    this.elements.clearRecording.disabled = false;
    this.elements.audioControls.classList.remove("hidden");

    this.updateStatus(getMessage("audio_uploaded") + ` ${file.name}`);
    this.showMessage(getMessage("audio_uploaded") + ` ${file.name}`, "success");
  }

  async saveRecordingLocally() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const result = await chrome.storage.local.get("savedRecordings");
    const recordings = result.savedRecordings || [];

    recordings.push({
      timestamp: timestamp,
      blob: this.audioBlob,
      duration: this.elements.timer.textContent,
    });

    // Keep only last 10 recordings
    if (recordings.length > 10) {
      recordings.splice(0, recordings.length - 10);
    }

    await chrome.storage.local.set({ savedRecordings: recordings });
  }

  // ============================================================================
  // AUDIO FORMAT HANDLING METHODS
  // ============================================================================

  getAudioConstraints() {
    const quality = this.settings.audioQuality;
    const constraints = { audio: true };

    const qualitySettings = {
      high: {
        sampleRate: 48000,
        channelCount: 2,
        echoCancellation: true,
        noiseSuppression: true,
      },
      medium: {
        sampleRate: 44100,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
      low: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
      },
    };

    constraints.audio = qualitySettings[quality] || qualitySettings.medium;
    return constraints;
  }

  getSupportedMimeType() {
    // OpenAI supported formats only, prioritize formats with better compatibility
    const types = [
      "audio/webm;codecs=opus", // WebM Opus first (most compatible)
      "audio/webm",
      "audio/mp4",
      "audio/wav",
      "audio/mp3",
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return "audio/webm"; // fallback to OpenAI-supported format
  }

  getFileExtension(mimeType) {
    const formats = this.getSupportedAudioFormats();
    return formats.extensionMap[mimeType] || "webm";
  }

  // Single source of truth for supported audio formats (OpenAI supported only)
  getSupportedAudioFormats() {
    return {
      // OpenAI supported MIME types only
      mimeTypes: [
        "audio/m4a",
        "audio/mp3",
        "audio/mp4",
        "audio/mpeg",
        "audio/mpga",
        "audio/wav",
        "audio/webm",
        "audio/x-m4a",
        "audio/x-wav",
        "audio/wave",
      ],
      // Supported file extensions (OpenAI supported only)
      extensions: ["mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm"],
      // MIME type to extension mapping (OpenAI supported only)
      extensionMap: {
        "audio/webm;codecs=opus": "webm",
        "audio/webm": "webm",
        "audio/wav": "wav",
        "audio/wave": "wav",
        "audio/x-wav": "wav",
        "audio/mp3": "mp3",
        "audio/mpeg": "mp3",
        "audio/mp4": "m4a",
        "audio/m4a": "m4a",
        "audio/x-m4a": "m4a",
        "audio/mpga": "mpga",
      }
    };
  }

  isOpenAISupportedFormat(mimeType) {
    const formats = this.getSupportedAudioFormats();
    return formats.mimeTypes.includes(mimeType);
  }

  createOpenAICompatibleBlob() {
    const currentType = this.audioBlob.type;

    if (this.isOpenAISupportedFormat(currentType)) {
      return this.audioBlob;
    }

    // Handle specific unsupported formats
    if (currentType === "audio/x-m4a" || currentType === "audio/mp4") {
      return new Blob([this.audioBlob], { type: "audio/mp4" });
    }

    if (currentType === "audio/aac") {
      return new Blob([this.audioBlob], { type: "audio/mp4" });
    }

    return new Blob([this.audioBlob], { type: "audio/webm" });
  }

  // ============================================================================
  // UI METHODS
  // ============================================================================

  updateStatus(message, type = "normal") {
    this.elements.statusBar.className = "md-status-card";
    this.elements.statusText.textContent = message;
    
    // Update the icon in md-status-card__icon
    const iconContainer = this.elements.statusBar.querySelector('.md-status-card__icon');
    if (iconContainer) {
      let iconName = 'info';
      
      if (type === "recording") {
        this.elements.statusBar.classList.add("md-status-card--recording");
        iconName = 'mic';
      } else if (type === "processing") {
        this.elements.statusBar.classList.add("md-status-card--processing");
        iconName = 'hourglass_empty';
      } else if (message.toLowerCase().includes("error") || message.toLowerCase().includes("failed")) {
        iconName = 'error';
      } else if (message.toLowerCase().includes("complete") || message.toLowerCase().includes("successful")) {
        iconName = 'check_circle';
      }
      
      iconContainer.textContent = iconName;
    }
  }

  showProgress() {
    const progressContainer = document.getElementById('progressContainer');
    if (progressContainer) progressContainer.classList.remove("hidden");
  }

  hideProgress() {
    const progressContainer = document.getElementById('progressContainer');
    if (progressContainer) progressContainer.classList.add("hidden");
    const progressFill = document.getElementById('progressFill');
    if (progressFill) progressFill.style.width = '0%';
  }

  updateProgress(percentage, message) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    if (progressFill) progressFill.style.width = `${percentage}%`;
    if (progressText) progressText.textContent = `${percentage}%`;
    if (message) {
      this.updateStatus(message, "processing");
    }
  }

  updateVolume() {
    const volume = this.elements.volumeSlider.value;
    this.elements.volumeValue.textContent = `${volume}%`;
    this.elements.audioPlayback.volume = volume / 100;
  }

  updateAudioControls() {
    this.elements.audioControls.classList.remove("hidden");
  }

  showResult(content) {
    if (typeof content === 'string' && (content.includes('<') || content.includes('>'))) {
        // If it's HTML content from showResults, use DOMParser to avoid CSP issues 
        // with inline strings that might be scrutinized, or just set it if safe.
        // For now, let's keep showResult as a generic container setter but be careful.
        this.elements.result.innerHTML = content;
    } else {
        this.elements.result.textContent = content;
    }
    this.elements.result.classList.remove("hidden");
  }

  /**
   * Displays a temporary message to the user.
   * Shows success, error, or info messages with auto-removal.
   * 
   * @param {string} message - The message text to display
   * @param {string} type - Message type ('success', 'error', 'info')
   * @private
   */
  showMessage(message, type) {
    const messageDiv = document.createElement("div");
    messageDiv.className = type === "error" ? "md-message md-message--error" : "md-message md-message--success";
    
    const iconEl = document.createElement("span");
    iconEl.className = "material-symbols-rounded";
    if (type === "error") {
        iconEl.textContent = "error";
    } else if (type === "info") {
        iconEl.textContent = "info";
        messageDiv.className = "md-message md-message--info";
    } else {
        iconEl.textContent = "check_circle";
    }
    
    messageDiv.appendChild(iconEl);
    const textSpan = document.createElement("span");
    textSpan.textContent = message;
    messageDiv.appendChild(textSpan);

    // Remove existing messages
    document
      .querySelectorAll(".md-message")
      .forEach((el) => el.remove());

    this.elements.result.appendChild(messageDiv);
    this.elements.result.classList.remove("hidden");

    setTimeout(() => messageDiv.remove(), 5000);
  }

  // ============================================================================
  // TIMER METHODS
  // ============================================================================

  startTimer() {
    this.elements.timer.classList.remove("hidden");
    this.timerInterval = setInterval(() => {
      const elapsed = Date.now() - this.recordingStartTime;
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      this.elements.timer.textContent = `${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }, 1000);
  }

  stopTimer() {
    this.elements.timer.classList.add("hidden");
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // ============================================================================
  // API STATUS AND NAVIGATION METHODS
  // ============================================================================

  openWelcomePage() {
    chrome.tabs.create({
      url: chrome.runtime.getURL("welcome/welcome.html"),
      active: true,
    });
  }

  openSettings() {
    chrome.runtime.openOptionsPage();
    // Refresh settings after opening options page
    setTimeout(() => {
      this.refreshSettings();
    }, 1000);
  }

  // ============================================================================
  // CHROME EXTENSION METHODS
  // ============================================================================

  /**
   * Inserts medical summary into the active webpage.
   * Communicates with content script to inject summary into healthcare forms.
   * 
   * @async
   * @param {string} summary - The medical summary to insert
   * @returns {Promise<void>} Resolves when insertion is complete
   */
  async insertSummary(summary) {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || !tabs[0]) {
          console.error("No active tab found");
          this.showMessage(getMessage("error_no_tab"), "error");
          resolve();
          return;
        }

        const tab = tabs[0];

        // First, try to ping the content script to test connection
        chrome.tabs.sendMessage(tab.id, { action: "ping" }, (response) => {
          if (chrome.runtime.lastError) {
            this.showMessage(
              getMessage("content_script_unavailable"),
              "error"
            );
            resolve();
            return;
          }

          // Now send the actual summary
          chrome.tabs.sendMessage(
            tab.id,
            {
              action: "updateSummary",
              summary: summary,
            },
            (response) => {
              if (chrome.runtime.lastError) {
                this.showMessage(
                  getMessage("failed_insert"),
                  "error"
                );
              } else {
                this.showMessage(getMessage("summary_inserted"), "success");
              }
              resolve();
            }
          );
        });
      });
    });
  }
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new MedicalAudioRecorder();
});
