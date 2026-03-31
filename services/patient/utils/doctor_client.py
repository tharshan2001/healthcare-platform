import httpx
import os

DOCTOR_SERVICE_URL = os.getenv("DOCTOR_SERVICE_URL", "http://localhost:8002")

class DoctorClient:
    def __init__(self):
        self.base_url = DOCTOR_SERVICE_URL
    
    def get_doctors(self, specialty=None, min_experience=None, max_fee=None):
        params = {}
        if specialty:
            params["specialty"] = specialty
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

doctor_client = DoctorClient()