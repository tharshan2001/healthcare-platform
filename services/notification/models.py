from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from database import Base

class NotificationType:
    APPOINTMENT = "appointment"
    PAYMENT = "payment"
    REMINDER = "reminder"
    UPDATE = "update"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    message = Column(String, nullable=False)
    type = Column(String, nullable=False)
    status = Column(String, default="unread", nullable=False) 
    created_at = Column(DateTime(timezone=True), server_default=func.now())