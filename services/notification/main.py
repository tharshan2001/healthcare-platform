from fastapi import FastAPI
from database import engine, Base
from models import Notification
from routers.notification_routes import router as notification_router

app = FastAPI()
app.include_router(notification_router, prefix="/notifications", tags=["notifications"])

Base.metadata.create_all(bind=engine)


@app.get("/")
def read_root():
    return {"message": "Notification Service is running!"}


@app.get("/health")
def health_check():
    return {"status": "healthy", "queue_processor": "active"}


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("NOTIFICATION_PORT", 8006))
    uvicorn.run(app, host="0.0.0.0", port=port)