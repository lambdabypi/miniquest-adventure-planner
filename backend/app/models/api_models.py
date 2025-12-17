# backend/app/models/api_models.py
"""API request/response models"""

from pydantic import BaseModel
from typing import List, Dict, Optional

class AdventureRequest(BaseModel):
    """Adventure generation request"""
    user_input: str
    user_address: Optional[str] = None
    preferences: Optional[Dict] = None
    enable_progress: bool = False  # ✅ NEW: Enable progress tracking
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_input": "I want to visit coffee shops and museums in Boston",
                "user_address": "123 Main St, Boston, MA",
                "preferences": {"budget": 50, "time_available": 120},
                "enable_progress": True
            }
        }

class AdventureResponse(BaseModel):
    """Adventure generation response"""
    success: bool
    adventures: List[Dict]
    metadata: Dict
    message: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "adventures": [],
                "metadata": {
                    "total_adventures": 3,
                    "progress_tracking_enabled": True,
                    "progress_log": []
                },
                "message": "Generated 3 adventures successfully"
            }
        }

class SystemStatus(BaseModel):
    """System status response"""
    status: str
    features: Dict[str, bool]
    api_keys: Dict[str, str]
    coordinator_ready: bool
    timestamp: str

class TestResponse(BaseModel):
    """Generic test response"""
    test_name: str
    success: bool
    message: str
    details: Optional[Dict] = None