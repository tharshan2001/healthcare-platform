# Telemedicine Service

FastAPI microservice for doctor-patient video consultation workflows.

## Features
- Schedule telemedicine sessions
- Join sessions as doctor or patient with provider payload generation
- Session lifecycle management (`scheduled`, `live`, `completed`, `cancelled`)
- Event history and participant access tracking
- Jitsi-by-default provider with optional Twilio token mode

## Local run (without Docker)

```powershell
Push-Location "D:\DS project\healthcare-platform\services\telemedicine_service"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8004 --reload
```

Service docs: `http://localhost:8004/docs`

## Docker run (compose)

```powershell
Push-Location "D:\DS project\healthcare-platform"
docker compose up --build telemedicine_db telemedicine_service
```

## Quick smoke runner

```powershell
Push-Location "D:\DS project\healthcare-platform\services\telemedicine_service"
python smoke_runner.py
```

## Important env vars
- `DATABASE_URL`
- `VIDEO_PROVIDER` (`jitsi` or `twilio`)
- `JITSI_BASE_URL`
- `JITSI_ROOM_PREFIX`
- `JOIN_TOKEN_TTL_SECONDS`
- Twilio optionals: `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY`, `TWILIO_API_SECRET`

