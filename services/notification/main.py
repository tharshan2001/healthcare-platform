from fastapi import FastAPI
from contextlib import asynccontextmanager
from database import engine, Base
from models import Notification
from routers.notification_routes import router as notification_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    from notification_queue import process_queue
    import asyncio
    
    queue_task = asyncio.create_task(process_queue())
    yield
    queue_task.cancel()


app = FastAPI(lifespan=lifespan)
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
    uvicorn.run(app, host="0.0.0.0", port=8005)