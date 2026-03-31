from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import auth, availability, prescriptions, doctors, slots

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Doctor Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(availability.router, prefix="/availability", tags=["availability"])
app.include_router(prescriptions.router, prefix="/prescriptions", tags=["prescriptions"])
app.include_router(doctors.router, prefix="", tags=["doctors"])
app.include_router(slots.router, prefix="", tags=["slots"])

@app.get("/")
def root():
    return {"message": "Doctor Service is running"}

@app.get("/health")
def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)