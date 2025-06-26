// content.js - Enhanced version with better integration
class ContentIntegrator {
  constructor() {
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
    
    this.setupMessageListener();
    this.detectHealthcareSystems();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "updateSummary") {
        this.insertSummary(request.summary);
        sendResponse({ success: true });
      } else if (request.action === "detectFields") {
        const fields = this.detectMedicalFields();
        sendResponse({ fields: fields });
      }
    });
  }

  detectHealthcareSystems() {
    const url = window.location.href;
    const title = document.title.toLowerCase();
    
    // Detect specific healthcare systems
    if (url.includes('puskesmas') || title.includes('puskesmas')) {
      this.systemType = 'epuskesmas';
    } else if (url.includes('simrs') || title.includes('simrs')) {
      this.systemType = 'simrs';
    } else if (url.includes('hospital') || title.includes('hospital')) {
      this.systemType = 'hospital';
    } else {
      this.systemType = 'generic';
    }
    
    console.log(`Detected healthcare system: ${this.systemType}`);
  }

  detectMedicalFields() {
    const fields = [];
    
    this.targetSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        if (element && this.isVisible(element)) {
          fields.push({
            id: element.id,
            name: element.name,
            placeholder: element.placeholder,
            selector: selector,
            tagName: element.tagName,
            type: this.determineMedicalFieldType(element)
          });
        }
      });
    });
    
    return fields;
  }

  determineMedicalFieldType(element) {
    const text = (element.placeholder + ' ' + element.name + ' ' + element.id).toLowerCase();
    
    if (text.includes('diagnosis') || text.includes('diagnos')) {
      return 'diagnosis';
    } else if (text.includes('symptom') || text.includes('gejala')) {
      return 'symptoms';
    } else if (text.includes('treatment') || text.includes('terapi') || text.includes('pengobatan')) {
      return 'treatment';
    } else if (text.includes('note') || text.includes('catatan')) {
      return 'notes';
    } else if (text.includes('complaint') || text.includes('keluhan')) {
      return 'complaint';
    }
    
    return 'general';
  }

  isVisible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && element.offsetParent !== null;
  }

  insertSummary(summary) {
    let inserted = false;
    
    // Try primary target first
    const primaryTarget = document.getElementById('diagnose-comments');
    if (primaryTarget) {
      this.insertIntoElement(primaryTarget, summary);
      this.highlightElement(primaryTarget);
      inserted = true;
    } else {
      // Try alternative selectors
      for (const selector of this.targetSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          if (this.isVisible(element)) {
            this.insertIntoElement(element, summary);
            this.highlightElement(element);
            inserted = true;
            break;
          }
        }
        if (inserted) break;
      }
    }
    
    if (!inserted) {
      // Create floating notification if no target found
      this.createFloatingNotification(summary);
    }
    
    // Log insertion for debugging
    console.log(`Summary inserted: ${inserted}`);
  }

  insertIntoElement(element, summary) {
    const timestamp = new Date().toLocaleString('id-ID');
    const formattedSummary = `\n--- AI Medical Summary (${timestamp}) ---\n${summary}\n--- End Summary ---\n`;
    
    if (element.value) {
      // For input/textarea elements
      element.value = element.value + formattedSummary;
    } else {
      // For div/span elements
      element.textContent = element.textContent + formattedSummary;
    }
    
    // Trigger change event
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

  createFloatingNotification(summary) {
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
        <div style="
          font-size: 14px;
          line-height: 1.4;
          color: #333;
          white-space: pre-wrap;
        ">${summary}</div>
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
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 30 seconds
    setTimeout(() => {
      if (document.getElementById('medical-ai-notification')) {
        notification.remove();
      }
    }, 30000);
  }
}

// Initialize content integrator
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new ContentIntegrator());
} else {
  new ContentIntegrator();
}