from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class DoctorCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    specialty: str
    qualifications: Optional[str] = None
    license_number: Optional[str] = None
    consultation_fee: Optional[float] = 0.0
    years_of_experience: Optional[int] = 0
    bio: Optional[str] = None

class DoctorLogin(BaseModel):
    email: EmailStr
    password: str

class DoctorResponse(BaseModel):
    id: int
    email: str
    full_name: str
    specialty: str
    qualifications: Optional[str]
    license_number: Optional[str]
    consultation_fee: float
    years_of_experience: int
    bio: Optional[str]
    is_available: bool
    created_at: datetime

    class Config:
        from_attributes = True

class DoctorUpdate(BaseModel):
    full_name: Optional[str] = None
    specialty: Optional[str] = None
    qualifications: Optional[str] = None
    consultation_fee: Optional[float] = None
    years_of_experience: Optional[int] = None
    bio: Optional[str] = None
    is_available: Optional[bool] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class AvailabilityCreate(BaseModel):
    day_of_week: str
    start_time: str
    end_time: str
    is_available: bool = True

class AvailabilityResponse(BaseModel):
    id: int
    doctor_id: int
    day_of_week: str
    start_time: str
    end_time: str
    is_available: bool

    class Config:
        from_attributes = True

class PrescriptionCreate(BaseModel):
    patient_id: int
    appointment_id: Optional[int] = None
    medication_details: str
    dosage: Optional[str] = None
    duration: Optional[str] = None
    notes: Optional[str] = None

class PrescriptionResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    appointment_id: Optional[int]
    medication_details: str
    dosage: Optional[str]
    duration: Optional[str]
    notes: Optional[str]
    issued_at: datetime

    class Config:
        from_attributes = True