from fastapi import APIRouter, Depends, Query
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
    hospital: Optional[str]
    is_available: bool

class AvailabilityResponse(BaseModel):
    id: int
    doctor_id: int
    day_of_week: str
    start_time: str
    end_time: str
    is_available: bool

class TimeSlotResponse(BaseModel):
    id: int
    doctor_id: int
    date: str
    time: str
    available: bool
    is_locked: bool = False

@router.get("/doctors", response_model=List[DoctorResponse])
def get_doctors(
    doctor_name: Optional[str] = None,
    specialty: Optional[str] = None,
    hospital: Optional[str] = None,
    min_experience: Optional[int] = None,
    max_fee: Optional[float] = None,
    current_patient: Optional[Patient] = Depends(get_current_patient)
):
    doctors = doctor_client.get_doctors(doctor_name=doctor_name, specialty=specialty, hospital=hospital, min_experience=min_experience, max_fee=max_fee)
    return doctors

@router.get("/doctors/public", response_model=List[DoctorResponse])
def get_doctors_public(
    doctor_name: Optional[str] = None,
    specialty: Optional[str] = None,
    hospital: Optional[str] = None,
    min_experience: Optional[int] = None,
    max_fee: Optional[float] = None
):
    doctors = doctor_client.get_doctors(doctor_name=doctor_name, specialty=specialty, hospital=hospital, min_experience=min_experience, max_fee=max_fee)
    return doctors

@router.get("/doctors/public/{doctor_id}", response_model=DoctorResponse)
def get_doctor_public(doctor_id: int):
    doctor = doctor_client.get_doctor(doctor_id)
    if not doctor:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor

@router.get("/doctors/{doctor_id}", response_model=DoctorResponse)
def get_doctor(doctor_id: int):
    doctor = doctor_client.get_doctor(doctor_id)
    if not doctor:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor

@router.get("/doctors/{doctor_id}/availability", response_model=List[AvailabilityResponse])
def get_doctor_availability(doctor_id: int):
    availability = doctor_client.get_availability(doctor_id)
    return availability

@router.get("/doctors/{doctor_id}/slots", response_model=List[TimeSlotResponse])
def get_available_slots(doctor_id: int, date: str = Query(...)):
    slots = doctor_client.get_available_slots(doctor_id, date)
    return slots

@router.get("/specializations", response_model=List[str])
def get_specializations():
    return doctor_client.get_specializations()

@router.get("/hospitals", response_model=List[str])
def get_hospitals():
    return doctor_client.get_hospitals()