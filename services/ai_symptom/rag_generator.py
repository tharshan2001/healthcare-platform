import os
import pandas as pd
from dotenv import load_dotenv
from google import genai

load_dotenv()

class RAGGenerator:
    def __init__(self, model_name: str = "gemini-1.5-flash-latest"):
        try:
            self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
            self.model_name = model_name
            self.available = True
        except Exception:
            self.available = False
    
    def generate(self, query: str, retrieved_data: 'pd.DataFrame') -> str:
        """Generate response from AI."""
        is_symptom_related = any(keyword in query.lower() for keyword in 
            ['pain', 'ache', 'fever', 'headache', 'cough', 'sick', 'nausea', 'tired', 
             'hurt', 'stomach', 'chest', 'back', 'throat', 'cold', 'flu', 'body', 
             'dizzy', 'vomit', 'breath', 'skin', 'rash', 'blood', 'sweat', 'sleep',
             'symptom', 'feel', 'feeling', 'unwell', 'doctor', 'medical', 'health'])
        
        if not is_symptom_related:
            return "I'm Dr. AI, a health assistant. I can help with medical symptoms like headaches, fevers, coughs, or any discomfort you're feeling. What symptoms are you experiencing?"
        
        if not self.available:
            return self._mock_response(query)
        
        try:
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
        except Exception as e:
            print(f"AI generation failed: {e}")
            return self._mock_response(query)
    
    def _mock_response(self, query: str) -> str:
        return f"""Based on your symptoms: "{query}"

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

Consult a General Physician for proper diagnosis."""

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