import httpx
import os
from dotenv import load_dotenv

load_dotenv()
NOTIFICATION_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://localhost:8010")


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


def send_appointment_notification(
    patient_id: int,
    doctor_id: int,
    appointment_date: str,
    appointment_time: str,
    patient_email: str,
    patient_phone: str,
    patient_name: str,
    doctor_name: str,
    notification_type: str = "appointment"
):
    message = f"Your appointment with Dr. {doctor_name} is scheduled for {appointment_date} at {appointment_time}."
    return send_notification(
        user_id=patient_id,
        message=message,
        notification_type=notification_type,
        email=patient_email,
        phone=patient_phone
    )