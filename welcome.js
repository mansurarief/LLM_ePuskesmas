/**
 * Welcome Page Manager - Chrome Extension
 * Handles microphone permission requests and initial setup
 */
class WelcomeManager {
  constructor() {
    this.initializeElements();
    this.setupEventListeners();
    this.checkCurrentPermissions();
  }

  // ============================================================================
  // INITIALIZATION METHODS
  // ============================================================================

  initializeElements() {
    this.elements = {
      status: document.getElementById('status'),
      nextSteps: document.getElementById('nextSteps'),
      requestAccess: document.getElementById('requestAccess'),
      configureSettings: document.getElementById('configureSettings')
    };
  }

  setupEventListeners() {
    this.elements.requestAccess.addEventListener('click', () => this.requestMicrophoneAccess());
    this.elements.configureSettings.addEventListener('click', () => this.openSettings());
  }

  // ============================================================================
  // PERMISSION MANAGEMENT
  // ============================================================================

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

  async getMicrophoneStream() {
    return await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
  }

  async testMicrophone(stream) {
    this.showStatus('Testing microphone...', 'info');
    
    // Stop all tracks after testing
    stream.getTracks().forEach(track => track.stop());
  }

  async savePermissionStatus() {
    await chrome.storage.local.set({ 
      microphoneAccess: true,
      permissionGrantedAt: new Date().toISOString()
    });
  }

  handleSuccessfulPermission(button) {
    this.showStatus('✅ Microphone access granted successfully!', 'success');
    this.showNextSteps();
    
    // Update button
    button.textContent = '✓ Access Granted';
    button.className = 'btn-success';
  }

  handlePermissionError(error, button, originalText) {
    console.error('Error accessing microphone:', error);
    
    const errorMessage = this.getErrorMessage(error);
    this.showStatus(errorMessage, 'error');
    
    // Reset button
    button.textContent = originalText;
    button.disabled = false;
  }

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

  updateButtonState(button, text, disabled) {
    button.textContent = text;
    button.disabled = disabled;
  }

  // ============================================================================
  // NAVIGATION METHODS
  // ============================================================================

  openSettings() {
    chrome.runtime.openOptionsPage();
  }

  // ============================================================================
  // UI METHODS
  // ============================================================================

  showStatus(message, type) {
    this.elements.status.textContent = message;
    this.elements.status.className = `status-${type}`;
    this.elements.status.style.display = 'block';
  }

  showNextSteps() {
    this.elements.nextSteps.style.display = 'block';
    this.checkApiKeyConfiguration();
  }

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