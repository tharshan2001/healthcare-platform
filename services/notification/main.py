from fastapi import FastAPI
from database import engine, Base
from models import Notification
from routers.notification_routes import router as notification_router


app = FastAPI()
app.include_router(notification_router, prefix="/notifications", tags=["notifications"])

# create tables
Base.metadata.create_all(bind=engine)

@app.get("/")
def read_root():
    return {"message": "Notification Service is running!"}