import streamlit as st
from vector_store import VectorStore
import os

st.set_page_config(page_title="🩺 Disease Prediction RAG", page_icon="🩺")

st.title("🩺 Disease Prediction RAG System")

@st.cache_resource
def get_store():
    store = VectorStore()
    if os.path.exists("faiss_index/index.faiss"):
        store.load_index()
    else:
        from data_preprocessing import load_and_prepare_data
        data = load_and_prepare_data()
        store.build_index(data)
    return store

store = get_store()

query = st.text_input("Enter your symptoms (e.g., headache, fever, cough)")

if st.button("Check Symptoms"):
    if query:
        from rag_generator import RAGGenerator
        generator = RAGGenerator()
        with st.spinner("Analyzing..."):
            results = store.retrieve(query, k=5)
            answer = generator.generate(query, results)
        
        st.markdown("### 🩺 Result:")
        st.write(answer)
        
        with st.expander("View retrieved data"):
            st.dataframe(results[["symptom_text", "prognosis"]])
    else:
        st.warning("Please enter symptoms")

st.markdown("---")
st.caption("⚠️ This is for educational purposes only. Always consult a medical professional for proper diagnosis.")