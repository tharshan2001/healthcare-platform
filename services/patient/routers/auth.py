from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from schemas import PatientCreate, PatientLogin, PatientResponse, PatientUpdate, Token
from models import Patient
from utils.auth import hash_password, verify_password, create_access_token, decode_token

router = APIRouter()

security = HTTPBearer()

def get_current_patient(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    patient_id = payload.get("sub")
    patient = db.query(Patient).filter(Patient.id == int(patient_id)).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@router.post("/register", response_model=PatientResponse)
def register(patient: PatientCreate, db: Session = Depends(get_db)):
    existing = db.query(Patient).filter(Patient.email == patient.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = hash_password(patient.password)
    db_patient = Patient(
        email=patient.email,
        password_hash=hashed_password,
        full_name=patient.full_name,
        date_of_birth=patient.date_of_birth,
        gender=patient.gender,
        phone=patient.phone,
        address=patient.address
    )
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient

@router.post("/login", response_model=Token)
def login(patient: PatientLogin, db: Session = Depends(get_db)):
    db_patient = db.query(Patient).filter(Patient.email == patient.email).first()
    if not db_patient or not verify_password(patient.password, db_patient.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(data={"sub": str(db_patient.id), "role": "patient"})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/profile", response_model=PatientResponse)
def get_profile(current_patient: Patient = Depends(get_current_patient)):
    return current_patient

@router.put("/profile", response_model=PatientResponse)
def update_profile(patient_update: PatientUpdate, current_patient: Patient = Depends(get_current_patient), db: Session = Depends(get_db)):
    if patient_update.full_name:
        current_patient.full_name = patient_update.full_name
    if patient_update.date_of_birth:
        current_patient.date_of_birth = patient_update.date_of_birth
    if patient_update.gender:
        current_patient.gender = patient_update.gender
    if patient_update.phone:
        current_patient.phone = patient_update.phone
    if patient_update.address:
        current_patient.address = patient_update.address
    
    db.commit()
    db.refresh(current_patient)
    return current_patient