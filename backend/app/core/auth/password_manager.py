# backend/app/core/auth/password_manager.py
"""Password hashing and verification"""

from passlib.context import CryptContext
import logging

logger = logging.getLogger(__name__)

class PasswordManager:
    """Handles password hashing and verification using bcrypt"""
    
    def __init__(self):
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        logger.info("✅ PasswordManager initialized")
    
    def hash_password(self, password: str) -> str:
        """
        Hash a plain password using bcrypt.
        
        Args:
            password: Plain text password
            
        Returns:
            Hashed password string
        """
        return self.pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """
        Verify a plain password against a hashed password.
        
        Args:
            plain_password: Plain text password to verify
            hashed_password: Hashed password to compare against
            
        Returns:
            True if password matches, False otherwise
        """
        return self.pwd_context.verify(plain_password, hashed_password)
    
    def needs_rehash(self, hashed_password: str) -> bool:
        """
        Check if a hashed password needs to be rehashed.
        Useful for password migrations.
        
        Args:
            hashed_password: Hashed password to check
            
        Returns:
            True if password should be rehashed
        """
        return self.pwd_context.needs_update(hashed_password)