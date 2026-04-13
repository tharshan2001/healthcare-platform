import httpx
import os

DOCTOR_SERVICE_URL = os.getenv("DOCTOR_SERVICE_URL", "http://localhost:8002")

class DoctorClient:
    def __init__(self):
        self.base_url = DOCTOR_SERVICE_URL
    
    def get_doctors(self, doctor_name=None, specialty=None, hospital=None, min_experience=None, max_fee=None):
        params = {}
        if doctor_name:
            params["doctor_name"] = doctor_name
        if specialty:
            params["specialty"] = specialty
        if hospital:
            params["hospital"] = hospital
        if min_experience:
            params["min_experience"] = min_experience
        if max_fee:
            params["max_fee"] = max_fee
        
        with httpx.Client() as client:
            response = client.get(f"{self.base_url}/doctors", params=params)
            if response.status_code == 200:
                return response.json()
            return []
    
    def get_doctor(self, doctor_id):
        with httpx.Client() as client:
            response = client.get(f"{self.base_url}/doctors/{doctor_id}")
            if response.status_code == 200:
                return response.json()
            return None
    
    def get_availability(self, doctor_id):
        with httpx.Client() as client:
            response = client.get(f"{self.base_url}/availability/availability/{doctor_id}")
            if response.status_code == 200:
                return response.json()
            return []
    
    def get_available_slots(self, doctor_id, date):
        with httpx.Client() as client:
            response = client.get(f"{self.base_url}/doctors/{doctor_id}/slots", params={"date": date})
            if response.status_code == 200:
                return response.json()
            return []
    
    def get_specializations(self):
        with httpx.Client() as client:
            response = client.get(f"{self.base_url}/specializations")
            if response.status_code == 200:
                return response.json()
            return []
    
    def get_hospitals(self):
        with httpx.Client() as client:
            response = client.get(f"{self.base_url}/hospitals")
            if response.status_code == 200:
                return response.json()
            return []

doctor_client = DoctorClient()