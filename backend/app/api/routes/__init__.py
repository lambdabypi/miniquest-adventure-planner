# backend/app/api/routes/__init__.py
"""API routes exports"""

from .adventures import router as adventures_router
from .system import router as system_router
from .testing import router as testing_router
from .auth import router as auth_router, get_current_user
from .analytics import router as analytics_router
from .chat import router as chat_router
from .saved_adventures import router as saved_adventures_router

__all__ = [
    'adventures_router',
    'system_router',
    'testing_router',
    'auth_router',
    'analytics_router',
    'chat_router',
    'saved_adventures_router',
    'get_current_user',
]