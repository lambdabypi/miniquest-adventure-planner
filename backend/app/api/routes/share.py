# backend/app/api/routes/share.py
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
import logging, secrets
from datetime import datetime, timedelta
from bson import ObjectId

from ...database import MongoDBClient
from ..dependencies import get_mongodb_client
from ..routes.auth import get_current_user
from ...models.share_models import (
    CreateShareRequest, SharedItineraryResponse, PublicItineraryResponse
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/share", tags=["sharing"])

# ── Create shareable link ─────────────────────────────────────

@router.post("", response_model=SharedItineraryResponse)
async def create_share(
    req: CreateShareRequest,
    current_user: dict = Depends(get_current_user),
    db: MongoDBClient = Depends(get_mongodb_client),
):
    try:
        share_id = secrets.token_urlsafe(10)   # e.g. "aB3xZ9..."
        uid = str(current_user.get("user_id") or current_user.get("id"))
        expires = datetime.utcnow() + timedelta(days=30)

        col = db.connection.get_database()["shared_itineraries"]
        await col.insert_one({
            "share_id": share_id,
            "user_id": uid,
            "username": current_user.get("username", ""),
            "adventure_data": req.adventure_data,
            "message": req.message,
            "view_count": 0,
            "created_at": datetime.utcnow(),
            "expires_at": expires,
        })

        # Build URL - reads from env so it works locally and on GCP
        import os
        base = os.getenv("FRONTEND_URL", "http://localhost:3000")
        share_url = f"{base}/shared/{share_id}"

        logger.info(f"✅ Share created: {share_id} by user {uid}")
        return SharedItineraryResponse(
            success=True,
            share_id=share_id,
            share_url=share_url,
            expires_at=expires,
        )
    except Exception as e:
        logger.error(f"Create share error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ── View shared itinerary (PUBLIC - no auth required) ─────────

@router.get("/{share_id}", response_model=PublicItineraryResponse)
async def get_shared(
    share_id: str,
    db: MongoDBClient = Depends(get_mongodb_client),
):
    try:
        col = db.connection.get_database()["shared_itineraries"]
        doc = await col.find_one({"share_id": share_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Share link not found")

        if doc.get("expires_at") and doc["expires_at"] < datetime.utcnow():
            raise HTTPException(status_code=410, detail="Share link has expired")

        # Single atomic increment - returns doc AFTER update
        updated = await col.find_one_and_update(
            {"share_id": share_id},
            {"$inc": {"view_count": 1}},
            return_document=True
        )

        return PublicItineraryResponse(
            share_id=share_id,
            adventure_data=doc["adventure_data"],
            shared_by=doc.get("username", ""),
            message=doc.get("message"),
            view_count=updated.get("view_count", 1),
            created_at=doc["created_at"],
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get share error: {e}")
        raise HTTPException(status_code=500, detail=str(e))