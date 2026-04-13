from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SessionStatus(str, Enum):
    SCHEDULED = "scheduled"
    LIVE = "live"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ParticipantRole(str, Enum):
    DOCTOR = "doctor"
    PATIENT = "patient"


class SessionCreateRequest(BaseModel):
    appointment_id: UUID | None = Field(None, description="Optional appointment id from appointment service")
    doctor_id: UUID
    patient_id: UUID
    scheduled_start_at: datetime
    scheduled_end_at: datetime
    provider: str = Field("jitsi", description="jitsi or twilio")


class SessionCreateResponse(BaseModel):
    session_id: UUID
    room_name: str
    status: SessionStatus
    provider: str
    scheduled_start_at: datetime
    scheduled_end_at: datetime
    created_at: datetime


class JoinSessionRequest(BaseModel):
    role: ParticipantRole
    participant_id: UUID
    display_name: str = Field(..., min_length=2, max_length=80)


class JoinSessionResponse(BaseModel):
    session_id: UUID
    room_name: str
    provider: str
    join_url: str
    access_token: str
    token_expires_at: datetime
    status: SessionStatus


class SessionEventResponse(BaseModel):
    event_type: str
    actor_role: str | None
    actor_id: UUID | None
    payload: dict | None
    created_at: datetime


class SessionDetailResponse(BaseModel):
    id: UUID
    appointment_id: UUID | None
    doctor_id: UUID
    patient_id: UUID
    provider: str
    room_name: str
    status: SessionStatus
    scheduled_start_at: datetime
    scheduled_end_at: datetime
    actual_start_at: datetime | None
    actual_end_at: datetime | None
    join_link_doctor: str | None
    join_link_patient: str | None
    cancel_reason: str | None
    created_at: datetime
    updated_at: datetime
    events: list[SessionEventResponse] = Field(default_factory=list)


class SessionListResponse(BaseModel):
    total: int
    items: list[SessionDetailResponse]


class StartSessionRequest(BaseModel):
    actor_role: str = "doctor"
    actor_id: UUID | None = None


class CompleteSessionRequest(BaseModel):
    actor_role: str = "doctor"
    actor_id: UUID | None = None


class CancelSessionRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500)
    actor_role: str = "doctor"
    actor_id: UUID | None = None


class MessageResponse(BaseModel):
    message: str
    success: bool = True


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    checks: dict[str, str]


class ErrorResponse(BaseModel):
    error: str
    detail: str | None = None
    status_code: int


class SessionFilters(BaseModel):
    doctor_id: UUID | None = None
    patient_id: UUID | None = None
    status: SessionStatus | None = None

    model_config = ConfigDict(extra="ignore")

