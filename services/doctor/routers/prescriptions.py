from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from schemas import PrescriptionCreate, PrescriptionResponse
from models import Prescription, Doctor
from routers.auth import get_current_doctor
from typing import List

router = APIRouter()

@router.post("/prescriptions", response_model=PrescriptionResponse)
def create_prescription(
    prescription: PrescriptionCreate,
    current_doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    db_prescription = Prescription(
        patient_id=prescription.patient_id,
        doctor_id=current_doctor.id,
        appointment_id=prescription.appointment_id,
        medication_details=prescription.medication_details,
        dosage=prescription.dosage,
        duration=prescription.duration,
        notes=prescription.notes
    )
    db.add(db_prescription)
    db.commit()
    db.refresh(db_prescription)
    return db_prescription

@router.get("/prescriptions", response_model=List[PrescriptionResponse])
def get_prescriptions(
    current_doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    prescriptions = db.query(Prescription).filter(Prescription.doctor_id == current_doctor.id).all()
    return prescriptions

@router.get("/prescriptions/patient/{patient_id}", response_model=List[PrescriptionResponse])
def get_patient_prescriptions(
    patient_id: int,
    db: Session = Depends(get_db)
):
    prescriptions = db.query(Prescription).filter(Prescription.patient_id == patient_id).all()
    return prescriptions