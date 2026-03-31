from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from database import get_db
from routers.auth import get_current_patient
from models import Patient
from utils.doctor_client import doctor_client

router = APIRouter()

class DoctorResponse(BaseModel):
    id: int
    email: str
    full_name: str
    specialty: str
    qualifications: Optional[str]
    consultation_fee: float
    years_of_experience: int
    bio: Optional[str]
    is_available: bool

class AvailabilityResponse(BaseModel):
    id: int
    doctor_id: int
    day_of_week: str
    start_time: str
    end_time: str
    is_available: bool

@router.get("/doctors", response_model=List[DoctorResponse])
def get_doctors(
    specialty: Optional[str] = None,
    min_experience: Optional[int] = None,
    max_fee: Optional[float] = None,
    current_patient: Patient = Depends(get_current_patient)
):
    doctors = doctor_client.get_doctors(specialty=specialty, min_experience=min_experience, max_fee=max_fee)
    return doctors

@router.get("/doctors/{doctor_id}", response_model=DoctorResponse)
def get_doctor(doctor_id: int, current_patient: Patient = Depends(get_current_patient)):
    doctor = doctor_client.get_doctor(doctor_id)
    if not doctor:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor

@router.get("/doctors/{doctor_id}/availability", response_model=List[AvailabilityResponse])
def get_doctor_availability(doctor_id: int, current_patient: Patient = Depends(get_current_patient)):
    availability = doctor_client.get_availability(doctor_id)
    return availability