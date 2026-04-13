# 🩺 Dr. AI - Medical Symptom Assistant

A symptom-based disease prediction system using RAG (Retrieval Augmented Generation) with Gemini AI.

## ⚠️ Disclaimer

This system is for **educational purposes only**. It is **NOT** a substitute for professional medical advice. Always consult a qualified healthcare provider for diagnosis and treatment.

## 🚀 Features

- **AI-Powered Analysis**: Uses Gemini AI with RAG for accurate symptom analysis
- **Medical Knowledge Base**: Searches 96,000+ medical records for relevant conditions
- **Smart Detection**: Handles greetings and filters non-medical queries
- **Error Handling**: Graceful handling of API failures with user-friendly messages
- **Logging**: Full request/response logging for debugging
- **Modern UI**: Clean React frontend with animations

## 📋 Requirements

- Python 3.9+
- Node.js 18+
- Gemini API key

## 🛠️ Installation

### Backend

```bash
cd /path/to/RAG
source .venv/bin/activate
pip install -r requirements.txt

# Create .env file with your Gemini API key
echo "GEMINI_API_KEY=your_api_key_here" > .env

# Run backend
python backend.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 🏃‍♂️ Running the Application

### Terminal 1 - Backend (Port 8000)
```bash
cd /path/to/RAG
source .venv/bin/activate
python backend.py
```

### Terminal 2 - Frontend (Port 5173)
```bash
cd frontend
npm run dev
```

Then open: **http://localhost:5173**

## 📁 Project Structure

```
RAG/
├── backend.py              # FastAPI server with error handling & logging
├── rag_generator.py        # Gemini AI response generation
├── vector_store.py         # FAISS vector database & retrieval
├── data_preprocessing.py  # Medical data preprocessing
├── main.py                 # CLI interface
├── app.py                 # Streamlit web app
├── data/                  # Medical dataset (96K+ records)
├── faiss_index/           # Pre-built vector index
├── frontend/              # React + Vite + Tailwind UI
│   ├── src/App.jsx       # Chat interface with animations
│   └── src/assets/       # Images and assets
├── requirements.txt       # Python dependencies
├── .env                   # API keys (not in git)
└── .gitignore           # Git ignore rules
```

## 🔧 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Send symptom query |
| `/api/health` | GET | Health check |

### Chat Request
```json
{
  "message": "headache fever cough"
}
```

### Chat Response
```json
{
  "response": "The combination of headache, fever, and cough..."
}
```

## 📊 How It Works

1. **User Input**: User describes symptoms
2. **Query Classification**: Check if greeting or medical query
3. **Vector Search**: Retrieve 8 most similar medical records from FAISS
4. **AI Generation**: Gemini generates response based on retrieved data
5. **Response**: Return formatted answer with possible conditions

## 🔍 Logging

Logs are saved to `backend.log` and show:
- User input
- Retrieved medical records (symptoms → disease)
- AI generation status
- Error handling

## 🐛 Error Handling

- **High Demand**: "Our AI service is currently experiencing high demand..."
- **Network Error**: "Unable to connect to the AI service..."
- **API Key Issue**: "Service temporarily unavailable..."
- **Other Errors**: Generic friendly message with medical disclaimer

## 🧪 Testing

```bash
# Test health endpoint
curl http://localhost:8000/api/health

# Test chat endpoint
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "headache fever"}'
```

## 📝 Example Responses

**Input**: "headache fever cough"

```
The combination of headache, fever, and cough is commonly 
associated with respiratory infections.

Possible Conditions:
- Acute Bronchitis
- Strep Throat
- Common Cold
- Acute Sinusitis
- Nose Disorder

What to Do:
1. Rest and stay hydrated
2. Monitor your symptoms
3. Consult a doctor if symptoms persist
4. Avoid self-medication

This is not a medical diagnosis.
```

## 📜 License

MIT License - For educational purposes only.

## 👨‍⚕️ Credits

- Dataset: Disease Prediction Using Machine Learning (Kaggle)
- Embeddings: Sentence Transformers (all-MiniLM-L6-v2)
- Vector Store: FAISS
- AI: Google Gemini
- Frontend: React + Vite + Tailwind CSS