import httpx
import os

APPOINTMENT_SERVICE_URL = os.getenv("APPOINTMENT_SERVICE_URL", "http://localhost:8003")

def create_appointment(patient_id, doctor_id, appointment_date, appointment_time, reason_for_visit="", notes=""):
    with httpx.Client(timeout=10.0) as client:
        try:
            response = client.post(
                f"{APPOINTMENT_SERVICE_URL}/appointments/appointments",
                json={
                    "patient_id": patient_id,
                    "doctor_id": doctor_id,
                    "appointment_date": appointment_date,
                    "appointment_time": appointment_time,
                    "reason_for_visit": reason_for_visit,
                    "notes": notes
                }
            )
            if response.status_code == 200:
                return response.json()
            return {"error": response.text, "status": response.status_code}
        except Exception as e:
            return {"error": str(e)}

def get_appointment(appointment_id):
    with httpx.Client(timeout=10.0) as client:
        try:
            response = client.get(f"{APPOINTMENT_SERVICE_URL}/appointments/appointments/{appointment_id}")
            if response.status_code == 200:
                return response.json()
            return None
        except:
            return None

def list_appointments(patient_id=None, doctor_id=None):
    params = {}
    if patient_id:
        params["patient_id"] = patient_id
    if doctor_id:
        params["doctor_id"] = doctor_id
    
    with httpx.Client(timeout=10.0) as client:
        try:
            response = client.get(f"{APPOINTMENT_SERVICE_URL}/appointments/appointments", params=params)
            if response.status_code == 200:
                return response.json()
            return []
        except:
            return []