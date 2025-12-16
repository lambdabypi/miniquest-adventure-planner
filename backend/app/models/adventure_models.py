# backend/app/models/adventure_models.py
"""Adventure-related models"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime

# ========================================
# ADVENTURE GENERATION MODELS
# ========================================

class AdventureParams(BaseModel):
    """User adventure parameters"""
    mood: str
    time_available: int
    budget: float
    location: str
    energy_level: str
    preferences: List[str]
    constraints: List[str]

class TavilyLocation(BaseModel):
    """Location discovered via Tavily research"""
    name: str
    description: str
    address: str
    type: str
    tavily_url: str
    research_score: int
    detailed_info: Optional[str] = None
    
    # Enhanced routing fields
    address_hint: Optional[str] = None
    neighborhood: Optional[str] = None
    target_location: Optional[str] = None
    enhanced_search_query: Optional[str] = None

class GoogleMapsLocation(BaseModel):
    """Location enhanced with Google Maps data"""
    # Tavily data
    name: str
    description: str
    tavily_url: str
    research_score: int
    address: str
    
    # Google Maps data
    place_id: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    rating: Optional[float] = None
    photos: List[str] = []
    reviews: List[Dict] = []

class AdventureOption(BaseModel):
    """Complete adventure itinerary"""
    title: str
    tagline: str
    description: str
    duration: int
    cost: float
    steps: List[Dict]
    locations: List[GoogleMapsLocation]
    map_url: Optional[str] = None
    routing_info: Optional[Dict] = None
    reasoning: str

# ========================================
# SAVED ADVENTURE MODELS
# ========================================

class SaveAdventureRequest(BaseModel):
    """Request to save an adventure"""
    adventure_data: Dict = Field(..., description="Complete adventure data")
    rating: Optional[int] = Field(None, ge=1, le=5, description="User rating (1-5)")
    notes: Optional[str] = Field(None, max_length=1000, description="User notes about the adventure")
    tags: Optional[List[str]] = Field(default=[], description="Custom tags for categorization")

class UpdateAdventureRequest(BaseModel):
    """Request to update a saved adventure"""
    rating: Optional[int] = Field(None, ge=1, le=5, description="Updated rating (1-5)")
    notes: Optional[str] = Field(None, max_length=1000, description="Updated notes")
    tags: Optional[List[str]] = Field(None, description="Updated tags")
    completed: Optional[bool] = Field(None, description="Mark as completed/incomplete")
    completed_at: Optional[datetime] = Field(None, description="Completion timestamp")

class SavedAdventureResponse(BaseModel):
    """Response for a saved adventure"""
    id: str = Field(..., alias="_id", description="Adventure ID")
    user_id: str
    adventure_data: Dict
    rating: Optional[int] = None
    notes: Optional[str] = None
    tags: List[str] = []
    saved_at: datetime
    completed: bool = False
    completed_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True

class SavedAdventureListResponse(BaseModel):
    """Response for list of saved adventures"""
    success: bool
    adventures: List[SavedAdventureResponse]
    total: int
    filter_applied: Optional[str] = None

class SaveAdventureResponse(BaseModel):
    """Response after saving an adventure"""
    success: bool
    adventure_id: str
    message: str

class DeleteAdventureResponse(BaseModel):
    """Response after deleting an adventure"""
    success: bool
    message: str

# ========================================
# PERSONALIZATION MODELS
# ========================================

class UserPersonalizationInsights(BaseModel):
    """User personalization insights from saved adventures"""
    has_history: bool
    total_adventures: int = 0
    average_rating: float = 0.0
    favorite_locations: List[str] = []
    favorite_themes: List[str] = []
    preferred_duration_range: Optional[Dict[str, int]] = None
    preferred_budget_range: Optional[Dict[str, float]] = None
    recommendations: List[str] = []

class PersonalizationResponse(BaseModel):
    """Response for personalization insights"""
    success: bool
    insights: UserPersonalizationInsights

# ========================================
# ADVENTURE STATISTICS MODELS
# ========================================

class AdventureStats(BaseModel):
    """Statistics for a user's adventure history"""
    total_saved: int
    total_completed: int
    completion_rate: float
    average_rating: float
    most_visited_location: Optional[str] = None
    favorite_adventure_type: Optional[str] = None
    total_distance_traveled: Optional[float] = None  # in miles/km
    last_adventure_date: Optional[datetime] = None

class AdventureStatsResponse(BaseModel):
    """Response for adventure statistics"""
    success: bool
    stats: AdventureStats

# ========================================
# ADVENTURE SEARCH MODELS
# ========================================

class AdventureSearchQuery(BaseModel):
    """Search query for saved adventures"""
    location: Optional[str] = None
    tags: Optional[List[str]] = None
    min_rating: Optional[int] = Field(None, ge=1, le=5)
    completed: Optional[bool] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    limit: int = Field(20, ge=1, le=100)
    offset: int = Field(0, ge=0)

class AdventureSearchResponse(BaseModel):
    """Response for adventure search"""
    success: bool
    adventures: List[SavedAdventureResponse]
    total: int
    limit: int
    offset: int
    has_more: bool

# ========================================
# ADVENTURE SHARING MODELS (Future Feature)
# ========================================

class ShareAdventureRequest(BaseModel):
    """Request to share an adventure"""
    adventure_id: str
    share_with: Optional[List[str]] = Field(None, description="List of user IDs to share with")
    public: bool = Field(False, description="Make adventure publicly visible")
    share_notes: Optional[str] = Field(None, max_length=500)

class SharedAdventureResponse(BaseModel):
    """Response for shared adventure"""
    success: bool
    share_id: str
    share_url: Optional[str] = None
    message: str

# ========================================
# ADVENTURE RECOMMENDATION MODELS
# ========================================

class AdventureRecommendationRequest(BaseModel):
    """Request for personalized adventure recommendations"""
    location: str
    max_recommendations: int = Field(5, ge=1, le=10)
    include_similar_to: Optional[str] = Field(None, description="Adventure ID to find similar to")

class AdventureRecommendation(BaseModel):
    """Single adventure recommendation"""
    adventure_data: Dict
    similarity_score: float = Field(..., ge=0.0, le=1.0)
    reasoning: str
    personalization_factors: List[str] = []

class AdventureRecommendationResponse(BaseModel):
    """Response for adventure recommendations"""
    success: bool
    recommendations: List[AdventureRecommendation]
    personalization_applied: bool
    message: str