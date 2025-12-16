# backend/app/core/progress_tracker.py
"""Real-time progress tracking for multi-agent workflow"""

import asyncio
from typing import Optional, Callable
import logging

logger = logging.getLogger(__name__)

class ProgressTracker:
    """
    Tracks progress through multi-agent workflow.
    
    Usage:
        tracker = ProgressTracker()
        await tracker.update("parse_location", "Parsing location...", 1, 7)
    """
    
    def __init__(self):
        self.current_step = 0
        self.total_steps = 7
        self.current_agent = ""
        self.current_message = ""
        self.callbacks = []
        
    def add_callback(self, callback: Callable):
        """Add a callback to be called on progress updates"""
        self.callbacks.append(callback)
    
    async def update(self, agent_name: str, message: str, step: int, total: int):
        """Update progress"""
        self.current_agent = agent_name
        self.current_message = message
        self.current_step = step
        self.total_steps = total
        
        progress_data = {
            "agent": agent_name,
            "message": message,
            "step": step,
            "total": total,
            "percentage": int((step / total) * 100)
        }
        
        logger.info(f"📊 Progress: [{step}/{total}] {agent_name}: {message}")
        
        # Call all registered callbacks
        for callback in self.callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(progress_data)
                else:
                    callback(progress_data)
            except Exception as e:
                logger.error(f"Progress callback error: {e}")
    
    def get_current_state(self) -> dict:
        """Get current progress state"""
        return {
            "agent": self.current_agent,
            "message": self.current_message,
            "step": self.current_step,
            "total": self.total_steps,
            "percentage": int((self.current_step / self.total_steps) * 100) if self.total_steps > 0 else 0
        }