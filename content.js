// content.js
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "updateSummary") {
      const summaryBox = document.getElementById('diagnose-comments');
      if (summaryBox) {
        summaryBox.value = request.summary;
      } else {
        console.error('Element with id "diagnose-comments" not found');
      }
    }
  });