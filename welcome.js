// welcome.js - Enhanced version with better UX
class WelcomeManager {
  constructor() {
    this.statusElement = document.getElementById('status');
    this.nextStepsElement = document.getElementById('nextSteps');
    
    this.setupEventListeners();
    this.checkCurrentPermissions();
  }

  setupEventListeners() {
    document.getElementById('requestAccess').addEventListener('click', () => this.requestMicrophoneAccess());
    document.getElementById('configureSettings').addEventListener('click', () => this.openSettings());
  }

  async checkCurrentPermissions() {
    try {
      const { microphoneAccess } = await chrome.storage.local.get('microphoneAccess');
      
      if (microphoneAccess) {
        this.showStatus('Microphone access already granted!', 'success');
        this.showNextSteps();
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  }

  async requestMicrophoneAccess() {
    const button = document.getElementById('requestAccess');
    const originalText = button.textContent;
    
    button.textContent = 'Requesting Access...';
    button.disabled = true;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // Test the microphone briefly
      this.showStatus('Testing microphone...', 'info');
      
      // Stop all tracks after testing
      stream.getTracks().forEach(track => track.stop());
      
      // Save permission status
      await chrome.storage.local.set({ 
        microphoneAccess: true,
        permissionGrantedAt: new Date().toISOString()
      });
      
      this.showStatus('✅ Microphone access granted successfully!', 'success');
      this.showNextSteps();
      
      // Update button
      button.textContent = '✓ Access Granted';
      button.className = 'btn-success';
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      
      let errorMessage = 'Error: Could not access microphone. ';
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Permission was denied. Please allow microphone access in your browser settings.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No microphone found. Please connect a microphone and try again.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Microphone is being used by another application.';
      } else {
        errorMessage += error.message;
      }
      
      this.showStatus(errorMessage, 'error');
      
      // Reset button
      button.textContent = originalText;
      button.disabled = false;
    }
  }

  openSettings() {
    chrome.runtime.openOptionsPage();
  }

  showStatus(message, type) {
    this.statusElement.textContent = message;
    this.statusElement.className = `status-${type}`;
    this.statusElement.style.display = 'block';
  }

  showNextSteps() {
    this.nextStepsElement.style.display = 'block';
    
    // Check if API key is already configured
    chrome.storage.local.get('apiKey').then(({ apiKey }) => {
      if (apiKey) {
        // Update first step to show it's complete
        const firstStep = this.nextStepsElement.querySelector('ol li:first-child');
        firstStep.innerHTML = '<strong>✓ OpenAI API key configured</strong>';
      }
    });
  }
}

// Initialize welcome manager
document.addEventListener('DOMContentLoaded', () => {
  new WelcomeManager();
});