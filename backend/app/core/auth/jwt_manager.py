# backend/app/core/auth/jwt_manager.py
"""JWT token creation and validation"""

from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional, Dict
import logging

logger = logging.getLogger(__name__)

class JWTManager:
    """Handles JWT token creation and validation"""
    
    def __init__(self, secret_key: str, algorithm: str = "HS256"):
        """
        Initialize JWT manager.
        
        Args:
            secret_key: Secret key for JWT encoding/decoding
            algorithm: JWT algorithm (default: HS256)
        """
        self.secret_key = secret_key
        self.algorithm = algorithm
        logger.info("✅ JWTManager initialized")
    
    def create_access_token(
        self, 
        data: Dict, 
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """
        Create a JWT access token.
        
        Args:
            data: Payload data to encode in token
            expires_delta: Optional expiration time delta
            
        Returns:
            Encoded JWT token string
        """
        to_encode = data.copy()
        
        # Set expiration time
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=15)
        
        to_encode.update({"exp": expire})
        
        # Encode token
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        
        return encoded_jwt
    
    def decode_token(self, token: str) -> Optional[Dict]:
        """
        Decode and validate a JWT token.
        
        Args:
            token: JWT token string to decode
            
        Returns:
            Decoded payload dict if valid, None if invalid
        """
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except JWTError as e:
            logger.warning(f"JWT decode error: {e}")
            return None
    
    def verify_token(self, token: str) -> bool:
        """
        Verify if a JWT token is valid.
        
        Args:
            token: JWT token string to verify
            
        Returns:
            True if token is valid, False otherwise
        """
        payload = self.decode_token(token)
        return payload is not None
    
    def extract_user_id(self, token: str) -> Optional[str]:
        """
        Extract user_id from token payload.
        
        Args:
            token: JWT token string
            
        Returns:
            User ID if found, None otherwise
        """
        payload = self.decode_token(token)
        if payload:
            return payload.get("user_id")
        return None
    
    def extract_email(self, token: str) -> Optional[str]:
        """
        Extract email from token payload.
        
        Args:
            token: JWT token string
            
        Returns:
            Email if found, None otherwise
        """
        payload = self.decode_token(token)
        if payload:
            return payload.get("sub")
        return None