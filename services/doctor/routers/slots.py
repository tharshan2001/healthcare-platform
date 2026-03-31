from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from schemas import AvailabilityResponse
from models import Availability, Doctor
from typing import List
from datetime import datetime
import httpx

router = APIRouter()

class TimeSlotResponse(BaseModel):
    doctor_id: int
    date: str
    time: str
    available: bool

APPOINTMENT_SERVICE_URL = "http://localhost:8003"

def generate_time_slots(start_time: str, end_time: str, slot_duration_minutes: int = 30):
    slots = []
    start_h, start_m = map(int, start_time.split(':'))
    end_h, end_m = map(int, end_time.split(':'))
    
    current = start_h * 60 + start_m
    end = end_h * 60 + end_m
    
    while current + slot_duration_minutes <= end:
        h = current // 60
        m = current % 60
        slots.append(f"{h:02d}:{m:02d}")
        current += slot_duration_minutes
    
    return slots

@router.get("/doctors/{doctor_id}/availability", response_model=List[AvailabilityResponse])
def get_doctor_availability(doctor_id: int, db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    availability = db.query(Availability).filter(
        Availability.doctor_id == doctor_id,
        Availability.is_available == True
    ).all()
    return availability

@router.get("/doctors/{doctor_id}/slots", response_model=List[TimeSlotResponse])
def get_available_slots(
    doctor_id: int,
    date: str = Query(...),
    db: Session = Depends(get_db)
):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    availability = db.query(Availability).filter(
        Availability.doctor_id == doctor_id,
        Availability.is_available == True
    ).all()
    
    if not availability:
        return []
    
    try:
        input_date = datetime.strptime(date, '%Y-%m-%d')
        day_name = input_date.strftime('%A')
    except:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    available_for_day = [a for a in availability if a.day_of_week == day_name]
    
    if not available_for_day:
        return []
    
    try:
        with httpx.Client() as client:
            response = client.get(
                f"{APPOINTMENT_SERVICE_URL}/appointments/appointments",
                params={"doctor_id": doctor_id}
            )
            if response.status_code == 200:
                all_appointments = response.json()
                booked = [a for a in all_appointments if a.get('appointment_date') == date and a.get('status') != 'cancelled']
                booked_times = [a['appointment_time'] for a in booked]
            else:
                booked_times = []
    except:
        booked_times = []
    
    all_slots = []
    for avail in available_for_day:
        slots = generate_time_slots(avail.start_time, avail.end_time)
        for slot in slots:
            if slot not in booked_times:
                all_slots.append({
                    "doctor_id": doctor_id,
                    "date": date,
                    "time": slot,
                    "available": True
                })
    
    return all_slots