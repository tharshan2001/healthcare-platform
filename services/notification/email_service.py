import os
import smtplib
from email.mime.text import MIMEText

def send_email(to_email: str, subject: str, message: str):
    sender_email = os.getenv("EMAIL_USER")
    app_password = os.getenv("EMAIL_PASSWORD")

    msg = MIMEText(message)
    msg["Subject"] = subject
    msg["From"] = sender_email
    msg["To"] = to_email

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(sender_email, app_password)
            server.send_message(msg)

        print("✅ Real email sent!")

    except Exception as e:
        print("❌ Email failed:", e)