from redis_client import redis_client
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from schemas import AppointmentCreate, AppointmentUpdate, AppointmentResponse
from models import Appointment, AppointmentStatus, PaymentStatus
from utils.auth import decode_token
from typing import List
from datetime import date, time

def clear_availability_cache(doctor_id: int, date: str, time: str):
    cache_key = f"availability:{doctor_id}:{date}"
    redis_client.delete(cache_key)

router = APIRouter()

security = HTTPBearer()

try:
    import redis
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
    redis_enabled = True
except:
    redis_client = None
    redis_enabled = False

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload

def check_conflict(db: Session, doctor_id: int, appointment_date: str, appointment_time: str, exclude_id: int = None):
    query = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.appointment_date == appointment_date,
        Appointment.appointment_time == appointment_time,
        Appointment.status != AppointmentStatus.cancelled
    )
    if exclude_id:
        query = query.filter(Appointment.id != exclude_id)
    return query.first()

def cache_availability(doctor_id: int, date: str, time: str, available: bool):
    if redis_enabled and redis_client:
        try:
            key = f"availability:{doctor_id}:{date}:{time}"
            redis_client.setex(key, 300, "available" if available else "unavailable")
        except:
            pass

def get_cached_availability(doctor_id: int, date: str, time: str):
    if redis_enabled and redis_client:
        try:
            key = f"availability:{doctor_id}:{date}:{time}"
            return redis_client.get(key)
        except:
            return None
    return None

@router.post("/", response_model=AppointmentResponse)
def create_appointment(
    appointment: AppointmentCreate,
    db: Session = Depends(get_db)
):
    # Prevent booking in the past
    if appointment.appointment_date < str(date.today()):
        raise HTTPException(status_code=400, detail="Cannot book an appointment in the past")

    conflict = check_conflict(db, appointment.doctor_id, appointment.appointment_date, appointment.appointment_time)
    if conflict:
        raise HTTPException(status_code=400, detail="Time slot already booked")
    
    db_appointment = Appointment(
        patient_id=appointment.patient_id,
        doctor_id=appointment.doctor_id,
        appointment_date=appointment.appointment_date,
        appointment_time=appointment.appointment_time,
        reason_for_visit=appointment.reason_for_visit,
        notes=appointment.notes
    )
    db.add(db_appointment)

    try:
        db.commit()
        db.refresh(appointment)
    except Exception:
            db.rollback()
            raise HTTPException(status_code=500, detail="Failed to create appointment")
    # db.commit()
    # db.refresh(db_appointment)

    clear_availability_cache(
        db_appointment.doctor_id,
        str(db_appointment.appointment_date),
        str(db_appointment.appointment_time)
    )
    
    cache_availability(appointment.doctor_id, appointment.appointment_date, appointment.appointment_time, False)
    
    return db_appointment

@router.get("/my", response_model=List[AppointmentResponse])
def get_my_appointments(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    #Decode token
    token = credentials.credentials
    payload = {
        "user_id": 1,
        "role": "patient"
    }

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("user_id")
    role = payload.get("role")

    if not user_id or not role:
        raise HTTPException(status_code=401, detail="Invalid token data")

    #Role-based filtering
    if role == "patient":
        appointments = db.query(Appointment).filter(
            Appointment.patient_id == user_id
        ).all()

    elif role == "doctor":
        appointments = db.query(Appointment).filter(
            Appointment.doctor_id == user_id
        ).all()

    else:
        raise HTTPException(status_code=403, detail="Unauthorized role")

    return appointments

@router.get("/availability/{doctor_id}")
def get_doctor_availability(
    doctor_id: int,
    date: str,
    db: Session = Depends(get_db)
):
    #Redis key
    cache_key = f"availability:{doctor_id}:{date}"

    #Check cache
    try:
        cached_data = redis_client.get(cache_key)
        if cached_data:
            data = json.loads(cached_data)
            data["source"] = "cache"
            return data
    except:
        pass

    #All slots
    all_slots = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]

    #Get booked slots
    booked_appointments = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.appointment_date == date
    ).all()

    booked_slots = [appt.appointment_time for appt in booked_appointments]

    #Calculate available
    available_slots = [
        slot for slot in all_slots if slot not in booked_slots
    ]

    #Store in cache
    try:
        redis_client.setex(
            cache_key,
            300,
            ",".join(available_slots)
        )
    except:
        pass

    response = {
        "doctor_id": doctor_id,
        "date": date,
        "available_slots": available_slots,
        "source": "database"
    }

    redis_client.setex(cache_key, 300, json.dumps(response))

    return response


@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(appointment_id: int, db: Session = Depends(get_db)):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment


@router.put("/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(
    appointment_id: int,
    appointment_update: AppointmentUpdate,
    db: Session = Depends(get_db)
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    #Check cancelled FIRST (before anything else)
    if appointment.status == AppointmentStatus.cancelled:
        raise HTTPException(status_code=400, detail="Cannot update a cancelled appointment")
    
    if appointment.status == AppointmentStatus.completed:
        raise HTTPException(status_code=400, detail="Cannot update a completed appointment")

    #Conflict check
    if appointment_update.appointment_date or appointment_update.appointment_time:
        new_date = appointment_update.appointment_date or appointment.appointment_date
        new_time = appointment_update.appointment_time or appointment.appointment_time

        conflict = check_conflict(
            db,
            appointment.doctor_id,
            new_date,
            new_time,
            exclude_id=appointment_id
        )

        if conflict:
            raise HTTPException(status_code=400, detail="Time slot already booked")

    #Update fields safely
    if appointment_update.appointment_date is not None:
        if appointment_update.appointment_date < str(date.today()):
            raise HTTPException(status_code=400, detail="Cannot reschedule to a past date")
        appointment.appointment_date = appointment_update.appointment_date

    if appointment_update.appointment_time is not None:
        appointment.appointment_time = appointment_update.appointment_time

    if appointment_update.reason_for_visit is not None:
        appointment.reason_for_visit = appointment_update.reason_for_visit

    if appointment_update.notes is not None:
        appointment.notes = appointment_update.notes

    if appointment_update.status:
        new_status = AppointmentStatus(appointment_update.status)

        if new_status == AppointmentStatus.completed:
            if appointment.status != AppointmentStatus.scheduled:
                raise HTTPException(status_code=400, detail="Only scheduled appointments can be marked as completed")
            
        appointment.status = new_status

    if appointment_update.payment_status is not None:
        appointment.payment_status = PaymentStatus(appointment_update.payment_status)

    # db.commit()
    # db.refresh(appointment)

    try:
        db.commit()
        db.refresh(appointment)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create appointment")

    clear_availability_cache(
        appointment.doctor_id,
        str(appointment.appointment_date),
        str(appointment.appointment_time)
    )

    return appointment

@router.delete("/{appointment_id}", response_model=AppointmentResponse)
def cancel_appointment(
    appointment_id: int,
    db: Session = Depends(get_db)
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    #Prevent cancelling again
    if appointment.status == AppointmentStatus.cancelled:
        raise HTTPException(status_code=400, detail="Appointment already cancelled")

    #Update status
    appointment.status = AppointmentStatus.cancelled

    try:
        db.commit()
        db.refresh(appointment)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create appointment")

    #CLEAR CACHE
    clear_availability_cache(
        appointment.doctor_id,
        str(appointment.appointment_date),
        str(appointment.appointment_time)
    )

    return appointment

@router.get("/appointments", response_model=List[AppointmentResponse])
def list_appointments(
    patient_id: int = None,
    doctor_id: int = None,
    db: Session = Depends(get_db)
):
    query = db.query(Appointment)
    if patient_id:
        query = query.filter(Appointment.patient_id == patient_id)
    if doctor_id:
        query = query.filter(Appointment.doctor_id == doctor_id)
    return query.all()