import os
from dotenv import load_dotenv
import stripe
import httpx
from fastapi import APIRouter, Depends, HTTPException,Request
from sqlalchemy.orm import Session
from database import get_db
from models import Payment
from schemas import (
    CreatePaymentRequest,
    CreatePaymentResponse,
    PaymentResponse,
    UpdatePaymentStatusRequest,
)
from utils.stripe_client import create_checkout_session

router = APIRouter(prefix="/payments", tags=["Payments"])

NOTIFICATION_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://localhost:8004")


def send_payment_notification(user_id: int, message: str, email: str, phone: str):
    try:
        with httpx.Client(timeout=10.0) as client:
            client.post(
                f"{NOTIFICATION_SERVICE_URL}/notifications/",
                json={
                    "user_id": user_id,
                    "message": message,
                    "type": "payment",
                    "email": email,
                    "phone": phone
                }
            )
    except Exception as e:
        print(f"Failed to send notification: {e}")


@router.post("/create", response_model=CreatePaymentResponse)
def create_payment(request: CreatePaymentRequest, db: Session = Depends(get_db)):
    try:
        payment = Payment(
            appointment_id=request.appointment_id,
            patient_id=request.patient_id,
            amount=request.amount,
            currency=request.currency,
            status="pending",
            payment_method=request.payment_method,
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)

        session = create_checkout_session(
            payment_id=payment.id,
            amount=payment.amount,
            currency=payment.currency,
        )

        payment.checkout_session_id = session.id
        db.commit()
        db.refresh(payment)

        if request.patient_email:
            message = f"Your payment of ${request.amount} is ready. Please complete payment to confirm your appointment."
            send_payment_notification(
                user_id=request.patient_id,
                message=message,
                email=request.patient_email,
                phone=request.patient_phone or ""
            )

        return CreatePaymentResponse(
            payment_id=payment.id,
            status=payment.status,
            checkout_url=session.url,
            checkout_session_id=session.id,
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create payment: {str(e)}")


@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(payment_id: int, db: Session = Depends(get_db)):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    return payment

load_dotenv()
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Stripe webhook secret is not configured")

    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=sig_header,
            secret=STRIPE_WEBHOOK_SECRET,
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid Stripe signature")

    if event["type"] == "checkout.session.completed":
        session_data = event["data"]["object"]

        payment_id = session_data.get("metadata", {}).get("payment_id")
        transaction_id = session_data.get("payment_intent")
        checkout_session_id = session_data.get("id")

        if payment_id:
            payment = db.query(Payment).filter(Payment.id == int(payment_id)).first()

            if payment:
                payment.status = "paid"
                payment.transaction_id = transaction_id
                payment.checkout_session_id = checkout_session_id
                db.commit()

    return {"message": "Webhook received successfully"}
@router.put("/{payment_id}/status", response_model=PaymentResponse)
def update_payment_status(
    payment_id: int,
    request: UpdatePaymentStatusRequest,
    db: Session = Depends(get_db),
):
    allowed_statuses = ["pending", "paid", "failed", "cancelled"]

    if request.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Allowed values: {allowed_statuses}",
        )

    payment = db.query(Payment).filter(Payment.id == payment_id).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    payment.status = request.status
    db.commit()
    db.refresh(payment)

    return payment