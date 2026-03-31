from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from schemas import DoctorCreate, DoctorLogin, DoctorResponse, DoctorUpdate, Token
from models import Doctor
from utils.auth import hash_password, verify_password, create_access_token, decode_token

router = APIRouter()

security = HTTPBearer()

def get_current_doctor(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    doctor_id = payload.get("sub")
    doctor = db.query(Doctor).filter(Doctor.id == int(doctor_id)).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor

@router.post("/register", response_model=DoctorResponse)
def register(doctor: DoctorCreate, db: Session = Depends(get_db)):
    existing = db.query(Doctor).filter(Doctor.email == doctor.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    existing_license = db.query(Doctor).filter(Doctor.license_number == doctor.license_number).first()
    if existing_license:
        raise HTTPException(status_code=400, detail="License number already registered")
    
    hashed_password = hash_password(doctor.password)
    db_doctor = Doctor(
        email=doctor.email,
        password_hash=hashed_password,
        full_name=doctor.full_name,
        specialty=doctor.specialty,
        qualifications=doctor.qualifications,
        license_number=doctor.license_number,
        consultation_fee=doctor.consultation_fee,
        years_of_experience=doctor.years_of_experience,
        bio=doctor.bio
    )
    db.add(db_doctor)
    db.commit()
    db.refresh(db_doctor)
    return db_doctor

@router.post("/login", response_model=Token)
def login(doctor: DoctorLogin, db: Session = Depends(get_db)):
    db_doctor = db.query(Doctor).filter(Doctor.email == doctor.email).first()
    if not db_doctor or not verify_password(doctor.password, db_doctor.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(data={"sub": str(db_doctor.id), "role": "doctor"})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/profile", response_model=DoctorResponse)
def get_profile(current_doctor: Doctor = Depends(get_current_doctor)):
    return current_doctor

@router.put("/profile", response_model=DoctorResponse)
def update_profile(doctor_update: DoctorUpdate, current_doctor: Doctor = Depends(get_current_doctor), db: Session = Depends(get_db)):
    if doctor_update.full_name:
        current_doctor.full_name = doctor_update.full_name
    if doctor_update.specialty:
        current_doctor.specialty = doctor_update.specialty
    if doctor_update.qualifications:
        current_doctor.qualifications = doctor_update.qualifications
    if doctor_update.consultation_fee:
        current_doctor.consultation_fee = doctor_update.consultation_fee
    if doctor_update.years_of_experience:
        current_doctor.years_of_experience = doctor_update.years_of_experience
    if doctor_update.bio:
        current_doctor.bio = doctor_update.bio
    if doctor_update.is_available is not None:
        current_doctor.is_available = doctor_update.is_available
    
    db.commit()
    db.refresh(current_doctor)
    return current_doctor