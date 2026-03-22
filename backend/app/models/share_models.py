# backend/app/models/share_models.py
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class CreateShareRequest(BaseModel):
    adventure_data: dict
    message: Optional[str] = None   # Optional note from sharer

class SharedItineraryResponse(BaseModel):
    success: bool
    share_id: str
    share_url: str
    expires_at: Optional[datetime]

class PublicItineraryResponse(BaseModel):
    """Returned for unauthenticated /share/{id} requests"""
    share_id: str
    adventure_data: dict
    shared_by: str                   # username only, no email
    message: Optional[str]
    view_count: int
    created_at: datetime