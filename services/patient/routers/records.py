from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from schemas import MedicalRecordResponse
from models import MedicalRecord, Patient
from routers.auth import get_current_patient
import os
import uuid

router = APIRouter()

UPLOAD_DIR = "./uploads"

@router.post("/upload-record", response_model=MedicalRecordResponse)
async def upload_record(
    file: UploadFile = File(...),
    record_type: str = Form(...),
    current_patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)
    
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    medical_record = MedicalRecord(
        patient_id=current_patient.id,
        file_name=file.filename,
        file_path=file_path,
        record_type=record_type
    )
    db.add(medical_record)
    db.commit()
    db.refresh(medical_record)
    return medical_record

@router.get("/records", response_model=list[MedicalRecordResponse])
def get_records(
    current_patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    records = db.query(MedicalRecord).filter(MedicalRecord.patient_id == current_patient.id).all()
    return records