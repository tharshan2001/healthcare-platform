from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class PatientCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class PatientLogin(BaseModel):
    email: EmailStr
    password: str

class PatientResponse(BaseModel):
    id: int
    email: str
    full_name: str
    date_of_birth: Optional[str]
    gender: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class MedicalRecordCreate(BaseModel):
    patient_id: int
    file_name: str
    record_type: str

class MedicalRecordResponse(BaseModel):
    id: int
    patient_id: int
    file_name: Optional[str]
    file_path: Optional[str]
    record_type: Optional[str]
    uploaded_at: datetime

    class Config:
        from_attributes = True