import httpx
import os

NOTIFICATION_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://localhost:8005")


def send_notification(user_id: int, message: str, notification_type: str, email: str, phone: str):
    with httpx.Client(timeout=10.0) as client:
        try:
            response = client.post(
                f"{NOTIFICATION_SERVICE_URL}/notifications/",
                json={
                    "user_id": user_id,
                    "message": message,
                    "type": notification_type,
                    "email": email,
                    "phone": phone
                }
            )
            if response.status_code == 200:
                return response.json()
            return {"error": response.text, "status": response.status_code}
        except Exception as e:
            return {"error": str(e)}


def send_sync_notification(user_id: int, message: str, notification_type: str, email: str, phone: str):
    with httpx.Client(timeout=30.0) as client:
        try:
            response = client.post(
                f"{NOTIFICATION_SERVICE_URL}/notifications/sync/{user_id}",
                params={
                    "message": message,
                    "notification_type": notification_type,
                    "email": email,
                    "phone": phone
                }
            )
            if response.status_code == 200:
                return response.json()
            return {"error": response.text, "status": response.status_code}
        except Exception as e:
            return {"error": str(e)}


def get_notifications(user_id: int):
    with httpx.Client(timeout=10.0) as client:
        try:
            response = client.get(f"{NOTIFICATION_SERVICE_URL}/notifications/{user_id}")
            if response.status_code == 200:
                return response.json()
            return []
        except Exception as e:
            return []


def get_unread_notifications(user_id: int):
    with httpx.Client(timeout=10.0) as client:
        try:
            response = client.get(f"{NOTIFICATION_SERVICE_URL}/notifications/unread/{user_id}")
            if response.status_code == 200:
                return response.json()
            return []
        except Exception as e:
            return []


def get_queue_size():
    with httpx.Client(timeout=10.0) as client:
        try:
            response = client.get(f"{NOTIFICATION_SERVICE_URL}/notifications/queue/size")
            if response.status_code == 200:
                return response.json()
            return {"queue_size": 0}
        except Exception as e:
            return {"queue_size": 0}