"""app/schemas.py — request/response models."""
from pydantic import BaseModel


class InitiateOptions(BaseModel):
    callback_url: str | None = None
    gateway: str | None = None  # "payhero" (only supported gateway)
    metadata: dict | None = None


class CommitmentInitiateOptions(InitiateOptions):
    service_price: int = 0


class FinalRequestOptions(InitiateOptions):
    pass


class InitiateResponse(BaseModel):
    authorization_url: str | None = None
    reference: str
    gateway: str
    requires_stk: bool = False
    amount_kes: float
    message: str


class VerifyResponse(BaseModel):
    status: str
    reference: str
    amount_kes: float | None = None
    gateway: str | None = None
