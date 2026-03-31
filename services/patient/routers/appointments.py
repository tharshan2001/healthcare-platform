from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_db
from routers.auth import get_current_patient
from models import Patient
from utils import appointment_client

router = APIRouter()

class AppointmentCreate(BaseModel):
    doctor_id: int
    appointment_date: str
    appointment_time: str
    reason_for_visit: Optional[str] = None
    notes: Optional[str] = None

@router.post("/appointments")
def create_appointment(
    appointment: AppointmentCreate,
    current_patient: Patient = Depends(get_current_patient)
):
    result = appointment_client.create_appointment(
        patient_id=current_patient.id,
        doctor_id=appointment.doctor_id,
        appointment_date=appointment.appointment_date,
        appointment_time=appointment.appointment_time,
        reason_for_visit=appointment.reason_for_visit or "",
        notes=appointment.notes or ""
    )
    
    if result and "error" in result:
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to create appointment"))
    if not result:
        raise HTTPException(status_code=400, detail="Failed to create appointment")
    
    return result

@router.get("/appointments")
def get_my_appointments(
    current_patient: Patient = Depends(get_current_patient)
):
    appointments = appointment_client.list_appointments(patient_id=current_patient.id)
    return appointments

@router.get("/appointments/{appointment_id}")
def get_appointment(
    appointment_id: int,
    current_patient: Patient = Depends(get_current_patient)
):
    appointment = appointment_client.get_appointment(appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    if "patient_id" in appointment and appointment["patient_id"] != current_patient.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return appointment