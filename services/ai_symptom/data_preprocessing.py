import pandas as pd
import os

def load_and_prepare_data(csv_path: str = "data/Diseases_and_Symptoms_dataset.csv") -> 'pd.DataFrame':
    """Load dataset and convert symptoms to text format."""
    df = pd.read_csv(csv_path)
    
    symptom_cols = df.columns[1:]  # All columns except first (diseases)
    
    def row_to_text(row):
        symptoms = [col for col in symptom_cols if row[col] == 1]
        return ", ".join(symptoms) if symptoms else "No symptoms recorded"
    
    df["symptom_text"] = df.apply(row_to_text, axis=1)
    df = df.rename(columns={"diseases": "prognosis"})
    return df[["symptom_text", "prognosis"]]

if __name__ == "__main__":
    data = load_and_prepare_data()
    print(f"Loaded {len(data)} records")
    print(data.head())