from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Notification
from schemas import NotificationCreate, NotificationResponse

router = APIRouter()


# ✅ CREATE NOTIFICATION
@router.post("/", response_model=NotificationResponse)
def create_notification(notification: NotificationCreate, db: Session = Depends(get_db)):
    new_notification = Notification(
        user_id=notification.user_id,
        message=notification.message,
        type=notification.type,
        status="unread"
    )

    db.add(new_notification)
    db.commit()
    db.refresh(new_notification)

    return new_notification

# ✅ GET UNREAD NOTIFICATIONS
@router.get("/unread/{user_id}", response_model = list[NotificationResponse])
def get_unread_notifications(user_id: int, db: Session = Depends(get_db)):
    notifications = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.status == "unread"
    ).all()

    return notifications


# ✅ GET USER NOTIFICATIONS
@router.get("/{user_id}", response_model=list[NotificationResponse])
def get_notifications(user_id: int, db: Session = Depends(get_db)):
    notifications = db.query(Notification).filter(
        Notification.user_id == user_id
    ).all()

    return notifications


# ✅ MARK AS READ
@router.put("/{notification_id}", response_model=NotificationResponse)
def mark_as_read(notification_id: int, db: Session = Depends(get_db)):
    notification = db.query(Notification).filter(
        Notification.id == notification_id
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.status = "read"
    db.commit()
    db.refresh(notification)

    return notification


# ✅ DELETE NOTIFICATION
@router.delete("/{notification_id}")
def delete_notification(notification_id: int, db: Session = Depends(get_db)):
    notification = db.query(Notification).filter(
        Notification.id == notification_id
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    db.delete(notification)
    db.commit()

    return {"message": "Notification deleted successfully"}