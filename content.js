/**
 * Content Integrator - Chrome Extension
 * Handles integration with healthcare systems and summary insertion
 */
class ContentIntegrator {
  constructor() {
    this.initializeProperties();
    this.setupMessageListener();
    this.detectHealthcareSystems();
    console.log("🏥 Medical Audio Recorder Content Script Initialized");
  }

  // ============================================================================
  // INITIALIZATION METHODS
  // ============================================================================

  initializeProperties() {
    this.targetSelectors = [
      '#diagnose-comments',
      '[name="diagnosis"]',
      '[name="notes"]',
      '[name="summary"]',
      'textarea[placeholder*="diagnosis"]',
      'textarea[placeholder*="notes"]',
      '.medical-notes',
      '.diagnosis-field',
      '.consultation-notes'
    ];
    
    this.systemType = 'generic';
    this.isInitialized = false;
  }

  setupMessageListener() {
    try {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log("Content script received message:", request);
        
        if (request.action === "updateSummary") {
          console.log("Processing updateSummary action");
          this.insertSummary(request.summary);
          sendResponse({ success: true });
        } else if (request.action === "ping") {
          console.log("Content script ping received");
          sendResponse({ success: true, message: "Content script is active" });
        }
        
        // Return true to indicate we will send a response asynchronously
        return true;
      });
      
      console.log("Content script message listener setup complete");
      this.isInitialized = true;
    } catch (error) {
      console.error("Error setting up message listener:", error);
    }
  }

  // ============================================================================
  // HEALTHCARE SYSTEM DETECTION
  // ============================================================================

  detectHealthcareSystems() {
    const url = window.location.href;
    const title = document.title.toLowerCase();
    
    const systemPatterns = {
      epuskesmas: ['puskesmas'],
      simrs: ['simrs'],
      hospital: ['hospital']
    };
    
    for (const [system, patterns] of Object.entries(systemPatterns)) {
      if (patterns.some(pattern => url.includes(pattern) || title.includes(pattern))) {
        this.systemType = system;
        break;
      }
    }
    
    console.log(`Detected healthcare system: ${this.systemType}`);
  }

  // ============================================================================
  // SUMMARY INSERTION METHODS
  // ============================================================================

  insertSummary(summary) {
    console.log("Received summary:", summary);
    
    // Try to parse JSON summary first
    const parsedData = this.parseSummaryJSON(summary);
    
    if (parsedData) {
      console.log("✅ JSON parsing successful, populating specific fields");
      // Populate specific fields with parsed data
      this.populateSpecificFields(parsedData);
      return;
    }
    
    console.log("❌ JSON parsing failed, falling back to original insertion method");
    // Fallback to original insertion method
    let inserted = false;
    
    // Try primary target first
    const primaryTarget = document.getElementById('diagnose-comments');
    if (primaryTarget) {
      this.insertIntoElement(primaryTarget, summary);
      this.highlightElement(primaryTarget);
      inserted = true;
    } else {
      // Try alternative selectors
      inserted = this.tryAlternativeSelectors(summary);
    }
    
    if (!inserted) {
      this.createFloatingNotification(summary);
    }
    
    console.log(`Summary inserted: ${inserted}`);
  }

  parseSummaryJSON(summary) {
    try {
      console.log("Attempting to parse summary:", summary);
      
      let jsonString = summary.trim();
      
      // First, try to extract JSON from the full summary format
      // The summary might be wrapped with timestamps and formatting
      if (summary.includes('--- AI Medical Summary')) {
        const startIndex = summary.indexOf('{');
        const endIndex = summary.lastIndexOf('}');
        if (startIndex !== -1 && endIndex !== -1) {
          jsonString = summary.substring(startIndex, endIndex + 1);
          console.log("Extracted JSON from timestamp wrapper:", jsonString);
        }
      }
      
      // Check if the string is already valid JSON
      if (jsonString.startsWith('{') && jsonString.endsWith('}')) {
        try {
          const parsed = JSON.parse(jsonString);
          console.log("Raw parsed JSON:", parsed);
          
          // Check if it has the expected structure
          if (parsed.chief_complaint || parsed.additional_complaint || parsed.history_of_present_illness || parsed.past_medical_history || parsed.family_history || parsed.recommended_medication_therapy || parsed.recommended_non_medication_therapy || parsed.education) {
            console.log("✅ Successfully parsed JSON data:", parsed);
            return parsed;
          } else {
            console.log("Parsed JSON but missing expected fields. Available fields:", Object.keys(parsed));
            console.log("Expected fields: chief_complaint, additional_complaint, history_of_present_illness, past_medical_history, family_history, recommended_medication_therapy, recommended_non_medication_therapy, education");
          }
        } catch (parseError) {
          console.log("Failed to parse as JSON:", parseError.message);
        }
      }
      
      // Fallback: Look for JSON pattern in the summary
      const jsonMatch = jsonString.match(/\{.*\}/);
      if (jsonMatch) {
        const extractedJson = jsonMatch[0];
        console.log("Found JSON pattern:", extractedJson);
        const parsed = JSON.parse(extractedJson);
        
        // Check if it has the expected structure
        if (parsed.chief_complaint || parsed.additional_complaint || parsed.history_of_present_illness || parsed.past_medical_history || parsed.family_history || parsed.recommended_medication_therapy || parsed.recommended_non_medication_therapy || parsed.education) {
          console.log("✅ Successfully parsed JSON data from pattern match:", parsed);
          return parsed;
        } else {
          console.log("Parsed JSON but missing expected fields. Available fields:", Object.keys(parsed));
        }
      } else {
        console.log("No JSON pattern found in summary");
        console.log("Summary content:", summary);
      }
    } catch (error) {
      console.error("Error parsing JSON summary:", error);
    }
    
    return null;
  }

  populateSpecificFields(parsedData) {
    let fieldsPopulated = 0;
    console.log("Starting to populate fields with data:", parsedData);
    
    // Define field mappings for ePuskesmas form structure
    const fieldMappings = [
      {
        jsonKey: 'chief_complaint',
        selectors: [
          '[name="Anamnesa[keluhan_utama]"]',
          '#keluhan',
          'textarea[placeholder*="Keluhan Utama"]',
          'textarea[placeholder*="main complaint"]',
          'input[name*="keluhan_utama"]',
          'textarea[name*="keluhan_utama"]'
        ]
      },
      {
        jsonKey: 'additional_complaint',
        selectors: [
          '[name="Anamnesa[keluhan_tambahan]"]',
          '#keluhan-tambahan',
          'textarea[placeholder*="Keluhan Tambahan"]',
          'textarea[placeholder*="additional complaint"]',
          'input[name*="keluhan_tambahan"]',
          'textarea[name*="keluhan_tambahan"]'
        ]
      },
      {
        jsonKey: 'history_of_present_illness',
        selectors: [
          '[name="MRiwayatPasien[Riwayat Penyakit Sekarang][value]"]',
          '#text_rps',
          'textarea[placeholder*="Riwayat Penyakit Sekarang"]',
          'textarea[placeholder*="current medical history"]',
          'textarea[name*="rps"]',
          'input[name*="rps"]'
        ]
      },
      {
        jsonKey: 'past_medical_history',
        selectors: [
          '[name="MRiwayatPasien[Riwayat Penyakit Dulu][value]"]',
          '#text_rpd',
          'textarea[placeholder*="Riwayat Penyakit Dulu"]',
          'textarea[placeholder*="past medical history"]',
          'textarea[name*="rpd"]',
          'input[name*="rpd"]'
        ]
      },
      {
        jsonKey: 'family_history',
        selectors: [
          '[name="MRiwayatPasien[Riwayat Penyakit Keluarga][value]"]',
          '#text_rpk',
          'textarea[placeholder*="Riwayat Penyakit Keluarga"]',
          'textarea[placeholder*="family medical history"]',
          'textarea[name*="rpk"]',
          'input[name*="rpk"]'
        ]
      },
      {
        jsonKey: 'recommended_medication_therapy',
        selectors: [
          '[name="Anamnesa[terapi]"]',
          '#text_terapi',
          'textarea[placeholder*="Terapi Obat"]',
          'textarea[placeholder*="medication therapy"]',
          'textarea[name*="terapi"]',
          'input[name*="terapi"]'
        ]
      },
      {
        jsonKey: 'recommended_non_medication_therapy',
        selectors: [
          '[name="Anamnesa[terapi_non_obat]"]',
          '#text_terapi_non_obat',
          'textarea[placeholder*="Terapi Non Obat"]',
          'textarea[placeholder*="non-medication therapy"]',
          'textarea[name*="terapi_non_obat"]',
          'input[name*="terapi_non_obat"]'
        ]
      },
      {
        jsonKey: 'education',
        selectors: [
          '[name="Anamnesa[edukasi]"]',
          '#text_edukasi',
          'textarea[placeholder*="Edukasi"]',
          'textarea[placeholder*="patient education"]',
          'textarea[name*="edukasi"]',
          'input[name*="edukasi"]'
        ]
      }
    ];
    
    // Try to populate each field
    for (const fieldMapping of fieldMappings) {
      const jsonValue = parsedData[fieldMapping.jsonKey];
      if (jsonValue) {
        console.log(`Looking for field: ${fieldMapping.jsonKey} with value: ${jsonValue}`);
        
        for (const selector of fieldMapping.selectors) {
          const element = document.querySelector(selector);
          if (element) {
            console.log(`Found element for ${fieldMapping.jsonKey} using selector: ${selector}`);
            element.value = jsonValue;
            this.highlightElement(element);
            fieldsPopulated++;
            console.log(`✅ Populated ${fieldMapping.jsonKey}: ${jsonValue}`);
            break; // Found and populated this field, move to next
          }
        }
        
        if (fieldsPopulated === 0) {
          console.log(`❌ No element found for ${fieldMapping.jsonKey}`);
        }
      } else {
        console.log(`No value found for ${fieldMapping.jsonKey}`);
      }
    }
    
    if (fieldsPopulated > 0) {
      console.log(`✅ Successfully populated ${fieldsPopulated} fields`);
      // Show success notification
      this.showSuccessNotification(parsedData);
    } else {
      console.log("❌ No matching fields found, creating floating notification");
      this.createFloatingNotification(JSON.stringify(parsedData, null, 2));
    }
  }

  showSuccessNotification(parsedData) {
    // Remove existing notification
    const existing = document.getElementById('medical-ai-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.id = 'medical-ai-notification';
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border: 2px solid #28a745;
        border-radius: 10px;
        padding: 20px;
        max-width: 400px;
        max-height: 500px;
        overflow-y: auto;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          border-bottom: 1px solid #eee;
          padding-bottom: 10px;
        ">
          <h3 style="margin: 0; color: #28a745; font-size: 16px;">✅ Summary Applied</h3>
          <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #666;
          ">×</button>
        </div>
        <div style="
          font-size: 14px;
          line-height: 1.4;
          color: #333;
        ">
          <strong>Keluhan Utama:</strong><br>
          ${parsedData.chief_complaint || 'N/A'}<br><br>
          <strong>Keluhan Tambahan:</strong><br>
          ${parsedData.additional_complaint || 'N/A'}<br><br>
          <strong>RPS (Riwayat Penyakit Sekarang):</strong><br>
          ${parsedData.history_of_present_illness || 'N/A'}<br><br>
          <strong>RPD (Riwayat Penyakit Dahulu):</strong><br>
          ${parsedData.past_medical_history || 'N/A'}<br><br>
          <strong>RPK (Riwayat Penyakit Keluarga):</strong><br>
          ${parsedData.family_history || 'N/A'}<br><br>
          <strong>Terapi Obat yang Dianjurkan:</strong><br>
          ${parsedData.recommended_medication_therapy || 'N/A'}<br><br>
          <strong>Terapi Non Obat yang Dianjurkan:</strong><br>
          ${parsedData.recommended_non_medication_therapy || 'N/A'}<br><br>
          <strong>Edukasi:</strong><br>
          ${parsedData.education || 'N/A'}
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (document.getElementById('medical-ai-notification')) {
        notification.remove();
      }
    }, 5000);
  }

  tryAlternativeSelectors(summary) {
    for (const selector of this.targetSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        if (this.isVisible(element)) {
          this.insertIntoElement(element, summary);
          this.highlightElement(element);
          return true;
        }
      }
    }
    return false;
  }

  insertIntoElement(element, summary) {
    const timestamp = new Date().toLocaleString('id-ID');
    const formattedSummary = `\n--- AI Medical Summary (${timestamp}) ---\n${summary}\n--- End Summary ---\n`;
    
    if (element.value !== undefined) {
      // For input/textarea elements
      element.value = element.value + formattedSummary;
    } else {
      // For div/span elements
      element.textContent = element.textContent + formattedSummary;
    }
    
    this.triggerElementEvents(element);
  }

  triggerElementEvents(element) {
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }

  highlightElement(element) {
    const originalStyle = element.style.cssText;
    element.style.transition = 'all 0.3s ease';
    element.style.backgroundColor = '#fff3cd';
    element.style.border = '2px solid #ffc107';
    
    setTimeout(() => {
      element.style.cssText = originalStyle;
    }, 3000);
  }

  isVisible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           element.offsetParent !== null;
  }

  // ============================================================================
  // FLOATING NOTIFICATION METHODS
  // ============================================================================

  createFloatingNotification(summary) {
    this.removeExistingNotification();
    
    const notification = this.createNotificationElement(summary);
    document.body.appendChild(notification);
    
    this.setupNotificationAutoRemove(notification);
  }

  removeExistingNotification() {
    const existing = document.getElementById('medical-ai-notification');
    if (existing) existing.remove();
  }

  createNotificationElement(summary) {
    const notification = document.createElement('div');
    notification.id = 'medical-ai-notification';
    notification.innerHTML = this.getNotificationHTML(summary);
    return notification;
  }

  getNotificationHTML(summary) {
    return `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border: 2px solid #007bff;
        border-radius: 10px;
        padding: 20px;
        max-width: 400px;
        max-height: 300px;
        overflow-y: auto;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        ${this.getNotificationHeader()}
        ${this.getNotificationContent(summary)}
        ${this.getNotificationFooter(summary)}
      </div>
    `;
  }

  getNotificationHeader() {
    return `
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        border-bottom: 1px solid #eee;
        padding-bottom: 10px;
      ">
        <h3 style="margin: 0; color: #007bff; font-size: 16px;">🏥 AI Medical Summary</h3>
        <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #666;
        ">×</button>
      </div>
    `;
  }

  getNotificationContent(summary) {
    return `
      <div style="
        font-size: 14px;
        line-height: 1.4;
        color: #333;
        white-space: pre-wrap;
      ">${summary}</div>
    `;
  }

  getNotificationFooter(summary) {
    return `
      <div style="
        margin-top: 15px;
        text-align: center;
      ">
        <button onclick="navigator.clipboard.writeText('${summary.replace(/'/g, "\\'")}'); this.textContent='Copied!'" style="
          background: #007bff;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 13px;
        ">Copy to Clipboard</button>
      </div>
    `;
  }

  setupNotificationAutoRemove(notification) {
    setTimeout(() => {
      if (document.getElementById('medical-ai-notification')) {
        notification.remove();
      }
    }, 30000);
  }
}

// Initialize content integrator with multiple initialization strategies
function initializeContentScript() {
  try {
    console.log("🏥 Initializing Medical Audio Recorder Content Script...");
    
    // Check if already initialized
    if (window.medicalContentScript) {
      console.log("Content script already initialized");
      return;
    }
    
    // Create and initialize the content integrator
    const contentIntegrator = new ContentIntegrator();
    
    // Store reference globally for debugging
    window.medicalContentScript = contentIntegrator;
    
    console.log("✅ Content script initialization complete");
    
    // Send a ready signal to the background script
    if (chrome && chrome.runtime) {
      chrome.runtime.sendMessage({ 
        action: "contentScriptReady", 
        url: window.location.href,
        timestamp: Date.now()
      }).catch(() => {
        // Ignore errors if background script is not available
      });
    }
    
  } catch (error) {
    console.error("❌ Error initializing content script:", error);
  }
}

// Multiple initialization strategies
if (document.readyState === 'loading') {
  // Document is still loading
  document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
  // Document is already loaded
  initializeContentScript();
}

// Also try to initialize after a short delay as a fallback
setTimeout(() => {
  if (!window.medicalContentScript) {
    console.log("🔄 Retrying content script initialization...");
    initializeContentScript();
  }
}, 1000);