from vector_store import VectorStore
from rag_generator import RAGGenerator
import os

def main():
    store = VectorStore()
    
    if os.path.exists("faiss_index/index.faiss"):
        store.load_index()
    else:
        from data_preprocessing import load_and_prepare_data
        data = load_and_prepare_data()
        store.build_index(data)
    
    generator = RAGGenerator()
    
    print("🩺 Disease Prediction RAG System")
    print("Enter symptoms (or 'exit' to quit):\n")
    
    while True:
        query = input("Symptoms: ")
        
        if query.lower() == "exit":
            break
        
        results = store.retrieve(query, k=5)
        answer = generator.generate(query, results)
        
        print("\n🩺 Result:\n", answer, "\n")

if __name__ == "__main__":
    main()