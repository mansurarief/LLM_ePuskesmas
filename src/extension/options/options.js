import {
  localizeHtmlPage,
  getMessage,
  initTranslations,
} from "../utils/translations.js";

/**
 * @fileoverview Options Page Manager for Medical Audio Recorder Chrome Extension
 * This file manages the extension's settings page, including API key configuration,
 * provider selection, and connection testing for healthcare documentation features.
 *
 * @author LLM ePuskesmas Team
 * @license MIT
 * @version 1.0.0
 */

/**
 * Manages the options/settings page for the Medical Audio Recorder extension.
 * Handles configuration of API keys, AI providers, language settings,
 * and connection testing for transcription and summarization services.
 *
 * @class OptionsManager
 */
class OptionsManager {
  /**
   * Initializes the OptionsManager instance.
   * Sets up DOM element references, event listeners, and loads current settings.
   *
   * @constructor
   */
  constructor() {
    this.init();
  }

  /**
   * Asynchronous initialization of the options page components.
   *
   * @async
   */
  async init() {
    await initTranslations();
    localizeHtmlPage();
    this.initializeElements();
    this.setupEventListeners();
    await this.loadSettings();
  }

  // ============================================================================
  // INITIALIZATION METHODS
  // ============================================================================

  /**
   * Initializes and caches references to form elements.
   * Stores references to input fields, buttons, and message containers.
   *
   * @private
   */
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
      enableRealtimeTranscription: document.getElementById(
        "enableRealtimeTranscription",
      ),

      // Buttons
      saveSettings: document.getElementById("saveSettings"),
      testConnection: document.getElementById("testConnection"),

      // Messages
      successMessage: document.getElementById("successMessage"),
      errorMessage: document.getElementById("errorMessage"),
    };
  }

  /**
   * Sets up event listeners for form interactions.
   * Handles save, test, and provider change events.
   *
   * @private
   */
  setupEventListeners() {
    // Button event listeners
    this.elements.saveSettings.addEventListener("click", () =>
      this.saveSettings(),
    );
    this.elements.testConnection.addEventListener("click", () =>
      this.testConnection(),
    );

    // Form event listeners
    this.elements.transcriptionProvider.addEventListener("change", () =>
      this.updateTranscriptionModels(),
    );
    this.elements.summarizationProvider.addEventListener("change", () =>
      this.updateSummarizationModels(),
    );

    // Visibility toggle event listeners for API key fields
    document.querySelectorAll(".md-toggle-visibility").forEach((button) => {
      button.addEventListener("click", () => {
        const targetId = button.getAttribute("data-target");
        const input = document.getElementById(targetId);
        const icon = button.querySelector(".material-symbols-rounded");

        if (input && icon) {
          if (input.type === "password") {
            input.type = "text";
            icon.textContent = "visibility_off";
          } else {
            input.type = "password";
            icon.textContent = "visibility";
          }
        }
      });
    });
  }

  // ============================================================================
  // SETTINGS MANAGEMENT
  // ============================================================================

  /**
   * Loads settings from Chrome storage and populates form fields.
   * Retrieves API keys, provider settings, and other configuration options.
   *
   * @async
   * @private
   * @throws {Error} When storage access fails
   */
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
        "enableRealtimeTranscription",
      ]);

      this.populateFormFields(settings);
      this.updateTranscriptionModels();
      this.updateSummarizationModels();
    } catch (error) {
      console.error("Error loading settings:", error);
      this.showMessage(
        getMessage("error_loading") + ": " + error.message,
        "error",
      );
    }
  }

  /**
   * Populates form fields with loaded settings.
   * Handles different input types and validates select options.
   *
   * @private
   * @param {Object} settings - Settings object from storage
   */
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
      enableRealtimeTranscription:
        settings.enableRealtimeTranscription === true,
    };

    Object.entries(fieldMappings).forEach(([fieldName, value]) => {
      const element = this.elements[fieldName];
      if (element) {
        if (element.type === "checkbox") {
          element.checked = value;
        } else {
          element.value = value;
          if (element.tagName === "SELECT") {
            const optionValues = Array.from(element.options).map(
              (opt) => opt.value,
            );
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

  /**
   * Saves form data to Chrome storage.
   * Collects form values and persists them to extension storage.
   *
   * @async
   * @throws {Error} When storage write fails
   */
  async saveSettings() {
    try {
      const currentSettings = await chrome.storage.local.get("language");
      const settings = this.collectFormData();
      await chrome.storage.local.set(settings);

      this.showMessage(getMessage("settings_saved"), "success");

      if (currentSettings.language !== settings.language) {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      this.showMessage(
        getMessage("error_saving") + ": " + error.message,
        "error",
      );
    }
  }

  /**
   * Collects data from form fields.
   * Gathers all configuration values from the options form.
   *
   * @private
   * @returns {Object} Form data object with all settings
   */
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
      enableRealtimeTranscription:
        this.elements.enableRealtimeTranscription.checked,
    };

    return baseSettings;
  }

  /**
   * Updates available transcription models based on selected provider.
   * Dynamically populates model dropdown when provider changes.
   *
   * @private
   */
  updateTranscriptionModels() {
    const provider = this.elements.transcriptionProvider.value;
    const modelSelect = this.elements.transcriptionModel;

    // Clear existing options
    modelSelect.innerHTML = "";

    if (provider === "openai") {
      const openaiModels = [
        { value: "whisper-1", label: getMessage("whisper_1") },
        { value: "gpt-4o-transcribe", label: getMessage("gpt4o_transcribe") },
        {
          value: "gpt-4o-mini-transcribe",
          label: getMessage("gpt4o_mini_transcribe"),
        },
      ];

      openaiModels.forEach((model) => {
        const option = document.createElement("option");
        option.value = model.value;
        option.textContent = model.label;
        modelSelect.appendChild(option);
      });
    } else if (provider === "gemini") {
      const geminiModels = [
        { value: "gemini-2.0-flash", label: getMessage("gemini_2_0_flash") },
        {
          value: "gemini-2.0-flash-lite",
          label: getMessage("gemini_2_0_flash_lite"),
        },
      ];

      geminiModels.forEach((model) => {
        const option = document.createElement("option");
        option.value = model.value;
        option.textContent = model.label;
        modelSelect.appendChild(option);
      });
    }

    // Set default value
    modelSelect.value =
      provider === "openai" ? "whisper-1" : "gemini-2.0-flash";
  }

  /**
   * Updates available summarization models based on selected provider.
   * Dynamically populates model dropdown when provider changes.
   *
   * @private
   */
  updateSummarizationModels() {
    const provider = this.elements.summarizationProvider.value;
    const modelSelect = this.elements.summarizationModel;

    modelSelect.innerHTML = "";

    if (provider === "openai") {
      const openaiModels = [
        { value: "gpt-3.5-turbo", label: getMessage("gpt35_turbo") },
        { value: "gpt-5-nano", label: getMessage("gpt5_nano") },
        { value: "gpt-5-mini", label: getMessage("gpt5_mini") },
        { value: "gpt-4o-mini", label: getMessage("gpt4o_mini") },
      ];

      openaiModels.forEach((model) => {
        const option = document.createElement("option");
        option.value = model.value;
        option.textContent = model.label;
        modelSelect.appendChild(option);
      });
    } else if (provider === "gemini") {
      const geminiModels = [
        {
          value: "gemini-2.5-flash-lite",
          label: getMessage("gemini_2_5_flash_lite"),
        },
        { value: "gemini-2.0-flash", label: getMessage("gemini_2_0_flash") },
        {
          value: "gemini-2.0-flash-lite",
          label: getMessage("gemini_2_0_flash_lite"),
        },
      ];

      geminiModels.forEach((model) => {
        const option = document.createElement("option");
        option.value = model.value;
        option.textContent = model.label;
        modelSelect.appendChild(option);
      });
    }

    modelSelect.value =
      provider === "openai" ? "gpt-3.5-turbo" : "gemini-2.0-flash-lite";
  }

  // ============================================================================
  // API TESTING METHODS
  // ============================================================================

  /**
   * Tests API connections for configured providers.
   * Validates API keys by making test requests to each configured service.
   *
   * @async
   */
  /**
   * Tests API connections for configured providers.
   * Validates API keys by making test requests to each configured service.
   *
   * @async
   */
  async testConnection() {
    try {
      const openaiKey = this.elements.openaiApiKey.value;
      const geminiKey = this.elements.geminiApiKey.value;

      const resultsContainer = document.createElement("div");
      resultsContainer.className = "md-api-test-results";

      const openaiItem = document.createElement("div");
      let openaiSuccess = false;
      let openaiMessage = "";

      if (openaiKey) {
        const openaiResult = await this.testOpenAIConnection(openaiKey);
        openaiSuccess = openaiResult.success;
        openaiMessage = openaiResult.message;
      } else {
        openaiMessage = getMessage("api_key_not_provided");
      }

      openaiItem.className = `md-api-test-item ${openaiSuccess ? "md-api-test-item--success" : "md-api-test-item--error"}`;
      const openaiIcon = document.createElement("span");
      openaiIcon.className = "material-symbols-rounded";
      openaiIcon.textContent = openaiSuccess ? "check_circle" : "error";
      const openaiText = document.createElement("span");
      openaiText.textContent = `OpenAI: ${openaiMessage}`;
      openaiItem.appendChild(openaiIcon);
      openaiItem.appendChild(openaiText);
      resultsContainer.appendChild(openaiItem);

      const geminiItem = document.createElement("div");
      let geminiSuccess = false;
      let geminiMessage = "";

      if (geminiKey) {
        const geminiResult = await this.testGeminiConnection(geminiKey);
        geminiSuccess = geminiResult.success;
        geminiMessage = geminiResult.message;
      } else {
        geminiMessage = getMessage("api_key_not_provided");
      }

      geminiItem.className = `md-api-test-item ${geminiSuccess ? "md-api-test-item--success" : "md-api-test-item--error"}`;
      const geminiIcon = document.createElement("span");
      geminiIcon.className = "material-symbols-rounded";
      geminiIcon.textContent = geminiSuccess ? "check_circle" : "error";
      const geminiText = document.createElement("span");
      geminiText.textContent = `Gemini: ${geminiMessage}`;
      geminiItem.appendChild(geminiIcon);
      geminiItem.appendChild(geminiText);
      resultsContainer.appendChild(geminiItem);

      this.showTestResults(resultsContainer);
    } catch (error) {
      console.error("Connection test failed:", error);
      this.showMessage(
        getMessage("error_connection") + ": " + error.message,
        "error",
      );
    }
  }

  /**
   * Shows the API test results in a dedicated container.
   *
   * @param {HTMLElement} resultsContainer - Container with test result items
   * @private
   */
  showTestResults(resultsContainer) {
    const existingResults = document.querySelector(".md-api-test-results");
    if (existingResults) {
      existingResults.remove();
    }

    const actionsContainer = document.querySelector(".md-options-actions");
    if (actionsContainer && actionsContainer.parentNode) {
      actionsContainer.parentNode.insertBefore(
        resultsContainer,
        actionsContainer.nextSibling,
      );
    }

    setTimeout(() => {
      if (resultsContainer.parentNode) {
        resultsContainer.remove();
      }
    }, 10000);
  }

  /**
   * Tests OpenAI API connection.
   * Makes a test request to OpenAI's models endpoint to validate the API key.
   *
   * @async
   * @private
   * @param {string} apiKey - OpenAI API key to test
   * @returns {Promise<Object>} Test result with success and message
   */
  async testOpenAIConnection(apiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (response.ok) {
        return { success: true, message: getMessage("connection_successful") };
      } else {
        return {
          success: false,
          message: getMessage("connection_failed_check_key"),
        };
      }
    } catch (error) {
      return {
        success: false,
        message: getMessage("connection_failed") + ": " + error.message,
      };
    }
  }

  /**
   * Tests Gemini API connection.
   * Makes a test request to Gemini's models endpoint to validate the API key.
   *
   * @async
   * @private
   * @param {string} apiKey - Gemini API key to test
   * @returns {Promise<Object>} Test result with success and message
   */
  async testGeminiConnection(apiKey) {
    try {
      if (!apiKey.startsWith("AIza")) {
        return {
          success: false,
          message: getMessage("invalid_gemini_key_format"),
        };
      }
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      );

      if (response.ok) {
        return { success: true, message: getMessage("connection_successful") };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message:
            errorData.error?.message ||
            getMessage("connection_failed_check_key"),
        };
      }
    } catch (error) {
      return {
        success: false,
        message: getMessage("connection_failed") + ": " + error.message,
      };
    }
  }

  // ============================================================================
  // UI UTILITY METHODS
  // ============================================================================

  /**
   * Displays a message to the user.
   * Shows success or error messages with auto-hide functionality.
   *
   * @param {string} message - Message text to display
   * @param {string} type - Message type ('success' or 'error')
   * @private
   */
  showMessage(message, type) {
    this.elements.successMessage.classList.add("hidden");
    this.elements.errorMessage.classList.add("hidden");

    const targetElement =
      type === "success"
        ? this.elements.successMessage
        : this.elements.errorMessage;

    const iconEl = targetElement.querySelector(".material-symbols-rounded");
    if (iconEl) {
      iconEl.textContent = type === "success" ? "check_circle" : "error";
    }

    const textEl = targetElement.querySelector(".md-message__text");
    if (textEl) {
      textEl.textContent = message;
    }

    targetElement.classList.remove("hidden");

    setTimeout(() => {
      this.elements.successMessage.classList.add("hidden");
      this.elements.errorMessage.classList.add("hidden");
    }, 5000);
  }
}

// Initialize options manager when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new OptionsManager();
});
