/**
 * @fileoverview Background Service for Medical Audio Recorder Chrome Extension
 * This service worker handles extension lifecycle events, storage management,
 * and communication between different parts of the extension. It manages
 * installation, updates, and background tasks for the medical documentation system.
 * 
 * @author LLM ePuskesmas Team
 * @license MIT
 * @version 1.0.0
 */

/**
 * Background service worker for the Medical Audio Recorder extension.
 * Manages extension lifecycle, handles installation/update events,
 * provides storage management, and facilitates communication between
 * content scripts and popup interfaces.
 * 
 * @class BackgroundService
 */
class BackgroundService {
  /**
   * Initializes the BackgroundService instance.
   * Sets up Chrome extension event listeners and initializes storage.
   * 
   * @constructor
   */
  constructor() {
    this.setupEventListeners();
    this.initializeStorage();
  }

  // ============================================================================
  // INITIALIZATION METHODS
  // ============================================================================

  /**
   * Sets up Chrome extension event listeners.
   * Handles installation, startup, storage changes, action clicks, and messages.
   * 
   * @private
   */
  setupEventListeners() {
    chrome.runtime.onInstalled.addListener((details) =>
      this.handleInstallation(details)
    );
    chrome.runtime.onStartup.addListener(() => this.handleStartup());
    chrome.storage.onChanged.addListener((changes, area) =>
      this.handleStorageChange(changes, area)
    );
    chrome.action.onClicked.addListener(() => this.handleActionClick());

    // Add message listener for content script communication
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep the message channel open for async response
    });
  }

  /**
   * Handles incoming messages from content scripts and popup.
   * Routes messages based on action type and provides appropriate responses.
   * 
   * @param {Object} request - Message request object
   * @param {Object} sender - Message sender information
   * @param {Function} sendResponse - Response callback function
   * @private
   */
  handleMessage(request, sender, sendResponse) {
    console.log("Background received message:", request);

    switch (request.action) {
      case "contentScriptReady":
        console.log("Content script ready on:", request.url);
        sendResponse({
          success: true,
          message: "Background script acknowledged",
        });
        break;

      case "ping":
        sendResponse({ success: true, message: "Background script is active" });
        break;

      default:
        console.log("Unknown message action:", request.action);
        sendResponse({ success: false, message: "Unknown action" });
    }
  }

  /**
   * Initializes extension storage on first run.
   * Sets up default storage structure and configuration.
   * 
   * @async
   * @private
   * @throws {Error} When storage initialization fails
   */
  async initializeStorage() {
    try {
      const { firstRun } = await chrome.storage.local.get("firstRun");

      if (firstRun === undefined) {
        await chrome.storage.local.set({ firstRun: false });
        console.log("Extension storage initialized");
      }
    } catch (error) {
      console.error("Error initializing storage:", error);
    }
  }

  // ============================================================================
  // INSTALLATION AND STARTUP HANDLERS
  // ============================================================================

  /**
   * Handles extension installation and update events.
   * Processes first installation and update scenarios differently.
   * 
   * @async
   * @private
   * @param {Object} details - Installation details from Chrome API
   */
  async handleInstallation(details) {
    console.log("Extension installed/updated:", details.reason);

    if (details.reason === "install") {
      await this.handleFirstInstallation();
    } else if (details.reason === "update") {
      await this.handleUpdate(details);
    }
  }

  /**
   * Handles first-time extension installation.
   * Sets up default settings and opens welcome page.
   * 
   * @async
   * @private
   */
  async handleFirstInstallation() {
    await this.setDefaultSettings();
    this.openWelcomePage();
  }

  /**
   * Handles extension updates.
   * Processes version changes and migration if needed.
   * 
   * @async
   * @private
   * @param {Object} details - Update details including version information
   */
  async handleUpdate(details) {
    const currentVersion = chrome.runtime.getManifest().version;
    console.log(`Updated to version ${currentVersion}`);

    if (
      details.previousVersion &&
      this.isMajorUpdate(details.previousVersion, currentVersion)
    ) {
      await this.handleMajorUpdate();
    }
  }

  /**
   * Handles extension startup events.
   * Performs any necessary startup initialization.
   * 
   * @async
   * @private
   */
  async handleStartup() {
    console.log("Extension startup");
  }

  // ============================================================================
  // STORAGE AND SETTINGS MANAGEMENT
  // ============================================================================

  /**
   * Handles Chrome storage change events.
   * Logs important setting changes for debugging.
   * 
   * @param {Object} changes - Storage changes object
   * @param {string} area - Storage area ('local', 'sync', etc.)
   * @private
   */
  handleStorageChange(changes, area) {
    if (area === "local") {
      this.logImportantChanges(changes);
    }
  }

  /**
   * Logs important configuration changes.
   * Tracks changes to critical settings like API keys.
   * 
   * @param {Object} changes - Storage changes to analyze
   * @private
   */
  logImportantChanges(changes) {
    const importantKeys = ["apiKey", "gptModel"];

    Object.keys(changes).forEach((key) => {
      if (importantKeys.includes(key)) {
        console.log(`Setting changed: ${key}`);
      }
    });
  }

  /**
   * Sets default configuration settings.
   * Initializes all required settings with sensible defaults.
   * 
   * @async
   * @private
   */
  async setDefaultSettings() {
    const defaultSettings = {
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

    await chrome.storage.local.set(defaultSettings);
    console.log("Default settings initialized");
  }

  // ============================================================================
  // VERSION MANAGEMENT
  // ============================================================================

  /**
   * Determines if an update is a major version change.
   * Compares version numbers to identify major updates.
   * 
   * @param {string} previousVersion - Previous extension version
   * @param {string} currentVersion - Current extension version
   * @returns {boolean} True if this is a major update, false otherwise
   * @private
   */
  isMajorUpdate(previousVersion, currentVersion) {
    const prevMajor = parseInt(previousVersion.split(".")[0]);
    const currMajor = parseInt(currentVersion.split(".")[0]);
    return currMajor > prevMajor;
  }

  /**
   * Handles major version updates.
   * Performs migration tasks for major version changes.
   * 
   * @async
   * @private
   */
  async handleMajorUpdate() {
    console.log("Handling major update");
  }

  // ============================================================================
  // NAVIGATION METHODS
  // ============================================================================

  /**
   * Opens the extension welcome page.
   * Creates a new tab with the welcome/setup page.
   * 
   * @private
   */
  openWelcomePage() {
    chrome.tabs.create({
      url: chrome.runtime.getURL("welcome.html"),
      active: true,
    });
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handles extension icon clicks.
   * Processes toolbar icon click events.
   * 
   * @private
   */
  handleActionClick() {
    console.log("Extension icon clicked");
    // Add custom behavior here if needed
  }
}

// Initialize background service
try {
  new BackgroundService();
  console.log("Background service initialized successfully");
} catch (error) {
  console.error("Failed to initialize background service:", error);
}
