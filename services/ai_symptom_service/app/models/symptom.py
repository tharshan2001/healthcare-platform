import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Boolean, Text, DateTime, 
    ForeignKey, Enum, Numeric, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from ..database import Base


class SessionStatus(str, enum.Enum):
    """Status of a symptom checking session."""
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class TriagePriority(str, enum.Enum):
    """Triage priority levels (1 = most urgent, 5 = least urgent)."""
    CRITICAL = "1"
    URGENT = "2"
    MODERATE = "3"
    LOW = "4"
    ROUTINE = "5"


class AlertType(str, enum.Enum):
    """Types of emergency alerts."""
    CRITICAL = "critical"
    URGENT = "urgent"
    WARNING = "warning"


class SymptomSession(Base):
    """
    Tracks a user's symptom checking session.
    Each session contains multiple symptom entries and analysis results.
    """
    __tablename__ = "symptom_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    status = Column(
        Enum(SessionStatus, name="session_status", create_type=False, values_callable=lambda x: [e.value for e in x]),
        default=SessionStatus.ACTIVE
    )
    triage_priority = Column(
        Enum(TriagePriority, name="triage_priority", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=True
    )
    chief_complaint = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    symptom_entries = relationship(
        "SymptomEntry", 
        back_populates="session", 
        cascade="all, delete-orphan"
    )
    analysis_results = relationship(
        "AnalysisResult", 
        back_populates="session", 
        cascade="all, delete-orphan"
    )
    emergency_alerts = relationship(
        "EmergencyAlert", 
        back_populates="session", 
        cascade="all, delete-orphan"
    )
    follow_up_responses = relationship(
        "FollowUpResponse",
        back_populates="session",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self):
        return f"<SymptomSession(id={self.id}, patient_id={self.patient_id}, status={self.status})>"


class SymptomEntry(Base):
    """
    Individual symptom reported within a session.
    Contains details like severity, duration, and body location.
    """
    __tablename__ = "symptom_entries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("symptom_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    symptom_name = Column(String(255), nullable=False)
    severity = Column(Integer, nullable=True)  # 1-10 scale
    duration = Column(String(100), nullable=True)  # Human-readable duration
    duration_value = Column(Integer, nullable=True)
    duration_unit = Column(String(20), nullable=True)  # hours, days, weeks, etc.
    body_location = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    onset_type = Column(String(50), nullable=True)  # sudden, gradual
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Relationships
    session = relationship("SymptomSession", back_populates="symptom_entries")
    
    def __repr__(self):
        return f"<SymptomEntry(id={self.id}, symptom={self.symptom_name}, severity={self.severity})>"


class AnalysisResult(Base):
    """
    Stores AI-generated analysis for a symptom session.
    Includes possible conditions, severity scores, and recommendations.
    """
    __tablename__ = "analysis_results"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("symptom_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    possible_conditions = Column(JSON, nullable=False, default=list)
    recommended_specialty = Column(String(100), nullable=True)
    severity_score = Column(Integer, nullable=True)  # 1-10 scale
    is_emergency = Column(Boolean, default=False, index=True)
    follow_up_questions = Column(JSON, default=list)
    ai_reasoning = Column(Text, nullable=True)
    confidence_score = Column(Numeric(3, 2), nullable=True)  # 0.00 to 1.00
    model_used = Column(String(100), nullable=True)
    tokens_used = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    session = relationship("SymptomSession", back_populates="analysis_results")
    
    def __repr__(self):
        return f"<AnalysisResult(id={self.id}, severity={self.severity_score}, emergency={self.is_emergency})>"


class EmergencyAlert(Base):
    """
    Logs emergency detections for audit and follow-up.
    Created when critical symptoms are detected.
    """
    __tablename__ = "emergency_alerts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("symptom_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    patient_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    alert_type = Column(
        Enum(AlertType, name="alert_type", create_type=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False
    )
    triggered_symptoms = Column(JSON, nullable=False)
    emergency_instructions = Column(Text, nullable=True)
    was_acknowledged = Column(Boolean, default=False)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    
    # Relationships
    session = relationship("SymptomSession", back_populates="emergency_alerts")
    
    def __repr__(self):
        return f"<EmergencyAlert(id={self.id}, type={self.alert_type}, acknowledged={self.was_acknowledged})>"


class FollowUpResponse(Base):
    """
    Stores patient responses to AI follow-up questions.
    """
    __tablename__ = "follow_up_responses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("symptom_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    question_id = Column(String(100), nullable=False)
    question_text = Column(Text, nullable=False)
    response_text = Column(Text, nullable=False)
    response_options = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Relationships
    session = relationship("SymptomSession", back_populates="follow_up_responses")
    
    def __repr__(self):
        return f"<FollowUpResponse(id={self.id}, question_id={self.question_id})>"
