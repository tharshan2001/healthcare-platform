from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float
from datetime import datetime
from database import Base

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    specialty = Column(String(100), nullable=False)
    qualifications = Column(String(500))
    license_number = Column(String(100), unique=True)
    consultation_fee = Column(Float, default=0.0)
    years_of_experience = Column(Integer, default=0)
    bio = Column(String(1000))
    is_available = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Availability(Base):
    __tablename__ = "availability"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, index=True, nullable=False)
    day_of_week = Column(String(20), nullable=False)
    start_time = Column(String(10), nullable=False)
    end_time = Column(String(10), nullable=False)
    is_available = Column(Boolean, default=True)

class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, index=True, nullable=False)
    doctor_id = Column(Integer, index=True, nullable=False)
    appointment_id = Column(Integer, index=True)
    medication_details = Column(String(2000), nullable=False)
    dosage = Column(String(500))
    duration = Column(String(200))
    notes = Column(String(1000))
    issued_at = Column(DateTime, default=datetime.utcnow)