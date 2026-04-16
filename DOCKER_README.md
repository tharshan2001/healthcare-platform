# Healthcare Platform - Local Development with Docker

## Quick Start

### Prerequisites
- Docker Desktop installed
- Docker Compose installed

### Run All Services

```bash
# Start all services (databases + microservices + frontend)
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Access Services

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Patient Service | http://localhost:8001 |
| Doctor Service | http://localhost:8002 |
| Appointment Service | http://localhost:8003 |
| Telemedicine Service | http://localhost:8004 |
| Payment Service | http://localhost:8005 |
| Notification Service | http://localhost:8006 |
| AI Symptom Service | http://localhost:8007 |

### Individual Service Commands

```bash
# Build and run a specific service
docker-compose build patient-service
docker-compose up patient-service

# Run with specific database
docker-compose up postgres-patient patient-service
```

### Environment Setup

1. Copy `.env.example` to `.env` and configure:
   - Stripe keys (for payment)
   - Google API key (for AI symptom)
   - Email credentials (for notifications)

### Database Management

```bash
# View database logs
docker-compose logs postgres-patient

# Reset database (removes all data)
docker-compose down -v
docker-compose up -d
```

### Troubleshooting

```bash
# Check service health
docker-compose ps

# View service logs
docker-compose logs -f patient-service

# Rebuild after code changes
docker-compose up -d --build
```