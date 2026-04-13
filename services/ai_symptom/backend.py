from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys
import os
import re
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from vector_store import VectorStore
from rag_generator import RAGGenerator

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

store = None
generator = None

GREETINGS = ['hi', 'hello', 'hey', 'good morning', 'good evening', 'good afternoon', 'hi there', 'hello there', 'greetings', 'howdy', 'yo']
NON_MEDICAL_KEYWORDS = ['weather', 'news', 'sports', 'music', 'movie', 'game', 'joke', 'fact', 'age', 'birthday', 'love', 'color', 'food', 'recipe', 'travel', 'politics', 'stock', 'crypto', 'sport', 'calculator', 'math', 'sum', 'plus', 'minus', 'what time', 'date today']

def is_greeting(message: str) -> bool:
    msg_lower = message.lower().strip()
    # Only match if it's exactly a greeting or followed by whitespace/punctuation
    for g in GREETINGS:
        if msg_lower == g or re.match(r'^' + re.escape(g) + r'[\s,!?.\s]*$', msg_lower):
            return True
    return False

def is_medical_related(message: str) -> bool:
    msg_lower = message.lower()
    # First check for greeting
    if is_greeting(message):
        return False
    # Non-medical keywords - immediately reject
    non_medical = ['weather', 'news', 'sports', 'music', 'movie', 'game', 'joke', 'fact', 'age', 'birthday', 'love', 'color', 'food', 'recipe', 'travel', 'politics', 'stock', 'crypto', 'sport', 'calculator', 'math', 'sum', 'plus', 'minus', 'what time', 'date', 'how are', 'who are', 'what is your', 'tell me about', 'calculate', 'definition', 'meaning of', 'help me']
    for keyword in non_medical:
        if keyword in msg_lower:
            return False
    # Medical indicators - if found, treat as medical
    medical_patterns = ['symptom', 'pain', 'hurt', 'ache', 'fever', 'cough', 'sick', 'doctor', 'medicine', 'health', 'feeling', 'body', 'head', 'stomach', 'chest', 'back', 'headache', 'nausea', 'dizzy', 'tired', 'weak', 'swelling', 'rash', 'infection', 'cold', 'flu', 'virus', 'bacteria', 'disease', 'diagnosis', 'prescription', 'treatment', 'remedy', 'high fever', 'severe', 'vomit', 'diarrhea', 'rash', 'loss of appetite', 'abrupt onset', 'behind the eyes', 'poop', 'stool', 'bowel', 'bleeding', 'blood', 'constipation', 'stomach pain', 'abdominal', 'throat', 'ear', 'skin', 'eye', 'joint', 'bone', 'muscle', 'breathing', 'breath', 'heart', 'chest pain', 'palpitation', 'anxiety', 'depression', 'sleep', 'insomnia', 'weight', 'appetite', 'urinate', 'urine', 'menstrual', 'period']
    for pattern in medical_patterns:
        if pattern in msg_lower:
            return True
    # Default - ask for more info
    return False

def get_greeting_response() -> str:
    return """🩺 Hello! I'm Dr. AI, your medical symptom assistant.

I can help you understand possible conditions based on your symptoms. Just describe what you're feeling (e.g., "headache, fever, cough") and I'll suggest possible causes.

Remember: This is for educational purposes only. Always consult a doctor for proper diagnosis.

How can I help you today?"""

def get_non_medical_response() -> str:
    return """I'm specialized in helping with medical symptoms and health-related queries only. 

Please describe your symptoms (e.g., "headache, fever, cough") and I'll be happy to help suggest possible conditions.

🩺 How are you feeling today?"""

def get_services():
    global store, generator
    if store is None:
        store = VectorStore()
        store.load_index()
        generator = RAGGenerator()
    return store, generator

class ChatRequest(BaseModel):
    message: str

@app.post("/api/chat")
async def chat(req: ChatRequest):
    message = req.message.strip()
    logger.info(f"User input: {message}")
    
    # Handle greetings
    if is_greeting(message):
        logger.info("Detected greeting - returning greeting response")
        return {"response": get_greeting_response()}
    
    # Check if medical related
    if not is_medical_related(message):
        logger.info("Non-medical query detected - returning redirect response")
        return {"response": get_non_medical_response()}
    
    # Process medical query with error handling
    try:
        store, generator = get_services()
        
        # Retrieve relevant data from vector store
        logger.info(f"Retrieving relevant medical data for: {message}")
        results = store.retrieve(message, k=8)
        
        # Log retrieved sources
        logger.info(f"Retrieved {len(results)} relevant medical records:")
        for idx, row in results.iterrows():
            logger.info(f"  - Symptoms: {row['symptom_text'][:80]}... -> Disease: {row['prognosis']}")
        
        # Generate response using retrieved data
        logger.info("Generating AI response from retrieved medical data...")
        response = generator.generate(message, results)
        
        logger.info(f"Response generated successfully ({len(response)} chars)")
        return {"response": response}
        
    except Exception as e:
        error_msg = str(e).lower()
        logger.error(f"Error processing request: {error_msg}")
        
        # Handle API quota exceeded
        if 'quota' in error_msg or 'rate limit' in error_msg or 'exceeded' in error_msg or 'resource_exhausted' in error_msg or '503' in error_msg or 'unavailable' in error_msg or 'high demand' in error_msg:
            logger.warning("API quota/service unavailable - high demand")
            return {"response": "⚠️ Our AI service is currently experiencing high demand. Please try again in a few moments. For urgent medical concerns, please consult a healthcare professional."}
        
        # Handle API key issues
        if 'api_key' in error_msg or 'authentication' in error_msg or 'unauthorized' in error_msg:
            logger.warning("API key/authentication error")
            return {"response": "⚠️ Service temporarily unavailable. Please contact support. For immediate medical concerns, please consult a healthcare professional."}
        
        # Handle network/connection errors
        if 'connection' in error_msg or 'timeout' in error_msg or 'network' in error_msg or 'httpx' in error_msg:
            logger.warning("Network/connection error")
            return {"response": "⚠️ Unable to connect to the AI service. Please check your internet connection and try again. For medical concerns, please consult a doctor."}
        
        # Handle other errors - generic friendly message
        logger.error(f"Unexpected error: {error_msg}")
        return {"response": "⚠️ Something went wrong while processing your request. Please try again. If the problem persists, please consult a medical professional for assistance."}

@app.get("/api/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)