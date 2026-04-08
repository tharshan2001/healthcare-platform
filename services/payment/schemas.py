from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class CreatePaymentRequest(BaseModel):
    appointment_id: int
    patient_id: int
    amount: float = Field(..., gt=0)
    currency: str = "usd"
    payment_method: str = "stripe"


class CreatePaymentResponse(BaseModel):
    payment_id: int
    status: str
    checkout_url: str
    checkout_session_id: str


class PaymentResponse(BaseModel):
    id: int
    appointment_id: int
    patient_id: int
    amount: float
    currency: str
    status: str
    transaction_id: Optional[str] = None
    checkout_session_id: Optional[str] = None
    payment_method: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UpdatePaymentStatusRequest(BaseModel):
    status: str