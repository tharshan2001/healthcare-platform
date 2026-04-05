from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, nullable=False)

    message = Column(String, nullable=False)

    type = Column(String, nullable=False)  
    # example: "appointment", "payment", etc.

    status = Column(String, default="unread")  
    # unread / read

    created_at = Column(DateTime, default=datetime.utcnow)