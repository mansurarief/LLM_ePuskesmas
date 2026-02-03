/**
 * @fileoverview Translation utility for selective locale loading.
 * Allows overriding the browser's default locale with a user-selected language.
 */

let forcedMessages = null;

/**
 * Initializes the translation system by loading the user's preferred language.
 * @returns {Promise<void>}
 */
export async function initTranslations() {
  try {
    const result = await chrome.storage.local.get("language");
    const preferredLang = result.language || "id";
    const browserLang = chrome.i18n.getUILanguage().split("-")[0];

    // Only fetch manually if the preferred language differs from the browser's UI language
    if (preferredLang !== browserLang) {
      const url = chrome.runtime.getURL(`_locales/${preferredLang}/messages.json`);
      const response = await fetch(url);
      if (response.ok) {
        forcedMessages = await response.json();
        console.log(`Forced locale loaded: ${preferredLang}`);
      }
    }
  } catch (error) {
    console.error("Error initializing translations:", error);
  }
}

/**
 * Retrieves a localized message, checking forced messages first, then falling back to chrome.i18n.
 * 
 * @param {string} key - The message key
 * @returns {string} The localized message
 */
export function getMessage(key) {
  if (forcedMessages && forcedMessages[key]) {
    return forcedMessages[key].message;
  }
  return chrome.i18n.getMessage(key) || key;
}

/**
 * Localizes the entire HTML page by traversing DOM nodes.
 * This avoids CSP violations caused by setting innerHTML.
 */
export function localizeHtmlPage() {
  const processNode = (node) => {
    // Localize text nodes
    if (node.nodeType === Node.TEXT_NODE) {
      const originalText = node.nodeValue;
      const localizedText = originalText.replace(/__MSG_(\w+)__/g, (match, v1) => {
        return getMessage(v1) || match;
      });
      if (localizedText !== originalText) {
        node.nodeValue = localizedText;
      }
    } 
    // Localize attributes of element nodes
    else if (node.nodeType === Node.ELEMENT_NODE) {
      const attributes = ["title", "placeholder", "alt", "aria-label"];
      for (const attr of attributes) {
        if (node.hasAttribute(attr)) {
          const originalAttr = node.getAttribute(attr);
          const localizedAttr = originalAttr.replace(/__MSG_(\w+)__/g, (match, v1) => {
            return getMessage(v1) || match;
          });
          if (localizedAttr !== originalAttr) {
            node.setAttribute(attr, localizedAttr);
          }
        }
      }
      // Recursively process children
      for (const child of node.childNodes) {
        processNode(child);
      }
    }
  };

  processNode(document.documentElement);
}
