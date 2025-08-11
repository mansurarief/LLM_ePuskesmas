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
      apiProvider: document.getElementById("apiProvider"),
      apiKey: document.getElementById("apiKey"),
      gptModel: document.getElementById("gptModel"),
      enableRetry: document.getElementById("enableRetry"),
      saveRecordings: document.getElementById("saveRecordings"),

      // Buttons
      saveSettings: document.getElementById("saveSettings"),
      testConnection: document.getElementById("testConnection"),

      // Containers
      openaiConfig: document.getElementById("openaiConfig"),

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
    this.elements.apiProvider.addEventListener("change", () =>
      this.toggleApiConfig()
    );
  }

  // ============================================================================
  // SETTINGS MANAGEMENT
  // ============================================================================

  async loadSettings() {
    try {
      const settings = await chrome.storage.local.get([
        "apiKey",
        "gptModel",
        "enableRetry",
        "apiProvider",
        "saveRecordings",
      ]);

      this.populateFormFields(settings);
      this.toggleApiConfig();
    } catch (error) {
      console.error("Error loading settings:", error);
      this.showMessage("Error loading settings: " + error.message, "error");
    }
  }

  populateFormFields(settings) {
    const fieldMappings = {
      apiProvider: settings.apiProvider || "openai",
      apiKey: settings.apiKey || "",
      gptModel: settings.gptModel || "gpt-3.5-turbo",
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
    return {
      apiProvider: this.elements.apiProvider.value,
      apiKey: this.elements.apiKey.value,
      gptModel: this.elements.gptModel.value,
      enableRetry: this.elements.enableRetry.checked,
      saveRecordings: this.elements.saveRecordings.checked,
    };
  }

  toggleApiConfig() {
    const apiProvider = this.elements.apiProvider.value;
    const configVisibility = {
      openai: { openai: true, local: false },
    };

    const visibility = configVisibility[apiProvider] || {
      openai: false,
      local: false,
    };

    this.elements.openaiConfig.style.display = visibility.openai
      ? "block"
      : "none";
  }

  // ============================================================================
  // API TESTING METHODS
  // ============================================================================

  async testConnection() {
    try {
      const { apiKey } = await chrome.storage.local.get("apiKey");

      if (!apiKey) {
        this.showMessage("Please enter your API key first.", "error");
        return;
      }

      const response = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (response.ok) {
        this.showMessage("API connection successful!", "success");
      } else {
        this.showMessage(
          "API connection failed. Please check your API key.",
          "error"
        );
      }
    } catch (error) {
      console.error("Connection test failed:", error);
      this.showMessage("Connection test failed: " + error.message, "error");
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
