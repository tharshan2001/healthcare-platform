from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from schemas import DoctorResponse
from models import Doctor
from typing import List, Optional

router = APIRouter()

@router.get("/doctors", response_model=List[DoctorResponse])
def list_doctors(
    specialty: Optional[str] = Query(None),
    min_experience: Optional[int] = Query(None),
    max_fee: Optional[float] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Doctor).filter(Doctor.is_available == True)
    
    if specialty:
        query = query.filter(Doctor.specialty.ilike(f"%{specialty}%"))
    if min_experience:
        query = query.filter(Doctor.years_of_experience >= min_experience)
    if max_fee:
        query = query.filter(Doctor.consultation_fee <= max_fee)
    
    doctors = query.all()
    return doctors

@router.get("/doctors/{doctor_id}", response_model=DoctorResponse)
def get_doctor(doctor_id: int, db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor