from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AppointmentCreate(BaseModel):
    doctor_id: int
    patient_id: int
    appointment_date: str
    appointment_time: str
    reason_for_visit: Optional[str] = None
    notes: Optional[str] = None

class AppointmentUpdate(BaseModel):
    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None
    status: Optional[str] = None
    reason_for_visit: Optional[str] = None
    notes: Optional[str] = None
    payment_status: Optional[str] = None

class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    appointment_date: str
    appointment_time: str
    status: str
    reason_for_visit: Optional[str]
    notes: Optional[str]
    payment_status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True