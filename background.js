// background.js - Enhanced version with better functionality
class BackgroundService {
  constructor() {
    this.setupEventListeners();
    this.initializeStorage();
  }

  setupEventListeners() {
    chrome.runtime.onInstalled.addListener((details) => this.handleInstallation(details));
    chrome.runtime.onStartup.addListener(() => this.handleStartup());
    chrome.storage.onChanged.addListener((changes, area) => this.handleStorageChange(changes, area));
    chrome.action.onClicked.addListener(() => this.handleActionClick());
  }

  async initializeStorage() {
    try {
      // Check if this is first run
      const { firstRun } = await chrome.storage.local.get('firstRun');
      
      if (firstRun === undefined) {
        await chrome.storage.local.set({ firstRun: false });
        console.log('Extension storage initialized');
      }
    } catch (error) {
      console.error('Error initializing storage:', error);
    }
  }

  async handleInstallation(details) {
    console.log('Extension installed/updated:', details.reason);
    
    if (details.reason === 'install') {
      // First time installation
      await this.setDefaultSettings();
      this.openWelcomePage();
    } else if (details.reason === 'update') {
      // Extension updated
      const currentVersion = chrome.runtime.getManifest().version;
      console.log(`Updated to version ${currentVersion}`);
      
      // Check if major version change requires reset
      if (details.previousVersion && this.isMajorUpdate(details.previousVersion, currentVersion)) {
        await this.handleMajorUpdate();
      }
    }
  }

  async handleStartup() {
    console.log('Extension startup');
    
    // Clean up old recordings if storage is getting full
    await this.cleanupOldRecordings();
    
    // Check API key validity
    await this.validateApiKey();
  }

  handleStorageChange(changes, area) {
    if (area === 'local') {
      // Log important setting changes
      Object.keys(changes).forEach(key => {
        if (['apiKey', 'language', 'gptModel'].includes(key)) {
          console.log(`Setting changed: ${key}`);
        }
      });
    }
  }

  handleActionClick() {
    // This is called when user clicks the extension icon
    // You can add custom behavior here if needed
    console.log('Extension icon clicked');
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
      medicalTemplates: [
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
      ]
    };
    
    await chrome.storage.local.set(defaultSettings);
    console.log('Default settings initialized');
  }

  openWelcomePage() {
    chrome.tabs.create({
      url: chrome.runtime.getURL("welcome.html"),
      active: true
    });
  }

  isMajorUpdate(previousVersion, currentVersion) {
    const prevMajor = parseInt(previousVersion.split('.')[0]);
    const currMajor = parseInt(currentVersion.split('.')[0]);
    return currMajor > prevMajor;
  }

  async handleMajorUpdate() {
    console.log('Handling major update');
    
    // Show update notification if supported
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

  async cleanupOldRecordings() {
    try {
      const { savedRecordings } = await chrome.storage.local.get('savedRecordings');
      
      if (savedRecordings && savedRecordings.length > 10) {
        // Keep only the 10 most recent recordings
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
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        
        if (!response.ok) {
          console.warn('API key validation failed');
          await chrome.storage.local.set({ apiKeyValid: false });
        } else {
          await chrome.storage.local.set({ apiKeyValid: true });
        }
      }
    } catch (error) {
      console.error('Error validating API key:', error);
    }
  }
}

// Initialize background service
try {
  new BackgroundService();
  console.log('Background service initialized successfully');
} catch (error) {
  console.error('Failed to initialize background service:', error);
}