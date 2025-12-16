# backend/app/api/routes/auth.py
"""Authentication endpoints"""

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict
import logging

from ...models.auth_models import UserCreate, UserLogin, Token
from ...core.auth import AuthHandler
from ..dependencies import get_mongodb_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["authentication"])

# ✨ Security scheme
security = HTTPBearer()

# ========================================
# ✨ DEPENDENCY: Get Current User
# ========================================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    mongodb_client = Depends(get_mongodb_client)
) -> Dict:
    """
    Dependency to get current authenticated user.
    
    Returns dict with:
    - user_id: str
    - email: str
    - username: str
    - etc.
    """
    try:
        auth_handler = AuthHandler(mongodb_client)
        user = await auth_handler.get_current_user(credentials)
        
        # ✨ CRITICAL: Ensure user_id is present
        if "id" in user and "user_id" not in user:
            user["user_id"] = user["id"]  # Add user_id alias
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Get current user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

# ========================================
# ROUTES
# ========================================

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(
    user_create: UserCreate,
    mongodb_client = Depends(get_mongodb_client)
):
    """
    Register a new user.
    
    Args:
        user_create: User registration data
        mongodb_client: MongoDB client (injected)
        
    Returns:
        Token with access token and user info
    """
    try:
        logger.info(f"📝 Registration request: {user_create.email}")
        
        # Initialize auth handler
        auth_handler = AuthHandler(mongodb_client)
        
        # Register user
        result = await auth_handler.register_user(user_create)
        
        logger.info(f"✅ User registered: {user_create.email}")
        
        return Token(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=Token)
async def login(
    user_login: UserLogin,
    mongodb_client = Depends(get_mongodb_client)
):
    """
    Authenticate user and return token.
    
    Args:
        user_login: User login credentials
        mongodb_client: MongoDB client (injected)
        
    Returns:
        Token with access token and user info
    """
    try:
        logger.info(f"🔐 Login request: {user_login.email}")
        
        # Initialize auth handler
        auth_handler = AuthHandler(mongodb_client)
        
        # Authenticate user
        result = await auth_handler.authenticate_user(user_login)
        
        logger.info(f"✅ User authenticated: {user_login.email}")
        
        return Token(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

@router.post("/logout")
async def logout():
    """Logout endpoint (client-side token removal)"""
    return {
        "message": "Logout successful",
        "detail": "Please remove token from client storage"
    }

@router.get("/me")
async def get_me(current_user: Dict = Depends(get_current_user)):
    """
    Get current authenticated user.
    
    Returns:
        Current user information
    """
    return current_user