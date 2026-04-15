import os
from datetime import datetime, timezone
from uuid import UUID

import httpx
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


def _service_urls(env_var: str, *defaults: str) -> list[str]:
    raw_value = os.getenv(env_var, "")
    urls = [value.strip().rstrip("/") for value in raw_value.split(",") if value.strip()]
    urls.extend(default.rstrip("/") for default in defaults)

    unique_urls: list[str] = []
    for url in urls:
        if url and url not in unique_urls:
            unique_urls.append(url)
    return unique_urls


def _fetch_remote_resource(urls: list[str], path: str) -> dict | None:
    saw_connectivity_error = False

    with httpx.Client(timeout=5.0) as client:
        for base_url in urls:
            try:
                response = client.get(f"{base_url}{path}")
            except httpx.RequestError:
                saw_connectivity_error = True
                continue

            if response.status_code == 200:
                payload = response.json()
                if isinstance(payload, dict):
                    return payload
                return {"data": payload}

            if response.status_code != 404:
                raise HTTPException(
                    status_code=502,
                    detail=f"Validation service at {base_url} returned {response.status_code}",
                )

    if saw_connectivity_error:
        raise HTTPException(status_code=503, detail="Validation service is unavailable")
    return None


def _require_registered_doctor(doctor_id: int) -> dict:
    try:
        doctor = _fetch_remote_resource(
            _service_urls(
                "DOCTOR_SERVICE_URLS",
                "http://host.docker.internal:8002",
                "http://localhost:8002",
            ),
            f"/doctors/{doctor_id}",
        )
    except HTTPException as exc:
        if exc.status_code == 503 and not settings.EXTERNAL_VALIDATION_STRICT:
            return {"id": doctor_id, "validation": "skipped_unavailable"}
        raise

    if not doctor:
        raise HTTPException(status_code=404, detail=f"Doctor {doctor_id} not found")
    return doctor


def _require_registered_patient(patient_id: int) -> dict:
    try:
        patient = _fetch_remote_resource(
            _service_urls(
                "PATIENT_SERVICE_URLS",
                "http://host.docker.internal:8001",
                "http://localhost:8001",
            ),
            f"/patients/{patient_id}",
        )
    except HTTPException as exc:
        if exc.status_code == 503 and not settings.EXTERNAL_VALIDATION_STRICT:
            return {"id": patient_id, "validation": "skipped_unavailable"}
        raise

    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    return patient


def _require_registered_appointment(appointment_id: int) -> dict:
    try:
        appointment = _fetch_remote_resource(
            _service_urls(
                "APPOINTMENT_SERVICE_URLS",
                "http://host.docker.internal:8003",
                "http://localhost:8003",
            ),
            f"/appointments/{appointment_id}",
        )
    except HTTPException as exc:
        if exc.status_code == 503 and not settings.EXTERNAL_VALIDATION_STRICT:
            return {"id": appointment_id, "validation": "skipped_unavailable"}
        raise

    if not appointment:
        raise HTTPException(status_code=404, detail=f"Appointment {appointment_id} not found")
    return appointment


def _scope_filter(query, role: ParticipantRole, participant_id: int):
    if role == ParticipantRole.DOCTOR:
        return query.filter(TelemedicineSession.doctor_id == participant_id)
    return query.filter(TelemedicineSession.patient_id == participant_id)


def _build_room_name(doctor_id: int, patient_id: int) -> str:
    timestamp = int(_utc_now().timestamp())
    return f"{settings.JITSI_ROOM_PREFIX}-d{str(doctor_id)[:8]}-p{str(patient_id)[:8]}-{timestamp}"


def _emit_event(
    db: Session,
    session_id: UUID,
    event_type: EventType,
    actor_role: str | None,
    actor_id: int | None,
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


def _session_to_response(
    session: TelemedicineSession,
    events: list[SessionEvent],
    viewer_role: ParticipantRole | None = None,
) -> SessionDetailResponse:
    join_link_doctor = session.join_link_doctor if viewer_role == ParticipantRole.DOCTOR else None
    join_link_patient = session.join_link_patient if viewer_role == ParticipantRole.PATIENT else None
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
        join_link_doctor=join_link_doctor,
        join_link_patient=join_link_patient,
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

    _require_registered_doctor(request.doctor_id)
    _require_registered_patient(request.patient_id)

    if request.appointment_id is not None:
        appointment = _require_registered_appointment(request.appointment_id)
        appointment_doctor_id = appointment.get("doctor_id")
        appointment_patient_id = appointment.get("patient_id")
        if appointment_doctor_id is not None and appointment_patient_id is not None:
            if int(appointment_doctor_id) != request.doctor_id or int(appointment_patient_id) != request.patient_id:
                raise HTTPException(
                    status_code=400,
                    detail="Appointment doctor and patient must match the telemedicine session participants",
                )

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
    role: ParticipantRole = Query(...),
    participant_id: int = Query(..., ge=1),
    status_filter: SessionStatus | None = Query(None, alias="status"),
    from_time: datetime | None = Query(None, alias="from"),
    to_time: datetime | None = Query(None, alias="to"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = _scope_filter(db.query(TelemedicineSession), role, participant_id)
    filters = []
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
        items.append(_session_to_response(session, events, viewer_role=role))

    return SessionListResponse(total=total, items=items)


@router.get("/sessions/{session_id}", response_model=SessionDetailResponse)
async def get_session(
    session_id: UUID,
    role: ParticipantRole = Query(...),
    participant_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    session = db.query(TelemedicineSession).filter(TelemedicineSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    if role == ParticipantRole.DOCTOR and session.doctor_id != participant_id:
        raise HTTPException(status_code=403, detail="This session is not assigned to the requesting doctor")
    if role == ParticipantRole.PATIENT and session.patient_id != participant_id:
        raise HTTPException(status_code=403, detail="This session is not assigned to the requesting patient")

    events = (
        db.query(SessionEvent)
        .filter(SessionEvent.session_id == session.id)
        .order_by(desc(SessionEvent.created_at))
        .all()
    )
    return _session_to_response(session, events, viewer_role=role)


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

    if request.actor_role != ParticipantRole.DOCTOR.value or request.actor_id != session.doctor_id:
        raise HTTPException(status_code=403, detail="Only the assigned doctor can start this session")

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

    if request.actor_role != ParticipantRole.DOCTOR.value or request.actor_id != session.doctor_id:
        raise HTTPException(status_code=403, detail="Only the assigned doctor can complete this session")

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

    if request.actor_role != ParticipantRole.DOCTOR.value or request.actor_id != session.doctor_id:
        raise HTTPException(status_code=403, detail="Only the assigned doctor can cancel this session")

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




