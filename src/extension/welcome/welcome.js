import { localizeHtmlPage, getMessage, initTranslations } from "../utils/translations.js";

/**
 * @fileoverview Welcome Page Manager for Medical Audio Recorder Chrome Extension
 * This file manages the initial setup and onboarding experience for users.
 * Handles microphone permission requests, API key validation, and guides users
 * through the initial configuration process for the medical documentation system.
 * 
 * @author LLM ePuskesmas Team
 * @license MIT
 * @version 1.0.0
 */

/**
 * Manages the welcome/onboarding page for the Medical Audio Recorder extension.
 * Handles microphone permission requests, initial setup guidance,
 * and user onboarding for the medical documentation system.
 * 
 * @class WelcomeManager
 */
class WelcomeManager {
  /**
   * Initializes the WelcomeManager instance.
   * Sets up DOM elements, event listeners, and checks current permissions.
   * 
   * @constructor
   */
  constructor() {
    this.init();
  }

  /**
   * Asynchronous initialization of the welcome page components.
   * 
   * @async
   */
  async init() {
    await initTranslations();
    localizeHtmlPage();
    this.initializeElements();
    this.setupEventListeners();
    this.checkCurrentPermissions();
  }

  // ============================================================================
  // INITIALIZATION METHODS
  // ============================================================================

  /**
   * Initializes and caches references to DOM elements.
   * Stores references to status displays, buttons, and navigation elements.
   * 
   * @private
   */
  initializeElements() {
    this.elements = {
      status: document.getElementById('status'),
      nextSteps: document.getElementById('nextSteps'),
      requestAccess: document.getElementById('requestAccess'),
      configureSettings: document.getElementById('configureSettings')
    };
  }

  /**
   * Sets up event listeners for user interactions.
   * Handles microphone permission requests and settings navigation.
   * 
   * @private
   */
  setupEventListeners() {
    this.elements.requestAccess.addEventListener('click', () => this.requestMicrophoneAccess());
    this.elements.configureSettings.addEventListener('click', () => this.openSettings());
  }

  // ============================================================================
  // PERMISSION MANAGEMENT
  // ============================================================================

  /**
   * Checks current microphone permission status.
   * Determines if microphone access has already been granted.
   * 
   * @async
   * @private
   */
  async checkCurrentPermissions() {
    try {
      const { microphoneAccess } = await chrome.storage.local.get('microphoneAccess');
      
      if (microphoneAccess) {
        this.showStatus(getMessage("microphone_already_granted"), 'success');
        this.showNextSteps();
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      this.showStatus(getMessage("error_permissions") + ': ' + error.message, 'error');
    }
  }

  /**
   * Requests microphone access from the user.
   * Handles the permission request flow and updates UI accordingly.
   * 
   * @async
   * @public
   */
  async requestMicrophoneAccess() {
    const button = this.elements.requestAccess;
    const originalContent = Array.from(button.childNodes).map(n => n.cloneNode(true));
    
    const loadingIcon = document.createElement("span");
    loadingIcon.className = "material-symbols-rounded";
    loadingIcon.textContent = "progress_activity";
    loadingIcon.style.animation = "spin 1s linear infinite";
    this.updateButtonState(button, [loadingIcon, document.createTextNode(" Requesting Access...")], true);
    
    try {
      const stream = await this.getMicrophoneStream();
      await this.testMicrophone(stream);
      await this.savePermissionStatus();
      
      this.handleSuccessfulPermission(button);
    } catch (error) {
      this.handlePermissionError(error, button, originalContent);
    }
  }

  /**
   * Requests microphone stream from the browser.
   * Configures audio constraints for optimal recording quality.
   * 
   * @async
   * @private
   * @returns {Promise<MediaStream>} Microphone media stream
   * @throws {Error} When microphone access is denied or unavailable
   */
  async getMicrophoneStream() {
    return await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
  }

  /**
   * Tests the microphone stream functionality.
   * Validates that the microphone is working and stops the stream.
   * 
   * @async
   * @private
   * @param {MediaStream} stream - Microphone media stream to test
   */
  async testMicrophone(stream) {
    this.showStatus(getMessage("testing_microphone"), 'info');
    
    // Stop all tracks after testing
    stream.getTracks().forEach(track => track.stop());
  }

  /**
   * Saves microphone permission status to extension storage.
   * Records permission grant timestamp for future reference.
   * 
   * @async
   * @private
   */
  async savePermissionStatus() {
    await chrome.storage.local.set({ 
      microphoneAccess: true,
      permissionGrantedAt: new Date().toISOString()
    });
  }

  /**
   * Handles successful microphone permission grant.
   * Updates UI to reflect successful permission and shows next steps.
   * 
   * @param {HTMLElement} button - Permission request button element
   * @private
   */
  handleSuccessfulPermission(button) {
    this.showStatus(getMessage("microphone_access_granted"), 'success');
    this.showNextSteps();
    
    const successIcon = document.createElement("span");
    successIcon.className = "material-symbols-rounded";
    successIcon.textContent = "check_circle";
    this.updateButtonState(button, [successIcon, document.createTextNode(" " + getMessage("access_granted"))], true);
    button.className = "md-button md-button--filled md-button--success";
  }

  /**
   * Handles microphone permission errors.
   * Processes permission denial and displays appropriate error messages.
   * 
   * @param {Error} error - Permission error object
   * @param {HTMLElement} button - Permission request button element
   * @param {string} originalText - Original button text to restore
   * @private
   */
  handlePermissionError(error, button, originalContent) {
    console.error('Error accessing microphone:', error);
    
    const errorMessage = this.getErrorMessage(error);
    this.showStatus(errorMessage, 'error');
    
    // Reset button
    this.updateButtonState(button, originalContent, false);
  }

  /**
   * Generates user-friendly error messages for permission errors.
   * Provides specific guidance based on the type of microphone error.
   * 
   * @param {Error} error - Permission error object
   * @returns {string} User-friendly error message
   * @private
   */
  getErrorMessage(error) {
    let errorMessage = getMessage("error_recording") + ". ";
    
    switch (error.name) {
      case 'NotAllowedError':
        errorMessage += getMessage("permission_denied");
        break;
      case 'NotFoundError':
        errorMessage += getMessage("no_microphone");
        break;
      case 'NotReadableError':
        errorMessage += getMessage("microphone_in_use");
        break;
      default:
        errorMessage += error.message;
    }
    
    return errorMessage;
  }

  /**
   * Updates button text and state.
   * Centralizes button state management for consistency.
   * 
   * @param {HTMLElement} button - Button element to update
   * @param {string} text - New button text
   * @param {boolean} disabled - Whether button should be disabled
   * @private
   */
  updateButtonState(button, content, disabled) {
    button.textContent = "";
    if (Array.isArray(content)) {
        content.forEach(node => button.appendChild(node));
    } else if (typeof content === "string") {
        button.textContent = content;
    } else {
        button.appendChild(content);
    }
    button.disabled = disabled;
  }

  // ============================================================================
  // NAVIGATION METHODS
  // ============================================================================

  /**
   * Opens the extension settings page.
   * Navigates user to the options page for configuration.
   * 
   * @public
   */
  openSettings() {
    chrome.runtime.openOptionsPage();
  }

  // ============================================================================
  // UI METHODS
  // ============================================================================

  /**
   * Displays status messages to the user.
   * Shows success, error, or informational messages.
   * 
   * @param {string} message - Status message to display
   * @param {string} type - Message type ('success', 'error', 'info')
   * @private
   */
  showStatus(message, type) {
    const iconEl = document.createElement("span");
    iconEl.className = 'material-symbols-rounded';
    iconEl.textContent = 'info';
    if (type === 'success') iconEl.textContent = 'check_circle';
    if (type === 'error') iconEl.textContent = 'error';
    
    this.elements.status.textContent = "";
    this.elements.status.appendChild(iconEl);
    
    const textSpan = document.createElement("span");
    textSpan.textContent = message;
    this.elements.status.appendChild(textSpan);
    
    this.elements.status.className = `md-status-message md-status-message--${type}`;
    this.elements.status.classList.remove('hidden');
  }

  /**
   * Shows the next steps section after successful setup.
   * Displays configuration guidance and API key setup information.
   * 
   * @private
   */
  showNextSteps() {
    this.elements.nextSteps.classList.remove('hidden');
    this.checkApiKeyConfiguration();
  }

  /**
   * Checks if API keys are configured in storage.
   * Validates API key configuration status and updates UI accordingly.
   * 
   * @async
   * @private
   */
  async checkApiKeyConfiguration() {
    try {
      const { apiKey } = await chrome.storage.local.get('apiKey');
      
      if (apiKey) {
        this.updateFirstStep();
      }
    } catch (error) {
      console.error('Error checking API key:', error);
    }
  }

  /**
   * Updates the first setup step when API key is configured.
   * Marks API configuration step as complete in the UI.
   * 
   * @private
   */
  updateFirstStep() {
    const firstStep = this.elements.nextSteps.querySelector('ol li:first-child');
    if (firstStep) {
      const strong = document.createElement("strong");
      strong.textContent = getMessage("step_api_configured");
      firstStep.textContent = "";
      firstStep.appendChild(strong);
    }
  }
}

// Initialize welcome manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new WelcomeManager();
});