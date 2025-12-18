# backend/app/agents/research/__init__.py
"""Research module exports"""

from .discovery_agent import TavilyResearchAgent
from .query_strategy import QueryStrategyAgent, VenueTypeDetector
from .research_summary_agent import ResearchSummaryAgent

__all__ = [
    'TavilyResearchAgent',
    'QueryStrategyAgent',
    'VenueTypeDetector',
	'ResearchSummaryAgent',
]