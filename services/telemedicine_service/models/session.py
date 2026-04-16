import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class SessionStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    LIVE = "live"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ParticipantRole(str, enum.Enum):
    DOCTOR = "doctor"
    PATIENT = "patient"


class EventType(str, enum.Enum):
    CREATED = "created"
    STARTED = "started"
    JOINED = "joined"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TelemedicineSession(Base):
    __tablename__ = "telemedicine_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    appointment_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    doctor_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    patient_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    provider = Column(String(40), nullable=False, default="jitsi")
    room_name = Column(String(120), nullable=False, unique=True, index=True)

    status = Column(
        Enum(
            SessionStatus,
            name="telemedicine_session_status",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=SessionStatus.SCHEDULED,
        index=True,
    )

    scheduled_start_at = Column(DateTime(timezone=True), nullable=False, index=True)
    scheduled_end_at = Column(DateTime(timezone=True), nullable=False)
    actual_start_at = Column(DateTime(timezone=True), nullable=True)
    actual_end_at = Column(DateTime(timezone=True), nullable=True)

    join_link_doctor = Column(Text, nullable=True)
    join_link_patient = Column(Text, nullable=True)
    cancel_reason = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    participant_access = relationship(
        "SessionParticipantAccess", back_populates="session", cascade="all, delete-orphan"
    )
    events = relationship("SessionEvent", back_populates="session", cascade="all, delete-orphan")


class SessionParticipantAccess(Base):
    __tablename__ = "session_participant_access"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(
        UUID(as_uuid=True), ForeignKey("telemedicine_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    participant_role = Column(
        Enum(
            ParticipantRole,
            name="telemedicine_participant_role",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
    )
    participant_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    access_token = Column(String(255), nullable=False, index=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=False)
    last_joined_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    session = relationship("TelemedicineSession", back_populates="participant_access")


class SessionEvent(Base):
    __tablename__ = "session_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(
        UUID(as_uuid=True), ForeignKey("telemedicine_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_type = Column(
        Enum(
            EventType,
            name="telemedicine_event_type",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        index=True,
    )
    actor_role = Column(String(40), nullable=True)
    actor_id = Column(UUID(as_uuid=True), nullable=True)
    event_payload = Column(JSON, nullable=True)
    is_system_event = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, index=True)

    session = relationship("TelemedicineSession", back_populates="events")