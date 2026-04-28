import asyncio
import queue
import threading
from datetime import datetime
from collections import deque

class NotificationQueue:
    def __init__(self):
        self._queue = deque()
        self._lock = asyncio.Lock()
        self._processing = False

    async def enqueue(self, notification_data: dict):
        async with self._lock:
            self._queue.append({
                **notification_data,
                "queued_at": datetime.utcnow()
            })

    async def dequeue(self) -> dict | None:
        async with self._lock:
            if self._queue:
                return self._queue.popleft()
            return None

    async def size(self) -> int:
        async with self._lock:
            return len(self._queue)

notification_queue = NotificationQueue()

async def process_queue():
    from email_service import send_email
    from sms_service import send_sms
    
    while True:
        await asyncio.sleep(1)
        
        notification = await notification_queue.dequeue()
        if notification:
            print(f"📤 Processing queued notification for user {notification.get('user_id')}")
            
            try:
                if notification.get("email"):
                    try:
                        send_email(
                            notification["email"],
                            notification.get("subject", "New Notification"),
                            notification["message"]
                        )
                    except Exception as email_error:
                        print(f"⚠️ Email failed (non-critical): {email_error}")
                
                if notification.get("phone"):
                    try:
                        send_sms(
                            notification["phone"],
                            notification["message"]
                        )
                    except Exception as sms_error:
                        print(f"⚠️ SMS failed (non-critical): {sms_error}")
                
                print(f"✅ Queued notification processed for user {notification.get('user_id')}")
            except Exception as e:
                print(f"❌ Failed to process queued notification: {e}")