# AI Services API Documentation

## Overview

The extension integrates with multiple AI providers for transcription and summarization. This document details the API implementations and usage.

## Supported Providers

### OpenAI

#### Configuration
```javascript
{
  provider: 'openai',
  apiKey: 'sk-...',
  transcriptionModel: 'whisper-1',
  summarizationModel: 'gpt-4o-mini'
}
```

#### Transcription API

**Endpoint:** `https://api.openai.com/v1/audio/transcriptions`

**Request:**
```javascript
const formData = new FormData();
formData.append('file', audioBlob, 'audio.webm');
formData.append('model', 'whisper-1');
formData.append('language', 'id'); // Indonesian
formData.append('response_format', 'json');

const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`
  },
  body: formData
});
```

**Response:**
```json
{
  "text": "Transcribed text in Indonesian..."
}
```

#### Summarization API

**Endpoint:** `https://api.openai.com/v1/chat/completions`

**Request:**
```javascript
const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT_INDO
      },
      {
        role: 'user',
        content: transcript
      }
    ],
    temperature: 0.3,
    max_tokens: 2000
  })
});
```

### Google Gemini

#### Configuration
```javascript
{
  provider: 'gemini',
  apiKey: 'AIza...',
  transcriptionModel: 'gemini-2.0-flash-exp',
  summarizationModel: 'gemini-2.0-flash-exp'
}
```

#### Unified API

**Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`

**Request:**
```javascript
const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-goog-api-key': apiKey
  },
  body: JSON.stringify({
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2000
    }
  })
});
```

## API Response Handling

### Success Response Processing

```javascript
async function processAPIResponse(response, provider) {
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (provider === 'openai') {
    return data.choices[0].message.content;
  } else if (provider === 'gemini') {
    return data.candidates[0].content.parts[0].text;
  }
}
```

### Error Handling

```javascript
class APIError extends Error {
  constructor(message, status, provider) {
    super(message);
    this.status = status;
    this.provider = provider;
  }
}

async function handleAPIError(error) {
  if (error.status === 429) {
    // Rate limit - implement exponential backoff
    await delay(1000 * Math.pow(2, retryCount));
    return retry();
  } else if (error.status === 401) {
    // Invalid API key
    throw new APIError('Invalid API key', 401, provider);
  } else if (error.status >= 500) {
    // Server error - retry
    return retry();
  }
}
```

## Retry Mechanism

```javascript
async function callAPIWithRetry(apiCall, maxRetries = 3) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      
      if (i < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, i), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}
```

## Medical Prompt System

### System Prompt Structure

```javascript
const SYSTEM_PROMPT_INDO = `
Anda adalah asisten medis yang membantu dokter di Puskesmas Indonesia.
Tugas Anda adalah menganalisis transkrip konsultasi dan menghasilkan ringkasan medis terstruktur.

Format output harus dalam JSON dengan kategori berikut:
- keluhan_utama: Keluhan utama pasien
- keluhan_tambahan: Keluhan tambahan (jika ada)
- riwayat_penyakit_sekarang: RPS
- riwayat_penyakit_dahulu: RPD
- riwayat_penyakit_keluarga: RPK
- pemeriksaan_fisik: Hasil pemeriksaan fisik
- diagnosa_kerja: Diagnosa kerja
- diagnosa_banding: Diagnosa banding
- terapi_obat: Daftar obat dengan dosis
- terapi_non_obat: Terapi non-obat
- edukasi: Edukasi untuk pasien
`;
```

### Medical Terminology Conversion

```javascript
const MEDICAL_TERMS = {
  'demam': 'febris',
  'sakit kepala': 'cephalgia',
  'batuk': 'tussis',
  'pilek': 'rhinitis',
  // ... extensive medical dictionary
};

function convertToMedicalTerms(text) {
  let result = text;
  for (const [common, medical] of Object.entries(MEDICAL_TERMS)) {
    const regex = new RegExp(`\\b${common}\\b`, 'gi');
    result = result.replace(regex, medical);
  }
  return result;
}
```

## Rate Limiting

### OpenAI Limits
- Whisper: 50 requests/minute
- GPT-4: 10,000 tokens/minute
- GPT-3.5: 90,000 tokens/minute

### Gemini Limits
- Free tier: 60 requests/minute
- Paid tier: 1000 requests/minute

### Implementation
```javascript
class RateLimiter {
  constructor(maxRequests, timeWindow) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = [];
  }
  
  async throttle() {
    const now = Date.now();
    this.requests = this.requests.filter(t => now - t < this.timeWindow);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.timeWindow - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.requests.push(now);
  }
}
```

## Best Practices

1. **API Key Security**
   - Never hardcode API keys
   - Use Chrome storage API for secure storage
   - Validate keys before use

2. **Error Handling**
   - Implement comprehensive error catching
   - Provide user-friendly error messages
   - Log errors for debugging

3. **Performance**
   - Implement request caching where appropriate
   - Use streaming for large responses
   - Optimize audio file sizes before upload

4. **Reliability**
   - Always implement retry logic
   - Handle network interruptions gracefully
   - Provide fallback options

## Testing

### Mock API Responses
```javascript
const mockResponses = {
  transcription: {
    text: "Pasien mengeluh demam sejak 3 hari..."
  },
  summary: {
    keluhan_utama: "Demam",
    diagnosa_kerja: "Suspek dengue fever"
  }
};

function setupMockAPI() {
  if (DEVELOPMENT_MODE) {
    window.fetch = async (url, options) => {
      // Return mock data for testing
      return new Response(JSON.stringify(mockResponses));
    };
  }
}
```