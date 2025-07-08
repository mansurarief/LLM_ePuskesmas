from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
from transformers import pipeline, AutoTokenizer
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
        self.llama_pipe = None
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

            # Load the Llama model
            logger.info("Loading Llama model...")
            model_id = "meta-llama/Meta-Llama-3-8B-Instruct"
            self.llama_pipe = pipeline(
                "text-generation",
                model=model_id,
                model_kwargs={"torch_dtype": torch.bfloat16},
                device_map="auto",
            )
            
            logger.info("Medical summarization model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            self.pipe = None
            self.tokenizer = None
            raise e
    
    def preprocess_text(self, text):
        """Preprocess text for better summarization"""
        try:
            if self.tokenizer is None:
                raise RuntimeError("Tokenizer not loaded. Please check server startup logs.")
            
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
            if self.pipe is None:
                raise RuntimeError("Summarization model not loaded. Please check server startup logs.")
            
            # Preprocess text
            processed_text, error = self.preprocess_text(text)
            if error:
                raise ValueError(error)
            
            # Add medical context if template prompt is provided
            if template_prompt:
                # Combine template with text for better context
                input_text = f"Medical Summary Request: {template_prompt}\n\nOriginal Text: {processed_text}"
            else:
                # Use a default medical summarization prompt for better results
                input_text = f"Summarize this medical text in Indonesian: {processed_text}"
            
            # Generate summary with better parameters
            result = self.pipe(
                input_text,
                max_length=max_length,
                min_length=min_length,
                do_sample=True,
                temperature=0.5,
                top_p=0.9,
                repetition_penalty=1.1,
                truncation=True
            )
            
            summary = result[0]['summary_text'].strip() # type: ignore
            
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

    def summarize_with_llama(self, text, template_prompt=None, max_length=150, min_length=50):
        try:
            if self.llama_pipe is None:
                raise RuntimeError("Llama model not loaded. Please check server startup logs.")
            
            # Prepare the system message and user message
            if template_prompt:
                system_content = f"You are a medical assistant. {template_prompt}"
                user_content = text
            else:
                system_content = "You are a medical assistant. Summarize the following medical text into a JSON format in Bahasa Indonesia with structure: {keluhan_utama: 'ISI DENGAN KELUHAN UTAMA', keluhan_tambahan: 'ISI DENGAN DETAIL LAINNYA'}."
                user_content = text

            messages = [
                {"role": "system", "content": system_content},
                {"role": "user", "content": user_content},
            ]

            # Generate summary with simplified parameters to prevent infinite loops
            generation_kwargs = {
                'max_new_tokens': min(max_length, 256),
                'do_sample': True,
                'temperature': 0.7,
                'top_p': 0.9,
                'repetition_penalty': 1.1,
                'length_penalty': 1.0,
                'early_stopping': True
            }
            
            # Add pad_token_id only if tokenizer exists
            if hasattr(self.llama_pipe, 'tokenizer') and self.llama_pipe.tokenizer is not None:
                generation_kwargs['pad_token_id'] = self.llama_pipe.tokenizer.eos_token_id
            
            outputs = self.llama_pipe(messages, **generation_kwargs)
            
            # Extract the generated text - handle different output formats
            if isinstance(outputs, list) and len(outputs) > 0:
                output = outputs[0]
                if isinstance(output, dict) and "generated_text" in output:
                    generated_text = output["generated_text"]
                    # If generated_text is a list of messages, get the last one
                    if isinstance(generated_text, list) and len(generated_text) > 0:
                        last_message = generated_text[-1]
                        if isinstance(last_message, dict) and "content" in last_message:
                            summary = last_message["content"]
                        else:
                            # Fallback: use the entire last message as string
                            summary = str(last_message)
                    else:
                        # Fallback: use generated_text directly
                        summary = str(generated_text)
                else:
                    # Fallback: use the entire output
                    summary = str(output)
            else:
                raise ValueError("Unexpected output format from Llama model")

            summary = summary.strip()

            # Post-process summary
            summary = self.post_process_summary(summary)

            return summary

        except Exception as e:
            logger.error(f"Summarization error: {str(e)}")
            raise e

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
        
        # Generate summary using the medical summarization model (faster and more reliable)
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