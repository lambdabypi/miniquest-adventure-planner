# backend/app/core/auth/auth_handler.py
"""Clean authentication handler - orchestration only"""

from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timedelta
from typing import Optional, Dict
import logging

from .password_manager import PasswordManager
from .jwt_manager import JWTManager
from ...database.mongodb_client import MongoDBClient
from ...models.auth_models import User, UserCreate, UserLogin, Token
from ..config import settings

logger = logging.getLogger(__name__)

# Security
security = HTTPBearer()

class AuthHandler:
    """
    Clean authentication handler - orchestrates password and JWT managers.
    
    Responsibilities:
    - User registration
    - User authentication
    - Current user retrieval from token
    """
    
    def __init__(self, mongodb_client: MongoDBClient):
        """
        Initialize authentication handler.
        
        Args:
            mongodb_client: MongoDB client for user data
        """
        self.mongodb_client = mongodb_client
        
        # Initialize managers
        self.password_manager = PasswordManager()
        self.jwt_manager = JWTManager(
            secret_key=settings.get_jwt_secret_key(),
            algorithm=settings.JWT_ALGORITHM
        )
        
        logger.info("✅ AuthHandler initialized")
    
    async def register_user(self, user_create: UserCreate) -> Dict:
        """
        Register a new user.
        
        Args:
            user_create: User registration data
            
        Returns:
            Dict with access token and user info
            
        Raises:
            HTTPException: If user already exists or registration fails
        """
        try:
            # Check if user exists
            existing_user = await self.mongodb_client.get_user_by_email(user_create.email)
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User with this email already exists"
                )
            
            # Hash password
            hashed_password = self.password_manager.hash_password(user_create.password)
            
            # Create user data
            user_data = self._build_user_data(user_create, hashed_password)
            
            # Store in MongoDB
            user_id = await self.mongodb_client.create_user(user_data)
            
            # Create access token
            access_token = self._create_token_for_user(
                user_data["email"], 
                str(user_id)
            )
            
            logger.info(f"✅ User registered: {user_create.email}")
            
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "user": self._format_user_response(user_data, user_id)
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Registration error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Registration failed"
            )
    
    async def authenticate_user(self, user_login: UserLogin) -> Dict:
        """
        Authenticate a user and return token.
        
        Args:
            user_login: User login credentials
            
        Returns:
            Dict with access token and user info
            
        Raises:
            HTTPException: If credentials are invalid
        """
        try:
            # Get user from database
            user = await self.mongodb_client.get_user_by_email(user_login.email)
            
            # Verify user exists and password is correct
            if not user or not self.password_manager.verify_password(
                user_login.password, 
                user["hashed_password"]
            ):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect email or password",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            # Check if user is active
            if not user.get("is_active", True):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Inactive user"
                )
            
            # Create access token
            access_token = self._create_token_for_user(
                user["email"], 
                str(user["_id"])
            )
            
            logger.info(f"✅ User authenticated: {user_login.email}")
            
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "user": self._format_user_response(user, user["_id"])
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication failed"
            )
    
    async def get_current_user(
        self, 
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ) -> Dict:
        """
        Get current user from JWT token.
        
        Args:
            credentials: HTTP Bearer credentials with JWT token
            
        Returns:
            Dict with current user information
            
        Raises:
            HTTPException: If token is invalid or user not found
        """
        try:
            # Decode token
            token = credentials.credentials
            email = self.jwt_manager.extract_email(token)
            user_id = self.jwt_manager.extract_user_id(token)
            
            if not email or not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Could not validate credentials",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            # Get user from database
            user = await self.mongodb_client.get_user_by_email(email)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Could not validate credentials",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            return self._format_user_response(user, user["_id"])
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Get current user error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    # ========================================
    # PRIVATE HELPER METHODS
    # ========================================
    
    def _build_user_data(self, user_create: UserCreate, hashed_password: str) -> Dict:
        """Build user data dictionary for storage"""
        return {
            "email": user_create.email,
            "username": user_create.username,
            "full_name": user_create.full_name,
            "hashed_password": hashed_password,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "adventure_count": 0,
            "preferences": {
                "default_location": "Boston, MA",
                "default_budget": 50.0,
                "preferred_activities": []
            }
        }
    
    def _create_token_for_user(self, email: str, user_id: str) -> str:
        """Create JWT token for user"""
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        return self.jwt_manager.create_access_token(
            data={"sub": email, "user_id": user_id},
            expires_delta=access_token_expires
        )
    
    def _format_user_response(self, user: Dict, user_id: any) -> Dict:
        """Format user data for response"""
        return {
            "id": str(user_id),
            "email": user["email"],
            "username": user["username"],
            "full_name": user["full_name"],
            "adventure_count": user.get("adventure_count", 0),
            "preferences": user.get("preferences", {})
        }