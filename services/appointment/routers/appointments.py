from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from schemas import AppointmentCreate, AppointmentUpdate, AppointmentResponse
from models import Appointment, AppointmentStatus, PaymentStatus
from utils.auth import decode_token
from utils.notification_client import send_notification
from typing import List

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

@router.post("/appointments", response_model=AppointmentResponse)
def create_appointment(
    appointment: AppointmentCreate,
    db: Session = Depends(get_db)
):
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
    db.commit()
    db.refresh(db_appointment)
    
    cache_availability(appointment.doctor_id, appointment.appointment_date, appointment.appointment_time, False)
    
    if appointment.patient_email:
        doctor_name = appointment.doctor_name or "your doctor"
        message = f"Your appointment with Dr. {doctor_name} is scheduled for {appointment.appointment_date} at {appointment.appointment_time}."
        print(f"SENDING NOTIFICATION to patient {appointment.patient_id}: {message}")
        try:
            result = send_notification(
                user_id=appointment.patient_id,
                message=message,
                notification_type="appointment",
                email=appointment.patient_email,
                phone=appointment.patient_phone or ""
            )
            print(f"Notification result: {result}")
        except Exception as e:
            print(f"Failed to send notification: {e}")
    
    return db_appointment

@router.get("/appointments/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(appointment_id: int, db: Session = Depends(get_db)):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment

@router.put("/appointments/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(
    appointment_id: int,
    appointment_update: AppointmentUpdate,
    db: Session = Depends(get_db)
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    if appointment_update.appointment_date or appointment_update.appointment_time:
        new_date = appointment_update.appointment_date or appointment.appointment_date
        new_time = appointment_update.appointment_time or appointment.appointment_time
        conflict = check_conflict(db, appointment.doctor_id, new_date, new_time, exclude_id=appointment_id)
        if conflict:
            raise HTTPException(status_code=400, detail="Time slot already booked")
    
    if appointment_update.appointment_date:
        appointment.appointment_date = appointment_update.appointment_date
    if appointment_update.appointment_time:
        appointment.appointment_time = appointment_update.appointment_time
    if appointment_update.status:
        appointment.status = AppointmentStatus(appointment_update.status)
    if appointment_update.notes:
        appointment.notes = appointment_update.notes
    if appointment_update.payment_status:
        appointment.payment_status = PaymentStatus(appointment_update.payment_status)
    
    db.commit()
    db.refresh(appointment)
    return appointment

@router.delete("/appointments/{appointment_id}")
def cancel_appointment(appointment_id: int, db: Session = Depends(get_db)):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    appointment.status = AppointmentStatus.cancelled
    db.commit()
    
    cache_availability(appointment.doctor_id, appointment.appointment_date, appointment.appointment_time, True)
    
    return {"message": "Appointment cancelled"}

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