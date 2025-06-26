from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM
import logging
import traceback
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for Chrome extension

# Initialize the model globally for better performance
class MedicalSummarizer:
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.pipe = None
        self.load_model()
    
    def load_model(self):
        try:
            logger.info("Loading medical summarization model...")
            device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info(f"Using device: {device}")
            
            # Load the pipeline for medical summarization
            self.pipe = pipeline(
                "summarization",
                model="Falconsai/medical_summarization",
                device=device,
                torch_dtype=torch.float16 if device == "cuda" else torch.float32
            )
            
            # Also load tokenizer for text preprocessing
            self.tokenizer = AutoTokenizer.from_pretrained("Falconsai/medical_summarization")
            
            logger.info("Medical summarization model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            raise e
    
    def preprocess_text(self, text):
        """Preprocess text for better summarization"""
        try:
            # Clean up the text
            text = re.sub(r'\s+', ' ', text)  # Replace multiple spaces with single space
            text = text.strip()
            
            # Ensure text is not too short
            if len(text.split()) < 10:
                return None, "Text too short for meaningful summarization"
            
            # Truncate if too long (model has limits)
            max_length = 1000  # Conservative limit
            tokens = self.tokenizer.encode(text, truncation=True, max_length=max_length)
            if len(tokens) == max_length:
                text = self.tokenizer.decode(tokens, skip_special_tokens=True)
                logger.warning("Text was truncated due to length")
            
            return text, None
        except Exception as e:
            return None, f"Preprocessing error: {str(e)}"
    
    def summarize(self, text, template_prompt=None, max_length=150, min_length=50):
        try:
            # Preprocess text
            processed_text, error = self.preprocess_text(text)
            if error:
                raise ValueError(error)
            
            # Add medical context if template prompt is provided
            if template_prompt:
                # Combine template with text for better context
                input_text = f"Medical Summary Request: {template_prompt}\n\nOriginal Text: {processed_text}"
            else:
                input_text = processed_text
            
            # Generate summary
            result = self.pipe(
                input_text,
                max_length=max_length,
                min_length=min_length,
                do_sample=False,
                temperature=0.3,
                truncation=True
            )
            
            summary = result[0]['summary_text'].strip()
            
            # Post-process summary
            summary = self.post_process_summary(summary)
            
            return summary
            
        except Exception as e:
            logger.error(f"Summarization error: {str(e)}")
            raise e
    
    def post_process_summary(self, summary):
        """Post-process the generated summary for medical context"""
        # Ensure proper capitalization
        summary = summary.capitalize()
        
        # Add period if missing
        if not summary.endswith('.'):
            summary += '.'
        
        return summary

# Initialize summarizer
summarizer = MedicalSummarizer()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model': 'Falconsai/medical_summarization',
        'device': 'cuda' if torch.cuda.is_available() else 'cpu'
    })

@app.route('/summarize', methods=['POST'])
def summarize_text():
    """Summarize medical text endpoint"""
    try:
        # Get request data
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        text = data.get('text', '').strip()
        if not text:
            return jsonify({'error': 'No text provided for summarization'}), 400
        
        # Optional parameters
        template_prompt = data.get('template_prompt', '')
        max_length = data.get('max_length', 150)
        min_length = data.get('min_length', 50)
        
        # Validate parameters
        max_length = min(max(max_length, 50), 300)  # Clamp between 50-300
        min_length = min(max(min_length, 20), max_length - 10)  # Ensure min < max
        
        logger.info(f"Summarizing text (length: {len(text)} chars)")
        if template_prompt:
            logger.info(f"Using template: {template_prompt[:50]}...")
        
        # Generate summary
        summary = summarizer.summarize(
            text, 
            template_prompt, 
            max_length=max_length, 
            min_length=min_length
        )
        
        logger.info("Summarization completed successfully")
        return jsonify({
            'summary': summary,
            'original_length': len(text),
            'summary_length': len(summary),
            'model': 'Falconsai/medical_summarization',
            'template_used': bool(template_prompt)
        })
        
    except Exception as e:
        logger.error(f"Summarization endpoint error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'error': 'Summarization failed',
            'details': str(e)
        }), 500

@app.route('/templates', methods=['GET'])
def get_templates():
    """Get available medical templates"""
    templates = [
        {
            "name": "General Consultation",
            "prompt": "Summarize this medical consultation focusing on: chief complaint, symptoms, physical examination findings, diagnosis, and treatment plan. Format in Indonesian."
        },
        {
            "name": "Follow-up Visit",
            "prompt": "Summarize this follow-up visit focusing on: current condition, response to previous treatment, any new symptoms, and adjusted treatment plan. Format in Indonesian."
        },
        {
            "name": "Emergency Case",
            "prompt": "Summarize this emergency case focusing on: presenting complaint, vital signs, immediate interventions, diagnosis, and urgent treatment required. Format in Indonesian."
        },
        {
            "name": "Diagnostic Review",
            "prompt": "Summarize this diagnostic review focusing on: test results, interpretation, clinical correlation, and recommended next steps. Format in Indonesian."
        }
    ]
    
    return jsonify({
        'templates': templates,
        'count': len(templates)
    })

@app.route('/models', methods=['GET'])
def get_models():
    """Get available models endpoint"""
    return jsonify({
        'available_models': ['Falconsai/medical_summarization'],
        'current_model': 'Falconsai/medical_summarization',
        'capabilities': ['medical_summarization', 'template_based_summarization']
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True)