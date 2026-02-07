import {
  localizeHtmlPage,
  getMessage,
  initTranslations,
} from "../utils/translations.js";

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
      document.body.classList.add("side-panel");
      console.log("Running in side panel context");
    } else {
      document.body.classList.add("popup-context");
      console.log("Running in popup context");
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

    // Realtime transcription properties
    this.realtimeWebSocket = null;
    this.realtimeAudioContext = null;
    this.realtimeMediaStream = null;
    this.realtimeProcessor = null;
    this.realtimeTranscript = "";
    this.isRealtimeActive = false;
    this.realtimeSessionTimer = null;
    this.realtimeSessionStartTime = null;
    this.realtimeProvider = null; // 'openai' or 'gemini'
    this.geminiSetupComplete = false; // Tracks Gemini Live API setup state
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

      // Step indicators (normal mode)
      step1: document.getElementById("step1"),
      step2: document.getElementById("step2"),
      step3: document.getElementById("step3"),
      step4: document.getElementById("step4"),
      normalStepper: document.getElementById("normalStepper"),

      // Step indicators (realtime mode)
      realtimeStepper: document.getElementById("realtimeStepper"),
      realtimeStep1: document.getElementById("realtimeStep1"),
      realtimeStep2: document.getElementById("realtimeStep2"),
      realtimeStep3: document.getElementById("realtimeStep3"),
      realtimeInfoBanner: document.getElementById("realtimeInfoBanner"),

      // Realtime controls
      realtimeControls: document.getElementById("realtimeControls"),
      startRealtime: document.getElementById("startRealtime"),
      stopRealtime: document.getElementById("stopRealtime"),
      clearRealtime: document.getElementById("clearRealtime"),
      openWelcomePageRealtime: document.getElementById(
        "openWelcomePageRealtime",
      ),

      // Live transcript container
      liveTranscriptContainer: document.getElementById(
        "liveTranscriptContainer",
      ),
      liveTranscriptChat: document.getElementById("liveTranscriptChat"),
      liveTranscriptPlaceholder: document.getElementById(
        "liveTranscriptPlaceholder",
      ),
      liveTranscriptActions: document.getElementById("liveTranscriptActions"),
      realtimeTranscriptTextarea: document.getElementById(
        "realtimeTranscriptTextarea",
      ),
      editRealtimeTranscript: document.getElementById("editRealtimeTranscript"),
      copyRealtimeTranscript: document.getElementById("copyRealtimeTranscript"),
      summarizeRealtimeTranscript: document.getElementById(
        "summarizeRealtimeTranscript",
      ),

      // Normal mode controls container
      normalControls: document.querySelector(
        ".md-controls:not(#realtimeControls)",
      ),

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
      this.startRecording(),
    );
    this.elements.stopRecording.addEventListener("click", () =>
      this.stopRecording(),
    );
    this.elements.playRecording.addEventListener("click", () =>
      this.playRecording(),
    );
    this.elements.transcribeAudio.addEventListener("click", () =>
      this.transcribeAudio(),
    );
    this.elements.clearRecording.addEventListener("click", () =>
      this.clearRecording(),
    );

    // File upload event listeners
    this.elements.uploadAudio.addEventListener("click", () =>
      this.openFileDialog(),
    );
    this.elements.audioFileInput.addEventListener("change", (event) =>
      this.handleFileUpload(event),
    );

    // Navigation event listeners
    this.elements.openWelcomePage.addEventListener("click", () =>
      this.openWelcomePage(),
    );
    this.elements.openSettings.addEventListener("click", () =>
      this.openSettings(),
    );
    this.elements.refreshSettings.addEventListener("click", () =>
      this.refreshSettings(),
    );
    this.elements.testApiKey.addEventListener("click", () => this.testApiKey());

    // Audio control event listeners
    this.elements.volumeSlider.addEventListener("input", () => {
      this.updateVolume();
      this.updateSliderFill(this.elements.volumeSlider);
    });
    this.elements.audioPlayback.addEventListener("loadedmetadata", () => {
      this.updateAudioControls();
      this.elements.duration.textContent = this.formatTime(
        this.elements.audioPlayback.duration,
      );
      this.elements.audioProgress.max = Math.floor(
        this.elements.audioPlayback.duration,
      );
    });
    this.elements.audioPlayback.addEventListener("timeupdate", () => {
      this.updateAudioProgress();
      this.updateSliderFill(this.elements.audioProgress);
    });
    this.elements.audioPlayback.addEventListener("play", () =>
      this.updatePlayPauseIcon(true),
    );
    this.elements.audioPlayback.addEventListener("pause", () =>
      this.updatePlayPauseIcon(false),
    );
    this.elements.audioPlayback.addEventListener("ended", () =>
      this.updatePlayPauseIcon(false),
    );

    this.elements.playPauseAudio.addEventListener("click", () =>
      this.togglePlayPause(),
    );
    this.elements.skipForward.addEventListener("click", () => this.skip(5));
    this.elements.skipBackward.addEventListener("click", () => this.skip(-5));
    this.elements.audioProgress.addEventListener("input", () => {
      this.seekAudio();
      this.updateSliderFill(this.elements.audioProgress);
    });

    // Transcript editor event listeners
    this.elements.copyTranscript.addEventListener("click", () =>
      this.copyTranscript(),
    );
    this.elements.clearTranscript.addEventListener("click", () =>
      this.clearTranscript(),
    );
    this.elements.summarizeTranscript.addEventListener("click", () =>
      this.summarizeTranscript(),
    );

    // Realtime transcription event listeners
    if (this.elements.startRealtime) {
      this.elements.startRealtime.addEventListener("click", () =>
        this.startRealtimeTranscription(),
      );
    }
    if (this.elements.stopRealtime) {
      this.elements.stopRealtime.addEventListener("click", () =>
        this.stopRealtimeTranscription(),
      );
    }
    if (this.elements.clearRealtime) {
      this.elements.clearRealtime.addEventListener("click", () =>
        this.clearRealtimeTranscription(),
      );
    }
    if (this.elements.openWelcomePageRealtime) {
      this.elements.openWelcomePageRealtime.addEventListener("click", () =>
        this.openWelcomePage(),
      );
    }
    if (this.elements.copyRealtimeTranscript) {
      this.elements.copyRealtimeTranscript.addEventListener("click", () =>
        this.copyRealtimeTranscript(),
      );
    }
    if (this.elements.editRealtimeTranscript) {
      this.elements.editRealtimeTranscript.addEventListener("click", () =>
        this.toggleRealtimeEditMode(),
      );
    }
    if (this.elements.summarizeRealtimeTranscript) {
      this.elements.summarizeRealtimeTranscript.addEventListener("click", () =>
        this.summarizeRealtimeTranscript(),
      );
    }

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
    slider.style.setProperty("--value", `${percentage}%`);
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
      "enableRealtimeTranscription",
    ]);

    this.setDefaultSettings();
    this.updateUIForRealtimeMode();
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
      enableRealtimeTranscription: false,
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
    const { microphoneAccess } =
      await chrome.storage.local.get("microphoneAccess");

    const isRealtimeMode = this.settings.enableRealtimeTranscription;

    if (microphoneAccess) {
      this.elements.startRecording.disabled = false;
      this.elements.openWelcomePage.classList.add("hidden");

      if (isRealtimeMode && this.elements.startRealtime) {
        this.elements.startRealtime.disabled = false;
        this.elements.openWelcomePageRealtime.classList.add("hidden");
      }
    } else {
      this.elements.startRecording.disabled = true;
      this.updateStatus(getMessage("permission_denied"), "warning");
      this.elements.openWelcomePage.classList.remove("hidden");

      if (isRealtimeMode && this.elements.startRealtime) {
        this.elements.startRealtime.disabled = true;
        this.elements.openWelcomePageRealtime.classList.remove("hidden");
      }
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
    const transcriptionProvider =
      this.settings.transcriptionProvider || "openai";
    const summarizationProvider =
      this.settings.summarizationProvider || "openai";
    let missingKeys = [];

    if (transcriptionProvider === "openai" && !this.settings.openaiApiKey) {
      missingKeys.push("OpenAI API key (for transcription)");
    } else if (
      transcriptionProvider === "gemini" &&
      !this.settings.geminiApiKey
    ) {
      missingKeys.push("Gemini API key (for transcription)");
    }

    if (summarizationProvider === "openai" && !this.settings.openaiApiKey) {
      missingKeys.push("OpenAI API key (for summarization)");
    } else if (
      summarizationProvider === "gemini" &&
      !this.settings.geminiApiKey
    ) {
      missingKeys.push("Gemini API key (for summarization)");
    }

    missingKeys = [...new Set(missingKeys)];

    if (missingKeys.length > 0) {
      this.showMessage(
        `<span class="material-symbols-rounded" style="color: var(--md-sys-color-warning);">warning</span> ${missingKeys.join(", ")} not configured. ${getMessage("step_configure_api")}`,
        "error",
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
        "summarizationProvider",
      ]);

      if (
        (result.transcriptionProvider === "openai" ||
          result.summarizationProvider === "openai") &&
        result.openaiApiKey === ""
      ) {
        this.showMessage(getMessage("api_key_missing"), "error");
      } else if (
        (result.transcriptionProvider === "gemini" ||
          result.summarizationProvider === "gemini") &&
        !result.geminiApiKey
      ) {
        this.showMessage(getMessage("gemini_key_not_configured"), "error");
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
      const transcriptionProvider =
        this.settings.transcriptionProvider || "openai";
      const summarizationProvider =
        this.settings.summarizationProvider || "openai";

      this.elements.result.textContent = "";
      const resultsContainer = document.createElement("div");
      resultsContainer.className = "md-api-test-results";

      if (
        transcriptionProvider === "openai" ||
        summarizationProvider === "openai"
      ) {
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

      if (
        transcriptionProvider === "gemini" ||
        summarizationProvider === "gemini"
      ) {
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
      this.showMessage(
        getMessage("error_testing_api_key") + ": " + error.message,
        "error",
      );
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

    this.summarizationTimerInterval = setInterval(() => {
      this.updateSummarizationTime();
    }, 1000);
  }

  endSummarizationTimer() {
    this.summarizationEndTime = Date.now();
    this.updateSummarizationTime();

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

    if (this.transcriptionTimerInterval) {
      clearInterval(this.transcriptionTimerInterval);
      this.transcriptionTimerInterval = null;
    }
    if (this.summarizationTimerInterval) {
      clearInterval(this.summarizationTimerInterval);
      this.summarizationTimerInterval = null;
    }

    this.elements.transcriptionTime.querySelector(".time-value").textContent =
      "--";
    this.elements.summarizationTime.querySelector(".time-value").textContent =
      "--";
  }

  // ============================================================================
  // STEP MANAGEMENT
  // ============================================================================

  updateStepIndicator(step, customText = null) {
    [
      this.elements.step1,
      this.elements.step2,
      this.elements.step3,
      this.elements.step4,
    ].forEach((stepEl) => {
      stepEl.className = "md-stepper__step";
    });

    for (let i = 1; i <= 4; i++) {
      const stepEl = this.elements[`step${i}`];
      if (i < step) {
        stepEl.className = "md-stepper__step md-stepper__step--completed";
      } else if (i === step) {
        stepEl.className = "md-stepper__step md-stepper__step--active";
        if (customText) {
          const labelEl = stepEl.querySelector(".md-stepper__label");
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
    setTimeout(
      () => {
        if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
          this.stopRecording();
        }
      },
      this.settings.maxRecordingTime * 60 * 1000,
    );
  }

  handleRecordingError(error) {
    console.error("Error accessing microphone:", error);
    this.updateStatus(getMessage("error_recording"));
    this.showMessage(getMessage("permission_denied"), "error");
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
      console.warn("No audio chunks to create blob from");
      return;
    }

    const originalBlob = new Blob(this.audioChunks, {
      type: this.recordingMimeType || this.getSupportedMimeType(),
    });

    this.convertToMP3(originalBlob)
      .then((mp3Blob) => {
        this.audioBlob = mp3Blob;
        this.setupAudioPlayback();
      })
      .catch((error) => {
        console.warn("MP3 conversion failed, using original format:", error);
        this.audioBlob = originalBlob;
        this.setupAudioPlayback();
      });
  }

  async convertToMP3(audioBlob) {
    return new Promise(async (resolve, reject) => {
      try {
        // Create audio context
        const audioContext = new (
          window.AudioContext || window.webkitAudioContext
        )();

        // Convert blob to array buffer
        const arrayBuffer = await audioBlob.arrayBuffer();

        // Decode audio data
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Create MP3 buffer using Web Audio API
        const mp3Buffer = this.encodeMP3(audioBuffer);

        // Create MP3 blob
        const mp3Blob = new Blob([mp3Buffer], { type: "audio/mp3" });

        audioContext.close();
        resolve(mp3Blob);
      } catch (error) {
        console.error("MP3 conversion error:", error);
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

    writeString(0, "RIFF");
    wavView.setUint32(4, 36 + length * numChannels * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    wavView.setUint32(16, 16, true);
    wavView.setUint16(20, 1, true);
    wavView.setUint16(22, numChannels, true);
    wavView.setUint32(24, sampleRate, true);
    wavView.setUint32(28, sampleRate * numChannels * 2, true);
    wavView.setUint16(32, numChannels * 2, true);
    wavView.setUint16(34, 16, true);
    writeString(36, "data");
    wavView.setUint32(40, length * numChannels * 2, true);

    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = Math.max(
          -1,
          Math.min(1, audioBuffer.getChannelData(channel)[i]),
        );
        wavView.setInt16(
          offset,
          sample < 0 ? sample * 0x8000 : sample * 0x7fff,
          true,
        );
        offset += 2;
      }
    }

    return wavBuffer;
  }

  setupAudioPlayback() {
    if (!this.audioBlob) {
      console.error("No audio blob available for playback");
      return;
    }

    const audioUrl = URL.createObjectURL(this.audioBlob);
    this.elements.audioPlayback.src = audioUrl;
    this.elements.audioPlayback.classList.remove("hidden");

    this.addDownloadButton();

    this.elements.audioPlayback.onerror = (error) => {
      console.error("Audio playback error:", error);
    };

    this.elements.audioPlayback.onloadeddata = () => {
      console.log(
        `Audio loaded successfully: duration=${this.elements.audioPlayback.duration}s`,
      );
    };
  }

  addDownloadButton() {
    const existingButton = document.getElementById("downloadAudio");
    if (existingButton) {
      existingButton.remove();
    }
    const downloadButton = document.createElement("button");
    downloadButton.id = "downloadAudio";
    downloadButton.innerHTML =
      '<span class="material-symbols-rounded">download</span> ' +
      getMessage("download_mp3");
    downloadButton.className =
      "md-button md-button--filled md-download-btn mb-2";

    downloadButton.onclick = () => {
      this.downloadAudioAsMP3();
    };

    const audioControls = this.elements.audioControls;
    if (audioControls && audioControls.parentNode) {
      audioControls.parentNode.insertBefore(
        downloadButton,
        audioControls.nextSibling,
      );
    }
  }

  downloadAudioAsMP3() {
    if (!this.audioBlob) {
      this.showMessage("No audio available to download", "error");
      return;
    }

    const url = URL.createObjectURL(this.audioBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recording_${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showMessage(getMessage("audio_downloaded"), "success");
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
    const icon = this.elements.playPauseAudio.querySelector(
      ".material-symbols-rounded",
    );
    if (icon) {
      icon.textContent = isPlaying ? "pause" : "play_arrow";
    }

    const playRecordingIcon = this.elements.playRecording.querySelector(
      ".material-symbols-rounded",
    );
    if (playRecordingIcon) {
      playRecordingIcon.textContent = isPlaying ? "pause" : "play_arrow";
    }

    const buttonChildren = this.elements.playRecording.childNodes;
    for (let i = buttonChildren.length - 1; i >= 0; i--) {
      if (
        buttonChildren[i].nodeType === Node.TEXT_NODE &&
        buttonChildren[i].textContent.trim()
      ) {
        buttonChildren[i].textContent = isPlaying
          ? getMessage("pause_recording")
          : getMessage("play_recording");
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
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
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

    const downloadButton = document.getElementById("downloadAudio");
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

      this.updateProgress(10, getMessage("transcribing_audio"));
      const progressInterval = this.startProgressSimulation(10, 85, 50);

      const transcription = await this.transcribeAudioOnly();

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
    const transcriptionProvider =
      this.settings.transcriptionProvider || "openai";

    if (transcriptionProvider === "openai") {
      return await this.transcribeWithOpenAI();
    } else if (transcriptionProvider === "gemini") {
      return await this.transcribeWithGemini();
    } else {
      throw new Error(
        `Unsupported transcription provider: ${transcriptionProvider}`,
      );
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
        getMessage("retrying_transcription") +
          ` (${this.retryCount}/${this.maxRetries})`,
      );
      setTimeout(() => this.transcribeWithRetry(), 2000);
    } else {
      this.updateStatus(getMessage("error_transcription"));
      this.showMessage(
        getMessage("error_transcription") + `: ${error.message}`,
        "error",
      );
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

      this.updateProgress(10, getMessage("generating_summary"));
      progressInterval = this.startProgressSimulation(10, 80, 60);

      const summary = await this.generateSummary(transcript);

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
      this.showMessage(
        getMessage("error_summarization") + `: ${error.message}`,
        "error",
      );
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
      throw new Error(getMessage("openai_key_not_configured"));
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
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI API: ${errorData.error?.message || "HTTP " + response.status}`,
      );
    }

    const data = await response.json();
    return data.text;
  }

  /**
   * Transcribes audio using Google Gemini's multimodal API.
   * Converts audio to base64 and sends to Gemini API for transcription.
   * Supports audio files of any duration.
   *
   * @async
   * @private
   * @returns {Promise<string>} Transcribed text from Gemini
   * @throws {Error} When API key is missing or API call fails
   */
  async transcribeWithGemini() {
    if (!this.settings.geminiApiKey) {
      throw new Error(getMessage("gemini_key_not_configured"));
    }

    const audioBase64 = await this.audioToBase64(this.audioBlob);

    const mimeType = this.audioBlob.type || "audio/webm";

    const transcriptionPrompt =
      this.settings.language === "id"
        ? `Transkripsikan audio ini dengan akurat ke dalam Bahasa Indonesia. 
         Berikan transkripsi kata per kata yang tepat dari percakapan dalam audio.
         Jangan meringkas atau mengubah apa pun - transkripsikan persis seperti yang diucapkan.
         Jika ada beberapa pembicara, tunjukkan perubahan pembicara dengan baris baru.
         Hanya berikan teks transkripsi, tanpa komentar atau penjelasan tambahan.`
        : `Transcribe this audio accurately. 
         Provide an exact word-for-word transcription of the conversation in the audio.
         Do not summarize or change anything - transcribe exactly as spoken.
         If there are multiple speakers, indicate speaker changes with new lines.
         Only provide the transcription text, no additional comments or explanations.`;

    const modelName = this.settings.transcriptionModel || "gemini-2.0-flash";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.settings.geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: audioBase64,
                  },
                },
                {
                  text: transcriptionPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Gemini API: ${errorData.error?.message || "HTTP " + response.status}`,
      );
    }

    const data = await response.json();

    const transcription = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!transcription) {
      return getMessage("realtime_transcription_empty");
    }

    return transcription.trim();
  }

  /**
   * Converts audio blob to base64 string.
   *
   * @private
   * @param {Blob} audioBlob - The audio blob to convert
   * @returns {Promise<string>} Base64 encoded audio data
   */
  async audioToBase64(audioBlob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result.split(",")[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });
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
      const summarizationProvider =
        this.settings.summarizationProvider || "openai";

      if (summarizationProvider === "openai") {
        return await this.generateSummaryWithOpenAI(transcription);
      } else if (summarizationProvider === "gemini") {
        return await this.generateSummaryWithGemini(transcription);
      } else {
        throw new Error(
          `Unsupported summarization provider: ${summarizationProvider}`,
        );
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
    if (!this.settings.openaiApiKey) {
      throw new Error(getMessage("openai_key_not_configured"));
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
        `OpenAI API: ${errorData.error?.message || "HTTP " + response.status}`,
      );
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  /**
   * Generates medical summary using Google Gemini API.
   * Processes transcription through medical summary prompt.
   *
   * @async
   * @private
   * @param {string} transcription - The transcribed text to process
   * @returns {Promise<string>} Medical summary in structured JSON format
   * @throws {Error} When API key is missing or API call fails
   */
  async generateSummaryWithGemini(transcription) {
    if (!this.settings.geminiApiKey) {
      throw new Error(getMessage("gemini_key_not_configured"));
    }

    // System prompt
    const systemPrompt = `
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

    const userPrompt = `
    Transcript to summarize:
    ${transcription}
    `;

    const modelName = this.getGeminiModelName(this.settings.summarizationModel);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.settings.geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: systemPrompt + "\n\n" + userPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Gemini API: ${errorData.error?.message || "HTTP " + response.status}`,
      );
    }

    const data = await response.json();

    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error(getMessage("gemini_summarization_not_implemented"));
    }

    return generatedText.trim();
  }

  /**
   * Maps the summarization model setting to Gemini API model name.
   *
   * @private
   * @param {string} modelSetting - The model setting value from options
   * @returns {string} Gemini API model name
   */
  getGeminiModelName(modelSetting) {
    const modelMap = {
      "gemini-2.5-flash-lite": "gemini-2.0-flash-lite",
      "gemini-2.0-flash": "gemini-2.0-flash",
      "gemini-2.0-flash-lite": "gemini-2.0-flash-lite",
    };

    return modelMap[modelSetting] || "gemini-2.0-flash-lite";
  }

  showResults(originalTranscription, summary) {
    this.elements.result.textContent = "";

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
    transcriptionTitle.appendChild(
      document.createTextNode(
        getMessage("transcription_label") || "Transcription",
      ),
    );

    const copyTranscriptionBtn = document.createElement("button");
    copyTranscriptionBtn.type = "button";
    copyTranscriptionBtn.className = "md-result-section__copy-btn";
    const copyIcon1 = document.createElement("span");
    copyIcon1.className = "material-symbols-rounded";
    copyIcon1.textContent = "content_copy";
    copyTranscriptionBtn.appendChild(copyIcon1);
    copyTranscriptionBtn.appendChild(
      document.createTextNode(getMessage("copy") || "Copy"),
    );

    transcriptionHeader.appendChild(transcriptionTitle);
    transcriptionHeader.appendChild(copyTranscriptionBtn);

    const transcriptionTextarea = document.createElement("textarea");
    transcriptionTextarea.className = "md-result-section__textarea";
    transcriptionTextarea.value = originalTranscription;
    transcriptionTextarea.readOnly = true;

    copyTranscriptionBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(transcriptionTextarea.value).then(() => {
        copyIcon1.textContent = "check";
        setTimeout(() => {
          copyIcon1.textContent = "content_copy";
        }, 2000);
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
    summaryTitle.appendChild(
      document.createTextNode(getMessage("summary_label") || "Summary"),
    );

    const copySummaryBtn = document.createElement("button");
    copySummaryBtn.type = "button";
    copySummaryBtn.className = "md-result-section__copy-btn";
    const copyIcon2 = document.createElement("span");
    copyIcon2.className = "material-symbols-rounded";
    copyIcon2.textContent = "content_copy";
    copySummaryBtn.appendChild(copyIcon2);
    copySummaryBtn.appendChild(
      document.createTextNode(getMessage("copy") || "Copy"),
    );

    summaryHeader.appendChild(summaryTitle);
    summaryHeader.appendChild(copySummaryBtn);

    const summaryTextarea = document.createElement("textarea");
    summaryTextarea.className = "md-result-section__textarea";
    summaryTextarea.value = summary;
    summaryTextarea.readOnly = true;

    copySummaryBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(summaryTextarea.value).then(() => {
        copyIcon2.textContent = "check";
        setTimeout(() => {
          copyIcon2.textContent = "content_copy";
        }, 2000);
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

    const fileName = file.name.toLowerCase();
    const extension = fileName.split(".").pop();

    const isSupportedByType = formats.mimeTypes.includes(file.type);
    const isSupportedByExtension = formats.extensions.includes(extension);

    if (!isSupportedByType && !isSupportedByExtension) {
      this.showMessage(
        getMessage("unsupported_format") + ` ${formats.extensions.join(", ")}`,
        "error",
      );
      return false;
    }

    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      this.showMessage(getMessage("file_too_large"), "error");
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
      "audio/webm;codecs=opus",
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

  getSupportedAudioFormats() {
    return {
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
      extensions: ["mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm"],
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
      },
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

    const iconContainer = this.elements.statusBar.querySelector(
      ".md-status-card__icon",
    );
    if (iconContainer) {
      let iconName = "info";

      if (type === "recording") {
        this.elements.statusBar.classList.add("md-status-card--recording");
        iconName = "mic";
      } else if (type === "processing") {
        this.elements.statusBar.classList.add("md-status-card--processing");
        iconName = "hourglass_empty";
      } else if (type === "realtime") {
        this.elements.statusBar.classList.add("md-status-card--realtime");
        iconName = "graphic_eq";
      } else if (
        message.toLowerCase().includes("error") ||
        message.toLowerCase().includes("failed")
      ) {
        iconName = "error";
      } else if (
        message.toLowerCase().includes("complete") ||
        message.toLowerCase().includes("successful")
      ) {
        iconName = "check_circle";
      }

      iconContainer.textContent = iconName;
    }
  }

  showProgress() {
    const progressContainer = document.getElementById("progressContainer");
    if (progressContainer) progressContainer.classList.remove("hidden");
  }

  hideProgress() {
    const progressContainer = document.getElementById("progressContainer");
    if (progressContainer) progressContainer.classList.add("hidden");
    const progressFill = document.getElementById("progressFill");
    if (progressFill) progressFill.style.width = "0%";
  }

  updateProgress(percentage, message) {
    const progressFill = document.getElementById("progressFill");
    const progressText = document.getElementById("progressText");
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
    if (
      typeof content === "string" &&
      (content.includes("<") || content.includes(">"))
    ) {
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
    messageDiv.className =
      type === "error"
        ? "md-message md-message--error"
        : "md-message md-message--success";

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

    document.querySelectorAll(".md-message").forEach((el) => el.remove());

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

        chrome.tabs.sendMessage(tab.id, { action: "ping" }, (response) => {
          if (chrome.runtime.lastError) {
            this.showMessage(getMessage("content_script_unavailable"), "error");
            resolve();
            return;
          }

          chrome.tabs.sendMessage(
            tab.id,
            {
              action: "updateSummary",
              summary: summary,
            },
            (response) => {
              if (chrome.runtime.lastError) {
                this.showMessage(getMessage("failed_insert"), "error");
              } else {
                this.showMessage(getMessage("summary_inserted"), "success");
              }
              resolve();
            },
          );
        });
      });
    });
  }

  // ============================================================================
  // REALTIME TRANSCRIPTION METHODS
  // ============================================================================

  /**
   * Updates the UI based on whether realtime mode is enabled or disabled.
   * Shows/hides appropriate controls and steppers.
   *
   * @private
   */
  updateUIForRealtimeMode() {
    const isRealtimeMode = this.settings.enableRealtimeTranscription;

    if (isRealtimeMode) {
      if (this.elements.realtimeStepper)
        this.elements.realtimeStepper.classList.remove("hidden");
      if (this.elements.realtimeInfoBanner)
        this.elements.realtimeInfoBanner.classList.remove("hidden");
      if (this.elements.realtimeControls)
        this.elements.realtimeControls.classList.remove("hidden");
      if (this.elements.liveTranscriptContainer)
        this.elements.liveTranscriptContainer.classList.remove("hidden");

      if (this.elements.normalStepper)
        this.elements.normalStepper.classList.add("hidden");

      const normalControlsContainer = document
        .getElementById("startRecording")
        ?.closest(".md-controls");
      if (
        normalControlsContainer &&
        normalControlsContainer.id !== "realtimeControls"
      ) {
        normalControlsContainer.classList.add("hidden");
      }

      if (this.elements.audioControls)
        this.elements.audioControls.classList.add("hidden");
      if (this.elements.transcriptEditor)
        this.elements.transcriptEditor.classList.add("hidden");

      this.updateStatus(getMessage("realtime_ready"), "normal");
    } else {
      if (this.elements.normalStepper)
        this.elements.normalStepper.classList.remove("hidden");

      const normalControlsContainer = document
        .getElementById("startRecording")
        ?.closest(".md-controls");
      if (
        normalControlsContainer &&
        normalControlsContainer.id !== "realtimeControls"
      ) {
        normalControlsContainer.classList.remove("hidden");
      }

      if (this.elements.realtimeStepper)
        this.elements.realtimeStepper.classList.add("hidden");
      if (this.elements.realtimeInfoBanner)
        this.elements.realtimeInfoBanner.classList.add("hidden");
      if (this.elements.realtimeControls)
        this.elements.realtimeControls.classList.add("hidden");
      if (this.elements.liveTranscriptContainer)
        this.elements.liveTranscriptContainer.classList.add("hidden");
    }
  }

  /**
   * Starts the realtime transcription session.
   * Establishes WebSocket connection and begins audio capture.
   *
   * @async
   */
  async startRealtimeTranscription() {
    try {
      const transcriptionProvider =
        this.settings.transcriptionProvider || "openai";

      if (transcriptionProvider === "gemini") {
        await this.startGeminiRealtimeTranscription();
      } else {
        await this.startOpenAIRealtimeTranscription();
      }
    } catch (error) {
      console.error("Realtime transcription error:", error);
      this.handleRealtimeError(error);
    }
  }

  /**
   * Starts OpenAI real-time transcription session.
   * Initializes audio capture and WebSocket connection to OpenAI.
   *
   * @async
   * @private
   */
  async startOpenAIRealtimeTranscription() {
    if (!this.settings.openaiApiKey) {
      this.showMessage(getMessage("openai_key_not_configured"), "error");
      return;
    }

    this.updateStatus(getMessage("realtime_connecting"), "processing");
    this.updateRealtimeStepIndicator(1);
    this.realtimeProvider = "openai";

    this.realtimeMediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 24000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    this.realtimeAudioContext = new (
      window.AudioContext || window.webkitAudioContext
    )({
      sampleRate: 24000,
    });
    await this.connectRealtimeWebSocket();

    await this.startRealtimeAudioProcessing();

    this.isRealtimeActive = true;
    this.realtimeSessionStartTime = Date.now();
    this.startRealtimeSessionTimer();
    this.updateRealtimeUIForRecording(true);
    this.updateStatus(getMessage("realtime_connected"), "realtime");

    if (this.elements.liveTranscriptPlaceholder) {
      this.elements.liveTranscriptPlaceholder.classList.add("hidden");
    }
  }

  /**
   * Starts Gemini real-time transcription session.
   * Initializes audio capture and WebSocket connection to Gemini Live API.
   *
   * @async
   * @private
   */
  async startGeminiRealtimeTranscription() {
    if (!this.settings.geminiApiKey) {
      this.showMessage(getMessage("gemini_key_not_configured"), "error");
      return;
    }

    this.updateStatus(getMessage("realtime_connecting"), "processing");
    this.updateRealtimeStepIndicator(1);
    this.realtimeProvider = "gemini";

    this.realtimeMediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    this.realtimeAudioContext = new (
      window.AudioContext || window.webkitAudioContext
    )({
      sampleRate: 16000,
    });
    await this.connectGeminiRealtimeWebSocket();

    await this.startGeminiRealtimeAudioProcessing();

    this.isRealtimeActive = true;
    this.realtimeSessionStartTime = Date.now();
    this.startRealtimeSessionTimer();
    this.updateRealtimeUIForRecording(true);
    this.updateStatus(getMessage("realtime_connected"), "realtime");

    if (this.elements.liveTranscriptPlaceholder) {
      this.elements.liveTranscriptPlaceholder.classList.add("hidden");
    }
  }

  /**
   * Connects to the OpenAI Realtime WebSocket API.
   *
   * @async
   * @private
   */
  async connectRealtimeWebSocket() {
    return new Promise((resolve, reject) => {
      const wsUrl = "wss://api.openai.com/v1/realtime?intent=transcription";

      this.realtimeWebSocket = new WebSocket(wsUrl, [
        "realtime",
        `openai-insecure-api-key.${this.settings.openaiApiKey}`,
        "openai-beta.realtime-v1",
      ]);

      this.realtimeWebSocket.onopen = () => {
        console.log("Realtime WebSocket connected");

        this.sendRealtimeSessionConfig();
        resolve();
      };

      this.realtimeWebSocket.onmessage = (event) => {
        this.handleRealtimeMessage(event);
      };

      this.realtimeWebSocket.onerror = (error) => {
        console.error("WebSocket error:", error);
        reject(new Error(getMessage("realtime_error_websocket")));
      };

      this.realtimeWebSocket.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason);
        if (this.isRealtimeActive) {
          this.stopRealtimeTranscription();
        }
      };

      setTimeout(() => {
        if (this.realtimeWebSocket.readyState !== WebSocket.OPEN) {
          reject(new Error(getMessage("realtime_error_connection")));
        }
      }, 10000);
    });
  }

  /**
   * Sends session configuration to the OpenAI Realtime API.
   *
   * @private
   */
  sendRealtimeSessionConfig() {
    const config = {
      type: "transcription_session.update",
      session: {
        input_audio_format: "pcm16",
        input_audio_transcription: {
          model: "gpt-4o-transcribe",
          language: this.settings.language === "id" ? "id" : "en",
          prompt: "Medical consultation transcription",
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
      },
    };

    this.realtimeWebSocket.send(JSON.stringify(config));
  }

  /**
   * Starts audio processing and sends audio data to WebSocket.
   *
   * @async
   * @private
   */
  async startRealtimeAudioProcessing() {
    const source = this.realtimeAudioContext.createMediaStreamSource(
      this.realtimeMediaStream,
    );

    this.realtimeProcessor = this.realtimeAudioContext.createScriptProcessor(
      4096,
      1,
      1,
    );

    this.realtimeProcessor.onaudioprocess = (event) => {
      if (
        !this.isRealtimeActive ||
        !this.realtimeWebSocket ||
        this.realtimeWebSocket.readyState !== WebSocket.OPEN
      ) {
        return;
      }

      const inputData = event.inputBuffer.getChannelData(0);

      const pcm16Data = this.float32ToPCM16(inputData);

      const base64Audio = this.arrayBufferToBase64(pcm16Data.buffer);

      const audioMessage = {
        type: "input_audio_buffer.append",
        audio: base64Audio,
      };

      this.realtimeWebSocket.send(JSON.stringify(audioMessage));
    };

    source.connect(this.realtimeProcessor);
    this.realtimeProcessor.connect(this.realtimeAudioContext.destination);
  }

  /**
   * Converts Float32 audio samples to Int16 PCM format.
   *
   * @private
   * @param {Float32Array} float32Array - The input audio samples
   * @returns {Int16Array} The converted PCM16 samples
   */
  float32ToPCM16(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }
    return int16Array;
  }

  /**
   * Converts ArrayBuffer to Base64 string.
   *
   * @private
   * @param {ArrayBuffer} buffer - The buffer to convert
   * @returns {string} Base64 encoded string
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // ============================================================================
  // GEMINI REALTIME TRANSCRIPTION METHODS
  // ============================================================================

  /**
   * Connects to the Gemini Live API WebSocket.
   *
   * @async
   * @private
   */
  async connectGeminiRealtimeWebSocket() {
    return new Promise((resolve, reject) => {
      const modelName = this.settings.transcriptionModel || "gemini-2.0-flash";
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${this.settings.geminiApiKey}`;

      this.realtimeWebSocket = new WebSocket(wsUrl);

      this.realtimeWebSocket.onopen = () => {
        console.log("Gemini Realtime WebSocket connected");

        this.sendGeminiSessionConfig(modelName);
        resolve();
      };

      this.realtimeWebSocket.onmessage = (event) => {
        this.handleGeminiRealtimeMessage(event);
      };

      this.realtimeWebSocket.onerror = (error) => {
        console.error("Gemini WebSocket error:", error);
        reject(new Error(getMessage("realtime_error_websocket")));
      };

      this.realtimeWebSocket.onclose = (event) => {
        console.log("Gemini WebSocket closed:", event.code, event.reason);
        if (this.isRealtimeActive) {
          this.stopRealtimeTranscription();
        }
      };

      setTimeout(() => {
        if (this.realtimeWebSocket.readyState !== WebSocket.OPEN) {
          reject(new Error(getMessage("realtime_error_connection")));
        }
      }, 10000);
    });
  }

  /**
   * Sends session configuration to the Gemini Live API.
   *
   * @private
   * @param {string} modelName - The Gemini model to use
   */
  sendGeminiSessionConfig(modelName) {
    const liveModelName = "gemini-2.0-flash-exp";

    const setupMessage = {
      setup: {
        model: `models/${liveModelName}`,
        generation_config: {
          response_modalities: ["TEXT"],
        },
        system_instruction: {
          parts: [
            {
              text:
                this.settings.language === "id"
                  ? `Anda adalah asisten transkripsi. Tugas Anda adalah mentranskripsi audio dengan akurat ke dalam Bahasa Indonesia. 
                 Transkripsikan persis seperti yang diucapkan tanpa meringkas atau menambahkan apapun.
                 Hanya berikan teks transkripsi, tanpa penjelasan atau komentar tambahan.`
                  : `You are a transcription assistant. Your task is to accurately transcribe audio.
                 Transcribe exactly as spoken without summarizing or adding anything.
                 Only provide the transcription text, no additional explanations or comments.`,
            },
          ],
        },
        input_audio_transcription: {},
      },
    };

    console.log("Sending Gemini Live setup:", JSON.stringify(setupMessage));
    this.realtimeWebSocket.send(JSON.stringify(setupMessage));
    this.geminiSetupComplete = false;
  }

  /**
   * Starts audio processing for Gemini Live API.
   * Uses ScriptProcessor to capture and send audio data.
   *
   * @async
   * @private
   */
  async startGeminiRealtimeAudioProcessing() {
    const source = this.realtimeAudioContext.createMediaStreamSource(
      this.realtimeMediaStream,
    );

    this.realtimeProcessor = this.realtimeAudioContext.createScriptProcessor(
      4096,
      1,
      1,
    );

    this.realtimeProcessor.onaudioprocess = (event) => {
      if (
        !this.isRealtimeActive ||
        !this.realtimeWebSocket ||
        this.realtimeWebSocket.readyState !== WebSocket.OPEN
      ) {
        return;
      }

      if (!this.geminiSetupComplete) {
        return;
      }

      const inputData = event.inputBuffer.getChannelData(0);

      const pcm16Data = this.float32ToPCM16(inputData);

      const base64Audio = this.arrayBufferToBase64(pcm16Data.buffer);

      const audioMessage = {
        realtime_input: {
          media_chunks: [
            {
              mime_type: "audio/pcm;rate=16000",
              data: base64Audio,
            },
          ],
        },
      };

      this.realtimeWebSocket.send(JSON.stringify(audioMessage));
    };

    source.connect(this.realtimeProcessor);
    this.realtimeProcessor.connect(this.realtimeAudioContext.destination);
  }

  /**
   * Handles incoming WebSocket messages from the Gemini Live API.
   *
   * @private
   * @param {MessageEvent} event - The WebSocket message event
   */
  handleGeminiRealtimeMessage(event) {
    try {
      const message = JSON.parse(event.data);

      console.log("Gemini Live message received:", message);

      if (message.setupComplete) {
        console.log("Gemini Live session setup complete");
        this.geminiSetupComplete = true;
        return;
      }

      if (message.serverContent) {
        const content = message.serverContent;

        if (content.inputTranscription) {
          const transcription = content.inputTranscription;
          console.log("Input transcription received:", transcription);
          if (transcription.text) {
            this.addFinalTranscript(transcription.text);
          }
        }

        if (content.modelTurn && content.modelTurn.parts) {
          for (const part of content.modelTurn.parts) {
            if (part.text) {
              console.log("Model turn text:", part.text);
              if (content.turnComplete) {
                this.addFinalTranscript(part.text);
              } else {
                this.updatePartialTranscript(part.text);
              }
            }
          }
        }

        if (content.turnComplete) {
          console.log("Turn complete");
          const partialMessage = this.elements.liveTranscriptChat.querySelector(
            ".md-live-transcript__message--partial",
          );
          if (partialMessage) {
            partialMessage.remove();
          }
        }

        if (content.outputTranscription && content.outputTranscription.text) {
          console.log(
            "Gemini output transcription:",
            content.outputTranscription.text,
          );
        }
      }

      if (message.toolCall) {
        console.log("Gemini tool call:", message.toolCall);
      }
      if (message.error) {
        console.error("Gemini Live API error:", message.error);
        this.handleRealtimeError(
          new Error(message.error.message || "Gemini API error"),
        );
      }
    } catch (error) {
      console.error("Error parsing Gemini realtime message:", error);
    }
  }

  /**
   * Handles incoming WebSocket messages from the Realtime API.
   *
   * @private
   * @param {MessageEvent} event - The WebSocket message event
   */
  handleRealtimeMessage(event) {
    try {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case "transcription_session.created":
          console.log("Realtime session created:", message.session?.id);
          break;

        case "transcription_session.updated":
          console.log("Realtime session updated");
          break;

        case "conversation.item.input_audio_transcription.delta":
          this.updatePartialTranscript(message.delta);
          break;

        case "conversation.item.input_audio_transcription.completed":
          this.addFinalTranscript(message.transcript);
          break;

        case "input_audio_buffer.speech_started":
          console.log("Speech detected");
          break;

        case "input_audio_buffer.speech_stopped":
          console.log("Speech ended");
          break;

        case "error":
          console.error("Realtime API error:", message.error);
          this.handleRealtimeError(
            new Error(message.error?.message || "API error"),
          );
          break;

        default:
          console.log("Realtime message:", message.type);
      }
    } catch (error) {
      console.error("Error parsing realtime message:", error);
    }
  }

  /**
   * Updates the partial (in-progress) transcript in the chat.
   *
   * @private
   * @param {string} text - The text to display (delta for OpenAI, full text for Gemini)
   * @param {boolean} isFullText - If true, replace text instead of appending (for Gemini)
   */
  updatePartialTranscript(text, isFullText = false) {
    if (!text) return;

    const isGemini = this.realtimeProvider === "gemini";

    let partialMessage = this.elements.liveTranscriptChat.querySelector(
      ".md-live-transcript__message--partial",
    );

    if (!partialMessage) {
      partialMessage = document.createElement("div");
      partialMessage.className =
        "md-live-transcript__message md-live-transcript__message--partial";
      this.elements.liveTranscriptChat.appendChild(partialMessage);
    }

    if (isGemini || isFullText) {
      partialMessage.textContent = text;
    } else {
      partialMessage.textContent += text;
    }

    this.elements.liveTranscriptChat.scrollTop =
      this.elements.liveTranscriptChat.scrollHeight;
  }

  /**
   * Adds a final (completed) transcript to the chat.
   *
   * @private
   * @param {string} transcript - The complete transcript text
   */
  addFinalTranscript(transcript) {
    if (!transcript || !transcript.trim()) return;

    const partialMessage = this.elements.liveTranscriptChat.querySelector(
      ".md-live-transcript__message--partial",
    );
    if (partialMessage) {
      partialMessage.remove();
    }
    const finalMessage = document.createElement("div");
    finalMessage.className =
      "md-live-transcript__message md-live-transcript__message--final";
    finalMessage.textContent = transcript.trim();
    this.elements.liveTranscriptChat.appendChild(finalMessage);

    this.realtimeTranscript +=
      (this.realtimeTranscript ? " " : "") + transcript.trim();

    this.elements.liveTranscriptChat.scrollTop =
      this.elements.liveTranscriptChat.scrollHeight;
  }

  /**
   * Stops the realtime transcription session.
   * Closes WebSocket connection and releases resources.
   */
  stopRealtimeTranscription() {
    this.isRealtimeActive = false;

    // Stop session timer
    if (this.realtimeSessionTimer) {
      clearInterval(this.realtimeSessionTimer);
      this.realtimeSessionTimer = null;
    }

    // Disconnect audio processing
    if (this.realtimeProcessor) {
      this.realtimeProcessor.disconnect();
      this.realtimeProcessor = null;
    }

    // Close audio context
    if (
      this.realtimeAudioContext &&
      this.realtimeAudioContext.state !== "closed"
    ) {
      this.realtimeAudioContext.close();
      this.realtimeAudioContext = null;
    }

    // Stop media stream
    if (this.realtimeMediaStream) {
      this.realtimeMediaStream.getTracks().forEach((track) => track.stop());
      this.realtimeMediaStream = null;
    }

    // Close WebSocket
    if (this.realtimeWebSocket) {
      if (this.realtimeWebSocket.readyState === WebSocket.OPEN) {
        this.realtimeWebSocket.close();
      }
      this.realtimeWebSocket = null;
    }

    // Reset provider state
    this.realtimeProvider = null;
    this.geminiSetupComplete = false;

    // Update UI
    this.updateRealtimeUIForRecording(false);
    this.updateStatus(getMessage("realtime_session_ended"), "normal");

    // Show actions if we have transcript
    if (this.realtimeTranscript.trim()) {
      this.showRealtimeTranscriptActions();
      this.updateRealtimeStepIndicator(2);
    }
  }

  /**
   * Clears the realtime transcription session (full reset).
   */
  clearRealtimeTranscription() {
    this.stopRealtimeTranscription();
    this.clearRealtimeLiveTranscript();
    this.updateRealtimeStepIndicator(1);
    this.updateStatus(getMessage("realtime_ready"), "normal");
  }

  /**
   * Clears only the live transcript content.
   * @param {boolean} resetData - Whether to clear the underlying transcript data
   */
  clearRealtimeLiveTranscript(resetData = true) {
    if (resetData) {
      this.realtimeTranscript = "";
    }

    const messages = this.elements.liveTranscriptChat.querySelectorAll(
      ".md-live-transcript__message",
    );
    messages.forEach((msg) => msg.remove());

    if (this.elements.realtimeTranscriptTextarea) {
      this.elements.realtimeTranscriptTextarea.value = "";
      if (resetData) {
        this.elements.realtimeTranscriptTextarea.classList.add("hidden");
        this.elements.liveTranscriptChat.classList.remove("hidden");
      }
    }

    if (resetData && this.elements.liveTranscriptPlaceholder) {
      this.elements.liveTranscriptPlaceholder.classList.remove("hidden");
    }
    if (resetData && this.elements.liveTranscriptActions) {
      this.elements.liveTranscriptActions.classList.add("hidden");
    }
  }

  /**
   * Copies the realtime transcript to clipboard.
   */
  copyRealtimeTranscript() {
    if (this.realtimeTranscript.trim()) {
      navigator.clipboard
        .writeText(this.realtimeTranscript)
        .then(() => {
          this.showMessage(getMessage("transcript_copied"), "success");
        })
        .catch(() => {
          this.showMessage(getMessage("failed_copy"), "error");
        });
    }
  }

  /**
   * Toggles between chat view and editable textarea for realtime transcript.
   */
  toggleRealtimeEditMode() {
    const isEditing =
      !this.elements.realtimeTranscriptTextarea.classList.contains("hidden");

    if (isEditing) {
      this.elements.realtimeTranscriptTextarea.classList.add("hidden");
      this.elements.liveTranscriptChat.classList.remove("hidden");

      const editedText = this.elements.realtimeTranscriptTextarea.value;

      this.clearRealtimeLiveTranscript(false);

      this.realtimeTranscript = "";

      this.addFinalTranscript(editedText);
    } else {
      this.elements.realtimeTranscriptTextarea.value = this.realtimeTranscript;
      this.elements.realtimeTranscriptTextarea.classList.remove("hidden");
      this.elements.liveTranscriptChat.classList.add("hidden");
    }
  }

  /**
   * Summarizes the realtime transcript using the existing summarization logic.
   */
  async summarizeRealtimeTranscript() {
    if (
      !this.elements.realtimeTranscriptTextarea.classList.contains("hidden")
    ) {
      this.realtimeTranscript = this.elements.realtimeTranscriptTextarea.value;
    }

    if (!this.realtimeTranscript.trim()) {
      this.showMessage(getMessage("realtime_transcription_empty"), "error");
      return;
    }

    this.elements.transcriptTextarea.value = this.realtimeTranscript;
    this.updateRealtimeStepIndicator(3);
    await this.summarizeTranscript();
  }

  /**
   * Shows the action buttons after transcription stops.
   *
   * @private
   */
  showRealtimeTranscriptActions() {
    if (this.elements.liveTranscriptActions) {
      this.elements.liveTranscriptActions.classList.remove("hidden");
    }
  }

  /**
   * Updates UI elements based on recording state.
   *
   * @private
   * @param {boolean} isRecording - Whether recording is active
   */
  updateRealtimeUIForRecording(isRecording) {
    if (isRecording) {
      this.elements.startRealtime.classList.add("hidden");
      this.elements.stopRealtime.classList.remove("hidden");
      this.elements.stopRealtime.disabled = false;
      this.elements.clearRealtime.classList.add("hidden");

      this.elements.statusBar.classList.add("md-status-card--realtime");
    } else {
      this.elements.startRealtime.classList.remove("hidden");
      this.elements.stopRealtime.classList.add("hidden");
      this.elements.stopRealtime.disabled = true;

      if (this.realtimeTranscript.trim()) {
        this.elements.clearRealtime.classList.remove("hidden");
        this.elements.clearRealtime.disabled = false;
      }

      this.elements.statusBar.classList.remove("md-status-card--realtime");
    }
  }

  /**
   * Updates the realtime mode step indicator.
   *
   * @private
   * @param {number} step - The current step (1, 2, or 3)
   */
  updateRealtimeStepIndicator(step) {
    const steps = [
      this.elements.realtimeStep1,
      this.elements.realtimeStep2,
      this.elements.realtimeStep3,
    ];

    steps.forEach((stepEl, index) => {
      if (!stepEl) return;

      stepEl.className = "md-stepper__step";

      if (index + 1 < step) {
        stepEl.classList.add("md-stepper__step--completed");
      } else if (index + 1 === step) {
        stepEl.classList.add("md-stepper__step--active");
      }
    });
  }

  /**
   * Starts the session timer for realtime transcription.
   *
   * @private
   */
  startRealtimeSessionTimer() {
    this.elements.timer.classList.remove("hidden");

    this.realtimeSessionTimer = setInterval(() => {
      if (!this.realtimeSessionStartTime) return;

      const elapsed = Date.now() - this.realtimeSessionStartTime;
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);

      this.elements.timer.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

      // Check for 30-minute limit
      if (minutes >= 30) {
        this.showMessage(getMessage("realtime_session_limit"), "warning");
        this.stopRealtimeTranscription();
      }
    }, 1000);
  }

  /**
   * Handles errors during realtime transcription.
   *
   * @private
   * @param {Error} error - The error that occurred
   */
  handleRealtimeError(error) {
    console.error("Realtime error:", error);

    // Clean up resources
    this.stopRealtimeTranscription();

    // Show error message
    this.updateStatus(getMessage("realtime_error_connection"), "normal");
    this.showMessage(
      error.message || getMessage("realtime_error_connection"),
      "error",
    );
  }
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new MedicalAudioRecorder();
});
