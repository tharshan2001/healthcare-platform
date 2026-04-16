from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from schemas import AvailabilityResponse
from models import Availability, Doctor, TimeSlot
from typing import List
from datetime import datetime, timedelta
import httpx
import os
from dotenv import load_dotenv

load_dotenv()
APPOINTMENT_SERVICE_URL = os.getenv("APPOINTMENT_SERVICE_URL", "http://localhost:8003")

router = APIRouter()

LOCK_DURATION_MINUTES = 10

class TimeSlotResponse(BaseModel):
    id: int
    doctor_id: int
    date: str
    time: str
    available: bool
    is_locked: bool = False

class LockSlotRequest(BaseModel):
    slot_id: int
    patient_id: int

class LockSlotResponse(BaseModel):
    success: bool
    slot_id: int
    message: str
    expires_at: str

class BookSlotRequest(BaseModel):
    slot_id: int
    patient_id: int
    doctor_id: int
    date: str
    time: str
    reason: str

class ReleaseSlotRequest(BaseModel):
    slot_id: int
    patient_id: int

class CreateSlotRequest(BaseModel):
    doctor_id: int
    date: str
    time: str

class CreateSlotResponse(BaseModel):
    id: int
    doctor_id: int
    date: str
    time: str
    available: bool

@router.post("/doctors/slots", response_model=CreateSlotResponse)
def create_slot(
    request: CreateSlotRequest,
    db: Session = Depends(get_db)
):
    slot = TimeSlot(
        doctor_id=request.doctor_id,
        date=request.date,
        time=request.time,
        is_booked=False
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return {
        "id": slot.id,
        "doctor_id": slot.doctor_id,
        "date": slot.date,
        "time": slot.time,
        "available": not slot.is_booked
    }

@router.get("/doctors/{doctor_id}/slots")
def get_available_slots(
    doctor_id: int,
    date: str,
    db: Session = Depends(get_db)
):
    slots = db.query(TimeSlot).filter(
        TimeSlot.doctor_id == doctor_id,
        TimeSlot.date == date,
        TimeSlot.is_booked == False
    ).order_by(TimeSlot.time).all()
    
    return [
        {
            "id": s.id,
            "doctor_id": s.doctor_id,
            "date": s.date,
            "time": s.time,
            "available": not s.is_booked,
            "is_locked": s.is_booked
        }
        for s in slots
    ]

@router.post("/doctors/slots/lock", response_model=LockSlotResponse)
def lock_slot(
    request: LockSlotRequest,
    db: Session = Depends(get_db)
):
    slot = db.query(TimeSlot).filter(TimeSlot.id == request.slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    
    now = datetime.utcnow()
    
    if slot.is_booked and slot.locked_at and slot.locked_at > now:
        if slot.booked_by == request.patient_id:
            expires_at = slot.locked_at + timedelta(minutes=LOCK_DURATION_MINUTES)
            return {
                "success": True,
                "slot_id": request.slot_id,
                "message": "Slot already locked by you",
                "expires_at": expires_at.isoformat()
            }
        raise HTTPException(status_code=409, detail="Slot is already locked by another patient")
    
    expires_at = now + timedelta(minutes=LOCK_DURATION_MINUTES)
    slot.is_booked = True
    slot.locked_at = now
    slot.booked_by = request.patient_id
    db.commit()
    
    return {
        "success": True,
        "slot_id": request.slot_id,
        "message": f"Slot locked for {LOCK_DURATION_MINUTES} minutes",
        "expires_at": expires_at.isoformat()
    }

@router.post("/doctors/slots/book")
def book_slot(
    request: BookSlotRequest,
    db: Session = Depends(get_db)
):
    slot = db.query(TimeSlot).filter(TimeSlot.id == request.slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    
    now = datetime.utcnow()
    
    if slot.is_booked and slot.locked_at and slot.locked_at > now:
        if slot.booked_by != request.patient_id:
            raise HTTPException(status_code=409, detail="Slot was locked by another patient")
    
    try:
        with httpx.Client(timeout=15.0) as client:
            # Get patient email/phone from patient service
            patient_url = f"http://localhost:8001/patients/{request.patient_id}"
            patient_response = client.get(patient_url)
            patient_data = patient_response.json() if patient_response.status_code == 200 else {}
            print(f"Patient data: {patient_data}")
            
            appt_payload = {
                "patient_id": request.patient_id,
                "doctor_id": request.doctor_id,
                "appointment_date": request.date,
                "appointment_time": request.time,
                "reason_for_visit": request.reason,
                "patient_email": patient_data.get("email", "patient@example.com"),
                "patient_phone": patient_data.get("phone", "0712345678")
            }
            print(f"Creating appointment with: {appt_payload}")
            
            response = client.post(
                f"{APPOINTMENT_SERVICE_URL}/appointments/appointments",
                json=appt_payload
            )
            print(f"Appointment response: {response.status_code}, {response.text}")
            
            if response.status_code == 200:
                slot.is_booked = True
                slot.locked_at = now
                slot.booked_by = request.patient_id
                db.commit()
                return {"success": True, "message": "Appointment booked successfully"}
            else:
                slot.is_booked = False
                slot.locked_at = None
                slot.booked_by = None
                db.commit()
                raise HTTPException(status_code=400, detail="Failed to book appointment")
    except Exception as e:
        slot.is_booked = False
        slot.locked_at = None
        slot.booked_by = None
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/doctors/slots/release")
def release_slot(
    request: ReleaseSlotRequest,
    db: Session = Depends(get_db)
):
    slot = db.query(TimeSlot).filter(TimeSlot.id == request.slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    
    if slot.booked_by != request.patient_id:
        raise HTTPException(status_code=403, detail="Cannot release slot locked by another patient")
    
    slot.is_booked = False
    slot.locked_at = None
    slot.booked_by = None
    db.commit()
    
    return {"success": True, "message": "Slot released"}