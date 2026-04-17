import os
from dotenv import load_dotenv
import stripe
import uuid

load_dotenv()

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
FRONTEND_SUCCESS_URL = os.getenv("FRONTEND_SUCCESS_URL", "http://localhost:5173/payment/success")
FRONTEND_CANCEL_URL = os.getenv("FRONTEND_CANCEL_URL", "http://localhost:5173/payment/cancel")
USE_MOCK = os.getenv("USE_MOCK_PAYMENT", "false").lower() == "true"

if not USE_MOCK and not STRIPE_SECRET_KEY:
    raise ValueError("STRIPE_SECRET_KEY is not set in the .env file")

if not USE_MOCK:
    stripe.api_key = STRIPE_SECRET_KEY
    stripe.api_base = "https://api.stripe.com"
    stripe.max_network_retries = 2


def create_checkout_session(payment_id: int, amount: float, currency: str = "usd"):
    if USE_MOCK:
        mock_session_id = f"cs_test_{uuid.uuid4().hex[:24]}"
        mock_url = f"{FRONTEND_SUCCESS_URL}?payment_id={payment_id}&session_id={mock_session_id}"
        return type('MockSession', (), {
            'id': mock_session_id,
            'url': mock_url
        })()
    
    currency_map = {
        "lkr": "lkr",
        "usd": "usd",
        "gbp": "gbp",
        "eur": "eur",
    }
    curr = currency_map.get(currency.lower(), "usd")
    
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="payment",
            line_items=[
                {
                    "price_data": {
                        "currency": curr,
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
            timeout=30,
        )
        return session
    except stripe.error.Timeout:
        raise Exception("Stripe request timed out. Please try again.")
    except stripe.error.NetworkError:
        raise Exception("Unable to connect to payment provider. Please check your internet connection.")
    except stripe.error.StripeError as e:
        raise Exception(f"Payment error: {str(e)}")
    except Exception as e:
        print(f"Stripe error: {e}")
        raise Exception(f"Payment failed: {str(e)}")
