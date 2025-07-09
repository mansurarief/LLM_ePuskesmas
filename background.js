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
    chrome.runtime.onInstalled.addListener((details) => this.handleInstallation(details));
    chrome.runtime.onStartup.addListener(() => this.handleStartup());
    chrome.storage.onChanged.addListener((changes, area) => this.handleStorageChange(changes, area));
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
        sendResponse({ success: true, message: "Background script acknowledged" });
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
      const { firstRun } = await chrome.storage.local.get('firstRun');
      
      if (firstRun === undefined) {
        await chrome.storage.local.set({ firstRun: false });
        console.log('Extension storage initialized');
      }
    } catch (error) {
      console.error('Error initializing storage:', error);
    }
  }

  // ============================================================================
  // INSTALLATION AND STARTUP HANDLERS
  // ============================================================================

  async handleInstallation(details) {
    console.log('Extension installed/updated:', details.reason);
    
    if (details.reason === 'install') {
      await this.handleFirstInstallation();
    } else if (details.reason === 'update') {
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
    
    if (details.previousVersion && this.isMajorUpdate(details.previousVersion, currentVersion)) {
      await this.handleMajorUpdate();
    }
  }

  async handleStartup() {
    console.log('Extension startup');
    
    await this.performStartupTasks();
  }

  async performStartupTasks() {
    await this.cleanupOldRecordings();
    await this.validateApiKey();
  }

  // ============================================================================
  // STORAGE AND SETTINGS MANAGEMENT
  // ============================================================================

  handleStorageChange(changes, area) {
    if (area === 'local') {
      this.logImportantChanges(changes);
    }
  }

  logImportantChanges(changes) {
    const importantKeys = ['apiKey', 'language', 'gptModel'];
    
    Object.keys(changes).forEach(key => {
      if (importantKeys.includes(key)) {
        console.log(`Setting changed: ${key}`);
      }
    });
  }

  async setDefaultSettings() {
    const defaultSettings = {
      language: 'id',
      gptModel: 'gpt-3.5-turbo',
      audioQuality: 'medium',
      maxRecordingTime: 10,
      enableRetry: true,
      saveRecordings: false,
      enableOfflineMode: false,
      medicalTemplates: this.getDefaultTemplates()
    };
    
    await chrome.storage.local.set(defaultSettings);
    console.log('Default settings initialized');
  }

  getDefaultTemplates() {
    return [
      {
        name: "General Consultation",
        prompt: "Summarize this medical consultation focusing on: chief complaint, symptoms, physical examination findings, diagnosis, and treatment plan. Format in Indonesian."
      },
      {
        name: "Follow-up Visit",
        prompt: "Summarize this follow-up visit focusing on: current condition, response to previous treatment, any new symptoms, and adjusted treatment plan. Format in Indonesian."
      },
      {
        name: "Emergency Case",
        prompt: "Summarize this emergency case focusing on: presenting complaint, vital signs, immediate interventions, diagnosis, and urgent treatment required. Format in Indonesian."
      }
    ];
  }

  // ============================================================================
  // VERSION MANAGEMENT
  // ============================================================================

  isMajorUpdate(previousVersion, currentVersion) {
    const prevMajor = parseInt(previousVersion.split('.')[0]);
    const currMajor = parseInt(currentVersion.split('.')[0]);
    return currMajor > prevMajor;
  }

  async handleMajorUpdate() {
    console.log('Handling major update');
    await this.showUpdateNotification();
  }

  async showUpdateNotification() {
    if (chrome.notifications && chrome.notifications.create) {
      try {
        await chrome.notifications.create('update-notification', {
          type: 'basic',
          iconUrl: 'icon.png',
          title: 'Medical Notetaking Updated',
          message: 'New features available! Click to see what\'s new.'
        });
      } catch (error) {
        console.log('Notifications not available:', error);
      }
    }
  }

  // ============================================================================
  // MAINTENANCE TASKS
  // ============================================================================

  async cleanupOldRecordings() {
    try {
      const { savedRecordings } = await chrome.storage.local.get('savedRecordings');
      
      if (savedRecordings && savedRecordings.length > 10) {
        const recentRecordings = savedRecordings.slice(-10);
        await chrome.storage.local.set({ savedRecordings: recentRecordings });
        console.log('Cleaned up old recordings');
      }
    } catch (error) {
      console.error('Error cleaning up recordings:', error);
    }
  }

  async validateApiKey() {
    try {
      const { apiKey } = await chrome.storage.local.get('apiKey');
      
      if (apiKey) {
        const isValid = await this.testApiKey(apiKey);
        await chrome.storage.local.set({ apiKeyValid: isValid });
      }
    } catch (error) {
      console.error('Error validating API key:', error);
    }
  }

  async testApiKey(apiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      
      return response.ok;
    } catch (error) {
      console.error('API key validation failed:', error);
      return false;
    }
  }

  // ============================================================================
  // NAVIGATION METHODS
  // ============================================================================

  openWelcomePage() {
    chrome.tabs.create({
      url: chrome.runtime.getURL("welcome.html"),
      active: true
    });
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  handleActionClick() {
    console.log('Extension icon clicked');
    // Add custom behavior here if needed
  }
}

// Initialize background service
try {
  new BackgroundService();
  console.log('Background service initialized successfully');
} catch (error) {
  console.error('Failed to initialize background service:', error);
}