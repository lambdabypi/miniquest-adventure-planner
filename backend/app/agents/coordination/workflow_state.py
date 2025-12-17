# backend/app/agents/coordination/workflow_state.py
"""Workflow state definition for LangGraph - WITH PROGRESS TRACKING"""

from typing import TypedDict, List, Dict, Optional

class AdventureState(TypedDict, total=False):
    """State passed through the LangGraph workflow - WITH REAL-TIME PROGRESS"""
    
    # User inputs
    user_input: str
    user_address: Optional[str]
    user_id: Optional[str]
    
    # Parsed data
    target_location: Optional[str]
    location_parsing_info: Optional[Dict]
    parsed_preferences: Optional[Dict]
    user_personalization: Optional[Dict]
    
    # Agent outputs
    scouted_venues: List[Dict]
    researched_venues: List[Dict]
    enhanced_locations: List[Dict]
    final_adventures: List[Dict]
    
    # Metadata
    metadata: Dict
    error: Optional[Dict]
    performance_metrics: Optional[Dict]
    
    # ✅ NEW: Real-time progress tracking
    progress_updates: List[Dict]  # Stream of progress events
    current_step: Optional[str]   # Current step name
    current_agent: Optional[str]  # Current agent name
    step_progress: Optional[Dict] # Detailed step progress