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
    this.initializeProperties();
    this.initializeElements();
    this.initializeEventListeners();
    this.loadSettings();
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
    this.elements.volumeSlider.addEventListener("input", () =>
      this.updateVolume()
    );
    this.elements.audioPlayback.addEventListener("loadedmetadata", () =>
      this.updateAudioControls()
    );

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
      this.elements.openWelcomePage.style.display = "none";
    } else {
      this.updateStatus(
        "Please grant microphone access to continue",
        "warning"
      );
      this.elements.openWelcomePage.style.display = "block";
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
        `⚠️ ${missingKeys.join(", ")} not configured. Click 'Settings' to add your API keys.`,
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
    this.showMessage("Settings refreshed.", "success");
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
        this.showMessage("OpenAI API key is not configured. Please go to Settings and add your API key.", "error");
      } else if ((result.transcriptionProvider === "gemini" || result.summarizationProvider === "gemini") && result.geminiApiKey === "") {
        this.showMessage("Gemini API key is not configured. Please go to Settings and add your API key.", "error");
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
      let testResults = [];

      // Test OpenAI API key if needed
      if ((transcriptionProvider === "openai" || summarizationProvider === "openai") && this.settings.openaiApiKey) {
        testResults.push("✅ OpenAI API key configured");
      } else if (transcriptionProvider === "openai" || summarizationProvider === "openai") {
        testResults.push("❌ OpenAI API key missing");
      }

      // Test Gemini API key if needed
      if ((transcriptionProvider === "gemini" || summarizationProvider === "gemini") && this.settings.geminiApiKey) {
        testResults.push("✅ Gemini API key configured");
      } else if (transcriptionProvider === "gemini" || summarizationProvider === "gemini") {
        testResults.push("❌ Gemini API key missing");
      }

      const message = testResults.join(" | ");
      const hasErrors = testResults.some(result => result.includes("❌"));
      
      this.showMessage(message, hasErrors ? "error" : "success");
    } catch (error) {
      console.error("Error testing API key:", error);
      this.showMessage("Error testing API key: " + error.message, "error");
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
    // Reset all steps
    [
      this.elements.step1,
      this.elements.step2,
      this.elements.step3,
      this.elements.step4,
    ].forEach((stepEl) => {
      stepEl.className = "step";
    });

    // Mark current and completed steps
    for (let i = 1; i <= 4; i++) {
      const stepEl = this.elements[`step${i}`];
      if (i < step) {
        stepEl.className = "step completed";
      } else if (i === step) {
        stepEl.className = "step active";
        // Update step text if custom text is provided
        if (customText) {
          stepEl.textContent = customText;
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

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: this.getSupportedMimeType(),
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

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => this.onRecordingStop();
    this.mediaRecorder.start(1000); // Collect data every second
  }

  startRecordingUI() {
    this.elements.startRecording.disabled = true;
    this.elements.stopRecording.disabled = false;
    this.elements.clearRecording.disabled = true;
    this.updateStatus("Recording in progress...", "recording");
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
    this.updateStatus("Error: Could not access microphone");
    this.showMessage(
      "Microphone access denied. Please check permissions.",
      "error"
    );
    this.elements.openWelcomePage.style.display = "block";
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
    this.updateStatus("Recording completed");
    this.elements.audioControls.style.display = "block";

    this.createAudioBlob();
    this.setupAudioPlayback();

    if (this.settings.saveRecordings) {
      this.saveRecordingLocally();
    }
  }

  createAudioBlob() {
    this.audioBlob = new Blob(this.audioChunks, {
      type: this.getSupportedMimeType(),
    });
  }

  setupAudioPlayback() {
    const audioUrl = URL.createObjectURL(this.audioBlob);
    this.elements.audioPlayback.src = audioUrl;
    this.elements.audioPlayback.style.display = "block";
  }

  playRecording() {
    if (this.elements.audioPlayback.src) {
      this.elements.audioPlayback.play();
    }
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
    this.elements.audioControls.style.display = "none";
    this.elements.transcriptEditor.style.display = "none";
    this.elements.result.style.display = "none";

    if (this.elements.audioPlayback.src) {
      URL.revokeObjectURL(this.elements.audioPlayback.src);
      this.elements.audioPlayback.src = "";
    }

    this.elements.transcriptTextarea.value = "";
    this.updateStatus("Ready to start recording");
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
      this.showMessage("No audio to transcribe", "error");
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
      this.updateStatus("Transcribing audio...", "processing");
      this.showProgress();
      this.updateStepIndicator(2);
      this.startTranscriptionTimer();

      this.updateProgress(20, "Transcribing audio...");
      const transcription = await this.transcribeAudioOnly();

      if (!transcription) {
        throw new Error("Transcription failed");
      }

      this.endTranscriptionTimer();
      this.transcriptionResult = transcription;
      this.showTranscriptEditor(transcription);
      this.updateStepIndicator(3);

      this.updateProgress(100, "Transcription completed!");
      this.updateStatus("Transcription completed successfully");
      setTimeout(() => this.hideProgress(), 2000);
    } catch (error) {
      this.endTranscriptionTimer();
      this.handleTranscriptionError(error);
    }
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
    this.elements.transcriptEditor.style.display = "block";
    this.elements.summarizeTranscript.disabled = false;
  }

  handleTranscriptionError(error) {
    console.error("Transcription error:", error);

    if (this.settings.enableRetry && this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.updateStatus(
        `Retrying transcription... (${this.retryCount}/${this.maxRetries})`
      );
      setTimeout(() => this.transcribeWithRetry(), 2000);
    } else {
      this.updateStatus("Transcription failed");
      this.showMessage(`Transcription failed: ${error.message}`, "error");
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
          this.showMessage("Transcript copied to clipboard", "success");
        })
        .catch(() => {
          this.showMessage("Failed to copy transcript", "error");
        });
    }
  }

  clearTranscript() {
    this.elements.transcriptTextarea.value = "";
    this.transcriptionResult = null;
    this.elements.transcriptEditor.style.display = "none";
    this.updateStepIndicator(2);
    this.resetTiming();
  }

  async summarizeTranscript() {
    const transcript = this.elements.transcriptTextarea.value.trim();
    if (!transcript) {
      this.showMessage("Please enter or transcribe some text first", "error");
      return;
    }

    try {
      this.updateStatus("Generating medical summary...", "processing");
      this.showProgress();
      this.updateStepIndicator(4);
      this.startSummarizationTimer();

      this.updateProgress(20, "Generating summary...");
      const summary = await this.generateSummary(transcript);

      this.endSummarizationTimer();
      this.updateProgress(90, "Inserting summary...");
      await this.insertSummary(summary);

      this.updateProgress(100, "Complete!");
      this.updateStatus("Summary generated and inserted successfully");
      this.showResults(transcript, summary);
      setTimeout(() => this.hideProgress(), 2000);
    } catch (error) {
      this.endSummarizationTimer();
      console.error("Summarization error:", error);
      this.updateStatus("Summarization failed");
      this.showMessage(`Summarization failed: ${error.message}`, "error");
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
        "OpenAI API key is not configured. Please go to Settings and add your API key."
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
        "Gemini API key is not configured. Please go to Settings and add your API key."
      );
    }

    // Placeholder for Gemini transcription implementation
    // You'll implement the actual Google Cloud Speech-to-Text API call here
    throw new Error("Gemini transcription not yet implemented. Please use OpenAI for now.");
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
        "OpenAI API key is not configured. Please go to Settings and add your API key."
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
        "Gemini API key is not configured. Please go to Settings and add your API key."
      );
    }

    // Placeholder for Gemini summarization implementation
    // You'll implement the actual Gemini API call here
    throw new Error("Gemini summarization not yet implemented. Please use OpenAI for now.");
  }

  showResults(originalTranscription, summary) {
    this.showResult(`
        <strong>Transcription:</strong><br>
        ${originalTranscription}<br><br>
        <strong>Summary:</strong><br>
        ${summary}
      `);
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
    if (!file.type.startsWith("audio/")) {
      this.showMessage("Please select a valid audio file", "error");
      return false;
    }

    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      this.showMessage(
        "File size too large. Please select a file smaller than 25MB",
        "error"
      );
      return false;
    }

    return true;
  }

  setupUploadedFilePlayback(file) {
    const audioUrl = URL.createObjectURL(this.audioBlob);
    this.elements.audioPlayback.src = audioUrl;
    this.elements.audioPlayback.style.display = "block";
  }

  updateUIForUploadedFile(file) {
    this.elements.playRecording.disabled = false;
    this.elements.transcribeAudio.disabled = false;
    this.elements.clearRecording.disabled = false;
    this.elements.audioControls.style.display = "block";

    this.updateStatus(`Audio file uploaded: ${file.name}`);
    this.showMessage(`Successfully uploaded: ${file.name}`, "success");
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
    const types = [
      "audio/webm;codecs=opus", // Most commonly supported
      "audio/webm",
      "audio/mp4", // OpenAI supports m4a
      "audio/mp3", // OpenAI supports mp3
      "audio/wav", // OpenAI supports wav
      "audio/ogg;codecs=opus", // OpenAI supports ogg
      "audio/ogg",
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return "audio/webm"; // fallback
  }

  getFileExtension(mimeType) {
    const extensionMap = {
      "audio/webm;codecs=opus": "webm",
      "audio/webm": "webm",
      "audio/ogg;codecs=opus": "ogg",
      "audio/ogg": "ogg",
      "audio/wav": "wav",
      "audio/mp3": "mp3",
      "audio/mp4": "m4a",
      "audio/mpeg": "mp3",
      "audio/mpga": "mpga",
      "audio/flac": "flac",
      "audio/x-m4a": "m4a", // Handle x-m4a MIME type
      "audio/aac": "m4a", // AAC files should use m4a extension
    };

    return extensionMap[mimeType] || "webm";
  }

  isOpenAISupportedFormat(mimeType) {
    const supportedFormats = [
      "audio/flac",
      "audio/m4a",
      "audio/mp3",
      "audio/mp4",
      "audio/mpeg",
      "audio/mpga",
      "audio/oga",
      "audio/ogg",
      "audio/wav",
      "audio/webm",
      "audio/x-m4a", // Some browsers use this MIME type for m4a files
    ];

    return supportedFormats.includes(mimeType);
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
    this.elements.statusText.textContent = message;
    this.elements.statusBar.className = "status-bar";

    if (type === "recording") {
      this.elements.statusBar.classList.add("recording");
      this.elements.statusText.innerHTML = `<span class="recording-indicator"></span>${message}`;
    } else if (type === "processing") {
      this.elements.statusBar.classList.add("processing");
    }
  }

  showProgress() {
    this.elements.progressBar.style.display = "block";
  }

  hideProgress() {
    this.elements.progressBar.style.display = "none";
    this.elements.progressFill.style.width = "0%";
  }

  updateProgress(percentage, message) {
    this.elements.progressFill.style.width = `${percentage}%`;
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
    this.elements.audioControls.style.display = "block";
  }

  showResult(content) {
    this.elements.result.innerHTML = content;
    this.elements.result.style.display = "block";
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
    messageDiv.className =
      type === "error" ? "error-message" : "success-message";
    messageDiv.textContent = message;

    // Remove existing messages
    document
      .querySelectorAll(".error-message, .success-message")
      .forEach((el) => el.remove());

    this.elements.result.appendChild(messageDiv);
    this.elements.result.style.display = "block";

    setTimeout(() => messageDiv.remove(), 5000);
  }

  // ============================================================================
  // TIMER METHODS
  // ============================================================================

  startTimer() {
    this.elements.timer.style.display = "block";
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
    this.elements.timer.style.display = "none";
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
      url: chrome.runtime.getURL("welcome.html"),
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
          this.showMessage("No active tab found", "error");
          resolve();
          return;
        }

        const tab = tabs[0];

        // First, try to ping the content script to test connection
        chrome.tabs.sendMessage(tab.id, { action: "ping" }, (response) => {
          if (chrome.runtime.lastError) {
            this.showMessage(
              "Content script not available. Please refresh the page and try again.",
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
                  "Failed to insert summary. Please refresh the page and try again.",
                  "error"
                );
              } else {
                this.showMessage("Summary inserted successfully!", "success");
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
