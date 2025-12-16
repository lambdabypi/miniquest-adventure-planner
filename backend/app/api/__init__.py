# backend/app/api/__init__.py
"""API module exports"""

from .dependencies import (
    set_coordinator, 
    get_coordinator, 
    set_mongodb_client, 
    get_mongodb_client,
    set_rag_system,  # ✨ ADD THIS
    get_rag_system   # ✨ ADD THIS
)
from .routes import (
    adventures_router, 
    system_router, 
    testing_router, 
    auth_router, 
    analytics_router, 
    chat_router, 
    saved_adventures_router
)

__all__ = [
    'set_coordinator',
    'get_coordinator',
    'set_mongodb_client',
    'get_mongodb_client',
    'set_rag_system',        # ✨ ADD THIS
    'get_rag_system',        # ✨ ADD THIS
    'adventures_router',
    'system_router',
    'testing_router',
    'auth_router',
    'analytics_router',
    'chat_router',
    'saved_adventures_router'
]