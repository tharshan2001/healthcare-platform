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
                    send_email(
                        notification["email"],
                        notification.get("subject", "New Notification"),
                        notification["message"]
                    )
                
                if notification.get("phone"):
                    send_sms(
                        notification["phone"],
                        notification["message"]
                    )
                
                print(f"✅ Queued notification sent to user {notification.get('user_id')}")
            except Exception as e:
                print(f"❌ Failed to process queued notification: {e}")