# backend/app/agents/__init__.py
"""
Agents module - Multi-agent system for adventure planning.

This module contains all agents organized by responsibility:
- Base: Foundation classes for all agents
- Coordination: LangGraph workflow orchestration
- Creation: Adventure creation logic
- Intent: User intent parsing
- Location: Location parsing and resolution
- Research: Tavily-based venue research
- Routing: Google Maps routing and enhancement
- Scouting: OpenAI-based venue scouting
"""

# Base agent
from .base import BaseAgent, ProcessingError

# Coordination (LangGraph workflow)
from .coordination import LangGraphCoordinator, AdventureState

# Individual agents
from .creation import AdventureCreatorAgent
from .intent import IntentParserAgent
from .location import LocationParserAgent
from .research import TavilyResearchAgent, QueryStrategyAgent, VenueTypeDetector
from .routing import EnhancedRoutingAgent
from .scouting import VenueScoutAgent

# Legacy agents (for backward compatibility - can be removed later)
from .google_maps_enhancer import GoogleMapsEnhancer

__all__ = [
    # Base
    'BaseAgent',
    'ProcessingError',
    
    # Coordination
    'LangGraphCoordinator',
    'AdventureState',
    
    # Core agents
    'AdventureCreatorAgent',
    'IntentParserAgent',
    'LocationParserAgent',
    'TavilyResearchAgent',
    'QueryStrategyAgent',
    'VenueTypeDetector',
    'EnhancedRoutingAgent',
    'VenueScoutAgent',
    
    # Legacy (backward compatibility)
    'GoogleMapsEnhancer',
]