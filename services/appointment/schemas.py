from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date, time
from enum import Enum


class AppointmentStatusEnum(str, Enum):
    scheduled = "scheduled"
    confirmed = "confirmed"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"
    no_show = "no_show"


class AppointmentEventTypeEnum(str, Enum):
    created = "created"
    rescheduled = "rescheduled"
    status_changed = "status_changed"
    cancelled = "cancelled"

class AppointmentCreate(BaseModel):
    doctor_id: int
    patient_id: Optional[int] = None
    appointment_date: date
    appointment_time: time
    reason_for_visit: Optional[str] = None
    notes: Optional[str] = None

class AppointmentUpdate(BaseModel):
    appointment_date: Optional[date] = None
    appointment_time: Optional[time] = None
    notes: Optional[str] = None
    reason_for_visit: Optional[str] = None
    version: Optional[int] = None


class AppointmentStatusUpdate(BaseModel):
    status: AppointmentStatusEnum
    actor_id: Optional[int] = None
    actor_role: Optional[str] = None
    version: Optional[int] = None


class AppointmentEventResponse(BaseModel):
    id: int
    appointment_id: int
    event_type: AppointmentEventTypeEnum
    old_value: Optional[dict] = None
    new_value: Optional[dict] = None
    actor_id: Optional[int] = None
    actor_role: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SlotResponse(BaseModel):
    doctor_id: int
    date: date
    time: time
    available: bool

class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    appointment_date: date
    appointment_time: time
    status: AppointmentStatusEnum
    reason_for_visit: Optional[str]
    notes: Optional[str]
    cancelled_by: Optional[str]
    cancel_reason: Optional[str]
    version: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True