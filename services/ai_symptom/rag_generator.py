import os
import pandas as pd
from dotenv import load_dotenv
from google import genai

load_dotenv()

class RAGGenerator:
    def __init__(self, model_name: str = "gemini-flash-latest"):
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        self.model_name = model_name
    
    def generate(self, query: str, retrieved_data: 'pd.DataFrame') -> str:
        """Generate response from AI."""
        is_symptom_related = any(keyword in query.lower() for keyword in 
            ['pain', 'ache', 'fever', 'headache', 'cough', 'sick', 'nausea', 'tired', 
             'hurt', 'stomach', 'chest', 'back', 'throat', 'cold', 'flu', 'body', 
             'dizzy', 'vomit', 'breath', 'skin', 'rash', 'blood', 'sweat', 'sleep',
             'symptom', 'feel', 'feeling', ' unwell', ' doctor', 'medical', 'health'])
        
        if not is_symptom_related:
            return "I'm Dr. AI, a health assistant. I can help with medical symptoms like headaches, fever, coughs, or any discomfort you're feeling. What symptoms are you experiencing?"
        
        context = "\n".join(
            [f"- {row.symptom_text} → {row.prognosis}" 
             for _, row in retrieved_data.iterrows()]
        )
        
        prompt = f"""User: "{query}"

Medical data:
{context}

Respond in this exact format only (no markdown, no asterisks):
[One simple paragraph explaining symptoms in plain language]

Most likely:
- disease 1
- disease 2
- disease 3
- disease 4
- disease 5

Suggestions:
- suggestion 1
- suggestion 2
- suggestion 3
- suggestion 4
- suggestion 5

Consult a [appropriate specialist type] for proper diagnosis."""
        
        response = self.client.models.generate_content(
            model=self.model_name,
            contents=prompt
        )
        
        return response.text

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    from vector_store import VectorStore
    
    store = VectorStore()
    store.load_index()
    
    generator = RAGGenerator()
    results = store.retrieve("headache fever cough", k=8)
    answer = generator.generate("headache fever cough", results)
    print(answer)