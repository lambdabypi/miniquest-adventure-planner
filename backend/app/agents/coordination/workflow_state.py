# backend/app/agents/coordination/workflow_state.py
"""Workflow state definition for LangGraph"""

from typing import TypedDict, List, Dict, Optional


class AdventureState(TypedDict, total=False):
    """State passed through the LangGraph workflow"""

    # ── User inputs ───────────────────────────────────────────────────────────
    user_input: str
    user_address: Optional[str]
    user_id: Optional[str]
    request_time: Optional[str]          # ISO local time from the frontend

    # ── Generation options (diversity / stop count) ───────────────────────────
    generation_options: Optional[Dict]

    # ── Parsed data ───────────────────────────────────────────────────────────
    target_location: Optional[str]
    location_parsing_info: Optional[Dict]
    parsed_preferences: Optional[Dict]
    user_personalization: Optional[Dict]

    # ── Agent outputs ─────────────────────────────────────────────────────────
    scouted_venues: List[Dict]
    researched_venues: List[Dict]
    enhanced_locations: List[Dict]
    final_adventures: List[Dict]

    # ── Metadata ──────────────────────────────────────────────────────────────
    metadata: Dict
    error: Optional[Dict]
    performance_metrics: Optional[Dict]

    # ── Real-time progress tracking ───────────────────────────────────────────
    progress_updates: List[Dict]
    current_step: Optional[str]
    current_agent: Optional[str]
    step_progress: Optional[Dict]