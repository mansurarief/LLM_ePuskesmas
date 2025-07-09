/**
 * Options Page Manager - Chrome Extension
 * Handles settings configuration, template management, and API testing
 */
class OptionsManager {
  constructor() {
    this.defaultTemplates = [
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

    this.initializeElements();
    this.setupEventListeners();
    this.loadSettings();
    this.loadTemplates();
  }

  // ============================================================================
  // INITIALIZATION METHODS
  // ============================================================================

  initializeElements() {
    this.elements = {
      // Form elements
      apiProvider: document.getElementById('apiProvider'),
      apiKey: document.getElementById('apiKey'),
      transcriptionUrl: document.getElementById('transcriptionUrl'),
      summarizationUrl: document.getElementById('summarizationUrl'),
      language: document.getElementById('language'),
      gptModel: document.getElementById('gptModel'),
      audioQuality: document.getElementById('audioQuality'),
      maxRecordingTime: document.getElementById('maxRecordingTime'),
      enableRetry: document.getElementById('enableRetry'),
      saveRecordings: document.getElementById('saveRecordings'),
      enableOfflineMode: document.getElementById('enableOfflineMode'),
      enableTranslation: document.getElementById('enableTranslation'),
      
      // Buttons
      saveSettings: document.getElementById('saveSettings'),
      testConnection: document.getElementById('testConnection'),
      testLocalApis: document.getElementById('testLocalApis'),
      addTemplate: document.getElementById('addTemplate'),
      
      // Containers
      templatesContainer: document.getElementById('templatesContainer'),
      openaiConfig: document.getElementById('openaiConfig'),
      localConfig: document.getElementById('localConfig'),
      
      // Messages
      successMessage: document.getElementById('successMessage'),
      errorMessage: document.getElementById('errorMessage')
    };
  }

  setupEventListeners() {
    // Button event listeners
    this.elements.saveSettings.addEventListener('click', () => this.saveSettings());
    this.elements.testConnection.addEventListener('click', () => this.testConnection());
    this.elements.testLocalApis.addEventListener('click', () => this.testLocalApis());
    this.elements.addTemplate.addEventListener('click', () => this.addTemplate());
    
    // Form event listeners
    this.elements.apiProvider.addEventListener('change', () => this.toggleApiConfig());
    
    // Template management with event delegation
    this.elements.templatesContainer.addEventListener('click', (event) => {
      if (event.target.classList.contains('delete-template')) {
        const index = parseInt(event.target.dataset.index);
        this.deleteTemplate(index);
      }
    });
  }

  // ============================================================================
  // SETTINGS MANAGEMENT
  // ============================================================================

  async loadSettings() {
    try {
      const settings = await chrome.storage.local.get([
        'apiKey', 'language', 'gptModel', 'audioQuality', 'maxRecordingTime',
        'enableRetry', 'saveRecordings', 'enableOfflineMode', 'apiProvider',
        'transcriptionUrl', 'summarizationUrl', 'enableTranslation'
      ]);
      
      this.populateFormFields(settings);
      this.toggleApiConfig();
    } catch (error) {
      console.error('Error loading settings:', error);
      this.showMessage('Error loading settings: ' + error.message, 'error');
    }
  }

  populateFormFields(settings) {
    const fieldMappings = {
      apiProvider: settings.apiProvider || 'openai',
      apiKey: settings.apiKey || '',
      transcriptionUrl: settings.transcriptionUrl || 'http://localhost:5001',
      summarizationUrl: settings.summarizationUrl || 'http://localhost:5002',
      language: settings.language || 'id',
      gptModel: settings.gptModel || 'gpt-3.5-turbo',
      audioQuality: settings.audioQuality || 'medium',
      maxRecordingTime: settings.maxRecordingTime || 10,
      enableRetry: settings.enableRetry !== false,
      saveRecordings: settings.saveRecordings || false,
      enableOfflineMode: settings.enableOfflineMode || false,
      enableTranslation: settings.enableTranslation || false
    };

    Object.entries(fieldMappings).forEach(([fieldName, value]) => {
      const element = this.elements[fieldName];
      if (element) {
        if (element.type === 'checkbox') {
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
      this.showMessage('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showMessage('Error saving settings: ' + error.message, 'error');
    }
  }

  collectFormData() {
    return {
      apiProvider: this.elements.apiProvider.value,
      apiKey: this.elements.apiKey.value,
      transcriptionUrl: this.elements.transcriptionUrl.value,
      summarizationUrl: this.elements.summarizationUrl.value,
      language: this.elements.language.value,
      gptModel: this.elements.gptModel.value,
      audioQuality: this.elements.audioQuality.value,
      maxRecordingTime: parseInt(this.elements.maxRecordingTime.value),
      enableRetry: this.elements.enableRetry.checked,
      saveRecordings: this.elements.saveRecordings.checked,
      enableOfflineMode: this.elements.enableOfflineMode.checked,
      enableTranslation: this.elements.enableTranslation.checked,
    };
  }

  toggleApiConfig() {
    const apiProvider = this.elements.apiProvider.value;
    const configVisibility = {
      local: { openai: false, local: true },
      openai: { openai: true, local: false },
      hybrid: { openai: true, local: true },
      hf: { openai: false, local: false }
    };

    const visibility = configVisibility[apiProvider] || { openai: false, local: false };
    
    this.elements.openaiConfig.style.display = visibility.openai ? 'block' : 'none';
    this.elements.localConfig.style.display = visibility.local ? 'block' : 'none';
  }

  // ============================================================================
  // TEMPLATE MANAGEMENT
  // ============================================================================

  async loadTemplates() {
    try {
      const { medicalTemplates } = await chrome.storage.local.get('medicalTemplates');
      const templates = medicalTemplates || this.defaultTemplates;
      this.renderTemplates(templates);
    } catch (error) {
      console.error('Error loading templates:', error);
      this.showMessage('Error loading templates: ' + error.message, 'error');
    }
  }

  renderTemplates(templates) {
    this.elements.templatesContainer.innerHTML = '';
    
    templates.forEach((template, index) => {
      const templateElement = this.createTemplateElement(template, index);
      this.elements.templatesContainer.appendChild(templateElement);
    });
  }

  createTemplateElement(template, index) {
    const templateDiv = document.createElement('div');
    templateDiv.className = 'template-item';
    templateDiv.innerHTML = `
      <div class="template-header">
        <strong>${template.name}</strong>
        <button class="delete-template" data-index="${index}">Delete</button>
      </div>
      <textarea readonly>${template.prompt}</textarea>
    `;
    return templateDiv;
  }

  addTemplate() {
    const templateName = prompt('Template name:');
    const templatePrompt = prompt('Template prompt:');
    
    if (templateName && templatePrompt) {
      this.saveNewTemplate(templateName, templatePrompt);
    }
  }

  async saveNewTemplate(name, prompt) {
    try {
      const { medicalTemplates } = await chrome.storage.local.get('medicalTemplates');
      const templates = medicalTemplates || this.defaultTemplates;
      templates.push({ name, prompt });
      
      await chrome.storage.local.set({ medicalTemplates: templates });
      this.loadTemplates();
      this.showMessage('Template added successfully!', 'success');
    } catch (error) {
      console.error('Error adding template:', error);
      this.showMessage('Error adding template: ' + error.message, 'error');
    }
  }

  async deleteTemplate(index) {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }
    
    try {
      const { medicalTemplates } = await chrome.storage.local.get('medicalTemplates');
      const templates = medicalTemplates || this.defaultTemplates;
      templates.splice(index, 1);
      
      await chrome.storage.local.set({ medicalTemplates: templates });
      this.loadTemplates();
      this.showMessage('Template deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting template:', error);
      this.showMessage('Error deleting template: ' + error.message, 'error');
    }
  }

  // ============================================================================
  // API TESTING METHODS
  // ============================================================================

  async testConnection() {
    try {
      const { apiKey } = await chrome.storage.local.get('apiKey');
      
      if (!apiKey) {
        this.showMessage('Please enter your API key first.', 'error');
        return;
      }
      
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      
      if (response.ok) {
        this.showMessage('API connection successful!', 'success');
      } else {
        this.showMessage('API connection failed. Please check your API key.', 'error');
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      this.showMessage('Connection test failed: ' + error.message, 'error');
    }
  }

  async testLocalApis() {
    const transcriptionUrl = this.elements.transcriptionUrl.value;
    const summarizationUrl = this.elements.summarizationUrl.value;
    
    const results = await this.testApiEndpoints(transcriptionUrl, summarizationUrl);
    this.displayApiTestResults(results);
  }

  async testApiEndpoints(transcriptionUrl, summarizationUrl) {
    const results = {
      transcription: await this.testSingleApi(transcriptionUrl, 'Transcription'),
      summarization: await this.testSingleApi(summarizationUrl, 'Summarization')
    };
    
    return results;
  }

  async testSingleApi(url, apiName) {
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: `✅ ${apiName} API: ${data.status} (${data.device})`
        };
      } else {
        return {
          success: false,
          message: `❌ ${apiName} API: HTTP ${response.status}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `❌ ${apiName} API: Connection failed - ${error.message}`
      };
    }
  }

  displayApiTestResults(results) {
    const allHealthy = results.transcription.success && results.summarization.success;
    let statusMessage = '';
    
    statusMessage += results.transcription.message + '\n';
    statusMessage += results.summarization.message + '\n';
    
    if (allHealthy) {
      statusMessage += '\n🎉 All local APIs are working correctly!';
      this.showMessage(statusMessage, 'success');
    } else {
      statusMessage += '\n⚠️ Some APIs are not responding. Make sure they are running.';
      this.showMessage(statusMessage, 'error');
    }
  }

  // ============================================================================
  // UI UTILITY METHODS
  // ============================================================================

  showMessage(message, type) {
    this.elements.successMessage.style.display = 'none';
    this.elements.errorMessage.style.display = 'none';
    
    const targetElement = type === 'success' ? this.elements.successMessage : this.elements.errorMessage;
    targetElement.innerHTML = message.replace(/\n/g, '<br>');
    targetElement.style.display = 'block';
    
    setTimeout(() => {
      this.elements.successMessage.style.display = 'none';
      this.elements.errorMessage.style.display = 'none';
    }, 8000);
  }
}

// Initialize options manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new OptionsManager();
});