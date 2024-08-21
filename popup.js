// popup.js
let mediaRecorder;
let audioChunks = [];

document.addEventListener('DOMContentLoaded', function() {
  const startRecordingButton = document.getElementById('startRecording');
  const stopRecordingButton = document.getElementById('stopRecording');
  const processAudioButton = document.getElementById('processAudio');
  const recordingStatus = document.getElementById('recordingStatus');
  const resultDiv = document.getElementById('result');
  const requestMicPermissionButton = document.getElementById('openWelcomePage');

  chrome.storage.local.get('microphoneAccess', function(data) {
    if (data.microphoneAccess) {
      startRecordingButton.disabled = false;
      requestMicPermissionButton.style.display = 'none';
    } else {
      recordingStatus.textContent = 'Please grant microphone access in the extension settings.';
      requestMicPermissionButton.style.display = 'block';
    }
  });

  startRecordingButton.addEventListener('click', startRecording);
  stopRecordingButton.addEventListener('click', stopRecording);
  processAudioButton.addEventListener('click', processAudio);
  requestMicPermissionButton.addEventListener('click', openWelcomePage);

  function openWelcomePage() {
    chrome.tabs.create({
      url: chrome.runtime.getURL("welcome.html"),
      active: true
  });
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        processAudioButton.disabled = false;
      };

      mediaRecorder.start();
      startRecordingButton.disabled = true;
      stopRecordingButton.disabled = false;
      recordingStatus.textContent = 'Recording...';
    } catch (error) {
      console.error('Error accessing microphone:', error);
      recordingStatus.textContent = 'Error: Could not access microphone';
      requestMicPermissionButton.style.display = 'block';
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      startRecordingButton.disabled = false;
      stopRecordingButton.disabled = true;
      recordingStatus.textContent = 'Recording stopped';
    }
  }

  async function processAudio() {
    if (audioChunks.length === 0) {
      alert('No audio recorded');
      return;
    }

    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    try {
      resultDiv.textContent = 'Processing audio...';

      // Step 1: Transcribe audio using Whisper API
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      formData.append('model', 'whisper-1');

      const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ${process.env.OPENAI_API_KEY}'
        },
        body: formData
      });

      const whisperData = await whisperResponse.json();
      const transcription = whisperData.text;

      // Step 2: Summarize transcription using GPT API
      const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${process.env.OPENAI_API_KEY}'
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {"role": "system", "content": "You are a helpful assistant that summarizes text and extracting the main complaints and diagnoses in Bahasa indonesia."},
            {"role": "user", "content": `Please summarize the following text:\n\n${transcription}`}
          ],
          max_tokens: 500
        })
      });

      const gptData = await gptResponse.json();
      const summary = gptData.choices[0].message.content.trim();

      // Step 3: Send summary to content script
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "updateSummary", summary: summary});
      });

      resultDiv.textContent = 'Processing complete. Check the webpage for the result.';
    } catch (error) {
      console.error('Error:', error);
      resultDiv.textContent = 'An error occurred. Please check the console for details.';
    }

    // Reset for next recording
    audioChunks = [];
    processAudioButton.disabled = true;
  }
});

// content.js (unchanged)
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