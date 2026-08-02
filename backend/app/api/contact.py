from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from app.database import supabase_admin as supabase

router = APIRouter(prefix="/api/v1/contact", tags=["contact"])


class ContactMessage(BaseModel):
    name: str
    email: EmailStr
    phone: str | None = None
    subject: str
    message: str


@router.post("")
def submit_contact(data: ContactMessage):
    result = supabase.table("contact_messages").insert(data.model_dump()).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save message")
    return {"message": "Message received. We'll get back to you soon."}
