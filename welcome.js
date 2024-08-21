// welcome.js
document.getElementById('requestAccess').addEventListener('click', () => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        document.getElementById('status').textContent = 'Microphone access granted!';
        chrome.storage.local.set({ microphoneAccess: true }, () => {
          console.log('Microphone access status saved');
        });
        stream.getTracks().forEach(track => track.stop());
      })
      .catch(err => {
        console.error('Error accessing microphone:', err);
        document.getElementById('status').textContent = 'Error: Could not access microphone';
      });
  });