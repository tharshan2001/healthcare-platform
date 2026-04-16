from fastapi import FastAPI, HTTPException
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


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not store or not generator:
        raise HTTPException(status_code=503, detail="Service not ready")
    
    try:
        results = store.retrieve(request.message, k=5)
        answer = generator.generate(request.message, results)
        return ChatResponse(response=answer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "ai-symptom"}


@app.get("/")
async def root():
    return {"message": "AI Symptom Analysis Service"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)