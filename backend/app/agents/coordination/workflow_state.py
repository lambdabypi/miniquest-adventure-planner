# backend/app/agents/coordination/workflow_state.py
"""Workflow state definition for LangGraph - OPTIMIZED"""

from typing import TypedDict, List, Dict, Optional

class AdventureState(TypedDict, total=False):
    """State passed through the LangGraph workflow - OPTIMIZED with performance tracking"""
    
    # User inputs
    user_input: str
    user_address: Optional[str]
    user_id: Optional[str]  # For personalization
    
    # Parsed data
    target_location: Optional[str]
    location_parsing_info: Optional[Dict]
    parsed_preferences: Optional[Dict]
    user_personalization: Optional[Dict]  # RAG personalization data
    
    # Agent outputs
    scouted_venues: List[Dict]
    researched_venues: List[Dict]
    enhanced_locations: List[Dict]
    final_adventures: List[Dict]
    
    # Metadata
    metadata: Dict
    error: Optional[Dict]
    
    # ✅ NEW: Performance tracking
    performance_metrics: Optional[Dict]