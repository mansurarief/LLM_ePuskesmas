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
    this.logSupportedFormats(); // Debug logging
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
      
      // UI elements
      statusBar: document.getElementById("statusBar"),
      statusText: document.getElementById("statusText"),
      timer: document.getElementById("timer"),
      templateSelect: document.getElementById("templateSelect"),
      
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
      summarizationTime: document.getElementById("summarizationTime")
    };
  }

  initializeEventListeners() {
    // Recording event listeners
    this.elements.startRecording.addEventListener("click", () => this.startRecording());
    this.elements.stopRecording.addEventListener("click", () => this.stopRecording());
    this.elements.playRecording.addEventListener("click", () => this.playRecording());
    this.elements.transcribeAudio.addEventListener("click", () => this.transcribeAudio());
    this.elements.clearRecording.addEventListener("click", () => this.clearRecording());
    
    // File upload event listeners
    this.elements.uploadAudio.addEventListener("click", () => this.openFileDialog());
    this.elements.audioFileInput.addEventListener("change", (event) => this.handleFileUpload(event));
    
    // Navigation event listeners
    this.elements.openWelcomePage.addEventListener("click", () => this.openWelcomePage());
    this.elements.openSettings.addEventListener("click", () => this.openSettings());

    // Audio control event listeners
    this.elements.volumeSlider.addEventListener("input", () => this.updateVolume());
    this.elements.audioPlayback.addEventListener("loadedmetadata", () => this.updateAudioControls());
    
    // Transcript editor event listeners
    this.elements.copyTranscript.addEventListener("click", () => this.copyTranscript());
    this.elements.clearTranscript.addEventListener("click", () => this.clearTranscript());
    this.elements.summarizeTranscript.addEventListener("click", () => this.summarizeTranscript());
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
      "enableOfflineMode",
      "medicalTemplates",
      "apiProvider",
      "transcriptionUrl",
      "summarizationUrl",
      "enableTranslation",
    ]);

    this.setDefaultSettings();
    this.loadTemplates();
  }

  setDefaultSettings() {
    const defaults = {
      apiProvider: "openai",
      transcriptionUrl: "http://localhost:5001",
      summarizationUrl: "http://localhost:5002",
      language: "id",
      gptModel: "gpt-3.5-turbo",
      audioQuality: "medium",
      maxRecordingTime: 10,
      enableRetry: true,
      enableTranslation: false,
    };

    Object.keys(defaults).forEach(key => {
      if (this.settings[key] === undefined) {
        this.settings[key] = defaults[key];
      }
    });
  }

  loadTemplates() {
    const defaultTemplates = [
      {
        name: "General Consultation",
        prompt: "Summarize this medical consultation focusing on: chief complaint, symptoms, physical examination findings, diagnosis, and treatment plan. Format in Indonesian.",
      },
      {
        name: "Follow-up Visit",
        prompt: "Summarize this follow-up visit focusing on: current condition, response to previous treatment, any new symptoms, and adjusted treatment plan. Format in Indonesian.",
      },
      {
        name: "Emergency Case",
        prompt: "Summarize this emergency case focusing on: presenting complaint, vital signs, immediate interventions, diagnosis, and urgent treatment required. Format in Indonesian.",
      },
    ];

    const templates = this.settings.medicalTemplates || defaultTemplates;
    this.elements.templateSelect.innerHTML = '<option value="">Select template...</option>';

    templates.forEach((template, index) => {
      const option = document.createElement("option");
      option.value = index;
      option.textContent = template.name;
      this.elements.templateSelect.appendChild(option);
    });
  }

  async checkMicrophoneAccess() {
    const { microphoneAccess } = await chrome.storage.local.get("microphoneAccess");

    if (microphoneAccess) {
      this.elements.startRecording.disabled = false;
      this.elements.openWelcomePage.style.display = "none";
    } else {
      this.updateStatus("Please grant microphone access to continue", "warning");
      this.elements.openWelcomePage.style.display = "block";
    }

    this.validateApiConfiguration();
  }

  validateApiConfiguration() {
    if (this.settings.apiProvider === "openai" || this.settings.apiProvider === "hybrid") {
      if (!this.settings.apiKey) {
        this.showMessage("Please configure your OpenAI API key in settings", "error");
      }
    }

    if (this.settings.apiProvider === "local" || this.settings.apiProvider === "hybrid") {
      this.checkLocalApiStatus();
    }
  }

  // ============================================================================
  // TIMING METHODS
  // ============================================================================

  startTranscriptionTimer() {
    this.transcriptionStartTime = Date.now();
    this.elements.transcriptionTime.style.display = "block";
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
      this.elements.transcriptionTime.querySelector('.time-value').textContent = timeString;
    }
  }

  startSummarizationTimer() {
    this.summarizationStartTime = Date.now();
    this.elements.summarizationTime.style.display = "block";
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
      this.elements.summarizationTime.querySelector('.time-value').textContent = timeString;
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
    
    this.elements.transcriptionTime.style.display = "none";
    this.elements.summarizationTime.style.display = "none";
  }

  // ============================================================================
  // STEP MANAGEMENT
  // ============================================================================

  updateStepIndicator(step) {
    // Reset all steps
    [this.elements.step1, this.elements.step2, this.elements.step3, this.elements.step4].forEach(stepEl => {
      stepEl.className = "step";
    });

    // Mark current and completed steps
    for (let i = 1; i <= 4; i++) {
      const stepEl = this.elements[`step${i}`];
      if (i < step) {
        stepEl.className = "step completed";
      } else if (i === step) {
        stepEl.className = "step active";
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
    this.showMessage("Microphone access denied. Please check permissions.", "error");
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

    this.logAudioBlobDetails();
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
      console.log("Transcription result:", transcription);

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
    if (this.settings.apiProvider === "local" || this.settings.apiProvider === "hybrid") {
      try {
        return await this.transcribeWithLocalAPI();
      } catch (error) {
        console.warn("Local transcription failed:", error);
        if (this.settings.apiProvider === "hybrid" && this.settings.apiKey) {
          console.log("Falling back to OpenAI API");
          return await this.transcribeWithOpenAI();
        }
        throw error;
      }
    } else if (this.settings.apiProvider === "hf") {
      return await this.transcribeWithHF();
    }
    return await this.transcribeWithOpenAI();
  }

  showTranscriptEditor(transcription) {
    this.elements.transcriptTextarea.value = transcription;
    this.elements.transcriptEditor.style.display = "block";
    this.elements.summarizeTranscript.disabled = false;
  }

  handleTranscriptionError(error) {
      console.error("Transcription error:", error);
      console.error("Error stack:", error.stack);

      if (this.settings.enableRetry && this.retryCount < this.maxRetries) {
        this.retryCount++;
      this.updateStatus(`Retrying transcription... (${this.retryCount}/${this.maxRetries})`);
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
      navigator.clipboard.writeText(transcript).then(() => {
        this.showMessage("Transcript copied to clipboard", "success");
      }).catch(() => {
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
      console.log("Summary result:", summary);

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

  async transcribeWithLocalAPI() {
    const formData = this.createTranscriptionFormData();
    
    console.log("Local API - Original audio blob type:", this.audioBlob.type);
    console.log("Local API - Compatible blob type:", formData.get("file").type);
    console.log("Local API - Filename:", formData.get("file").name);

    const response = await fetch(`${this.settings.transcriptionUrl}/transcribe`, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Local API: ${errorData.error || "HTTP " + response.status}`);
    }

    const data = await response.json();
    return data.text;
  }

  async transcribeWithOpenAI() {
    const formData = this.createTranscriptionFormData();
    formData.append("model", "whisper-1");

    console.log("Original audio blob type:", this.audioBlob.type);
    console.log("Compatible blob type:", formData.get("file").type);
    console.log("Filename:", formData.get("file").name);

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.settings.apiKey}`,
        },
        body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API: ${errorData.error?.message || "HTTP " + response.status}`);
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

  async transcribeWithHF() {
    try {
      const arrayBuffer = await this.audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      const payload = {
        data: [
          {
            path: `data:audio/webm;base64,${base64Audio}`,
            meta: { _type: "gradio.FileData" }
          },
          this.settings.language
        ]
      };

      const response = await fetch("https://naimackerman-whisper-transcription.hf.space/gradio_api/call/transcribe_audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HF API: HTTP ${response.status}`);
      }

      const responseData = await response.json();
      const eventId = responseData.event_id;

      return await this.pollHFResult(eventId);
      
    } catch (error) {
      console.error("HF transcription error:", error);
      throw new Error(`HF API: ${error.message}`);
    }
  }

  async pollHFResult(eventId) {
      let attempts = 0;
    const maxAttempts = 30;
      
      while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
        
        const resultResponse = await fetch(`https://naimackerman-whisper-transcription.hf.space/gradio_api/call/transcribe_audio/${eventId}`);
        
        if (!resultResponse.ok) {
          attempts++;
          continue;
        }

        const resultData = await resultResponse.json();
        
        if (resultData.status === "completed") {
        return resultData.data[0].text;
        } else if (resultData.status === "failed") {
          throw new Error("Transcription failed");
        }
        
        attempts++;
      }
      
      throw new Error("Transcription timeout");
  }

  // ============================================================================
  // SUMMARIZATION METHODS
  // ============================================================================

  async generateSummary(transcription) {
    try {
      if (this.settings.apiProvider === "local" || this.settings.apiProvider === "hybrid") {
        try {
          return await this.generateSummaryWithLocalAPI(transcription);
        } catch (error) {
          console.warn("Local summarization failed:", error);
          if (this.settings.apiProvider === "hybrid" && this.settings.apiKey) {
            console.log("Falling back to OpenAI API");
            return await this.generateSummaryWithOpenAI(transcription);
          }
          throw error;
        }
      }
      return await this.generateSummaryWithOpenAI(transcription);
      } catch (summaryError) {
        console.warn("Summary generation failed:", summaryError);
      if (summaryError.message && summaryError.message.includes("too short")) {
        const fallbackSummary = `Summary: ${transcription}`;
          console.log("Used fallback summary for short text");
        return fallbackSummary;
      }
          throw summaryError;
        }
      }

  async generateSummaryWithLocalAPI(transcription) {
    const templates = this.settings.medicalTemplates || [];
    const selectedTemplateIndex = this.elements.templateSelect.value;

    let templatePrompt = "";
    if (selectedTemplateIndex !== "" && templates[selectedTemplateIndex]) {
      templatePrompt = templates[selectedTemplateIndex].prompt;
    }

    const requestBody = {
      text: transcription,
      template_prompt: templatePrompt,
      max_length: 300,
      min_length: 100,
    };

    const response = await fetch(`${this.settings.summarizationUrl}/summarize`, {
        method: "POST",
      headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Local API: ${errorData.error || "HTTP " + response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error + (data.details ? ": " + data.details : ""));
    }

    return data.summary;
  }

  async generateSummaryWithOpenAI(transcription) {
    const templates = this.settings.medicalTemplates || [];
    const selectedTemplateIndex = this.elements.templateSelect.value;

    // Enhanced medical extraction prompt in English with Indonesian output
    let systemPrompt = `You are a medical assistant specialized in analyzing doctor-patient conversations in Bahasa Indonesia. Your task is to extract and structure medical information into a comprehensive JSON format.

EXTRACTION REQUIREMENTS:
1. keluhan_utama: Main complaint/symptoms (keluhan utama)
2. keluhan_tambahan: Additional complaints or supporting details (keluhan tambahan)
3. rps: Current medical history (riwayat penyakit sekarang) - current illness details
4. rpd: Past medical history (riwayat penyakit dahulu) - previous illnesses, surgeries, medications
5. rpsos: Social history (riwayat penyakit sosial) - lifestyle, occupation, social factors
6. tatalaksana: Treatment plan (tatalaksana) - education given and medications prescribed

OUTPUT FORMAT:
Respond ONLY with a valid JSON object in Bahasa Indonesia. If information is not available, use "Informasi tidak tersedia".

{
  "keluhan_utama": "Main complaint in Bahasa Indonesia",
  "keluhan_tambahan": "Additional complaints in Bahasa Indonesia", 
  "rps": "Current medical history in Bahasa Indonesia",
  "rpd": "Past medical history in Bahasa Indonesia",
  "rpsos": "Social history in Bahasa Indonesia",
  "tatalaksana": "Treatment plan including education and medications in Bahasa Indonesia"
}

GUIDELINES:
- Use proper medical terminology in Bahasa Indonesia
- Be concise but comprehensive
- Focus on clinically relevant information
- If a section is not mentioned in the conversation, use "Informasi tidak tersedia"
- Maintain medical accuracy and professionalism`;

    let userPrompt = `Analyze the following doctor-patient conversation in Bahasa Indonesia and extract the medical information as specified:

CONVERSATION TRANSCRIPT:
${transcription}

TASK: Extract and structure the medical information into the JSON format described above. Respond only with the JSON object in Bahasa Indonesia, no additional text.`;

    if (selectedTemplateIndex !== "" && templates[selectedTemplateIndex]) {
      // Use template-specific prompting with enhanced structure
      systemPrompt = `You are a medical assistant specialized in analyzing doctor-patient conversations according to specific medical templates.

TEMPLATE: ${templates[selectedTemplateIndex].prompt}

EXTRACTION REQUIREMENTS:
1. keluhan_utama: Main complaint/symptoms (keluhan utama)
2. keluhan_tambahan: Additional complaints or supporting details (keluhan tambahan)
3. rps: Current medical history (riwayat penyakit sekarang) - current illness details
4. rpd: Past medical history (riwayat penyakit dahulu) - previous illnesses, surgeries, medications
5. rpsos: Social history (riwayat penyakit sosial) - lifestyle, occupation, social factors
6. tatalaksana: Treatment plan (tatalaksana) - education given and medications prescribed

OUTPUT FORMAT:
Respond ONLY with a valid JSON object in Bahasa Indonesia following the template guidelines. If information is not available, use "Informasi tidak tersedia".

{
  "keluhan_utama": "Main complaint in Bahasa Indonesia",
  "keluhan_tambahan": "Additional complaints in Bahasa Indonesia", 
  "rps": "Current medical history in Bahasa Indonesia",
  "rpd": "Past medical history in Bahasa Indonesia",
  "rpsos": "Social history in Bahasa Indonesia",
  "tatalaksana": "Treatment plan including education and medications in Bahasa Indonesia"
}`;

      userPrompt = `TEMPLATE MEDIS: ${templates[selectedTemplateIndex].prompt}

CONVERSATION TRANSCRIPT:
${transcription}

TASK: Analyze the conversation according to the medical template and extract the information into the JSON format described above. Respond only with the JSON object in Bahasa Indonesia, no additional text.`;
    }

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
        max_tokens: 800, // Increased for more comprehensive extraction
        temperature: 0.2, // Lower temperature for more consistent JSON output
        // response_format: { type: "json_object" }, // Force JSON response (GPT-4+)
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API: ${errorData.error?.message || "HTTP " + response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  showResults(originalTranscription, summary) {
    console.log("Showing results - Original:", originalTranscription, "Summary:", summary);
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
      this.showMessage("File size too large. Please select a file smaller than 25MB", "error");
      return false;
    }

    return true;
  }

  setupUploadedFilePlayback(file) {
    console.log("Uploaded file type:", file.type);
    console.log("Uploaded file name:", file.name);
    console.log("Uploaded file size:", file.size);

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
      "audio/webm;codecs=opus",  // Most commonly supported
      "audio/webm",
      "audio/mp4",               // OpenAI supports m4a
      "audio/mp3",               // OpenAI supports mp3
      "audio/wav",               // OpenAI supports wav
      "audio/ogg;codecs=opus",   // OpenAI supports ogg
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
      "audio/x-m4a": "m4a",  // Handle x-m4a MIME type
      "audio/aac": "m4a",     // AAC files should use m4a extension
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
      "audio/x-m4a"  // Some browsers use this MIME type for m4a files
    ];
    
    return supportedFormats.includes(mimeType);
  }

  createOpenAICompatibleBlob() {
    const currentType = this.audioBlob.type;
    console.log("Original blob type:", currentType);
    
    if (this.isOpenAISupportedFormat(currentType)) {
      console.log("Blob type is already OpenAI-compatible");
      return this.audioBlob;
    }
    
    console.log("Creating OpenAI-compatible blob from:", currentType);
    
    // Handle specific unsupported formats
    if (currentType === "audio/x-m4a" || currentType === "audio/mp4") {
      console.log("Converting m4a/mp4 to proper format");
      return new Blob([this.audioBlob], { type: "audio/mp4" });
    }
    
    if (currentType === "audio/aac") {
      console.log("Converting AAC to mp4");
      return new Blob([this.audioBlob], { type: "audio/mp4" });
    }
    
    console.log("Using webm as fallback format");
    return new Blob([this.audioBlob], { type: "audio/webm" });
  }

  // ============================================================================
  // DEBUG AND UTILITY METHODS
  // ============================================================================

  logSupportedFormats() {
    const formats = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/mp3",
      "audio/wav",
      "audio/ogg;codecs=opus",
      "audio/ogg",
      "audio/flac",
      "audio/mpeg",
      "audio/mpga",
    ];
    
    console.log("Browser supported audio formats:");
    formats.forEach(format => {
      console.log(`${format}: ${MediaRecorder.isTypeSupported(format)}`);
    });
  }

  logAudioBlobDetails() {
    if (!this.audioBlob) {
      console.log("No audio blob available");
      return;
    }
    
    console.log("=== Audio Blob Details ===");
    console.log("Type:", this.audioBlob.type);
    console.log("Size:", this.audioBlob.size, "bytes");
    console.log("Is OpenAI supported:", this.isOpenAISupportedFormat(this.audioBlob.type));
    console.log("File extension:", this.getFileExtension(this.audioBlob.type));
    console.log("========================");
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
    messageDiv.className = type === "error" ? "error-message" : "success-message";
    messageDiv.textContent = message;

    // Remove existing messages
    document.querySelectorAll(".error-message, .success-message").forEach((el) => el.remove());

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
      this.elements.timer.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
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

  async checkLocalApiStatus() {
    try {
      const promises = [
        fetch(`${this.settings.transcriptionUrl}/health`).then((r) => ({ transcription: r.ok })),
        fetch(`${this.settings.summarizationUrl}/health`).then((r) => ({ summarization: r.ok })),
      ];

      const results = await Promise.allSettled(promises);

      let transcriptionOk = false;
      let summarizationOk = false;

      results.forEach((result) => {
        if (result.status === "fulfilled") {
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
        if (!transcriptionOk) missingServices.push("Transcription");
        if (!summarizationOk) missingServices.push("Summarization");

        this.showMessage(
          `Local ${missingServices.join(" and ")} API${missingServices.length > 1 ? "s are" : " is"} not responding. Please start the APIs.`,
          "error"
        );
      }
    } catch (error) {
      console.warn("Local API status check failed:", error);
    }
  }

  openWelcomePage() {
    chrome.tabs.create({
      url: chrome.runtime.getURL("welcome.html"),
      active: true,
    });
  }

  openSettings() {
    chrome.runtime.openOptionsPage();
  }

  // ============================================================================
  // CHROME EXTENSION METHODS
  // ============================================================================

  async checkContentScriptAvailability() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || !tabs[0]) {
          resolve(false);
          return;
        }

        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "ping" },
          (response) => {
            if (chrome.runtime.lastError) {
              console.warn("Content script not available:", chrome.runtime.lastError.message);
              resolve(false);
            } else {
              console.log("Content script is available");
              resolve(true);
            }
          }
        );
      });
    });
  }

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
        console.log("Attempting to send summary to tab:", tab.url);

        // First, try to ping the content script to test connection
        chrome.tabs.sendMessage(
          tab.id,
          { action: "ping" },
          (response) => {
            if (chrome.runtime.lastError) {
              console.warn("Content script not responding to ping:", chrome.runtime.lastError.message);
              this.showMessage("Content script not available. Please refresh the page and try again.", "error");
              resolve();
              return;
            }

            console.log("Content script ping successful:", response);

            // Now send the actual summary
            chrome.tabs.sendMessage(
              tab.id,
              {
                action: "updateSummary",
                summary: summary,
              },
              (response) => {
                if (chrome.runtime.lastError) {
                  console.warn("Could not insert summary into page:", chrome.runtime.lastError.message);
                  this.showMessage("Failed to insert summary. Please refresh the page and try again.", "error");
                } else {
                  console.log("Summary insertion response:", response);
                  this.showMessage("Summary inserted successfully!", "success");
                }
                resolve();
              }
            );
          }
        );
      });
    });
  }
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new MedicalAudioRecorder();
});
