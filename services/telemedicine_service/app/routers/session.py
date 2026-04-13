from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, desc
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models.session import (
    EventType,
    ParticipantRole,
    SessionEvent,
    SessionParticipantAccess,
    SessionStatus,
    TelemedicineSession,
)
from ..schemas.session import (
    CancelSessionRequest,
    CompleteSessionRequest,
    JoinSessionRequest,
    JoinSessionResponse,
    MessageResponse,
    SessionCreateRequest,
    SessionCreateResponse,
    SessionDetailResponse,
    SessionEventResponse,
    SessionListResponse,
    StartSessionRequest,
)
from ..video_provider import get_video_provider

router = APIRouter(prefix=f"{settings.API_V1_PREFIX}/telemedicine", tags=["telemedicine"])


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _build_room_name(doctor_id: UUID, patient_id: UUID) -> str:
    timestamp = int(_utc_now().timestamp())
    return f"{settings.JITSI_ROOM_PREFIX}-d{str(doctor_id)[:8]}-p{str(patient_id)[:8]}-{timestamp}"


def _emit_event(
    db: Session,
    session_id: UUID,
    event_type: EventType,
    actor_role: str | None,
    actor_id: UUID | None,
    payload: dict | None = None,
    is_system_event: bool = False,
) -> None:
    event = SessionEvent(
        session_id=session_id,
        event_type=event_type,
        actor_role=actor_role,
        actor_id=actor_id,
        event_payload=payload,
        is_system_event=is_system_event,
    )
    db.add(event)


def _session_to_response(session: TelemedicineSession, events: list[SessionEvent]) -> SessionDetailResponse:
    event_items = [
        SessionEventResponse(
            event_type=event.event_type.value,
            actor_role=event.actor_role,
            actor_id=event.actor_id,
            payload=event.event_payload,
            created_at=event.created_at,
        )
        for event in events
    ]
    return SessionDetailResponse(
        id=session.id,
        appointment_id=session.appointment_id,
        doctor_id=session.doctor_id,
        patient_id=session.patient_id,
        provider=session.provider,
        room_name=session.room_name,
        status=session.status.value,
        scheduled_start_at=session.scheduled_start_at,
        scheduled_end_at=session.scheduled_end_at,
        actual_start_at=session.actual_start_at,
        actual_end_at=session.actual_end_at,
        join_link_doctor=session.join_link_doctor,
        join_link_patient=session.join_link_patient,
        cancel_reason=session.cancel_reason,
        created_at=session.created_at,
        updated_at=session.updated_at,
        events=event_items,
    )


@router.post("/sessions", response_model=SessionCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_session(request: SessionCreateRequest, db: Session = Depends(get_db)):
    if request.scheduled_end_at <= request.scheduled_start_at:
        raise HTTPException(status_code=400, detail="scheduled_end_at must be greater than scheduled_start_at")

    provider = request.provider.strip().lower()
    if provider not in {"jitsi", "twilio"}:
        raise HTTPException(status_code=400, detail="provider must be either 'jitsi' or 'twilio'")

    room_name = _build_room_name(request.doctor_id, request.patient_id)

    session = TelemedicineSession(
        appointment_id=request.appointment_id,
        doctor_id=request.doctor_id,
        patient_id=request.patient_id,
        provider=provider,
        room_name=room_name,
        status=SessionStatus.SCHEDULED,
        scheduled_start_at=request.scheduled_start_at,
        scheduled_end_at=request.scheduled_end_at,
    )
    db.add(session)
    db.flush()

    _emit_event(
        db=db,
        session_id=session.id,
        event_type=EventType.CREATED,
        actor_role="system",
        actor_id=None,
        payload={"provider": session.provider, "scheduled_start_at": str(session.scheduled_start_at)},
        is_system_event=True,
    )

    db.commit()
    db.refresh(session)

    return SessionCreateResponse(
        session_id=session.id,
        room_name=session.room_name,
        status=session.status.value,
        provider=session.provider,
        scheduled_start_at=session.scheduled_start_at,
        scheduled_end_at=session.scheduled_end_at,
        created_at=session.created_at,
    )


@router.get("/sessions", response_model=SessionListResponse)
async def list_sessions(
    doctor_id: UUID | None = Query(None),
    patient_id: UUID | None = Query(None),
    status_filter: SessionStatus | None = Query(None, alias="status"),
    from_time: datetime | None = Query(None, alias="from"),
    to_time: datetime | None = Query(None, alias="to"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(TelemedicineSession)
    filters = []
    if doctor_id:
        filters.append(TelemedicineSession.doctor_id == doctor_id)
    if patient_id:
        filters.append(TelemedicineSession.patient_id == patient_id)
    if status_filter:
        filters.append(TelemedicineSession.status == status_filter)
    if from_time:
        filters.append(TelemedicineSession.scheduled_start_at >= from_time)
    if to_time:
        filters.append(TelemedicineSession.scheduled_end_at <= to_time)

    if filters:
        query = query.filter(and_(*filters))

    total = query.count()
    sessions = query.order_by(desc(TelemedicineSession.created_at)).offset(offset).limit(limit).all()

    items = []
    for session in sessions:
        events = (
            db.query(SessionEvent)
            .filter(SessionEvent.session_id == session.id)
            .order_by(desc(SessionEvent.created_at))
            .limit(20)
            .all()
        )
        items.append(_session_to_response(session, events))

    return SessionListResponse(total=total, items=items)


@router.get("/sessions/{session_id}", response_model=SessionDetailResponse)
async def get_session(session_id: UUID, db: Session = Depends(get_db)):
    session = db.query(TelemedicineSession).filter(TelemedicineSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    events = (
        db.query(SessionEvent)
        .filter(SessionEvent.session_id == session.id)
        .order_by(desc(SessionEvent.created_at))
        .all()
    )
    return _session_to_response(session, events)


@router.post("/sessions/{session_id}/join", response_model=JoinSessionResponse)
async def join_session(session_id: UUID, request: JoinSessionRequest, db: Session = Depends(get_db)):
    session = db.query(TelemedicineSession).filter(TelemedicineSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    if session.status in [SessionStatus.CANCELLED, SessionStatus.COMPLETED]:
        raise HTTPException(status_code=400, detail=f"Cannot join a {session.status.value} session")

    if request.role.value == ParticipantRole.DOCTOR.value and request.participant_id != session.doctor_id:
        raise HTTPException(status_code=403, detail="Doctor id does not match the session doctor")
    if request.role.value == ParticipantRole.PATIENT.value and request.participant_id != session.patient_id:
        raise HTTPException(status_code=403, detail="Patient id does not match the session patient")

    role = ParticipantRole(request.role.value)

    provider = get_video_provider(session.provider)
    join_url, token, token_expires_at = provider.build_join_payload(
        session_id=session.id,
        room_name=session.room_name,
        role=role,
        participant_id=request.participant_id,
        display_name=request.display_name,
    )

    existing_access = (
        db.query(SessionParticipantAccess)
        .filter(
            SessionParticipantAccess.session_id == session.id,
            SessionParticipantAccess.participant_role == role,
            SessionParticipantAccess.participant_id == request.participant_id,
        )
        .first()
    )
    if existing_access:
        existing_access.access_token = token
        existing_access.token_expires_at = token_expires_at
        existing_access.last_joined_at = _utc_now()
    else:
        db.add(
            SessionParticipantAccess(
                session_id=session.id,
                participant_role=role,
                participant_id=request.participant_id,
                access_token=token,
                token_expires_at=token_expires_at,
                last_joined_at=_utc_now(),
            )
        )

    if role == ParticipantRole.DOCTOR:
        session.join_link_doctor = join_url
    else:
        session.join_link_patient = join_url

    if session.status == SessionStatus.SCHEDULED:
        session.status = SessionStatus.LIVE
        session.actual_start_at = session.actual_start_at or _utc_now()
        _emit_event(
            db,
            session_id=session.id,
            event_type=EventType.STARTED,
            actor_role="system",
            actor_id=None,
            payload={"reason": "first participant joined"},
            is_system_event=True,
        )

    _emit_event(
        db,
        session_id=session.id,
        event_type=EventType.JOINED,
        actor_role=role.value,
        actor_id=request.participant_id,
        payload={"display_name": request.display_name},
    )

    db.commit()
    db.refresh(session)

    return JoinSessionResponse(
        session_id=session.id,
        room_name=session.room_name,
        provider=session.provider,
        join_url=join_url,
        access_token=token,
        token_expires_at=token_expires_at,
        status=session.status.value,
    )


@router.patch("/sessions/{session_id}/start", response_model=MessageResponse)
async def start_session(session_id: UUID, request: StartSessionRequest, db: Session = Depends(get_db)):
    session = db.query(TelemedicineSession).filter(TelemedicineSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    if session.status != SessionStatus.SCHEDULED:
        raise HTTPException(status_code=400, detail=f"Session status must be scheduled, got {session.status.value}")

    session.status = SessionStatus.LIVE
    session.actual_start_at = _utc_now()
    _emit_event(
        db,
        session_id=session.id,
        event_type=EventType.STARTED,
        actor_role=request.actor_role,
        actor_id=request.actor_id,
        payload={"trigger": "manual_start"},
    )

    db.commit()

    return MessageResponse(message=f"Session {session_id} started", success=True)


@router.patch("/sessions/{session_id}/complete", response_model=MessageResponse)
async def complete_session(session_id: UUID, request: CompleteSessionRequest, db: Session = Depends(get_db)):
    session = db.query(TelemedicineSession).filter(TelemedicineSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    if session.status != SessionStatus.LIVE:
        raise HTTPException(status_code=400, detail=f"Session status must be live, got {session.status.value}")

    session.status = SessionStatus.COMPLETED
    session.actual_end_at = _utc_now()
    _emit_event(
        db,
        session_id=session.id,
        event_type=EventType.COMPLETED,
        actor_role=request.actor_role,
        actor_id=request.actor_id,
        payload={"duration_seconds": int((session.actual_end_at - session.actual_start_at).total_seconds()) if session.actual_start_at else None},
    )

    db.commit()

    return MessageResponse(message=f"Session {session_id} completed", success=True)


@router.patch("/sessions/{session_id}/cancel", response_model=MessageResponse)
async def cancel_session(session_id: UUID, request: CancelSessionRequest, db: Session = Depends(get_db)):
    session = db.query(TelemedicineSession).filter(TelemedicineSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    if session.status == SessionStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Completed sessions cannot be cancelled")

    session.status = SessionStatus.CANCELLED
    session.cancel_reason = request.reason
    _emit_event(
        db,
        session_id=session.id,
        event_type=EventType.CANCELLED,
        actor_role=request.actor_role,
        actor_id=request.actor_id,
        payload={"reason": request.reason},
    )

    db.commit()

    return MessageResponse(message=f"Session {session_id} cancelled", success=True)




