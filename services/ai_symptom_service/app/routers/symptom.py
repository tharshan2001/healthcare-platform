from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional
from uuid import UUID
from datetime import datetime

from ..database import get_db
from ..models.symptom import (
    SymptomSession,
    SymptomEntry,
    AnalysisResult,
    EmergencyAlert,
    FollowUpResponse,
    SessionStatus,
    TriagePriority as ModelTriagePriority,
    AlertType as ModelAlertType,
)
from ..schemas.symptom import (
    SymptomSessionCreate,
    SymptomSessionResponse,
    SessionDetailResponse,
    AnalyzeRequest,
    AnalysisResponse,
    FollowUpRequest,
    EmergencyCheckRequest,
    EmergencyResponse,
    SymptomHistoryResponse,
    SymptomHistoryItem,
    SymptomEntryResponse,
    PossibleCondition,
    TriageResult,
    FollowUpQuestion,
    TriagePriority,
    MessageResponse,
)
from ..ai_engine import ai_engine

router = APIRouter(prefix="/api/v1/symptoms", tags=["symptoms"])


@router.post("/session", response_model=SymptomSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    request: SymptomSessionCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new symptom checking session.
    
    This endpoint initializes a new session for a patient to report their symptoms.
    The session can then be used to submit symptoms and receive AI analysis.
    """
    session = SymptomSession(
        patient_id=request.patient_id,
        chief_complaint=request.chief_complaint,
        status=SessionStatus.ACTIVE
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return SymptomSessionResponse(
        id=session.id,
        patient_id=session.patient_id,
        status=session.status.value,
        triage_priority=None,
        chief_complaint=session.chief_complaint,
        created_at=session.created_at,
        updated_at=session.updated_at,
        completed_at=session.completed_at,
        symptom_count=0,
        has_analysis=False,
        is_emergency=False
    )


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_symptoms(
    request: AnalyzeRequest,
    db: Session = Depends(get_db)
):
    """
    Submit symptoms for AI-powered analysis.
    
    This endpoint accepts a list of symptoms and uses AI to provide:
    - Possible medical conditions ranked by likelihood
    - Severity assessment (1-10)
    - Recommended medical specialty
    - Triage priority level
    - Emergency detection
    - Follow-up questions for additional information
    """
    session = db.query(SymptomSession).filter(
        SymptomSession.id == request.session_id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {request.session_id} not found"
        )
    
    if session.status != SessionStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Session is not active. Current status: {session.status.value}"
        )
    
    for symptom_input in request.symptoms:
        symptom_entry = SymptomEntry(
            session_id=session.id,
            symptom_name=symptom_input.symptom_name,
            severity=symptom_input.severity,
            duration=symptom_input.duration,
            duration_value=symptom_input.duration_value,
            duration_unit=symptom_input.duration_unit,
            body_location=symptom_input.body_location,
            description=symptom_input.description,
            onset_type=symptom_input.onset_type,
            is_primary=symptom_input.is_primary
        )
        db.add(symptom_entry)
    
    analysis_result = await ai_engine.analyze_symptoms(
        symptoms=request.symptoms,
        patient_age=request.patient_age,
        patient_gender=request.patient_gender,
        medical_history=request.medical_history,
        current_medications=request.current_medications
    )
    
    triage_priority_value = analysis_result.get("triage_priority", "5")
    try:
        triage_priority_enum = ModelTriagePriority(triage_priority_value)
    except ValueError:
        triage_priority_enum = ModelTriagePriority.ROUTINE
    
    analysis = AnalysisResult(
        session_id=session.id,
        possible_conditions=analysis_result.get("possible_conditions", []),
        recommended_specialty=analysis_result.get("recommended_specialty", "General Practice"),
        severity_score=analysis_result.get("severity_score", 5),
        is_emergency=analysis_result.get("is_emergency", False),
        follow_up_questions=analysis_result.get("follow_up_questions", []),
        ai_reasoning=analysis_result.get("ai_reasoning", ""),
        confidence_score=analysis_result.get("confidence_score", 0.5),
        model_used=analysis_result.get("model_used", "unknown"),
        tokens_used=analysis_result.get("tokens_used", 0)
    )
    
    db.add(analysis)
    
    session.triage_priority = triage_priority_enum
    
    if analysis_result.get("is_emergency"):
        emergency_alert = EmergencyAlert(
            session_id=session.id,
            patient_id=session.patient_id,
            alert_type=ModelAlertType.CRITICAL,
            triggered_symptoms=[s.symptom_name for s in request.symptoms],
            emergency_instructions=ai_engine._get_emergency_instructions(
                [s.symptom_name for s in request.symptoms]
            )
        )
        db.add(emergency_alert)
    
    db.commit()
    db.refresh(analysis)
    
    conditions = [
        PossibleCondition(
            condition_name=c.get("condition_name", "Unknown"),
            likelihood=c.get("likelihood", "unknown"),
            likelihood_score=c.get("likelihood_score"),
            description=c.get("description", ""),
            matching_symptoms=c.get("matching_symptoms", [])
        )
        for c in analysis_result.get("possible_conditions", [])
    ]
    
    follow_up_questions = [
        FollowUpQuestion(
            question_id=q.get("question_id", f"q_{i}"),
            question_text=q.get("question_text", ""),
            question_type=q.get("question_type", "text"),
            options=q.get("options"),
            required=q.get("required", True)
        )
        for i, q in enumerate(analysis_result.get("follow_up_questions", []))
    ]
    
    triage = TriageResult(
        priority=TriagePriority(triage_priority_value),
        priority_label=_get_priority_label(triage_priority_value),
        reasoning=analysis_result.get("triage_reasoning", ""),
        recommended_timeframe=analysis_result.get("recommended_timeframe", "Consult a healthcare provider")
    )
    
    return AnalysisResponse(
        session_id=session.id,
        analysis_id=analysis.id,
        possible_conditions=conditions,
        recommended_specialty=analysis.recommended_specialty,
        severity_score=analysis.severity_score,
        triage=triage,
        is_emergency=analysis.is_emergency,
        follow_up_questions=follow_up_questions,
        ai_reasoning=analysis.ai_reasoning,
        confidence_score=float(analysis.confidence_score) if analysis.confidence_score else 0.5,
        created_at=analysis.created_at
    )


@router.post("/follow-up", response_model=AnalysisResponse)
async def submit_follow_up(
    request: FollowUpRequest,
    db: Session = Depends(get_db)
):
    """
    Submit answers to follow-up questions and receive updated analysis.
    
    After receiving follow-up questions from the initial analysis,
    patients can provide additional information to refine the assessment.
    """
    session = db.query(SymptomSession).filter(
        SymptomSession.id == request.session_id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {request.session_id} not found"
        )
    
    for answer in request.answers:
        follow_up = FollowUpResponse(
            session_id=session.id,
            question_id=answer.question_id,
            question_text=answer.question_text,
            response_text=answer.response_text,
            response_options=answer.selected_options
        )
        db.add(follow_up)
    
    db.commit()
    
    symptoms = db.query(SymptomEntry).filter(
        SymptomEntry.session_id == session.id
    ).all()
    
    from ..schemas.symptom import SymptomInput
    symptom_inputs = [
        SymptomInput(
            symptom_name=s.symptom_name,
            severity=s.severity,
            duration=s.duration,
            body_location=s.body_location,
            description=s.description
        )
        for s in symptoms
    ]
    
    analysis_result = await ai_engine.analyze_symptoms(
        symptoms=symptom_inputs,
    )
    
    latest_analysis = db.query(AnalysisResult).filter(
        AnalysisResult.session_id == session.id
    ).order_by(desc(AnalysisResult.created_at)).first()
    
    if latest_analysis:
        latest_analysis.possible_conditions = analysis_result.get("possible_conditions", [])
        latest_analysis.recommended_specialty = analysis_result.get("recommended_specialty")
        latest_analysis.severity_score = analysis_result.get("severity_score")
        latest_analysis.is_emergency = analysis_result.get("is_emergency", False)
        latest_analysis.follow_up_questions = analysis_result.get("follow_up_questions", [])
        latest_analysis.ai_reasoning = analysis_result.get("ai_reasoning", "")
        latest_analysis.confidence_score = analysis_result.get("confidence_score", 0.5)
    else:
        latest_analysis = AnalysisResult(
            session_id=session.id,
            possible_conditions=analysis_result.get("possible_conditions", []),
            recommended_specialty=analysis_result.get("recommended_specialty"),
            severity_score=analysis_result.get("severity_score"),
            is_emergency=analysis_result.get("is_emergency", False),
            follow_up_questions=analysis_result.get("follow_up_questions", []),
            ai_reasoning=analysis_result.get("ai_reasoning", ""),
            confidence_score=analysis_result.get("confidence_score", 0.5)
        )
        db.add(latest_analysis)
    
    db.commit()
    db.refresh(latest_analysis)
    
    triage_priority_value = analysis_result.get("triage_priority", "5")
    conditions = [
        PossibleCondition(
            condition_name=c.get("condition_name", "Unknown"),
            likelihood=c.get("likelihood", "unknown"),
            likelihood_score=c.get("likelihood_score"),
            description=c.get("description", ""),
            matching_symptoms=c.get("matching_symptoms", [])
        )
        for c in analysis_result.get("possible_conditions", [])
    ]
    
    triage = TriageResult(
        priority=TriagePriority(triage_priority_value),
        priority_label=_get_priority_label(triage_priority_value),
        reasoning=analysis_result.get("triage_reasoning", ""),
        recommended_timeframe=analysis_result.get("recommended_timeframe", "Consult a healthcare provider")
    )
    
    return AnalysisResponse(
        session_id=session.id,
        analysis_id=latest_analysis.id,
        possible_conditions=conditions,
        recommended_specialty=latest_analysis.recommended_specialty,
        severity_score=latest_analysis.severity_score,
        triage=triage,
        is_emergency=latest_analysis.is_emergency,
        follow_up_questions=[],
        ai_reasoning=latest_analysis.ai_reasoning,
        confidence_score=float(latest_analysis.confidence_score) if latest_analysis.confidence_score else 0.5,
        created_at=latest_analysis.created_at
    )


@router.get("/history/{patient_id}", response_model=SymptomHistoryResponse)
async def get_symptom_history(
    patient_id: UUID,
    limit: int = 10,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    Get a patient's symptom checking history.
    
    Returns a list of past symptom sessions with their outcomes,
    useful for tracking health patterns over time.
    """
    total = db.query(SymptomSession).filter(
        SymptomSession.patient_id == patient_id
    ).count()
    
    sessions = db.query(SymptomSession).filter(
        SymptomSession.patient_id == patient_id
    ).order_by(desc(SymptomSession.created_at)).offset(offset).limit(limit).all()
    
    history_items = []
    for session in sessions:
        symptom_count = db.query(SymptomEntry).filter(
            SymptomEntry.session_id == session.id
        ).count()
        
        analysis = db.query(AnalysisResult).filter(
            AnalysisResult.session_id == session.id
        ).order_by(desc(AnalysisResult.created_at)).first()
        
        history_items.append(SymptomHistoryItem(
            session_id=session.id,
            chief_complaint=session.chief_complaint,
            status=session.status.value,
            triage_priority=session.triage_priority.value if session.triage_priority else None,
            symptom_count=symptom_count,
            severity_score=analysis.severity_score if analysis else None,
            is_emergency=analysis.is_emergency if analysis else False,
            created_at=session.created_at
        ))
    
    return SymptomHistoryResponse(
        patient_id=patient_id,
        total_sessions=total,
        history=history_items
    )


@router.get("/session/{session_id}", response_model=SessionDetailResponse)
async def get_session_details(
    session_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific symptom session.
    
    Returns the session with all associated symptoms, analysis results,
    and any emergency alerts that were triggered.
    """
    session = db.query(SymptomSession).filter(
        SymptomSession.id == session_id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    
    symptoms = db.query(SymptomEntry).filter(
        SymptomEntry.session_id == session_id
    ).all()
    
    analysis = db.query(AnalysisResult).filter(
        AnalysisResult.session_id == session_id
    ).order_by(desc(AnalysisResult.created_at)).first()
    
    alerts = db.query(EmergencyAlert).filter(
        EmergencyAlert.session_id == session_id
    ).all()
    
    session_response = SymptomSessionResponse(
        id=session.id,
        patient_id=session.patient_id,
        status=session.status.value,
        triage_priority=session.triage_priority.value if session.triage_priority else None,
        chief_complaint=session.chief_complaint,
        created_at=session.created_at,
        updated_at=session.updated_at,
        completed_at=session.completed_at,
        symptom_count=len(symptoms),
        has_analysis=analysis is not None,
        is_emergency=analysis.is_emergency if analysis else False
    )
    
    symptom_responses = [
        SymptomEntryResponse(
            id=s.id,
            symptom_name=s.symptom_name,
            severity=s.severity,
            duration=s.duration,
            body_location=s.body_location,
            description=s.description,
            onset_type=s.onset_type,
            is_primary=s.is_primary,
            created_at=s.created_at
        )
        for s in symptoms
    ]
    
    analysis_response = None
    if analysis:
        triage_priority_value = session.triage_priority.value if session.triage_priority else "5"
        conditions = [
            PossibleCondition(
                condition_name=c.get("condition_name", "Unknown"),
                likelihood=c.get("likelihood", "unknown"),
                likelihood_score=c.get("likelihood_score"),
                description=c.get("description", ""),
                matching_symptoms=c.get("matching_symptoms", [])
            )
            for c in analysis.possible_conditions
        ]
        
        triage = TriageResult(
            priority=TriagePriority(triage_priority_value),
            priority_label=_get_priority_label(triage_priority_value),
            reasoning="See AI reasoning for details",
            recommended_timeframe="Consult a healthcare provider"
        )
        
        analysis_response = AnalysisResponse(
            session_id=session.id,
            analysis_id=analysis.id,
            possible_conditions=conditions,
            recommended_specialty=analysis.recommended_specialty,
            severity_score=analysis.severity_score,
            triage=triage,
            is_emergency=analysis.is_emergency,
            follow_up_questions=[],
            ai_reasoning=analysis.ai_reasoning,
            confidence_score=float(analysis.confidence_score) if analysis.confidence_score else 0.5,
            created_at=analysis.created_at
        )
    
    emergency_responses = [
        EmergencyResponse(
            is_emergency=True,
            alert_type=a.alert_type.value,
            triggered_symptoms=a.triggered_symptoms,
            emergency_instructions=a.emergency_instructions or "",
            recommended_action="Seek immediate medical attention",
            call_emergency_services=a.alert_type == ModelAlertType.CRITICAL
        )
        for a in alerts
    ]
    
    return SessionDetailResponse(
        session=session_response,
        symptoms=symptom_responses,
        analysis=analysis_response,
        emergency_alerts=emergency_responses
    )


@router.post("/emergency-check", response_model=EmergencyResponse)
async def check_emergency(
    request: EmergencyCheckRequest,
    db: Session = Depends(get_db)
):
    """
    Quick emergency symptom check.
    
    Rapidly assesses if provided symptoms indicate a medical emergency
    that requires immediate attention. This is a fast-path endpoint
    for urgent situations.
    """
    result = await ai_engine.check_emergency(
        symptoms=request.symptoms,
        patient_id=str(request.patient_id) if request.patient_id else None
    )
    
    if result.get("is_emergency") and request.patient_id:
        session = SymptomSession(
            patient_id=request.patient_id,
            chief_complaint="Emergency check: " + ", ".join(request.symptoms[:3]),
            status=SessionStatus.ACTIVE,
            triage_priority=ModelTriagePriority.CRITICAL
        )
        db.add(session)
        db.commit()
        
        alert = EmergencyAlert(
            session_id=session.id,
            patient_id=request.patient_id,
            alert_type=ModelAlertType(result.get("alert_type", "critical")),
            triggered_symptoms=result.get("triggered_symptoms", request.symptoms),
            emergency_instructions=result.get("emergency_instructions", "")
        )
        db.add(alert)
        db.commit()
    
    return EmergencyResponse(
        is_emergency=result.get("is_emergency", False),
        alert_type=result.get("alert_type"),
        triggered_symptoms=result.get("triggered_symptoms", []),
        emergency_instructions=result.get("emergency_instructions", ""),
        recommended_action=result.get("recommended_action", "Monitor symptoms"),
        call_emergency_services=result.get("call_emergency_services", False)
    )


@router.patch("/session/{session_id}/complete", response_model=MessageResponse)
async def complete_session(
    session_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Mark a symptom session as completed.
    
    This should be called when the patient has received their analysis
    and any follow-up has been completed.
    """
    session = db.query(SymptomSession).filter(
        SymptomSession.id == session_id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    
    session.status = SessionStatus.COMPLETED
    session.completed_at = datetime.utcnow()
    db.commit()
    
    return MessageResponse(
        message=f"Session {session_id} marked as completed",
        success=True
    )


@router.delete("/session/{session_id}", response_model=MessageResponse)
async def cancel_session(
    session_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Cancel a symptom session.
    
    Sets the session status to cancelled. The session data is preserved
    but will not be included in active session counts.
    """
    session = db.query(SymptomSession).filter(
        SymptomSession.id == session_id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    
    session.status = SessionStatus.CANCELLED
    db.commit()
    
    return MessageResponse(
        message=f"Session {session_id} has been cancelled",
        success=True
    )


def _get_priority_label(priority: str) -> str:
    """Get human-readable label for triage priority."""
    labels = {
        "1": "Critical",
        "2": "Urgent",
        "3": "Moderate",
        "4": "Low",
        "5": "Routine"
    }
    return labels.get(priority, "Unknown")
