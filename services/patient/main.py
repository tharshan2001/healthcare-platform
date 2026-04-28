from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database import engine, Base, get_db
from routers import auth, records, doctors, appointments
from utils.auth import decode_token
from models import Patient

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Patient Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

def get_current_patient(credentials: HTTPAuthorizationCredentials = Depends(security), db = Depends(get_db)):
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    patient_id = payload.get("sub")
    patient = db.query(Patient).filter(Patient.id == int(patient_id)).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

app.include_router(auth, prefix="/auth", tags=["auth"])
app.include_router(records, prefix="/records", tags=["records"])
app.include_router(doctors, prefix="/doctors", tags=["doctors"])
app.include_router(appointments, prefix="/appointments", tags=["appointments"])

@app.get("/")
def root():
    return {"message": "Patient Service is running"}

@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/patients/{patient_id}")
def get_patient(patient_id: int, db = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {
        "id": patient.id,
        "email": patient.email,
        "full_name": patient.full_name,
        "is_active": patient.is_active,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

