from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import tempfile
import librosa
import torch
from transformers import pipeline
import logging
import traceback
from pyannote.audio.pipelines.speaker_verification import PretrainedSpeakerEmbedding
import pyannote.audio
from pyannote.audio import Audio
from pyannote.core import Segment
import contextlib
import wave
import numpy as np
from sklearn.cluster import AgglomerativeClustering
import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for Chrome extension
device = "cuda" if torch.cuda.is_available() else "cpu"

# Initialize the model globally for better performance
class WhisperTranscriber:
    def __init__(self):
        self.model = None
        self.processor = None
        self.pipe = None
        self.embedding_model = None
        self.audio = Audio()
        try:
            self.load_model()
            self.load_embedding_model()
        except Exception as e:
            logger.error(f"Failed to initialize WhisperTranscriber: {str(e)}")
    
    def load_model(self):
        try:
            logger.info("Loading Whisper model...")
            # Use pipeline for simplicity, but you can also use model + processor for more control
            logger.info(f"Using device: {device}")
            
            # Load the pipeline - using large-v3-turbo for better performance
            self.pipe = pipeline(
                "automatic-speech-recognition",
                model="openai/whisper-large-v3-turbo",
                device=device,
                torch_dtype=torch.float16 if device == "cuda" else torch.float32
            )
            logger.info("Whisper model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            self.pipe = None
            raise e

    def load_embedding_model(self):
        try:
            logger.info("Loading embedding model...")
            self.embedding_model = PretrainedSpeakerEmbedding(
                "speechbrain/spkrec-ecapa-voxceleb",
                device=torch.device(device)
            )
            logger.info("Embedding model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading embedding model: {str(e)}")
            self.embedding_model = None
            raise e

    def get_duration(self, audio_path):
        try:
            duration = librosa.get_duration(path=audio_path)
            return duration
        except Exception as e:
            logger.error(f"Error getting audio duration with librosa: {str(e)}")
            try:
                with contextlib.closing(wave.open(audio_path,'r')) as f:
                    frames = f.getnframes()
                    rate = f.getframerate()
                    return frames / float(rate)
            except Exception as wave_error:
                logger.error(f"Error getting audio duration with wave: {str(wave_error)}")
                try:
                    audio, sr = librosa.load(audio_path, sr=None)
                    return len(audio) / sr
                except Exception as final_error:
                    logger.error(f"Final fallback failed: {str(final_error)}")
                    return 60.0  # 60 seconds default
    
    def transcribe(self, audio_path, language=None):
        try:
            if self.pipe is None:
                raise RuntimeError("Whisper model not loaded. Please check server startup logs.")
            
            # Load audio file using librosa for better compatibility
            audio, sr = librosa.load(audio_path, sr=16000)  # Whisper expects 16kHz
            
            # Prepare generation kwargs
            generate_kwargs = {}
            if language and language != 'auto':
                # Map language codes
                lang_map = {
                    'id': 'indonesian',
                    'en': 'english',
                }
                if language in lang_map:
                    generate_kwargs['language'] = lang_map[language]
            
            # Transcribe using pipeline
            result = self.pipe(
                audio,
                generate_kwargs=generate_kwargs,
                return_timestamps=False
            )
            
            # ASR pipeline always returns a dict with 'text' key
            return result['text'].strip()  # type: ignore
        except Exception as e:
            logger.error(f"Transcription error: {str(e)}")
            raise e

    def transcribe_with_diarization(self, audio_path, language=None):
        try:
            if self.pipe is None:
                raise RuntimeError("Whisper model not loaded. Please check server startup logs.")
            
            # Load audio file using librosa for better compatibility
            audio, sr = librosa.load(audio_path, sr=16000)  # Whisper expects 16kHz
            
            # Prepare generation kwargs
            generate_kwargs = {}
            if language and language != 'auto':
                # Map language codes
                lang_map = {
                    'id': 'indonesian',
                    'en': 'english',
                }
                if language in lang_map:
                    generate_kwargs['language'] = lang_map[language]
            
            # Transcribe using pipeline
            result = self.pipe(
                audio,
                generate_kwargs=generate_kwargs,
                return_timestamps=True
            )
            print(result)
            segments = result["chunks"] # type: ignore

            embeddings = np.zeros(shape=(len(segments), 192))
            for i, segment in enumerate(segments):
                embeddings[i] = self.segment_embedding(audio_path, segment)

            embeddings = np.nan_to_num(embeddings)
            num_speakers = 2
            clustering = AgglomerativeClustering(num_speakers).fit(embeddings)
            labels = clustering.labels_
            for i in range(len(segments)):
                segments[i]["speaker"] = 'SPEAKER ' + str(labels[i] + 1) # type: ignore
            
            result_text = ""
            for (i, segment) in enumerate(segments):
                if i == 0 or segments[i - 1]["speaker"] != segment["speaker"]: # type: ignore
                    start_time = segment["timestamp"][0] # type: ignore
                    result_text += "\n" + segment["speaker"] + ' ' + str(self.time(start_time)) + '\n' # type: ignore
                result_text += segment["text"][1:] + ' ' # type: ignore
            return result_text.strip()
        except Exception as e:
            logger.error(f"Transcription error: {str(e)}")
            raise e

    def segment_embedding(self, audio_path, segment):
        start, end = segment["timestamp"]
        # Whisper overshoots the end timestamp in the last segment
        end = min(self.get_duration(audio_path), end)
        clip = Segment(start, end)
        waveform, sample_rate = self.audio.crop(audio_path, clip)
        return self.embedding_model(waveform[None]) # type: ignore

    def time(self, secs):
        return datetime.timedelta(seconds=round(secs))

# Initialize transcriber
transcriber = WhisperTranscriber()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model': 'whisper-large-v3-turbo',
        'device': 'cuda' if torch.cuda.is_available() else 'cpu'
    })

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    """Transcribe audio file endpoint"""
    try:
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Get optional parameters
        language = request.form.get('language', 'auto')
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            file.save(temp_file.name)
            
            try:
                # Transcribe
                logger.info(f"Transcribing audio with language: {language}")
                text = transcriber.transcribe_with_diarization(temp_file.name, language)
                
                logger.info("Transcription completed successfully")
                return jsonify({
                    'text': text,
                    'language': language,
                    'model': 'whisper-large-v3-turbo'
                })
                
            finally:
                # Clean up temporary file
                os.unlink(temp_file.name)
                
    except Exception as e:
        logger.error(f"Transcription endpoint error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'error': 'Transcription failed',
            'details': str(e)
        }), 500

@app.route('/models', methods=['GET'])
def get_models():
    """Get available models endpoint"""
    return jsonify({
        'available_models': ['whisper-large-v3-turbo'],
        'current_model': 'whisper-large-v3-turbo',
        'languages': ['auto', 'id', 'en']
    })

@app.route('/translate', methods=['POST'])
def translate_text():
    """Translate text endpoint using text2text-generation pipeline"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
            
        text = data.get('text')
        if not text:
            return jsonify({'error': 'No text provided for translation'}), 400
            
        source_language = data.get('source_language', 'auto')
        target_language = data.get('target_language', 'en')
        
        # Initialize translation pipeline if not already done
        if not hasattr(translate_text, 'translation_pipe'):
            logger.info("Loading translation pipeline...")
            device = "cuda" if torch.cuda.is_available() else "cpu"
            
            try:
                # Try simple Helsinki-NLP model first for better reliability
                logger.info("Trying Helsinki-NLP translation model first...")
                translate_text.translation_pipe = pipeline(
                    "translation",
                    model="Helsinki-NLP/opus-mt-mul-en",
                    device=device,
                    torch_dtype=torch.float16 if device == "cuda" else torch.float32
                )
                logger.info("Helsinki-NLP translation pipeline loaded successfully")
                
            except Exception as model_error:
                logger.error(f"Could not load Helsinki-NLP model: {str(model_error)}")
                # Try the text2text model as fallback
                logger.info("Falling back to text2text-generation model...")
                try:
                    translate_text.translation_pipe = pipeline(
                        "text2text-generation", 
                        model="SnypzZz/Llama2-13b-Language-translate",
                        device=device,
                        torch_dtype=torch.float16 if device == "cuda" else torch.float32
                    )
                    logger.info("Text2text translation pipeline loaded successfully")
                except Exception as fallback_error:
                    logger.error(f"Text2text model also failed: {str(fallback_error)}")
                    # Final fallback - create a simple passthrough function
                    logger.info("Using passthrough translation (no actual translation)")
                    translate_text.translation_pipe = None
        
        logger.info(f"Translating text from {source_language} to {target_language}")
        
        # Create translation prompt based on target language - using simple English prompts
        if target_language == 'en':
            prompt = f"Translate this to English: {text}"
        elif target_language == 'id':
            prompt = f"Translate this to Indonesian: {text}"
        elif target_language == 'ms':
            prompt = f"Translate this to Malay: {text}"
        else:
            prompt = f"Translate this to {target_language}: {text}"
        
        # Perform translation
        if translate_text.translation_pipe is None:
            # No translation available, return original text
            logger.warning("No translation model available, returning original text")
            translated_text = text
        else:
            try:
                # Check if it's a text2text-generation or translation pipeline
                if hasattr(translate_text.translation_pipe, 'task') and translate_text.translation_pipe.task == 'text2text-generation':
                    # Use prompt-based approach for text2text-generation
                    result = translate_text.translation_pipe(
                        prompt,
                        max_length=512,
                        num_beams=4,
                        early_stopping=True,
                        do_sample=False
                    )
                    
                    # Extract translated text
                    if isinstance(result, list) and len(result) > 0:
                        translated_text = result[0].get('generated_text', str(result[0]))
                    else:
                        translated_text = str(result)
                        
                    # Clean up the translated text (remove the prompt if it's included)
                    if translated_text.startswith(prompt):
                        translated_text = translated_text[len(prompt):].strip()
                        
                else:
                    # Use direct text for translation pipeline
                    result = translate_text.translation_pipe(text)
                    if isinstance(result, list) and len(result) > 0:
                        translated_text = result[0].get('translation_text', str(result[0]))
                    else:
                        translated_text = str(result)
                
            except Exception as translation_error:
                logger.error(f"Translation generation failed: {str(translation_error)}")
                # Simple fallback - return original text
                translated_text = text
        
        logger.info("Translation completed successfully")
        return jsonify({
            'original_text': text,
            'translated_text': translated_text,
            'source_language': source_language,
            'target_language': target_language,
            'model': 'text2text-generation'
        })
        
    except Exception as e:
        logger.error(f"Translation endpoint error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'error': 'Translation failed',
            'details': str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)