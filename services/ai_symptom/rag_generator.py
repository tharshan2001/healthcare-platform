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
        """Generate complete response from AI."""
        context = "\n".join(
            [f"- {row.symptom_text} → {row.prognosis}" 
             for _, row in retrieved_data.iterrows()]
        )
        
        prompt = f"""User's symptoms: "{query}"

Based on the following medical data:
{context}

Provide a complete response with:
1. A brief explanation of what these symptoms might indicate
2. List of 5 possible conditions based on the data above
3. 4 actionable suggestions
4. A disclaimer that this is not a medical diagnosis

Format (no markdown, no asterisks):
[Explanation paragraph]

Possible Conditions:
- condition 1
- condition 2
- condition 3
- condition 4
- condition 5

What to Do:
1. Rest and stay hydrated
2. Monitor your symptoms
3. Consult a doctor if symptoms persist
4. Avoid self-medication

This is not a medical diagnosis. Seek professional medical advice."""
        
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