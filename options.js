/**
 * Options Page Manager - Chrome Extension
 * Handles settings configuration and API testing
 */
class OptionsManager {
  constructor() {
    this.initializeElements();
    this.setupEventListeners();
    this.loadSettings();
  }

  // ============================================================================
  // INITIALIZATION METHODS
  // ============================================================================

  initializeElements() {
    this.elements = {
      // Form elements
      openaiApiKey: document.getElementById("openaiApiKey"),
      geminiApiKey: document.getElementById("geminiApiKey"),
      transcriptionProvider: document.getElementById("transcriptionProvider"),
      transcriptionModel: document.getElementById("transcriptionModel"),
      summarizationProvider: document.getElementById("summarizationProvider"),
      summarizationModel: document.getElementById("summarizationModel"),
      language: document.getElementById("language"),
      enableRetry: document.getElementById("enableRetry"),
      saveRecordings: document.getElementById("saveRecordings"),

      // Buttons
      saveSettings: document.getElementById("saveSettings"),
      testConnection: document.getElementById("testConnection"),

      // Messages
      successMessage: document.getElementById("successMessage"),
      errorMessage: document.getElementById("errorMessage"),
    };
  }

  setupEventListeners() {
    // Button event listeners
    this.elements.saveSettings.addEventListener("click", () =>
      this.saveSettings()
    );
    this.elements.testConnection.addEventListener("click", () =>
      this.testConnection()
    );

    // Form event listeners
    this.elements.transcriptionProvider.addEventListener("change", () =>
      this.updateTranscriptionModels()
    );
    this.elements.summarizationProvider.addEventListener("change", () =>
      this.updateSummarizationModels()
    );
  }

  // ============================================================================
  // SETTINGS MANAGEMENT
  // ============================================================================

  async loadSettings() {
    try {
      const settings = await chrome.storage.local.get([
        "openaiApiKey",
        "geminiApiKey",
        "transcriptionProvider",
        "transcriptionModel",
        "summarizationProvider",
        "summarizationModel",
        "language",
        "enableRetry",
        "saveRecordings",
      ]);

      this.populateFormFields(settings);
      this.updateTranscriptionModels();
      this.updateSummarizationModels();
    } catch (error) {
      console.error("Error loading settings:", error);
      this.showMessage("Error loading settings: " + error.message, "error");
    }
  }

  populateFormFields(settings) {
    const fieldMappings = {
      openaiApiKey: settings.openaiApiKey || "",
      geminiApiKey: settings.geminiApiKey || "",
      transcriptionProvider: settings.transcriptionProvider || "openai",
      transcriptionModel: settings.transcriptionModel || "whisper-1",
      summarizationProvider: settings.summarizationProvider || "openai",
      summarizationModel: settings.summarizationModel || "gpt-3.5-turbo",
      language: settings.language || "id",
      enableRetry: settings.enableRetry !== false,
      saveRecordings: settings.saveRecordings || false,
    };

    Object.entries(fieldMappings).forEach(([fieldName, value]) => {
      const element = this.elements[fieldName];
      if (element) {
        if (element.type === "checkbox") {
          element.checked = value;
        } else {
          element.value = value;
          // Ensure selects have a valid option selected in case of deprecated values
          if (element.tagName === "SELECT") {
            const optionValues = Array.from(element.options).map((opt) => opt.value);
            if (!optionValues.includes(String(value))) {
              const fallbackMap = {
                transcriptionProvider: "openai",
                transcriptionModel: "whisper-1",
                summarizationProvider: "openai",
                summarizationModel: "gpt-3.5-turbo",
                language: "id",
              };
              element.value = fallbackMap[fieldName] || optionValues[0] || "";
            }
          }
        }
      }
    });
  }

  async saveSettings() {
    try {
      const settings = this.collectFormData();
      await chrome.storage.local.set(settings);
      this.showMessage("Settings saved successfully!", "success");
    } catch (error) {
      console.error("Error saving settings:", error);
      this.showMessage("Error saving settings: " + error.message, "error");
    }
  }

  collectFormData() {
    const baseSettings = {
      openaiApiKey: this.elements.openaiApiKey.value,
      geminiApiKey: this.elements.geminiApiKey.value,
      transcriptionProvider: this.elements.transcriptionProvider.value,
      transcriptionModel: this.elements.transcriptionModel.value,
      summarizationProvider: this.elements.summarizationProvider.value,
      summarizationModel: this.elements.summarizationModel.value,
      language: this.elements.language.value,
      enableRetry: this.elements.enableRetry.checked,
      saveRecordings: this.elements.saveRecordings.checked,
    };

    return baseSettings;
  }

  updateTranscriptionModels() {
    const provider = this.elements.transcriptionProvider.value;
    const modelSelect = this.elements.transcriptionModel;
    
    // Clear existing options
    modelSelect.innerHTML = "";
    
    if (provider === "openai") {
      const openaiModels = [
        { value: "whisper-1", label: "Whisper-1" },
        { value: "gpt-4o-transcribe", label: "GPT-4o Transcribe" },
        { value: "gpt-4o-mini-transcribe", label: "GPT-4o Mini Transcribe" }
      ];
      
      openaiModels.forEach(model => {
        const option = document.createElement("option");
        option.value = model.value;
        option.textContent = model.label;
        modelSelect.appendChild(option);
      });
    } else if (provider === "gemini") {
      const geminiModels = [
        { value: "google-speech-id", label: "Google Speech-to-Text (Indonesian)" }
      ];
      
      geminiModels.forEach(model => {
        const option = document.createElement("option");
        option.value = model.value;
        option.textContent = model.label;
        modelSelect.appendChild(option);
      });
    }
    
    // Set default value
    modelSelect.value = provider === "openai" ? "whisper-1" : "google-speech-id";
  }

  updateSummarizationModels() {
    const provider = this.elements.summarizationProvider.value;
    const modelSelect = this.elements.summarizationModel;
    
    // Clear existing options
    modelSelect.innerHTML = "";
    
    if (provider === "openai") {
      const openaiModels = [
        { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
        { value: "gpt-5-nano", label: "GPT-5 Nano" },
        { value: "gpt-5-mini", label: "GPT-5 Mini" },
        { value: "gpt-4o-mini", label: "GPT-4o Mini" }
      ];
      
      openaiModels.forEach(model => {
        const option = document.createElement("option");
        option.value = model.value;
        option.textContent = model.label;
        modelSelect.appendChild(option);
      });
    } else if (provider === "gemini") {
      const geminiModels = [
        { value: "2.5flash-lite", label: "Gemini 2.5 Flash Lite" },
        { value: "2.0flash", label: "Gemini 2.0 Flash" },
        { value: "2.0flash-lite", label: "Gemini 2.0 Flash Lite" }
      ];
      
      geminiModels.forEach(model => {
        const option = document.createElement("option");
        option.value = model.value;
        option.textContent = model.label;
        modelSelect.appendChild(option);
      });
    }
    
    // Set default value
    modelSelect.value = provider === "openai" ? "gpt-3.5-turbo" : "2.5flash-lite";
  }

  // ============================================================================
  // API TESTING METHODS
  // ============================================================================

  async testConnection() {
    try {
      const openaiKey = this.elements.openaiApiKey.value;
      const geminiKey = this.elements.geminiApiKey.value;
      let testResults = [];

      if (openaiKey) {
        const openaiResult = await this.testOpenAIConnection(openaiKey);
        testResults.push(`OpenAI: ${openaiResult}`);
      } else {
        testResults.push("OpenAI: No API key provided");
      }

      if (geminiKey) {
        const geminiResult = await this.testGeminiConnection(geminiKey);
        testResults.push(`Gemini: ${geminiResult}`);
      } else {
        testResults.push("Gemini: No API key provided");
      }

      const allSuccessful = testResults.every(result => result.includes("successful"));
      const message = testResults.join(" | ");
      
      if (allSuccessful) {
        this.showMessage(message, "success");
      } else {
        this.showMessage(message, "error");
      }
    } catch (error) {
      console.error("Connection test failed:", error);
      this.showMessage("Connection test failed: " + error.message, "error");
    }
  }

  async testOpenAIConnection(apiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (response.ok) {
        return "Connection successful!";
      } else {
        return "Connection failed. Please check your API key.";
      }
    } catch (error) {
      return "Connection failed: " + error.message;
    }
  }

  async testGeminiConnection(apiKey) {
    try {
      // Test Gemini API connection - you'll implement the actual API call later
      // For now, we'll just validate the API key format
      if (apiKey.startsWith("AIza")) {
        return "API key format valid (connection test pending implementation)";
      } else {
        return "Invalid API key format. Gemini API keys should start with 'AIza'";
      }
    } catch (error) {
      return "Connection failed: " + error.message;
    }
  }

  // ============================================================================
  // UI UTILITY METHODS
  // ============================================================================

  showMessage(message, type) {
    this.elements.successMessage.style.display = "none";
    this.elements.errorMessage.style.display = "none";

    const targetElement =
      type === "success"
        ? this.elements.successMessage
        : this.elements.errorMessage;
    targetElement.innerHTML = message.replace(/\n/g, "<br>");
    targetElement.style.display = "block";

    setTimeout(() => {
      this.elements.successMessage.style.display = "none";
      this.elements.errorMessage.style.display = "none";
    }, 8000);
  }
}

// Initialize options manager when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new OptionsManager();
});
