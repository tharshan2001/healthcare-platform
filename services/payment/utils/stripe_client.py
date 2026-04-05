import os
from dotenv import load_dotenv
import stripe

load_dotenv()

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
FRONTEND_SUCCESS_URL = os.getenv("FRONTEND_SUCCESS_URL")
FRONTEND_CANCEL_URL = os.getenv("FRONTEND_CANCEL_URL")

if not STRIPE_SECRET_KEY:
    raise ValueError("STRIPE_SECRET_KEY is not set in the .env file")

stripe.api_key = STRIPE_SECRET_KEY


def create_checkout_session(payment_id: int, amount: float, currency: str = "usd"):
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        mode="payment",
        line_items=[
            {
                "price_data": {
                    "currency": currency.lower(),
                    "product_data": {
                        "name": f"Appointment Payment #{payment_id}",
                    },
                    "unit_amount": int(amount * 100),
                },
                "quantity": 1,
            }
        ],
        success_url=f"{FRONTEND_SUCCESS_URL}?payment_id={payment_id}&session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{FRONTEND_CANCEL_URL}?payment_id={payment_id}",
        metadata={
            "payment_id": str(payment_id),
        },
    )
    return session