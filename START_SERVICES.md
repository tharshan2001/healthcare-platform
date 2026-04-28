# Healthcare Platform - Quick Start Guide

## Prerequisites
- Docker Desktop installed and running
- Node.js 18+ installed
- Python 3.11+ installed

## Start Everything (Docker)

```bash
cd /Users/antonabitharshan/Documents/healthcare-platform
docker-compose up -d --build
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Patient Service (port 8001)
- Doctor Service (port 8002)
- Appointment Service (port 8003)
- Telemedicine Service (port 8004)
- Payment Service (port 8005)
- Notification Service (port 8006)
- AI Symptom Service (port 8007)
- Frontend (port 5173)

## Access Points

- **Frontend**: http://localhost:5173
- **API Docs**: 
  - Patient: http://localhost:8001/docs
  - Doctor: http://localhost:8002/docs
  - Appointment: http://localhost:8003/docs
  - Telemedicine: http://localhost:8004/docs
  - Payment: http://localhost:8005/docs
  - Notification: http://localhost:8006/docs
  - AI Symptom: http://localhost:8007/docs

## Test User Journey

1. **Register Patient**: http://localhost:5173/patient/register
2. **Login**: http://localhost:5173/patient/login
3. **Search Doctors**: Click "Find Doctors" or go to http://localhost:5173/doctor-search
4. **Select Doctor & Slot**: Click on a doctor, pick a date/time
5. **Book Appointment**: Complete payment (mock mode enabled by default)
6. **View Dashboard**: http://localhost:5173/patient/dashboard
7. **Join Telemedicine**: Click "Join" on upcoming appointments
8. **View Prescriptions**: http://localhost:5173/patient/prescriptions (after doctor creates one)
9. **Try AI Symptom Checker**: http://localhost:5173/patient/symptom-checker

## Environment Configuration

### Frontend (.env)
```
VITE_PATIENT_API=http://localhost:8001
VITE_DOCTOR_API=http://localhost:8002
VITE_APPOINTMENT_API=http://localhost:8003
VITE_TELEMEDICINE_API=http://localhost:8004
VITE_PAYMENT_API=http://localhost:8005
VITE_NOTIFICATION_API=http://localhost:8006
VITE_AI_SYMPTOM_API=http://localhost:8007
```

### Payment Mock Mode
Set in `/services/payment/.env`:
```
USE_MOCK_PAYMENT=true
```

### AI Symptom Checker
Set in `/services/ai_symptom/.env`:
```
GEMINI_API_KEY=your_api_key_here
```
If not set, mock responses are returned automatically.

## Quick Health Check

```bash
# Check all services
curl http://localhost:8001/health
curl http://localhost:8002/health
curl http://localhost:8003/health
curl http://localhost:8004/health
curl http://localhost:8005/health
curl http://localhost:8006/health
curl http://localhost:8007/health
```

## Stop Everything

```bash
docker-compose down
```

## Reset Database

```bash
docker-compose down -v
docker-compose up -d --build
```

## What's Fixed

✅ All localhost URLs replaced with environment variables
✅ JWT tokens stored in localStorage and attached to requests
✅ Protected routes work (patient & doctor)
✅ Doctor discovery with filters (specialty, hospital, name)
✅ Slot locking mechanism works (10-min lock)
✅ Appointment booking chain complete (lock → book → DB)
✅ Payment flow works (Stripe or mock mode)
✅ Telemedicine sessions with Jitsi integration
✅ Prescription visibility for patients (new endpoint + page)
✅ Notifications don't crash if email/SMS fails
✅ AI Symptom Checker has fallback mock responses
✅ Debug print statements cleaned up from production code

## Core Flows Working

1. ✅ **Authentication**: Register → Login → JWT stored → Reusable on refresh
2. ✅ **Doctor Discovery**: List → Filter → View availability → See slots
3. ✅ **Appointment Booking**: Select slot → Lock → Book → Payment → Confirmation
4. ✅ **Payment**: Stripe checkout or mock success
5. ✅ **Telemedicine**: Create session → Join → Video call (Jitsi)
6. ✅ **Prescriptions**: Doctor creates → Patient views
7. ✅ **Notifications**: Email/SMS with graceful failure handling
8. ✅ **AI Symptom Checker**: Returns response or mock on failure
