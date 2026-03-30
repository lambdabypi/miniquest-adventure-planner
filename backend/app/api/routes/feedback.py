# backend/app/api/routes/feedback.py
"""Feedback endpoints — submit (any user) + view (admin only)"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import logging
import os

from ...database import MongoDBClient
from ..dependencies import get_mongodb_client
from ..routes.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/feedback", tags=["feedback"])

# ── Admin guard ───────────────────────────────────────────────────────────────
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "").strip()

def _require_admin(current_user: dict):
    user_email = current_user.get("email", "")
    logger.info(f"🔐 Admin check — ADMIN_EMAIL={repr(ADMIN_EMAIL)} user_email={repr(user_email)}")
    if not ADMIN_EMAIL:
        raise HTTPException(status_code=500, detail="ADMIN_EMAIL not configured")
    if user_email.lower() != ADMIN_EMAIL.lower():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

def _get_collection(db: MongoDBClient):
    """Get the feedback collection from the MongoDBClient."""
    return db.connection.get_database()["feedback"]


# ── Models ────────────────────────────────────────────────────────────────────
class FeedbackSubmission(BaseModel):
    overall_rating: int                  # 1–5
    what_worked: Optional[str] = None
    what_to_improve: Optional[str] = None
    feature_requests: Optional[str] = None
    free_text: Optional[str] = None
    would_recommend: Optional[bool] = None
    adventure_count: Optional[int] = None  # how many adventures user has generated


# ── Submit ────────────────────────────────────────────────────────────────────
@router.post("", status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    payload: FeedbackSubmission,
    current_user: dict = Depends(get_current_user),
    db: MongoDBClient = Depends(get_mongodb_client),
):
    if not (1 <= payload.overall_rating <= 5):
        raise HTTPException(status_code=400, detail="overall_rating must be 1–5")

    record = {
        "user_id":          current_user["user_id"],
        "username":         current_user.get("username", ""),
        "email":            current_user.get("email", ""),
        "overall_rating":   payload.overall_rating,
        "what_worked":      payload.what_worked,
        "what_to_improve":  payload.what_to_improve,
        "feature_requests": payload.feature_requests,
        "free_text":        payload.free_text,
        "would_recommend":  payload.would_recommend,
        "adventure_count":  payload.adventure_count,
        "submitted_at":     datetime.utcnow(),
    }

    try:
        col = _get_collection(db)
        result = await col.insert_one(record)
        logger.info(f"✅ Feedback submitted by {current_user.get('email')} — id={result.inserted_id}")
        return {"success": True, "feedback_id": str(result.inserted_id)}
    except Exception as e:
        logger.error(f"❌ Feedback insert failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to save feedback")


# ── Admin: list all ───────────────────────────────────────────────────────────
@router.get("", response_model=List[dict])
async def list_feedback(
    current_user: dict = Depends(get_current_user),
    db: MongoDBClient = Depends(get_mongodb_client),
):
    _require_admin(current_user)
    try:
        col = _get_collection(db)
        cursor = col.find({}).sort("submitted_at", -1)
        items = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            doc["submitted_at"] = doc["submitted_at"].isoformat()
            items.append(doc)
        return items
    except Exception as e:
        logger.error(f"❌ Feedback list failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch feedback")


# ── Admin: stats summary ──────────────────────────────────────────────────────
@router.get("/stats")
async def feedback_stats(
    current_user: dict = Depends(get_current_user),
    db: MongoDBClient = Depends(get_mongodb_client),
):
    _require_admin(current_user)
    try:
        col = _get_collection(db)
        total = await col.count_documents({})
        pipeline = [{"$group": {"_id": None, "avg": {"$avg": "$overall_rating"}}}]
        avg_result = await col.aggregate(pipeline).to_list(1)
        avg_rating = round(avg_result[0]["avg"], 2) if avg_result else 0

        recommend_count = await col.count_documents({"would_recommend": True})
        dist_pipeline = [{"$group": {"_id": "$overall_rating", "count": {"$sum": 1}}}]
        dist_raw = await col.aggregate(dist_pipeline).to_list(10)
        distribution = {str(d["_id"]): d["count"] for d in dist_raw}

        return {
            "total": total,
            "avg_rating": avg_rating,
            "recommend_pct": round(recommend_count / total * 100) if total else 0,
            "distribution": distribution,
        }
    except Exception as e:
        logger.error(f"❌ Feedback stats failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to compute stats")