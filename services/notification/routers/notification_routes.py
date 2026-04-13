from utils import generate_message
from email_service import send_email
from sms_service import send_sms
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Notification
from schemas import NotificationCreate, NotificationResponse

router = APIRouter()

@router.post("/", response_model=NotificationResponse)
async def create_notification(
    notification: NotificationCreate, 
    db: Session = Depends(get_db)
):
    from notification_queue import notification_queue
    
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

    await notification_queue.enqueue({
        "user_id": notification.user_id,
        "message": final_message,
        "email": notification.email,
        "phone": notification.phone,
        "subject": f"Healthcare Platform - {notification.type.title()}"
    })

    return new_notification

@router.post("/sync/{user_id}", response_model=NotificationResponse)
async def create_sync_notification(
    user_id: int,
    message: str,
    notification_type: str,
    email: str,
    phone: str,
    db: Session = Depends(get_db)
):    
    final_message = message or generate_message(notification_type)

    new_notification = Notification(
        user_id=user_id,
        message=final_message,
        type=notification_type,
        status="unread"
    )

    db.add(new_notification)
    db.commit()
    db.refresh(new_notification)

    try:
        send_email(email, f"Healthcare Platform - {notification_type.title()}", final_message)
    except Exception as e:
        print(f"❌ Email failed: {e}")

    try:
        send_sms(phone, final_message)
    except Exception as e:
        print(f"❌ SMS failed: {e}")

    return new_notification

@router.get("/queue/size")
async def get_queue_size():
    from notification_queue import notification_queue
    size = await notification_queue.size()
    return {"queue_size": size}

@router.get("/unread/{user_id}", response_model=list[NotificationResponse])
def get_unread_notifications(user_id: int, db: Session = Depends(get_db)):
    notifications = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.status == "unread"
    ).all()

    return notifications

@router.get("/{user_id}", response_model=list[NotificationResponse])
def get_notifications(user_id: int, db: Session = Depends(get_db)):
    notifications = db.query(Notification).filter(
        Notification.user_id == user_id
    ).all()

    return notifications

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