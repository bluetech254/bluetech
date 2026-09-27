"""contact/router.py — Contact form submission."""
import logging
from pydantic import BaseModel, EmailStr
from typing import Optional
from fastapi import APIRouter, HTTPException
from core.database import supabase_admin

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/contact", tags=["Contact"])


class ContactMessage(BaseModel):
    name:    str
    email:   EmailStr
    phone:   Optional[str] = None
    subject: str
    message: str


@router.post("")
def submit_contact(data: ContactMessage):
    """Save a contact form message."""
    try:
        result = supabase_admin.table("contact_messages").insert(data.model_dump()).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to save message")
        return {"message": "Message received. We'll get back to you soon."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Contact submit error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
