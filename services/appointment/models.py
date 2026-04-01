from sqlalchemy import Column, Integer, String, DateTime, Date, Time, Enum, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
from database import Base
import enum

class AppointmentStatus(enum.Enum):
    scheduled = "scheduled"
    confirmed = "confirmed"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"
    no_show = "no_show"

class AppointmentEventType(enum.Enum):
    created = "created"
    rescheduled = "rescheduled"
    status_changed = "status_changed"
    cancelled = "cancelled"

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, index=True, nullable=False)
    doctor_id = Column(Integer, index=True, nullable=False)
    appointment_date = Column(Date, nullable=False)
    appointment_time = Column(Time, nullable=False)
    status = Column(Enum(AppointmentStatus), default=AppointmentStatus.scheduled)
    reason_for_visit = Column(String(1000))
    notes = Column(String(1000))
    cancelled_by = Column(String(20), nullable=True)
    cancel_reason = Column(String(1000), nullable=True)
    version = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        # Logical conflict checks are still enforced in service logic where cancelled bookings are excluded.
        Index("idx_appointments_doctor_datetime", "doctor_id", "appointment_date", "appointment_time"),
    )


class AppointmentEvent(Base):
    __tablename__ = "appointment_events"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), index=True, nullable=False)
    event_type = Column(Enum(AppointmentEventType), nullable=False)
    old_value = Column(JSONB, nullable=True)
    new_value = Column(JSONB, nullable=True)
    actor_id = Column(Integer, nullable=True)
    actor_role = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)