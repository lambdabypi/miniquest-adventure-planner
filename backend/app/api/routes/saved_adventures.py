# backend/app/api/routes/saved_adventures.py
"""Saved adventures management endpoints"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
import logging
from datetime import datetime

from ...database import MongoDBClient
from ...core.rag import DynamicTavilyRAGSystem
from ..dependencies import get_mongodb_client, get_rag_system
from ..routes.auth import get_current_user  # ✨ Import from auth routes
from ...models.adventure_models import (
    SaveAdventureRequest,
    UpdateAdventureRequest,
    SavedAdventureResponse,
    SavedAdventureListResponse,
    SaveAdventureResponse,
    DeleteAdventureResponse,
    PersonalizationResponse,
    UserPersonalizationInsights,
    AdventureSearchQuery,
    AdventureSearchResponse,
    AdventureStatsResponse,
    AdventureStats
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/saved-adventures", tags=["saved_adventures"])

# ========================================
# CORE CRUD ENDPOINTS
# ========================================

@router.post("", response_model=SaveAdventureResponse)
async def save_adventure(
    request: SaveAdventureRequest,
    current_user: dict = Depends(get_current_user),
    db_client: MongoDBClient = Depends(get_mongodb_client),
    rag_system: DynamicTavilyRAGSystem = Depends(get_rag_system)
):
    """
    Save an adventure for the user.
    Stores in MongoDB and ChromaDB for personalization.
    """
    try:
        user_id = current_user["user_id"]
        
        # Prepare adventure record
        saved_adventure = {
            "user_id": user_id,
            "adventure_data": request.adventure_data,
            "rating": request.rating,
            "notes": request.notes,
            "tags": request.tags or [],
            "saved_at": datetime.now(),
            "completed": False,
            "completed_at": None,
            "updated_at": datetime.now(),
            "metadata": {
                "location": request.adventure_data.get("location"),
                "title": request.adventure_data.get("title"),
                "theme": request.adventure_data.get("theme"),
                "duration": request.adventure_data.get("duration"),
                "cost": request.adventure_data.get("cost"),
                "preferences_used": request.adventure_data.get("preferences_used", [])
            }
        }
        
        # Save to MongoDB
        adventure_id = await db_client.query_repo.save_saved_adventure(saved_adventure)
        
        # Store in ChromaDB for RAG personalization
        rag_system.store_user_adventure(
            user_id=user_id,
            adventure_data=request.adventure_data,
            rating=request.rating
        )
        
        logger.info(f"✅ Adventure saved for user {user_id}: {adventure_id}")
        
        return SaveAdventureResponse(
            success=True,
            adventure_id=adventure_id,
            message="Adventure saved successfully"
        )
        
    except Exception as e:
        logger.error(f"❌ Error saving adventure: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=SavedAdventureListResponse)
async def get_saved_adventures(
    limit: int = Query(20, ge=1, le=100),
    completed: Optional[bool] = None,
    current_user: dict = Depends(get_current_user),
    db_client: MongoDBClient = Depends(get_mongodb_client)
):
    """Get user's saved adventures with optional filtering"""
    try:
        user_id = current_user["user_id"]
        
        adventures = await db_client.query_repo.get_saved_adventures(
            user_id=user_id,
            limit=limit,
            completed=completed
        )
        
        # Convert to response models
        adventure_responses = [
            SavedAdventureResponse(**adventure) for adventure in adventures
        ]
        
        filter_applied = None
        if completed is not None:
            filter_applied = "completed" if completed else "active"
        
        return SavedAdventureListResponse(
            success=True,
            adventures=adventure_responses,
            total=len(adventure_responses),
            filter_applied=filter_applied
        )
        
    except Exception as e:
        logger.error(f"❌ Error retrieving saved adventures: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{adventure_id}", response_model=SavedAdventureResponse)
async def get_saved_adventure(
    adventure_id: str,
    current_user: dict = Depends(get_current_user),
    db_client: MongoDBClient = Depends(get_mongodb_client)
):
    """Get a specific saved adventure"""
    try:
        user_id = current_user["user_id"]
        
        adventure = await db_client.query_repo.get_saved_adventure(
            adventure_id=adventure_id,
            user_id=user_id
        )
        
        if not adventure:
            raise HTTPException(status_code=404, detail="Adventure not found")
        
        return SavedAdventureResponse(**adventure)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error retrieving adventure: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{adventure_id}")
async def update_saved_adventure(
    adventure_id: str,
    request: UpdateAdventureRequest,
    current_user: dict = Depends(get_current_user),
    db_client: MongoDBClient = Depends(get_mongodb_client),
    rag_system: DynamicTavilyRAGSystem = Depends(get_rag_system)
):
    """Update a saved adventure (rating, notes, completion status)"""
    try:
        user_id = current_user["user_id"]
        
        # Prepare updates
        updates = {}
        if request.rating is not None:
            updates["rating"] = request.rating
        if request.notes is not None:
            updates["notes"] = request.notes
        if request.tags is not None:
            updates["tags"] = request.tags
        if request.completed is not None:
            updates["completed"] = request.completed
            if request.completed:
                updates["completed_at"] = datetime.now()
        updates["updated_at"] = datetime.now()
        
        # Update MongoDB
        updated = await db_client.query_repo.update_saved_adventure(
            adventure_id=adventure_id,
            user_id=user_id,
            updates=updates
        )
        
        if not updated:
            raise HTTPException(status_code=404, detail="Adventure not found")
        
        # If rating changed, update ChromaDB
        if request.rating is not None:
            adventure = await db_client.query_repo.get_saved_adventure(
                adventure_id=adventure_id,
                user_id=user_id
            )
            if adventure:
                rag_system.store_user_adventure(
                    user_id=user_id,
                    adventure_data=adventure["adventure_data"],
                    rating=request.rating
                )
        
        logger.info(f"✅ Adventure updated: {adventure_id}")
        
        return {
            "success": True,
            "message": "Adventure updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating adventure: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{adventure_id}", response_model=DeleteAdventureResponse)
async def delete_saved_adventure(
    adventure_id: str,
    current_user: dict = Depends(get_current_user),
    db_client: MongoDBClient = Depends(get_mongodb_client)
):
    """Delete a saved adventure"""
    try:
        user_id = current_user["user_id"]
        
        deleted = await db_client.query_repo.delete_saved_adventure(
            adventure_id=adventure_id,
            user_id=user_id
        )
        
        if not deleted:
            raise HTTPException(status_code=404, detail="Adventure not found")
        
        logger.info(f"✅ Adventure deleted: {adventure_id}")
        
        return DeleteAdventureResponse(
            success=True,
            message="Adventure deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting adventure: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# PERSONALIZATION ENDPOINTS
# ========================================

@router.get("/personalization/insights", response_model=PersonalizationResponse)
async def get_personalization_insights(
    location: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    rag_system: DynamicTavilyRAGSystem = Depends(get_rag_system)
):
    """Get personalization insights based on saved adventures"""
    try:
        user_id = current_user["user_id"]
        
        insights = rag_system.get_user_personalization(
            user_id=user_id,
            location=location or "general"
        )
        
        # Convert to Pydantic model
        personalization_insights = UserPersonalizationInsights(**insights)
        
        return PersonalizationResponse(
            success=True,
            insights=personalization_insights
        )
        
    except Exception as e:
        logger.error(f"❌ Error getting insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats/summary", response_model=AdventureStatsResponse)
async def get_adventure_statistics(
    current_user: dict = Depends(get_current_user),
    db_client: MongoDBClient = Depends(get_mongodb_client)
):
    """Get user's adventure statistics"""
    try:
        user_id = current_user["user_id"]
        
        # Get all saved adventures
        adventures = await db_client.query_repo.get_saved_adventures(
            user_id=user_id,
            limit=1000  # Get all for stats
        )
        
        if not adventures:
            return AdventureStatsResponse(
                success=True,
                stats=AdventureStats(
                    total_saved=0,
                    total_completed=0,
                    completion_rate=0.0,
                    average_rating=0.0
                )
            )
        
        # Calculate statistics
        total_saved = len(adventures)
        completed_adventures = [a for a in adventures if a.get("completed", False)]
        total_completed = len(completed_adventures)
        completion_rate = (total_completed / total_saved) if total_saved > 0 else 0.0
        
        # Average rating
        rated_adventures = [a for a in adventures if a.get("rating")]
        average_rating = (
            sum(a["rating"] for a in rated_adventures) / len(rated_adventures)
            if rated_adventures else 0.0
        )
        
        # Most visited location
        from collections import Counter
        locations = [
            a["metadata"]["location"] 
            for a in adventures 
            if a.get("metadata", {}).get("location")
        ]
        most_visited = Counter(locations).most_common(1)
        most_visited_location = most_visited[0][0] if most_visited else None
        
        # Last adventure date
        sorted_adventures = sorted(
            adventures, 
            key=lambda x: x.get("saved_at", datetime.min),
            reverse=True
        )
        last_adventure_date = sorted_adventures[0].get("saved_at") if sorted_adventures else None
        
        stats = AdventureStats(
            total_saved=total_saved,
            total_completed=total_completed,
            completion_rate=round(completion_rate, 2),
            average_rating=round(average_rating, 1),
            most_visited_location=most_visited_location,
            last_adventure_date=last_adventure_date
        )
        
        return AdventureStatsResponse(
            success=True,
            stats=stats
        )
        
    except Exception as e:
        logger.error(f"❌ Error getting statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# SEARCH ENDPOINTS
# ========================================

@router.post("/search", response_model=AdventureSearchResponse)
async def search_saved_adventures(
    query: AdventureSearchQuery,
    current_user: dict = Depends(get_current_user),
    db_client: MongoDBClient = Depends(get_mongodb_client)
):
    """Advanced search for saved adventures"""
    try:
        user_id = current_user["user_id"]
        
        # Build search filters
        filters = {"user_id": user_id}
        
        if query.completed is not None:
            filters["completed"] = query.completed
        
        if query.min_rating:
            filters["rating"] = {"$gte": query.min_rating}
        
        if query.location:
            filters["metadata.location"] = {"$regex": query.location, "$options": "i"}
        
        if query.tags:
            filters["tags"] = {"$in": query.tags}
        
        if query.date_from or query.date_to:
            date_filter = {}
            if query.date_from:
                date_filter["$gte"] = query.date_from
            if query.date_to:
                date_filter["$lte"] = query.date_to
            filters["saved_at"] = date_filter
        
        # Execute search
        adventures = await db_client.query_repo.search_saved_adventures(
            filters=filters,
            limit=query.limit,
            offset=query.offset
        )
        
        # Get total count
        total = await db_client.query_repo.count_saved_adventures(filters=filters)
        
        # Convert to response models
        adventure_responses = [
            SavedAdventureResponse(**adventure) for adventure in adventures
        ]
        
        has_more = (query.offset + len(adventures)) < total
        
        return AdventureSearchResponse(
            success=True,
            adventures=adventure_responses,
            total=total,
            limit=query.limit,
            offset=query.offset,
            has_more=has_more
        )
        
    except Exception as e:
        logger.error(f"❌ Error searching adventures: {e}")
        raise HTTPException(status_code=500, detail=str(e))