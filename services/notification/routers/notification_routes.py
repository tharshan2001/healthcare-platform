from utils import generate_message
from sms_service import send_sms
from email_service import send_email
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from models import Notification
from schemas import NotificationCreate, NotificationResponse

router = APIRouter()

# Send Notification
def send_notification(message: str, user_id: int):
    print(f"Email sent to user {user_id}: {message}")

    print(f"SMS sent to user {user_id}: {message}")

# ✅ CREATE NOTIFICATION
@router.post("/", response_model=NotificationResponse)
def create_notification(
    notification: NotificationCreate, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db)
):
    
    final_message = notification.message or generate_message(notification.type)


    new_notification = Notification(
        user_id=notification.user_id,
        message=final_message,
        type=notification.type,
        status="unread"
    )

    db.add(new_notification)
    db.commit()
    db.refresh(new_notification)

    background_tasks.add_task(
        send_email,
        notification.email,
        "New Notification",
        new_notification.message
    )

    background_tasks.add_task(
        send_sms,
        notification.phone,
        new_notification.message
    )

    # Add background task to send notifications
    background_tasks.add_task(
        send_notification,
        notification.message, 
        notification.user_id
    )

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