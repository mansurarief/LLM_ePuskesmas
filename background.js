/**
 * Background Service - Chrome Extension
 * Handles extension lifecycle, storage management, and background tasks
 */
class BackgroundService {
  constructor() {
    this.setupEventListeners();
    this.initializeStorage();
  }

  // ============================================================================
  // INITIALIZATION METHODS
  // ============================================================================

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

  async handleInstallation(details) {
    console.log("Extension installed/updated:", details.reason);

    if (details.reason === "install") {
      await this.handleFirstInstallation();
    } else if (details.reason === "update") {
      await this.handleUpdate(details);
    }
  }

  async handleFirstInstallation() {
    await this.setDefaultSettings();
    this.openWelcomePage();
  }

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

  async handleStartup() {
    console.log("Extension startup");
  }

  // ============================================================================
  // STORAGE AND SETTINGS MANAGEMENT
  // ============================================================================

  handleStorageChange(changes, area) {
    if (area === "local") {
      this.logImportantChanges(changes);
    }
  }

  logImportantChanges(changes) {
    const importantKeys = ["apiKey", "gptModel"];

    Object.keys(changes).forEach((key) => {
      if (importantKeys.includes(key)) {
        console.log(`Setting changed: ${key}`);
      }
    });
  }

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

  isMajorUpdate(previousVersion, currentVersion) {
    const prevMajor = parseInt(previousVersion.split(".")[0]);
    const currMajor = parseInt(currentVersion.split(".")[0]);
    return currMajor > prevMajor;
  }

  async handleMajorUpdate() {
    console.log("Handling major update");
  }

  // ============================================================================
  // NAVIGATION METHODS
  // ============================================================================

  openWelcomePage() {
    chrome.tabs.create({
      url: chrome.runtime.getURL("welcome.html"),
      active: true,
    });
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

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
