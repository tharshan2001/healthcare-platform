from sqlalchemy import Column, Integer, String, DateTime, Enum
from sqlalchemy.sql import func
from datetime import datetime
from database import Base
import enum

class NotificationType(enum.Enum):
    appointment = "appointment"
    payment = "payment"
    reminder = "reminder"
    update = "update"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, nullable=False)

    message = Column(String, nullable=False)

    type = Column(Enum(NotificationType), nullable=False)

    # unread / read
    status = Column(String, default="unread", nullable=False) 
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())