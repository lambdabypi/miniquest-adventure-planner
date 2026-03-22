# backend/app/api/routes/social.py
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
import logging
from datetime import datetime
from bson import ObjectId

from ...database import MongoDBClient
from ..dependencies import get_mongodb_client
from ..routes.auth import get_current_user
from ...models.social_models import (
    CreatePostRequest, PostResponse, PostListResponse,
    PostLikeResponse, CommentRequest, CommentResponse
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/social", tags=["social"])

def _fmt_post(post: dict, current_user_id: str) -> dict:
    """Serialize a MongoDB post doc → PostResponse-compatible dict."""
    post_id = str(post["_id"])
    likes: list = post.get("likes", [])
    comments: list = post.get("comments", [])
    return {
        "id": post_id,
        "user_id": str(post["user_id"]),
        "username": post.get("username", ""),
        "content": post["content"],
        "adventure_title": post.get("adventure_title"),
        "location": post.get("location"),
        "tags": post.get("tags", []),
        "like_count": len(likes),
        "liked_by_me": current_user_id in [str(l) for l in likes],
        "comment_count": len(comments),
        "comments": [
            {
                "id": str(c.get("_id", "")),
                "user_id": str(c["user_id"]),
                "username": c.get("username", ""),
                "content": c["content"],
                "created_at": c["created_at"],
            }
            for c in comments[-5:]       # return last 5 comments inline
        ],
        "created_at": post["created_at"],
    }

# ── Feed ──────────────────────────────────────────────────────

@router.get("", response_model=PostListResponse)
async def get_feed(
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db: MongoDBClient = Depends(get_mongodb_client),
):
    try:
        col = db.connection.get_database()["social_posts"]
        total = await col.count_documents({})
        cursor = col.find({}).sort("created_at", -1).skip(offset).limit(limit)
        posts = await cursor.to_list(length=limit)
        uid = str(current_user.get("user_id") or current_user.get("id"))
        return PostListResponse(
            success=True,
            posts=[_fmt_post(p, uid) for p in posts],
            total=total,
            has_more=(offset + limit) < total,
        )
    except Exception as e:
        logger.error(f"Feed error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ── Create post ───────────────────────────────────────────────

@router.post("", response_model=PostResponse)
async def create_post(
    req: CreatePostRequest,
    current_user: dict = Depends(get_current_user),
    db: MongoDBClient = Depends(get_mongodb_client),
):
    try:
        uid = str(current_user.get("user_id") or current_user.get("id"))
        col = db.connection.get_database()["social_posts"]
        doc = {
            "user_id": uid,
            "username": current_user.get("username", ""),
            "content": req.content,
            "adventure_title": req.adventure_title,
            "location": req.location,
            "tags": req.tags or [],
            "likes": [],
            "comments": [],
            "created_at": datetime.utcnow(),
        }
        result = await col.insert_one(doc)
        doc["_id"] = result.inserted_id
        return PostResponse(**_fmt_post(doc, uid))
    except Exception as e:
        logger.error(f"Create post error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ── Like / Unlike ─────────────────────────────────────────────

@router.post("/{post_id}/like", response_model=PostLikeResponse)
async def toggle_like(
    post_id: str,
    current_user: dict = Depends(get_current_user),
    db: MongoDBClient = Depends(get_mongodb_client),
):
    try:
        uid = str(current_user.get("user_id") or current_user.get("id"))
        col = db.connection.get_database()["social_posts"]
        post = await col.find_one({"_id": ObjectId(post_id)})
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")

        likes = [str(l) for l in post.get("likes", [])]
        if uid in likes:
            await col.update_one({"_id": ObjectId(post_id)}, {"$pull": {"likes": uid}})
            liked = False
            like_count = len(likes) - 1
        else:
            await col.update_one({"_id": ObjectId(post_id)}, {"$addToSet": {"likes": uid}})
            liked = True
            like_count = len(likes) + 1

        return PostLikeResponse(success=True, liked=liked, like_count=like_count)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Like error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ── Comment ───────────────────────────────────────────────────

@router.post("/{post_id}/comments", response_model=CommentResponse)
async def add_comment(
    post_id: str,
    req: CommentRequest,
    current_user: dict = Depends(get_current_user),
    db: MongoDBClient = Depends(get_mongodb_client),
):
    try:
        uid = str(current_user.get("user_id") or current_user.get("id"))
        col = db.connection.get_database()["social_posts"]
        comment = {
            "_id": ObjectId(),
            "user_id": uid,
            "username": current_user.get("username", ""),
            "content": req.content,
            "created_at": datetime.utcnow(),
        }
        result = await col.update_one(
            {"_id": ObjectId(post_id)},
            {"$push": {"comments": comment}},
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Post not found")
        return CommentResponse(
            id=str(comment["_id"]),
            user_id=uid,
            username=comment["username"],
            content=comment["content"],
            created_at=comment["created_at"],
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Comment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ── Delete post (own posts only) ──────────────────────────────

@router.delete("/{post_id}")
async def delete_post(
    post_id: str,
    current_user: dict = Depends(get_current_user),
    db: MongoDBClient = Depends(get_mongodb_client),
):
    try:
        uid = str(current_user.get("user_id") or current_user.get("id"))
        col = db.connection.get_database()["social_posts"]
        result = await col.delete_one({"_id": ObjectId(post_id), "user_id": uid})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Post not found or not yours")
        return {"success": True, "message": "Post deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))