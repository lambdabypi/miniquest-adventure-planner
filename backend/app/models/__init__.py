# backend/app/models/__init__.py
"""Models module exports"""

from .api_models import (
    AdventureRequest,
    AdventureResponse,
    SystemStatus,
    TestResponse
)
from .auth_models import (
    UserBase,
    UserCreate,
    UserLogin,
    User,
    Token
)
from .adventure_models import (
    # Adventure generation models
    AdventureParams,
    TavilyLocation,
    GoogleMapsLocation,
    AdventureOption,
    
    # Saved adventure request/response models
    SaveAdventureRequest,
    UpdateAdventureRequest,
    SavedAdventureResponse,
    SavedAdventureListResponse,
    SaveAdventureResponse,
    DeleteAdventureResponse,
    
    # Personalization models
    UserPersonalizationInsights,
    PersonalizationResponse,
    
    # Statistics models
    AdventureStats,
    AdventureStatsResponse,
    
    # Search models
    AdventureSearchQuery,
    AdventureSearchResponse,
    
    # Sharing models (future)
    ShareAdventureRequest,
    SharedAdventureResponse,
    
    # Recommendation models
    AdventureRecommendationRequest,
    AdventureRecommendation,
    AdventureRecommendationResponse
)
from .chat_models import (
    ChatMessage,
    SaveConversationRequest,
    UpdateConversationRequest,
    ConversationMetadata,
    Conversation,
    ConversationResponse
)

__all__ = [
    # ========================================
    # API MODELS
    # ========================================
    'AdventureRequest',
    'AdventureResponse',
    'SystemStatus',
    'TestResponse',
    
    # ========================================
    # AUTH MODELS
    # ========================================
    'UserBase',
    'UserCreate',
    'UserLogin',
    'User',
    'Token',
    
    # ========================================
    # ADVENTURE GENERATION MODELS
    # ========================================
    'AdventureParams',
    'TavilyLocation',
    'GoogleMapsLocation',
    'AdventureOption',
    
    # ========================================
    # SAVED ADVENTURE MODELS
    # ========================================
    'SaveAdventureRequest',
    'UpdateAdventureRequest',
    'SavedAdventureResponse',
    'SavedAdventureListResponse',
    'SaveAdventureResponse',
    'DeleteAdventureResponse',
    
    # ========================================
    # PERSONALIZATION MODELS
    # ========================================
    'UserPersonalizationInsights',
    'PersonalizationResponse',
    
    # ========================================
    # STATISTICS MODELS
    # ========================================
    'AdventureStats',
    'AdventureStatsResponse',
    
    # ========================================
    # SEARCH MODELS
    # ========================================
    'AdventureSearchQuery',
    'AdventureSearchResponse',
    
    # ========================================
    # SHARING MODELS (Future Feature)
    # ========================================
    'ShareAdventureRequest',
    'SharedAdventureResponse',
    
    # ========================================
    # RECOMMENDATION MODELS
    # ========================================
    'AdventureRecommendationRequest',
    'AdventureRecommendation',
    'AdventureRecommendationResponse',
    
    # ========================================
    # CHAT MODELS
    # ========================================
    'ChatMessage',
    'SaveConversationRequest',
    'UpdateConversationRequest',
    'ConversationMetadata',
    'Conversation',
    'ConversationResponse',
]