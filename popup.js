/**
 * Medical Audio Recorder - Chrome Extension
 * Handles audio recording, transcription, and medical summary generation
 */
class MedicalAudioRecorder {
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

  async loadSettings() {
    this.settings = await chrome.storage.local.get([
      "apiKey",
      "language",
      "gptModel",
      "audioQuality",
      "maxRecordingTime",
      "enableRetry",
      "saveRecordings",
      "apiProvider",
    ]);

    this.setDefaultSettings();
  }

  setDefaultSettings() {
    const defaults = {
      apiProvider: "openai",
      language: "id",
      gptModel: "gpt-3.5-turbo",
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

  validateApiConfiguration() {
    if (this.settings.apiProvider === "openai") {
      if (!this.settings.apiKey) {
        this.showMessage(
          "⚠️ OpenAI API key not configured. Click 'Settings' to add your API key.",
          "error"
        );
      }
    }
  }

  async refreshSettings() {
    await this.loadSettings();
    this.validateApiConfiguration();
    this.showMessage("Settings refreshed.", "success");
  }

  async checkApiKeyInStorage() {
    try {
      const result = await chrome.storage.local.get("apiKey");
      return result.apiKey;
    } catch (error) {
      console.error("Error checking API key in storage:", error);
      return null;
    }
  }

  async testApiKey() {
    try {
      const storageKey = await this.checkApiKeyInStorage();

      if (storageKey && !this.settings.apiKey) {
        this.showMessage(
          "⚠️ API key in storage but not loaded. Try refreshing settings.",
          "error"
        );
      } else if (!storageKey) {
        this.showMessage(
          "❌ No API key found in storage. Please configure in Settings.",
          "error"
        );
      } else if (this.settings.apiKey) {
        this.showMessage("✅ API key is configured and loaded!", "success");
      }
    } catch (error) {
      console.error("Error testing API key:", error);
      this.showMessage("Error testing API key: " + error.message, "error");
    }
  }

  // ============================================================================
  // TIMING METHODS
  // ============================================================================

  startTranscriptionTimer() {
    this.transcriptionStartTime = Date.now();
    this.updateTranscriptionTime();

    // Set up real-time updates
    this.transcriptionTimerInterval = setInterval(() => {
      this.updateTranscriptionTime();
    }, 1000);
  }

  endTranscriptionTimer() {
    this.transcriptionEndTime = Date.now();
    this.updateTranscriptionTime();

    // Clear the interval
    if (this.transcriptionTimerInterval) {
      clearInterval(this.transcriptionTimerInterval);
      this.transcriptionTimerInterval = null;
    }
  }

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
    this.elements.transcriptionTime.querySelector(".time-value").textContent = "--";
    this.elements.summarizationTime.querySelector(".time-value").textContent = "--";
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

  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }
  }

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

  async transcribeAudio() {
    if (!this.audioBlob) {
      this.showMessage("No audio to transcribe", "error");
      return;
    }

    this.validateApiConfiguration();

    this.retryCount = 0;
    await this.transcribeWithRetry();
  }

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

  async transcribeAudioOnly() {
    return await this.transcribeWithOpenAI();
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

  async transcribeWithOpenAI() {
    // Check if API key is configured
    if (!this.settings.apiKey) {
      throw new Error(
        "OpenAI API key is not configured. Please go to Settings and add your API key."
      );
    }

    const formData = this.createTranscriptionFormData();
    formData.append("model", "whisper-1");

    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.settings.apiKey}`,
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

  async generateSummary(transcription) {
    try {
      return await this.generateSummaryWithOpenAI(transcription);
    } catch (summaryError) {
      console.warn("Summary generation failed:", summaryError);
      if (summaryError.message && summaryError.message.includes("too short")) {
        const fallbackSummary = `Summary: ${transcription}`;
        return fallbackSummary;
      }
      throw summaryError;
    }
  }

  async generateSummaryWithOpenAI(transcription) {
    // Check if API key is configured
    if (!this.settings.apiKey) {
      throw new Error(
        "OpenAI API key is not configured. Please go to Settings and add your API key."
      );
    }

    // Enhanced medical extraction prompt in English with Indonesian output
    let systemPrompt = `You are a medical assistant specialized in analyzing doctor-patient conversations in Bahasa Indonesia. Your task is to extract and structure medical information into a comprehensive JSON format.

EXTRACTION REQUIREMENTS:
1. keluhan_utama: Main complaint/symptoms (keluhan utama) - only one main complaint that makes patient come to the doctor
2. keluhan_tambahan: Additional symptoms or supporting details (keluhan tambahan) - any additional symptoms reported by the patient besides the main complaint, including those that occurred simultaneously or prior to the main complaint. Avoid repeating the main complaint.
3. rps: Current medical history (riwayat penyakit sekarang) - current illness details that describe the patient's main complaint in a chronological manner: when it started, how the symptoms have progressed, the location, the nature/character of the complaint, aggravating or relieving factors, and any associated symptoms.
4. rpd: Past medical history (riwayat penyakit dahulu) - previous illnesses, surgeries, medications, and any other relevant medical history that may have contributed to the current complaint, including any chronic or acute illnesses, prior hospitalizations, surgeries, known allergies, and current or past medications.
5. rpsos: Social history (riwayat penyakit sosial) - patient's social habits and lifestyle factors that may influence their health, including smoking, alcohol use, illicit drug use, physical activity, occupation, and living environment.
6. rpk: Family medical history (riwayat penyakit keluarga) - any immediate family members (parents, siblings) have a history of significant medical conditions such as hypertension, diabetes, heart disease, cancer, mental illness, or genetic disorders.
7. terapi_obat: Treatment plan (tatalaksana) - pharmacological therapy prescribed to the patient, including the drug name, dosage, frequency, route of administration, and duration of use. Mention the indication if relevant, identify and convert any layman's terms or general descriptions of medications into their correct pharmacological drug classes.
8. edukasi: Patient education (edukasi) - any educational information provided to the patient, including instructions on medication use, lifestyle changes, or other health-related advice.

OUTPUT FORMAT:
Respond ONLY with a valid JSON object in Bahasa Indonesia. If information is not available, use "Informasi tidak tersedia".

{
  "keluhan_utama": "Main complaint in Bahasa Indonesia",
  "keluhan_tambahan": "Additional symptoms in Bahasa Indonesia", 
  "rps": "Current medical history in Bahasa Indonesia",
  "rpd": "Past medical history in Bahasa Indonesia",
  "rpsos": "Social history in Bahasa Indonesia",
  "rpk": "Family medical history in Bahasa Indonesia",
  "terapi_obat": "Treatment plan in Bahasa Indonesia",
  "edukasi": "Patient education in Bahasa Indonesia",
  "main_diagnosis": "Primary diagnosis with ICD-10 code if applicable",
  "differential_diagnosis": "List of alternative diagnoses to consider",
  "recommended_treatment": "Detailed treatment plan with drug names, dosages, frequency, route, and duration"
}

GUIDELINES:
- Use proper medical terminology in Bahasa Indonesia
- Be concise but comprehensive
- Focus on clinically relevant information
- If a section is not mentioned in the conversation, use "Informasi tidak tersedia"
- Maintain medical accuracy and professionalism and bio-ethics in Indonesia`;

    let userPrompt = `Analyze the following doctor-patient conversation in Bahasa Indonesia and extract the medical information as specified:

CONVERSATION TRANSCRIPT:
${transcription}

TASK: Extract and structure the medical information into the JSON format described above. Respond only with the JSON object in Bahasa Indonesia, no additional text.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.settings.apiKey}`,
      },
      body: JSON.stringify({
        model: this.settings.gptModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 800,
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
