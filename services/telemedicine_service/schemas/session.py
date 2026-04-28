from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class SessionStatus(str, Enum):
    SCHEDULED = "scheduled"
    LIVE = "live"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ParticipantRole(str, Enum):
    DOCTOR = "doctor"
    PATIENT = "patient"


class SessionCreateRequest(BaseModel):
    doctor_id: int = Field(..., ge=1)
    patient_id: int = Field(..., ge=1)
    appointment_id: int | None = Field(None, ge=1)
    provider: str = Field(default="jitsi")
    scheduled_start_at: datetime
    scheduled_end_at: datetime


class SessionCreateResponse(BaseModel):
    session_id: UUID
    room_name: str
    status: str
    provider: str
    scheduled_start_at: datetime
    scheduled_end_at: datetime
    created_at: datetime


class JoinSessionRequest(BaseModel):
    role: ParticipantRole
    participant_id: int = Field(..., ge=1)
    display_name: str


class JoinSessionResponse(BaseModel):
    session_id: UUID
    room_name: str
    provider: str
    join_url: str
    access_token: str
    token_expires_at: datetime
    status: str


class SessionListResponse(BaseModel):
    total: int
    items: list[dict[str, Any]]


class SessionDetailResponse(BaseModel):
    id: UUID
    appointment_id: int | None
    doctor_id: int
    patient_id: int
    provider: str
    room_name: str
    status: str
    scheduled_start_at: datetime
    scheduled_end_at: datetime
    actual_start_at: datetime | None
    actual_end_at: datetime | None
    join_link_doctor: str | None
    join_link_patient: str | None
    cancel_reason: str | None
    created_at: datetime
    updated_at: datetime
    events: list[dict[str, Any]]


class SessionEventResponse(BaseModel):
    event_type: str
    actor_role: str | None
    actor_id: int | None
    payload: dict[str, Any] | None
    created_at: datetime


class StartSessionRequest(BaseModel):
    actor_role: str
    actor_id: int = Field(..., ge=1)


class CompleteSessionRequest(BaseModel):
    actor_role: str
    actor_id: int = Field(..., ge=1)


class CancelSessionRequest(BaseModel):
    actor_role: str
    actor_id: int = Field(..., ge=1)
    reason: str


class SessionEventResponse(BaseModel):
    event_type: str
    actor_role: str | None
    actor_id: int | None
    payload: dict[str, Any] | None
    created_at: datetime


class MessageResponse(BaseModel):
    message: str
    success: bool = True