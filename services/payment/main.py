from fastapi import FastAPI

from database import Base, engine
from routers.payments import router as payments_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Payment Service", version="1.0.0")

app.include_router(payments_router)


@app.get("/")
def root():
    return {"message": "Payment Service is running"}