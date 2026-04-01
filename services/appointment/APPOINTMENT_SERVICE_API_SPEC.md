# Appointment Service API Specification

## Scope and Ownership

- Doctor search by specialty is owned by Doctor Service.
- Appointment lifecycle (create, update, cancel, status changes, list, read) is owned by Appointment Service.
- Real-time tracking is owned by Appointment Service via WebSocket stream per appointment.

## Status Lifecycle

Allowed appointment statuses:

- scheduled
- confirmed
- in_progress
- completed
- cancelled
- no_show

## Authorization Rules

- Patient role can: create bookings, view own bookings, modify own scheduled bookings, cancel own scheduled or confirmed bookings.
- Doctor role can: view assigned bookings, update status transitions for assigned bookings.
- System role can: mark no_show or apply automated transitions.

## Endpoints

### POST /appointments
Create a new appointment booking.

Request body:

```json
{
  "doctor_id": 12,
  "patient_id": 44,
  "appointment_date": "2026-04-10",
  "appointment_time": "10:30:00",
  "reason_for_visit": "Follow-up",
  "notes": "Bring previous reports"
}
```

Response 201:

```json
{
  "id": 101,
  "patient_id": 44,
  "doctor_id": 12,
  "appointment_date": "2026-04-10",
  "appointment_time": "10:30:00",
  "status": "scheduled",
  "reason_for_visit": "Follow-up",
  "notes": "Bring previous reports",
  "cancelled_by": null,
  "cancel_reason": null,
  "version": 1,
  "created_at": "2026-04-01T10:00:00Z",
  "updated_at": "2026-04-01T10:00:00Z"
}
```

Auth: patient

Errors:

- 400 validation error
- 409 time slot conflict
- 404 doctor not found

### GET /appointments/{id}
Get a single appointment by id.

Response 200: AppointmentResponse

Auth: patient owner, doctor owner, system

Errors:

- 403 forbidden
- 404 not found

### GET /appointments
List appointments with optional filters.

Query params:

- patient_id
- doctor_id
- status
- from_date
- to_date

Response 200: array of AppointmentResponse

Auth: patient (self only), doctor (self only), system

Errors:

- 400 invalid filter
- 403 forbidden

### PUT /appointments/{id}
Modify date, time, reason, notes for an appointment.

Request body:

```json
{
  "appointment_date": "2026-04-12",
  "appointment_time": "11:00:00",
  "reason_for_visit": "Updated reason",
  "notes": "Updated notes",
  "version": 1
}
```

Response 200: AppointmentResponse

Auth: patient owner

Errors:

- 400 invalid update
- 403 forbidden
- 404 not found
- 409 slot conflict or version conflict

### PATCH /appointments/{id}/status
Update only appointment status.

Request body:

```json
{
  "status": "in_progress",
  "actor_id": 12,
  "actor_role": "doctor",
  "version": 2
}
```

Response 200: AppointmentResponse

Auth: doctor owner, system

Errors:

- 400 invalid transition
- 403 forbidden
- 404 not found
- 409 version conflict

### DELETE /appointments/{id}
Cancel appointment.

Request body (optional):

```json
{
  "cancel_reason": "Cannot attend",
  "actor_role": "patient"
}
```

Response 200:

```json
{
  "message": "Appointment cancelled"
}
```

Auth: patient owner, doctor owner, system

Errors:

- 400 invalid cancel state
- 403 forbidden
- 404 not found

### GET /appointments/doctor/{doctor_id}/slots?date=YYYY-MM-DD
Get available slots for a doctor on a date.

Response 200:

```json
[
  {
    "doctor_id": 12,
    "date": "2026-04-10",
    "time": "09:00:00",
    "available": true
  }
]
```

Auth: public or patient

Errors:

- 400 invalid date
- 404 doctor not found

### GET /appointments/{id}/events
Get timeline events for one appointment.

Response 200: array of AppointmentEventResponse

Auth: patient owner, doctor owner, system

Errors:

- 403 forbidden
- 404 not found

### WS /appointments/stream/{appointment_id}
WebSocket stream for real-time status and event updates.

Sample event message:

```json
{
  "type": "status_changed",
  "appointment_id": 101,
  "status": "confirmed",
  "version": 2,
  "timestamp": "2026-04-01T11:00:00Z"
}
```

Auth: patient owner, doctor owner, system

Errors:

- 1008 policy violation (auth/permission)
- 4404 appointment not found

## Validation Rules

- No double booking for same doctor/date/time unless existing booking is cancelled.
- Past date/time cannot be booked.
- Cancelled or completed appointments cannot be modified.
- Status transitions must be validated in service layer.
- Every state-changing action writes a row in appointment_events.
