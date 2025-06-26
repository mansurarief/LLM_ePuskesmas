// options.js
  document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    loadTemplates();
    
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
    document.getElementById('testConnection').addEventListener('click', testConnection);
    document.getElementById('testLocalApis').addEventListener('click', testLocalApis);
    document.getElementById('addTemplate').addEventListener('click', addTemplate);
    document.getElementById('apiProvider').addEventListener('change', toggleApiConfig);
    
    // Add event delegation for delete buttons
    document.getElementById('templatesContainer').addEventListener('click', function(event) {
      if (event.target.classList.contains('delete-template')) {
        const index = parseInt(event.target.dataset.index);
        deleteTemplate(index);
      }
    });
  });
  
  const defaultTemplates = [
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
  
  async function loadSettings() {
    const settings = await chrome.storage.local.get([
      'apiKey', 'language', 'gptModel', 'audioQuality', 'maxRecordingTime',
      'enableRetry', 'saveRecordings', 'enableOfflineMode', 'apiProvider',
      'transcriptionUrl', 'summarizationUrl'
    ]);
    
    document.getElementById('apiProvider').value = settings.apiProvider || 'openai';
    document.getElementById('apiKey').value = settings.apiKey || '';
    document.getElementById('transcriptionUrl').value = settings.transcriptionUrl || 'http://localhost:5001';
    document.getElementById('summarizationUrl').value = settings.summarizationUrl || 'http://localhost:5002';
    document.getElementById('language').value = settings.language || 'id';
    document.getElementById('gptModel').value = settings.gptModel || 'gpt-3.5-turbo';
    document.getElementById('audioQuality').value = settings.audioQuality || 'medium';
    document.getElementById('maxRecordingTime').value = settings.maxRecordingTime || 10;
    document.getElementById('enableRetry').checked = settings.enableRetry || true;
    document.getElementById('saveRecordings').checked = settings.saveRecordings || false;
    document.getElementById('enableOfflineMode').checked = settings.enableOfflineMode || false;
    
    toggleApiConfig();
  }
  
  async function loadTemplates() {
    const { medicalTemplates } = await chrome.storage.local.get('medicalTemplates');
    const templates = medicalTemplates || defaultTemplates;
    
    const container = document.getElementById('templatesContainer');
    container.innerHTML = '';
    
    templates.forEach((template, index) => {
      const templateDiv = document.createElement('div');
      templateDiv.className = 'template-item';
      templateDiv.innerHTML = `
        <div class="template-header">
          <strong>${template.name}</strong>
          <button class="delete-template" data-index="${index}">Delete</button>
        </div>
        <textarea readonly>${template.prompt}</textarea>
      `;
      container.appendChild(templateDiv);
    });
  }
  
  async function saveSettings() {
    const settings = {
      apiProvider: document.getElementById('apiProvider').value,
      apiKey: document.getElementById('apiKey').value,
      transcriptionUrl: document.getElementById('transcriptionUrl').value,
      summarizationUrl: document.getElementById('summarizationUrl').value,
      language: document.getElementById('language').value,
      gptModel: document.getElementById('gptModel').value,
      audioQuality: document.getElementById('audioQuality').value,
      maxRecordingTime: parseInt(document.getElementById('maxRecordingTime').value),
      enableRetry: document.getElementById('enableRetry').checked,
      saveRecordings: document.getElementById('saveRecordings').checked,
      enableOfflineMode: document.getElementById('enableOfflineMode').checked
    };
    
    try {
      await chrome.storage.local.set(settings);
      showMessage('Settings saved successfully!', 'success');
    } catch (error) {
      showMessage('Error saving settings: ' + error.message, 'error');
    }
  }
  
  async function testConnection() {
    const { apiKey } = await chrome.storage.local.get('apiKey');
    
    if (!apiKey) {
      showMessage('Please enter your API key first.', 'error');
      return;
    }
    
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      
      if (response.ok) {
        showMessage('API connection successful!', 'success');
      } else {
        showMessage('API connection failed. Please check your API key.', 'error');
      }
    } catch (error) {
      showMessage('Connection test failed: ' + error.message, 'error');
    }
  }
  
  function addTemplate() {
    const templateName = prompt('Template name:');
    const templatePrompt = prompt('Template prompt:');
    
    if (templateName && templatePrompt) {
      chrome.storage.local.get('medicalTemplates').then(({ medicalTemplates }) => {
        const templates = medicalTemplates || defaultTemplates;
        templates.push({ name: templateName, prompt: templatePrompt });
        chrome.storage.local.set({ medicalTemplates: templates });
        loadTemplates();
      });
    }
  }
  
  async function deleteTemplate(index) {
    // Add confirmation dialog
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }
    
    const { medicalTemplates } = await chrome.storage.local.get('medicalTemplates');
    const templates = medicalTemplates || defaultTemplates;
    templates.splice(index, 1);
    await chrome.storage.local.set({ medicalTemplates: templates });
    loadTemplates();
    showMessage('Template deleted successfully!', 'success');
  }
  
  function toggleApiConfig() {
    const apiProvider = document.getElementById('apiProvider').value;
    const openaiConfig = document.getElementById('openaiConfig');
    const localConfig = document.getElementById('localConfig');
    
    if (apiProvider === 'local') {
      openaiConfig.style.display = 'none';
      localConfig.style.display = 'block';
    } else if (apiProvider === 'openai') {
      openaiConfig.style.display = 'block';
      localConfig.style.display = 'none';
    } else if (apiProvider === 'hybrid') {
      openaiConfig.style.display = 'block';
      localConfig.style.display = 'block';
    }
  }
  
  async function testLocalApis() {
    const transcriptionUrl = document.getElementById('transcriptionUrl').value;
    const summarizationUrl = document.getElementById('summarizationUrl').value;
    
    let allHealthy = true;
    let statusMessage = '';
    
    // Test transcription API
    try {
      const transcriptionResponse = await fetch(`${transcriptionUrl}/health`);
      if (transcriptionResponse.ok) {
        const data = await transcriptionResponse.json();
        statusMessage += `✅ Transcription API: ${data.status} (${data.device})\n`;
      } else {
        statusMessage += `❌ Transcription API: HTTP ${transcriptionResponse.status}\n`;
        allHealthy = false;
      }
    } catch (error) {
      statusMessage += `❌ Transcription API: Connection failed - ${error.message}\n`;
      allHealthy = false;
    }
    
    // Test summarization API
    try {
      const summarizationResponse = await fetch(`${summarizationUrl}/health`);
      if (summarizationResponse.ok) {
        const data = await summarizationResponse.json();
        statusMessage += `✅ Summarization API: ${data.status} (${data.device})\n`;
      } else {
        statusMessage += `❌ Summarization API: HTTP ${summarizationResponse.status}\n`;
        allHealthy = false;
      }
    } catch (error) {
      statusMessage += `❌ Summarization API: Connection failed - ${error.message}\n`;
      allHealthy = false;
    }
    
    if (allHealthy) {
      statusMessage += '\n🎉 All local APIs are working correctly!';
      showMessage(statusMessage, 'success');
    } else {
      statusMessage += '\n⚠️ Some APIs are not responding. Make sure they are running.';
      showMessage(statusMessage, 'error');
    }
  }

  function showMessage(message, type) {
    const successDiv = document.getElementById('successMessage');
    const errorDiv = document.getElementById('errorMessage');
    
    successDiv.style.display = 'none';
    errorDiv.style.display = 'none';
    
    if (type === 'success') {
      successDiv.innerHTML = message.replace(/\n/g, '<br>');
      successDiv.style.display = 'block';
    } else {
      errorDiv.innerHTML = message.replace(/\n/g, '<br>');
      errorDiv.style.display = 'block';
    }
    
    setTimeout(() => {
      successDiv.style.display = 'none';
      errorDiv.style.display = 'none';
    }, 8000);
  }