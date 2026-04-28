
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
import os

from vector_store import VectorStore
from rag_generator import RAGGenerator

store = None
generator = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global store, generator
    store = VectorStore()
    if os.path.exists("faiss_index/index.faiss"):
        store.load_index()
    else:
        from data_preprocessing import load_and_prepare_data
        data = load_and_prepare_data()
        store.build_index(data)
    generator = RAGGenerator()
    print("AI Symptom Service ready")
    yield


app = FastAPI(lifespan=lifespan, title="AI Symptom Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not store:
        raise HTTPException(status_code=503, detail="Service not ready")
    
    if not generator:
        # Return mock response if generator not available
        return ChatResponse(response=f"""Based on your symptoms: "{request.message}"

Most likely:
- Common cold or viral infection
- Seasonal allergies
- Mild respiratory condition
- Stress-related symptoms
- Minor inflammation

Suggestions:
- Rest and stay hydrated
- Monitor your temperature
- Consider over-the-counter remedies
- Avoid strenuous activities
- Consult a General Physician for proper diagnosis

Consult a General Physician for proper diagnosis.""")
    
    try:
        results = store.retrieve(request.message, k=5)
        answer = generator.generate(request.message, results)
        return ChatResponse(response=answer)
    except Exception as e:
        print(f"Chat error: {e}")
        # Return mock response on error
        return ChatResponse(response=f"""Based on your symptoms: "{request.message}"

Most likely:
- Common cold or viral infection
- Seasonal allergies
- Mild respiratory condition
- Stress-related symptoms
- Minor inflammation

Suggestions:
- Rest and stay hydrated
- Monitor your temperature
- Consider over-the-counter remedies
- Avoid strenuous activities
- Consult a General Physician for proper diagnosis

Consult a General Physician for proper diagnosis.""")


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "ai-symptom"}


@app.get("/")
async def root():
    return {"message": "AI Symptom Analysis Service"}


@app.get("/api/greeting")
async def get_greeting():
    return {"greeting": "Hi! I'm Dr. AI. Tell me your symptoms and I'll help you understand what might be going on."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8007)