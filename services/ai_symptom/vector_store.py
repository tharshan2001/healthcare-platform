import numpy as np
import pandas as pd
import faiss
from sentence_transformers import SentenceTransformer
import pickle
import os

class VectorStore:
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        self.model = SentenceTransformer(model_name)
        self.index = None
        self.data = None
    
    def build_index(self, data: 'pd.DataFrame', save_path: str = "faiss_index"):
        """Create embeddings and store in FAISS index."""
        self.data = data.reset_index(drop=True)
        embeddings = self.model.encode(self.data["symptom_text"].tolist())
        
        dimension = embeddings.shape[1]
        self.index = faiss.IndexFlatL2(dimension)
        self.index.add(np.array(embeddings).astype('float32'))
        
        os.makedirs(save_path, exist_ok=True)
        faiss.write_index(self.index, f"{save_path}/index.faiss")
        np.save(f"{save_path}/embeddings.npy", embeddings)
        self.data.to_pickle(f"{save_path}/data.pkl")
        
        return self.index
    
    def load_index(self, load_path: str = "faiss_index"):
        """Load existing FAISS index."""
        self.index = faiss.read_index(f"{load_path}/index.faiss")
        self.data = pd.read_pickle(f"{load_path}/data.pkl")
        return self.index, self.data
    
    def retrieve(self, query: str, k: int = 5) -> 'pd.DataFrame':
        """Retrieve top-k similar records."""
        if self.index is None:
            raise ValueError("Index not built or loaded")
        
        query_vec = self.model.encode([query]).astype('float32')
        distances, indices = self.index.search(query_vec, k)
        
        return self.data.iloc[indices[0]]

if __name__ == "__main__":
    from data_preprocessing import load_and_prepare_data
    
    data = load_and_prepare_data()
    store = VectorStore()
    store.build_index(data)
    print("Index built successfully")
    
    results = store.retrieve("headache fever cough", k=3)
    print(results)