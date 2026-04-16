from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, SessionLocal
from routers import auth, availability, prescriptions, doctors, slots
from models import Doctor, Availability, TimeSlot
from passlib.hash import bcrypt
from sqlalchemy import text

Base.metadata.create_all(bind=engine)

def create_time_slots_table():
    db = SessionLocal()
    try:
        result = db.execute(text("SELECT table_name FROM information_schema.tables WHERE table_name = 'time_slots'"))
        if result.fetchone() is None:
            db.execute(text("""
                CREATE TABLE time_slots (
                    id SERIAL PRIMARY KEY,
                    doctor_id INTEGER NOT NULL,
                    date VARCHAR(10) NOT NULL,
                    time VARCHAR(10) NOT NULL,
                    is_booked BOOLEAN DEFAULT FALSE,
                    booked_by INTEGER,
                    locked_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            db.commit()
            print("Created time_slots table")
    finally:
        db.close()

create_time_slots_table()

def migrate_hospital_column():
    db = SessionLocal()
    try:
        result = db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'doctors' AND column_name = 'hospital'"))
        if result.fetchone() is None:
            db.execute(text("ALTER TABLE doctors ADD COLUMN hospital VARCHAR(255)"))
            db.commit()
            print("Added hospital column")
    finally:
        db.close()

migrate_hospital_column()

app = FastAPI(title="Doctor Service", version="1.0.0")

def seed_doctors():
    db = SessionLocal()
    try:
        if db.query(Doctor).count() > 0:
            return
        
        doctors_data = [
            {
                "email": "dr.chanaka@healthcare.com",
                "password": "doctor123",
                "full_name": "Dr. Chanaka Fernando",
                "specialty": "Cardiology",
                "qualifications": "MD, FACC, FSCAI",
                "license_number": "MDC-001",
                "consultation_fee": 5000.0,
                "years_of_experience": 15,
                "bio": "Over 15 years of experience in interventional cardiology. Specialized in coronary angioplasty, stenting, and heart failure management.",
                "hospital": "23 Nawaloka Hospital-Colombo 02"
            },
            {
                "email": "dr.silva@healthcare.com",
                "password": "doctor123",
                "full_name": "Dr. Nimal Silva",
                "specialty": "Cardiology",
                "qualifications": "MD, MRCP, FESC",
                "license_number": "MDC-002",
                "consultation_fee": 4500.0,
                "years_of_experience": 12,
                "bio": "Experienced cardiologist focusing on preventive cardiology and cardiac rehabilitation.",
                "hospital": "23 Nawaloka Hospital-Colombo 02"
            },
            {
                "email": "dr.wije@healthcare.com",
                "password": "doctor123",
                "full_name": "Dr. Wije Kumar",
                "specialty": "Cardiology",
                "qualifications": "MD, PhD, FACC",
                "license_number": "MDC-003",
                "consultation_fee": 6000.0,
                "years_of_experience": 20,
                "bio": "Senior cardiologist with expertise in complex cardiac procedures and research.",
                "hospital": "Asiri Surgical Center-Colombo 05"
            },
            {
                "email": "dr.renuka@healthcare.com",
                "password": "doctor123",
                "full_name": "Dr. Renuka Perera",
                "specialty": "Pediatrics",
                "qualifications": "MD, DCH, MRCPCH",
                "license_number": "MDP-001",
                "consultation_fee": 3500.0,
                "years_of_experience": 10,
                "bio": "Dedicated pediatrician with special interest in childhood immunization and developmental pediatrics.",
                "hospital": "23 Nawaloka Hospital-Colombo 02"
            },
            {
                "email": "dr.kamal@healthcare.com",
                "password": "doctor123",
                "full_name": "Dr. Kamal Ratnayake",
                "specialty": "Pediatrics",
                "qualifications": "MD, DCH, MD-Ped",
                "license_number": "MDP-002",
                "consultation_fee": 3000.0,
                "years_of_experience": 8,
                "bio": "Pediatrician specializing in neonatal care and pediatric emergencies.",
                "hospital": "Asiri Surgical Center-Colombo 05"
            },
            {
                "email": "dr.ani@healthcare.com",
                "password": "doctor123",
                "full_name": "Dr. Ani Wijesuriya",
                "specialty": "Dermatology",
                "qualifications": "MD, FAAD, MD-Derm",
                "license_number": "MDD-001",
                "consultation_fee": 4000.0,
                "years_of_experience": 11,
                "bio": "Board-certified dermatologist specializing in cosmetic dermatology and skin cancer treatment.",
                "hospital": "23 Nawaloka Hospital-Colombo 02"
            },
            {
                "email": "dr.sanjay@healthcare.com",
                "password": "doctor123",
                "full_name": "Dr. Sanjay Dias",
                "specialty": "Dermatology",
                "qualifications": "MD, FAAD",
                "license_number": "MDD-002",
                "consultation_fee": 3800.0,
                "years_of_experience": 9,
                "bio": "Dermatologist focused on treating skin conditions and aesthetic procedures.",
                "hospital": "Asiri Surgical Center-Colombo 05"
            },
            {
                "email": "dr.malini@healthcare.com",
                "password": "doctor123",
                "full_name": "Dr. Malini Fernando",
                "specialty": "Neurology",
                "qualifications": "MD, PhD, FAAN",
                "license_number": "MDN-001",
                "consultation_fee": 5500.0,
                "years_of_experience": 14,
                "bio": "Neurologist with expertise in stroke management and neurodegenerative diseases.",
                "hospital": "23 Nawaloka Hospital-Colombo 02"
            },
            {
                "email": "dr.ranil@healthcare.com",
                "password": "doctor123",
                "full_name": "Dr. Ranil Wickramasinghe",
                "specialty": "Neurology",
                "qualifications": "MD, FRCP, FAAN",
                "license_number": "MDN-002",
                "consultation_fee": 6000.0,
                "years_of_experience": 18,
                "bio": "Senior neurologist specializing in epilepsy and movement disorders.",
                "hospital": "Asiri Surgical Center-Colombo 05"
            },
            {
                "email": "dr.sameera@healthcare.com",
                "password": "doctor123",
                "full_name": "Dr. Sameera Aluwihare",
                "specialty": "Orthopedics",
                "qualifications": "MD, FAOA, FRCS",
                "license_number": "MDO-001",
                "consultation_fee": 4500.0,
                "years_of_experience": 13,
                "bio": "Orthopedic surgeon specializing in joint replacement and sports medicine.",
                "hospital": "23 Nawaloka Hospital-Colombo 02"
            },
            {
                "email": "dr.udara@healthcare.com",
                "password": "doctor123",
                "full_name": "Dr. Udara Perera",
                "specialty": "Orthopedics",
                "qualifications": "MD, FAOA",
                "license_number": "MDO-002",
                "consultation_fee": 4000.0,
                "years_of_experience": 10,
                "bio": "Orthopedic specialist in minimally invasive orthopedic surgeries.",
                "hospital": "Asiri Surgical Center-Colombo 05"
            },
            {
                "email": "dr.dinusha@healthcare.com",
                "password": "doctor123",
                "full_name": "Dr. Dinusha Rajapaksa",
                "specialty": "Gynecology",
                "qualifications": "MD, MRCOG, FRCOG",
                "license_number": "MDG-001",
                "consultation_fee": 3500.0,
                "years_of_experience": 12,
                "bio": "Obstetrician and gynecologist with expertise in high-risk pregnancies.",
                "hospital": "23 Nawaloka Hospital-Colombo 02"
            },
            {
                "email": "dr.ishara@healthcare.com",
                "password": "doctor123",
                "full_name": "Dr. Ishara Gunawardena",
                "specialty": "Gynecology",
                "qualifications": "MD, MRCOG",
                "license_number": "MDG-002",
                "consultation_fee": 3200.0,
                "years_of_experience": 9,
                "bio": "Gynecologist focused on reproductive medicine and IVF.",
                "hospital": "Asiri Surgical Center-Colombo 05"
            },
            {
                "email": "dr.asiri@healthcare.com",
                "password": "doctor123",
                "full_name": "Dr. Asiri Fernando",
                "specialty": "General Surgery",
                "qualifications": "MD, FRCS, FACS",
                "license_number": "MDS-001",
                "consultation_fee": 3800.0,
                "years_of_experience": 16,
                "bio": "General surgeon with expertise in laparoscopic and minimally invasive surgeries.",
                "hospital": "23 Nawaloka Hospital-Colombo 02"
            },
            {
                "email": "dr.nirosha@healthcare.com",
                "password": "doctor123",
                "full_name": "Dr. Nirosha Mendis",
                "specialty": "General Surgery",
                "qualifications": "MD, FRCS",
                "license_number": "MDS-002",
                "consultation_fee": 3500.0,
                "years_of_experience": 11,
                "bio": "General and laparoscopic surgeon specializing in digestive surgeries.",
                "hospital": "Asiri Surgical Center-Colombo 05"
            },
            {
                "email": "dr.lahiru@healthcare.com",
                "password": "doctor123",
                "full_name": "Dr. Lahiru Kodithuwakku",
                "specialty": "Ophthalmology",
                "qualifications": "MD, FICO, FAOS",
                "license_number": "MDL-001",
                "consultation_fee": 3000.0,
                "years_of_experience": 8,
                "bio": "Ophthalmologist specializing in cataract surgery and retinal diseases.",
                "hospital": "23 Nawaloka Hospital-Colombo 02"
            },
            {
                "email": "dr.hirusha@healthcare.com",
                "password": "doctor123",
                "full_name": "Dr. Hirusha Weerakkodi",
                "specialty": "Ophthalmology",
                "qualifications": "MD, FICO",
                "license_number": "MDL-002",
                "consultation_fee": 2800.0,
                "years_of_experience": 6,
                "bio": "Eye surgeon with expertise in laser eye surgeries.",
                "hospital": "Asiri Surgical Center-Colombo 05"
            },
            {
                "email": "dr.vishan@healthcare.com",
                "password": "doctor123",
                "full_name": "Dr. Vishan Fernando",
                "specialty": "Psychiatry",
                "qualifications": "MD, MRCPsych",
                "license_number": "MD-001",
                "consultation_fee": 4000.0,
                "years_of_experience": 12,
                "bio": "Psychiatrist specializing in anxiety, depression, and stress disorders.",
                "hospital": "23 Nawaloka Hospital-Colombo 02"
            },
            {
                "email": "dr.nadee@healthcare.com",
                "password": "doctor123",
                "full_name": "Dr. Nadee Ranil",
                "specialty": "Psychiatry",
                "qualifications": "MD, MRCPsych",
                "license_number": "MD-002",
                "consultation_fee": 3800.0,
                "years_of_experience": 9,
                "bio": "Psychiatrist focusing on child and adolescent mental health.",
                "hospital": "Asiri Surgical Center-Colombo 05"
            },
            {
                "email": "dr.charitha@healthcare.com",
                "password": "doctor123",
                "full_name": "Dr. Charitha Herath",
                "specialty": "ENT",
                "qualifications": "MD, FACS, FRCS-ENT",
                "license_number": "MDE-001",
                "consultation_fee": 3200.0,
                "years_of_experience": 10,
                "bio": "ENT specialist with expertise in sinus surgery and hearing disorders.",
                "hospital": "23 Nawaloka Hospital-Colombo 02"
            },
        ]
        
        for d in doctors_data:
            doctor = Doctor(
                email=d["email"],
                password_hash=bcrypt.hash(d["password"]),
                full_name=d["full_name"],
                specialty=d["specialty"],
                qualifications=d["qualifications"],
                license_number=d["license_number"],
                consultation_fee=d["consultation_fee"],
                years_of_experience=d["years_of_experience"],
                bio=d["bio"],
                hospital=d["hospital"],
                is_available=True
            )
            db.add(doctor)
        
        db.commit()
        
        doctors = db.query(Doctor).all()
        
        availability_data = [
            {"day": "Monday", "start": "09:00", "end": "17:00"},
            {"day": "Tuesday", "start": "09:00", "end": "17:00"},
            {"day": "Wednesday", "start": "09:00", "end": "17:00"},
            {"day": "Thursday", "start": "09:00", "end": "17:00"},
            {"day": "Friday", "start": "09:00", "end": "17:00"},
        ]
        
        for doc in doctors:
            for avail in availability_data:
                availability = Availability(
                    doctor_id=doc.id,
                    day_of_week=avail["day"],
                    start_time=avail["start"],
                    end_time=avail["end"],
                    is_available=True
                )
                db.add(availability)
        
        db.commit()
        print(f"Seeded {len(doctors_data)} doctors with availability")
        
    finally:
        db.close()

seed_doctors()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth, prefix="/auth", tags=["auth"])
app.include_router(availability, prefix="/availability", tags=["availability"])
app.include_router(prescriptions, prefix="/prescriptions", tags=["prescriptions"])
app.include_router(doctors, prefix="", tags=["doctors"])
app.include_router(slots, prefix="", tags=["slots"])

@app.get("/")
def root():
    return {"message": "Doctor Service is running"}

@app.get("/health")
def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)