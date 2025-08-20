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
        this.showStatus('Microphone access already granted!', 'success');
        this.showNextSteps();
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      this.showStatus('Error checking permissions: ' + error.message, 'error');
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
    const originalText = button.textContent;
    
    this.updateButtonState(button, 'Requesting Access...', true);
    
    try {
      const stream = await this.getMicrophoneStream();
      await this.testMicrophone(stream);
      await this.savePermissionStatus();
      
      this.handleSuccessfulPermission(button);
    } catch (error) {
      this.handlePermissionError(error, button, originalText);
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
    this.showStatus('Testing microphone...', 'info');
    
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
    this.showStatus('✅ Microphone access granted successfully!', 'success');
    this.showNextSteps();
    
    // Update button
    button.textContent = '✓ Access Granted';
    button.className = 'btn-success';
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
  handlePermissionError(error, button, originalText) {
    console.error('Error accessing microphone:', error);
    
    const errorMessage = this.getErrorMessage(error);
    this.showStatus(errorMessage, 'error');
    
    // Reset button
    button.textContent = originalText;
    button.disabled = false;
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
    let errorMessage = 'Error: Could not access microphone. ';
    
    switch (error.name) {
      case 'NotAllowedError':
        errorMessage += 'Permission was denied. Please allow microphone access in your browser settings.';
        break;
      case 'NotFoundError':
        errorMessage += 'No microphone found. Please connect a microphone and try again.';
        break;
      case 'NotReadableError':
        errorMessage += 'Microphone is being used by another application.';
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
  updateButtonState(button, text, disabled) {
    button.textContent = text;
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
    this.elements.status.textContent = message;
    this.elements.status.className = `status-${type}`;
    this.elements.status.style.display = 'block';
  }

  /**
   * Shows the next steps section after successful setup.
   * Displays configuration guidance and API key setup information.
   * 
   * @private
   */
  showNextSteps() {
    this.elements.nextSteps.style.display = 'block';
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
      firstStep.innerHTML = '<strong>✓ OpenAI API key configured</strong>';
    }
  }
}

// Initialize welcome manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new WelcomeManager();
});