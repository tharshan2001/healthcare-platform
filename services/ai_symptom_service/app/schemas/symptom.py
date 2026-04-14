from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID
from enum import Enum


class SessionStatus(str, Enum):
    """Status of a symptom checking session."""
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class TriagePriority(str, Enum):
    """Triage priority levels."""
    CRITICAL = "1"
    URGENT = "2"
    MODERATE = "3"
    LOW = "4"
    ROUTINE = "5"


class AlertType(str, Enum):
    """Types of emergency alerts."""
    CRITICAL = "critical"
    URGENT = "urgent"
    WARNING = "warning"


# ============== Symptom Input Schemas ==============

class SymptomInput(BaseModel):
    """Individual symptom input from the user."""
    symptom_name: str = Field(..., min_length=1, max_length=255, description="Name of the symptom")
    severity: Optional[int] = Field(None, ge=1, le=10, description="Severity on a scale of 1-10")
    duration: Optional[str] = Field(None, max_length=100, description="How long symptom has been present")
    duration_value: Optional[int] = Field(None, ge=0, description="Numeric duration value")
    duration_unit: Optional[str] = Field(None, max_length=20, description="Duration unit (hours, days, weeks)")
    body_location: Optional[str] = Field(None, max_length=255, description="Body part affected")
    description: Optional[str] = Field(None, description="Additional description of the symptom")
    onset_type: Optional[str] = Field(None, description="How the symptom started (sudden, gradual)")
    is_primary: bool = Field(False, description="Whether this is the main symptom")
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "symptom_name": "headache",
            "severity": 7,
            "duration": "2 days",
            "duration_value": 2,
            "duration_unit": "days",
            "body_location": "forehead",
            "description": "Throbbing pain that gets worse with light",
            "onset_type": "gradual",
            "is_primary": True
        }
    })


class SymptomSessionCreate(BaseModel):
    """Request schema for creating a new symptom session."""
    patient_id: UUID = Field(..., description="UUID of the patient")
    chief_complaint: Optional[str] = Field(None, description="Main reason for symptom check")
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "patient_id": "123e4567-e89b-12d3-a456-426614174000",
            "chief_complaint": "Experiencing persistent headache and fatigue"
        }
    })


class AnalyzeRequest(BaseModel):
    """Request schema for symptom analysis."""
    session_id: UUID = Field(..., description="Session UUID")
    symptoms: list[SymptomInput] = Field(..., min_length=1, description="List of symptoms to analyze")
    patient_age: Optional[int] = Field(None, ge=0, le=150, description="Patient's age")
    patient_gender: Optional[str] = Field(None, description="Patient's gender")
    medical_history: Optional[list[str]] = Field(None, description="Relevant medical history")
    current_medications: Optional[list[str]] = Field(None, description="Current medications")
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "session_id": "123e4567-e89b-12d3-a456-426614174000",
            "symptoms": [
                {"symptom_name": "headache", "severity": 7, "duration": "2 days"},
                {"symptom_name": "fever", "severity": 5, "duration": "1 day"}
            ],
            "patient_age": 35,
            "patient_gender": "female",
            "medical_history": ["hypertension"],
            "current_medications": ["lisinopril"]
        }
    })


# ============== Follow-up Schemas ==============

class FollowUpQuestion(BaseModel):
    """A follow-up question from the AI."""
    question_id: str = Field(..., description="Unique identifier for the question")
    question_text: str = Field(..., description="The question text")
    question_type: str = Field("text", description="Type of question (text, yes_no, multiple_choice)")
    options: Optional[list[str]] = Field(None, description="Options for multiple choice questions")
    required: bool = Field(True, description="Whether the question must be answered")


class FollowUpAnswer(BaseModel):
    """Answer to a follow-up question."""
    question_id: str = Field(..., description="ID of the question being answered")
    question_text: str = Field(..., description="Original question text")
    response_text: str = Field(..., description="User's response")
    selected_options: Optional[list[str]] = Field(None, description="Selected options for multiple choice")


class FollowUpRequest(BaseModel):
    """Request schema for submitting follow-up answers."""
    session_id: UUID = Field(..., description="Session UUID")
    answers: list[FollowUpAnswer] = Field(..., min_length=1, description="List of answers")
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "session_id": "123e4567-e89b-12d3-a456-426614174000",
            "answers": [
                {
                    "question_id": "q1",
                    "question_text": "Does the headache worsen with physical activity?",
                    "response_text": "Yes, it gets much worse when I move around"
                }
            ]
        }
    })


# ============== Emergency Schemas ==============

class EmergencyCheckRequest(BaseModel):
    """Request for quick emergency symptom check."""
    symptoms: list[str] = Field(..., min_length=1, description="List of symptom descriptions")
    patient_id: Optional[UUID] = Field(None, description="Optional patient UUID")
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "symptoms": ["chest pain", "difficulty breathing", "left arm numbness"],
            "patient_id": "123e4567-e89b-12d3-a456-426614174000"
        }
    })


class EmergencyResponse(BaseModel):
    """Response for emergency detection."""
    is_emergency: bool = Field(..., description="Whether symptoms indicate an emergency")
    alert_type: Optional[AlertType] = Field(None, description="Type of alert if emergency")
    triggered_symptoms: list[str] = Field(default_factory=list, description="Symptoms that triggered the alert")
    emergency_instructions: str = Field(..., description="Instructions for the patient")
    recommended_action: str = Field(..., description="Recommended immediate action")
    call_emergency_services: bool = Field(False, description="Whether to call emergency services")
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "is_emergency": True,
            "alert_type": "critical",
            "triggered_symptoms": ["chest pain", "difficulty breathing"],
            "emergency_instructions": "These symptoms may indicate a cardiac emergency. Please call emergency services immediately.",
            "recommended_action": "Call 911 or your local emergency number immediately",
            "call_emergency_services": True
        }
    })


# ============== Analysis Response Schemas ==============

class PossibleCondition(BaseModel):
    """A possible medical condition from analysis."""
    condition_name: str = Field(..., description="Name of the condition")
    likelihood: str = Field(..., description="Likelihood level (high, moderate, low)")
    likelihood_score: Optional[float] = Field(None, ge=0, le=1, description="Numerical likelihood score")
    description: str = Field(..., description="Brief description of the condition")
    matching_symptoms: list[str] = Field(default_factory=list, description="Symptoms that match this condition")


class TriageResult(BaseModel):
    """Triage assessment result."""
    priority: TriagePriority = Field(..., description="Triage priority level")
    priority_label: str = Field(..., description="Human-readable priority label")
    reasoning: str = Field(..., description="Explanation for the triage decision")
    recommended_timeframe: str = Field(..., description="Recommended timeframe to seek care")
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "priority": "2",
            "priority_label": "Urgent",
            "reasoning": "Combination of high fever and severe headache requires prompt medical evaluation",
            "recommended_timeframe": "Within 24 hours"
        }
    })


class AnalysisResponse(BaseModel):
    """Full analysis response from the AI."""
    session_id: UUID = Field(..., description="Session UUID")
    analysis_id: UUID = Field(..., description="Analysis result UUID")
    possible_conditions: list[PossibleCondition] = Field(..., description="Possible medical conditions")
    recommended_specialty: str = Field(..., description="Recommended medical specialty")
    severity_score: int = Field(..., ge=1, le=10, description="Overall severity score")
    triage: TriageResult = Field(..., description="Triage assessment")
    is_emergency: bool = Field(..., description="Whether this is an emergency")
    follow_up_questions: list[FollowUpQuestion] = Field(default_factory=list, description="Follow-up questions")
    ai_reasoning: str = Field(..., description="AI's reasoning for the analysis")
    confidence_score: float = Field(..., ge=0, le=1, description="AI confidence in the analysis")
    disclaimer: str = Field(
        default="This analysis is for informational purposes only and should not replace professional medical advice. Please consult a healthcare provider for proper diagnosis and treatment.",
        description="Medical disclaimer"
    )
    created_at: datetime = Field(..., description="When the analysis was created")
    
    model_config = ConfigDict(from_attributes=True)


# ============== Session Response Schemas ==============

class SymptomEntryResponse(BaseModel):
    """Response schema for a symptom entry."""
    id: UUID
    symptom_name: str
    severity: Optional[int]
    duration: Optional[str]
    body_location: Optional[str]
    description: Optional[str]
    onset_type: Optional[str]
    is_primary: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class SymptomSessionResponse(BaseModel):
    """Response schema for a symptom session."""
    id: UUID
    patient_id: UUID
    status: SessionStatus
    triage_priority: Optional[TriagePriority]
    chief_complaint: Optional[str]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]
    symptom_count: int = Field(0, description="Number of symptoms reported")
    has_analysis: bool = Field(False, description="Whether analysis has been performed")
    is_emergency: bool = Field(False, description="Whether emergency was detected")
    
    model_config = ConfigDict(from_attributes=True)


class SessionDetailResponse(BaseModel):
    """Detailed session response with all related data."""
    session: SymptomSessionResponse
    symptoms: list[SymptomEntryResponse]
    analysis: Optional[AnalysisResponse]
    emergency_alerts: list[EmergencyResponse]
    
    model_config = ConfigDict(from_attributes=True)


# ============== History Response Schemas ==============

class SymptomHistoryItem(BaseModel):
    """A single item in the symptom history."""
    session_id: UUID
    chief_complaint: Optional[str]
    status: SessionStatus
    triage_priority: Optional[TriagePriority]
    symptom_count: int
    severity_score: Optional[int]
    is_emergency: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class SymptomHistoryResponse(BaseModel):
    """Response schema for patient's symptom history."""
    patient_id: UUID
    total_sessions: int
    history: list[SymptomHistoryItem]
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "patient_id": "123e4567-e89b-12d3-a456-426614174000",
            "total_sessions": 5,
            "history": [
                {
                    "session_id": "123e4567-e89b-12d3-a456-426614174001",
                    "chief_complaint": "Headache and fever",
                    "status": "completed",
                    "triage_priority": "3",
                    "symptom_count": 2,
                    "severity_score": 6,
                    "is_emergency": False,
                    "created_at": "2024-01-15T10:30:00Z"
                }
            ]
        }
    })


# ============== Common Response Schemas ==============

class MessageResponse(BaseModel):
    """Generic message response."""
    message: str
    success: bool = True


class ErrorResponse(BaseModel):
    """Error response schema."""
    error: str
    detail: Optional[str] = None
    status_code: int
