import os
import hashlib
from datetime import datetime
import httpx

API_USERNAME = os.getenv("DIALOG_SMS_USER", "user_kismet")
API_PASSWORD = os.getenv("DIALOG_SMS_PASS", "md$%43JG")
API_AUTH_STRING = os.getenv("DIALOG_SMS_AUTH", "05612d4977d425f")
API_BASE_URL = os.getenv("DIALOG_SMS_URL", "https://richcommunication.dialog.lk/api")
DEFAULT_MASK = os.getenv("DIALOG_SMS_MASK", "KISMET PLUS")


def generate_headers():
    now = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    digest = hashlib.md5(API_PASSWORD.encode()).hexdigest()
    
    return {
        "Content-Type": "application/json",
        "USER": API_USERNAME,
        "DIGEST": digest,
        "CREATED": now,
        "API-AUTH-STRING": API_AUTH_STRING,
    }


def send_sms(phone_number: str, message: str):
    if not phone_number:
        raise ValueError("Phone number is required")
    
    if not message:
        raise ValueError("Message is required")
    
    clean_phone = phone_number.replace("+", "").replace(" ", "").replace("-", "")
    if not clean_phone.startswith("94"):
        if clean_phone.startswith("0"):
            clean_phone = "94" + clean_phone[1:]
        else:
            clean_phone = "94" + clean_phone
    
    sms_message = {
        "number": clean_phone,
        "text": message,
        "mask": DEFAULT_MASK,
        "campaignName": "HealthcareApp"
    }
    
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                f"{API_BASE_URL}/sms/send",
                json={"messages": [sms_message]},
                headers=generate_headers()
            )
            
            if response.status_code == 200:
                result = response.json()
                msg_result = result.get("messages", [{}])[0] if result.get("messages") else {}
                
                if msg_result.get("resultCode") == 0:
                    print(f"✅ SMS sent successfully to {clean_phone}")
                    return {"status": "success", "phone": clean_phone, "serverRef": msg_result.get("serverRef")}
                else:
                    error_desc = msg_result.get("resultDesc", "Unknown error")
                    print(f"❌ SMS API error: {error_desc}")
                    raise Exception(f"SMS failed: {error_desc}")
            else:
                print(f"❌ SMS HTTP error: {response.status_code} - {response.text}")
                raise Exception(f"SMS HTTP error: {response.status_code}")
                
    except httpx.RequestError as e:
        print(f"❌ SMS request failed: {e}")
        raise Exception(f"SMS request failed: {e}")
    except Exception as e:
        print(f"❌ SMS sending failed: {e}")
        raise