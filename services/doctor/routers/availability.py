from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from schemas import AvailabilityCreate, AvailabilityResponse
from models import Availability, Doctor
from routers.auth import get_current_doctor
from typing import List

router = APIRouter()

@router.post("/availability", response_model=AvailabilityResponse)
def add_availability(
    availability: AvailabilityCreate,
    current_doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    db_availability = Availability(
        doctor_id=current_doctor.id,
        day_of_week=availability.day_of_week,
        start_time=availability.start_time,
        end_time=availability.end_time,
        is_available=availability.is_available
    )
    db.add(db_availability)
    db.commit()
    db.refresh(db_availability)
    return db_availability

@router.get("/availability", response_model=List[AvailabilityResponse])
def get_availability(
    current_doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    availability = db.query(Availability).filter(Availability.doctor_id == current_doctor.id).all()
    return availability

@router.get("/availability/{doctor_id}", response_model=List[AvailabilityResponse])
def get_doctor_availability(doctor_id: int, db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    availability = db.query(Availability).filter(
        Availability.doctor_id == doctor_id,
        Availability.is_available == True
    ).all()
    return availability

@router.delete("/availability/{availability_id}")
def delete_availability(
    availability_id: int,
    current_doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    availability = db.query(Availability).filter(
        Availability.id == availability_id,
        Availability.doctor_id == current_doctor.id
    ).first()
    
    if not availability:
        raise HTTPException(status_code=404, detail="Availability not found")
    
    db.delete(availability)
    db.commit()
    return {"message": "Availability deleted"}