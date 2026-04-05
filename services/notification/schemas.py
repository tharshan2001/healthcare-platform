from pydantic import BaseModel
from datetime import datetime


# ✅ REQUEST BODY (for creating notification)
class NotificationCreate(BaseModel):
    user_id: int
    message:  str | None = None
    type: str
    email: str
    phone: str


# ✅ RESPONSE MODEL (what API returns)
class NotificationResponse(BaseModel):
    id: int
    user_id: int
    message: str
    type: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True