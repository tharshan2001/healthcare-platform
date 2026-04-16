# AI-Enabled Smart Healthcare Microservices Platform

## 📋 Project Overview

A cloud-native AI-enabled healthcare platform built using Python microservices architecture with FastAPI, Docker, and React.

### Key Features
- 🏥 Patient & Doctor Management
- 📅 Real-time Appointment Scheduling
- 🎥 Telemedicine Video Consultations
- 🤖 AI-Powered Symptom Checker
- 💳 Secure Payment Processing
- 📧 Multi-channel Notifications (SMS, Email)
- 💊 Digital Prescription Management

---

## 📁 Project Folder Structure

```
healthcare-platform/
│
├── services/
│   ├── patient_service/
│   │   ├── app/
│   │   │   ├── models/
│   │   │   ├── schemas/
│   │   │   ├── routers/
│   │   │   ├── main.py
│   │   │   ├── database.py
│   │   │   └── auth.py
│   │   ├── requirements.txt
│   │   ├── Dockerfile
│   │   └── .env
│   │
│   ├── doctor_service/
│   │   ├── app/
│   │   │   ├── models/
│   │   │   ├── schemas/
│   │   │   ├── routers/
│   │   │   ├── main.py
│   │   │   ├── database.py
│   │   │   └── auth.py
│   │   ├── requirements.txt
│   │   ├── Dockerfile
│   │   └── .env
│   │
│   ├── appointment_service/
│   │   ├── app/
│   │   │   ├── models/
│   │   │   ├── schemas/
│   │   │   ├── routers/
│   │   │   ├── main.py
│   │   │   ├── database.py
│   │   │   └── redis_cache.py
│   │   ├── requirements.txt
│   │   ├── Dockerfile
│   │   └── .env
│   │
│   ├── telemedicine_service/
│   │   ├── app/
│   │   │   ├── models/
│   │   │   ├── schemas/
│   │   │   ├── routers/
│   │   │   ├── main.py
│   │   │   └── video_sdk.py
│   │   ├── requirements.txt
│   │   ├── Dockerfile
│   │   └── .env
│   │
│   ├── payment_service/
│   │   ├── app/
│   │   │   ├── models/
│   │   │   ├── schemas/
│   │   │   ├── routers/
│   │   │   ├── main.py
│   │   │   └── payment_gateway.py
│   │   ├── requirements.txt
│   │   ├── Dockerfile
│   │   └── .env
│   │
│   ├── notification_service/
│   │   ├── app/
│   │   │   ├── routers/
│   │   │   ├── main.py
│   │   │   ├── sms_service.py
│   │   │   └── email_service.py
│   │   ├── requirements.txt
│   │   ├── Dockerfile
│   │   └── .env
│   │
│   └── ai_symptom_service/
│       ├── app/
│       │   ├── models/
│       │   ├── schemas/
│       │   ├── routers/
│       │   ├── main.py
│       │   └── ai_engine.py
│       ├── requirements.txt
│       ├── Dockerfile
│       └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── patient/
│   │   │   ├── doctor/
│   │   │   ├── appointment/
│   │   │   └── auth/
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   └── index.js
│   ├── package.json
│   └── Dockerfile
│
├── database/
│   └── init_schemas/
│       ├── patient_db.sql
│       ├── doctor_db.sql
│       ├── appointment_db.sql
│       └── payment_db.sql
│
├── docker-compose.yml
├── README.md
├── members.txt
└── submission.txt
```

---

## 🏗️ Architecture Components

### 🔹 Microservices (7 Services)

| Service | Responsibilities | Tech Stack |
|---------|-----------------|------------|
| **Patient Service** | Registration, authentication, profile management, medical records | FastAPI + PostgreSQL + JWT |
| **Doctor Service** | Profile management, availability scheduling, prescriptions | FastAPI + PostgreSQL |
| **Appointment Service** | Booking, rescheduling, cancellation, conflict detection | FastAPI + PostgreSQL + Redis |
| **Telemedicine Service** | Video session management, room generation | FastAPI + Twilio/Agora/Jitsi |
| **Payment Service** | Payment processing, transaction verification | FastAPI + Stripe/PayHere |
| **Notification Service** | SMS and email notifications | FastAPI + Twilio + SendGrid |
| **AI Symptom Service** | Symptom analysis, specialty recommendations | FastAPI + OpenAI API |

### 🔹 Frontend
- **Framework**: React.js
- **Components**: Patient, Doctor, Appointment, Auth modules
- **API Communication**: Axios/Fetch API
- **State Management**: React Context/Redux

### 🔹 Database
- **Type**: PostgreSQL (separate database per service)
- **ORM**: SQLAlchemy
- **Caching**: Redis (for appointment availability)

---

## 📂 Folder Structure Explanation

### 🗂️ Services Folder
Each microservice follows this pattern:

```
service_name/
├── app/
│   ├── models/          # SQLAlchemy database models
│   ├── schemas/         # Pydantic validation schemas
│   ├── routers/         # API endpoint definitions
│   ├── main.py          # FastAPI application entry point
│   ├── database.py      # Database connection & session
│   └── auth.py          # JWT authentication utilities
├── requirements.txt     # Python dependencies
├── Dockerfile          # Container configuration
└── .env                # Environment variables
```

**Key Files:**
- `models/` - Define database tables (SQLAlchemy)
- `schemas/` - Request/response validation (Pydantic)
- `routers/` - API endpoints (FastAPI routes)
- `main.py` - FastAPI app initialization
- `database.py` - PostgreSQL connection
- `auth.py` - JWT token generation/validation

### 🗂️ Frontend Folder

```
frontend/
├── src/
│   ├── components/      # React components by module
│   ├── services/        # API service functions
│   ├── App.jsx          # Main application component
│   └── index.js         # Entry point
├── package.json         # Node.js dependencies
└── Dockerfile          # Container configuration
```

### 🗂️ Database Folder

```
database/
└── init_schemas/        # SQL schema initialization files
    ├── patient_db.sql
    ├── doctor_db.sql
    ├── appointment_db.sql
    └── payment_db.sql
```

### 🗂️ Root Files

- `docker-compose.yml` - Orchestrates all services, databases, and Redis
- `README.md` - Project documentation
- `members.txt` - Team member information
- `submission.txt` - Submission details

---

## 🚀 Quick Start Guide

### Prerequisites
- Docker & Docker Compose
- Python 3.11+
- Node.js 16+
- PostgreSQL (via Docker)
- Redis (via Docker)

### 1. Create Folder Structure

```bash
# Create main project folder
mkdir healthcare-platform
cd healthcare-platform

# Create all backend service folders
mkdir -p services/{patient_service,doctor_service,appointment_service,telemedicine_service,payment_service,notification_service,ai_symptom_service}/app/{models,schemas,routers}

# Create frontend structure
mkdir -p frontend/src/{components/{patient,doctor,appointment,auth},services}

# Create database folder
mkdir -p database/init_schemas
```

### 2. Essential Files Per Service

**Minimum required files:**
```
✓ app/main.py           # FastAPI application
✓ app/database.py       # Database connection
✓ app/models/           # Database tables
✓ app/routers/          # API endpoints
✓ requirements.txt      # Python packages
✓ Dockerfile           # Container setup
✓ .env                 # Configuration
```

### 3. Start Development

```bash
# Navigate to project root
cd healthcare-platform

# Start all services
docker-compose up --build

# Access services
# Patient Service: http://localhost:8001
# Doctor Service: http://localhost:8002
# Appointment Service: http://localhost:8003
# Frontend: http://localhost:3000
```

---

## 🛠️ Technology Stack

### Backend
- **Framework**: FastAPI
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy
- **Caching**: Redis
- **Authentication**: JWT + OAuth2
- **Validation**: Pydantic

### Frontend
- **Framework**: React.js
- **Styling**: CSS3 / Tailwind CSS
- **HTTP Client**: Axios
- **State**: React Context API

### DevOps
- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **API Documentation**: FastAPI Auto-generated (Swagger)

### External Services
- **Video**: Twilio / Agora / Jitsi
- **Payment**: Stripe / PayHere
- **SMS**: Twilio
- **Email**: SendGrid
- **AI**: OpenAI API

---

## 📝 Minimum Files Needed to Start

### Per Service (Example: Patient Service)

**1. requirements.txt**
```txt
fastapi==0.104.1
uvicorn==0.24.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
pydantic==2.5.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
```

**2. Dockerfile**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**3. .env**
```env
DATABASE_URL=postgresql://user:password@db:5432/patient_db
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Root Level

**docker-compose.yml**
```yaml
version: '3.8'

services:
  patient_service:
    build: ./services/patient_service
    ports:
      - "8001:8000"
    environment:
      - DATABASE_URL=postgresql://user:password@patient_db:5432/patient_db
    depends_on:
      - patient_db

  patient_db:
    image: postgres:15
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: patient_db
    volumes:
      - patient_data:/var/lib/postgresql/data

volumes:
  patient_data:
```

---

## 🔐 Security Features

- ✅ JWT-based authentication
- ✅ Password hashing (bcrypt)
- ✅ HTTPS/TLS encryption
- ✅ Input validation (Pydantic)
- ✅ SQL injection prevention (ORM)
- ✅ CORS configuration
- ✅ Environment variable protection

---

## 🧪 Testing Strategy

### Unit Tests
- Framework: `pytest`
- Coverage: CRUD operations, authentication

### Integration Tests
- End-to-end workflows
- Inter-service communication

### API Tests
- Tool: Postman / Thunder Client
- Test all endpoints with various payloads

### Load Tests
- Tool: Locust / Apache JMeter
- Concurrent user simulations

---

## 📊 Database Design

Each service has its own PostgreSQL database:

- `patient_db` - Patients, Medical Records, Prescriptions
- `doctor_db` - Doctors, Availability, Specialties
- `appointment_db` - Appointments, Schedules
- `telemedicine_db` - Video Sessions
- `payment_db` - Transactions, Payments
- `notification_db` - Notification Logs
- `ai_symptom_db` - Symptom Analyses

---

## 🔄 Communication Patterns

- **Synchronous**: HTTP/REST for inter-service calls
- **Asynchronous**: Message queues for notifications
- **Caching**: Redis for appointment availability
- **Event-Driven**: Webhooks for payment confirmations

---

## 📅 Development Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| **Phase 1** | Week 1-2 | Project setup, Patient & Doctor services |
| **Phase 2** | Week 3-4 | Appointment service, Redis caching |
| **Phase 3** | Week 5-6 | Telemedicine & Payment services |
| **Phase 4** | Week 7-8 | AI service, Frontend development |
| **Phase 5** | Week 9-10 | Testing, deployment, documentation |

---

## 🎯 Success Criteria

- ✅ All microservices functional and independently deployable
- ✅ Secure JWT authentication with role-based access
- ✅ Successful appointment booking with conflict detection
- ✅ Working telemedicine video sessions
- ✅ Payment integration with webhook handling
- ✅ Multi-channel notifications delivered
- ✅ AI symptom checker providing recommendations
- ✅ Complete Docker Compose deployment

---

## 📚 API Documentation

Once services are running, access auto-generated API docs:

- Patient Service: `http://localhost:8001/docs`
- Doctor Service: `http://localhost:8002/docs`
- Appointment Service: `http://localhost:8003/docs`
- Telemedicine Service: `http://localhost:8004/docs`
- Payment Service: `http://localhost:8005/docs`
- Notification Service: `http://localhost:8006/docs`
- AI Symptom Service: `http://localhost:8007/docs`

---

## 🤝 Contributing

### Team Members
See `members.txt` for team member details.

### Contribution Guidelines
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

## 📄 License

This project is developed for educational purposes as part of SE3020 - Distributed Systems course.

---

## 📞 Support

For questions or issues, contact the course instructor or refer to project documentation.

---

## 🎓 Course Information

- **Course**: SE3020 – Distributed Systems
- **Program**: BSc (Hons) Information Technology – Software Engineering
- **Year**: 3 – Semester 1, 2026

---

**Built with ❤️ using Python, FastAPI, React, and Docker**
