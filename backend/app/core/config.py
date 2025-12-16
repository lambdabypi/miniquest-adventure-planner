# backend/app/core/config.py
"""Application configuration with smart environment detection"""

from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    """Application settings with automatic Docker/local detection"""
    
    # ========================================
    # REQUIRED API KEYS
    # ========================================
    OPENAI_API_KEY: str
    TAVILY_API_KEY: str
    
    # ========================================
    # OPTIONAL ENHANCEMENTS
    # ========================================
    GOOGLE_MAPS_KEY: Optional[str] = None
    
    # ========================================
    # DATABASE - Smart defaults with auto-detection
    # ========================================
    MONGODB_URL: str = "mongodb://admin:password123@mongodb:27017/miniquest?authSource=admin"
    REDIS_URL: str = "redis://redis:6379"
    
    # ========================================
    # APP SETTINGS
    # ========================================
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    
    # ========================================
    # AUTH SETTINGS
    # ========================================
    JWT_SECRET_KEY: Optional[str] = None
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # ========================================
    # RAG SETTINGS
    # ========================================
    CHROMADB_PATH: str = "./chromadb"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"
    
    def get_jwt_secret_key(self) -> str:
        """Get or generate JWT secret key"""
        if self.JWT_SECRET_KEY:
            return self.JWT_SECRET_KEY
        
        import secrets
        return secrets.token_urlsafe(32)
    
    @property
    def is_production(self) -> bool:
        """Check if running in production"""
        return self.ENVIRONMENT.lower() == "production"
    
    @property
    def is_development(self) -> bool:
        """Check if running in development"""
        return self.ENVIRONMENT.lower() == "development"
    
    @property
    def is_docker(self) -> bool:
        """
        Detect if running inside Docker container.
        Useful for environment-specific logic.
        """
        return os.path.exists('/.dockerenv') or os.path.exists('/run/.containerenv')
    
    def get_mongodb_url(self) -> str:
        """
        Get MongoDB URL with smart host detection.
        
        Returns:
            MongoDB URL appropriate for the environment
        """
        # If explicitly set in .env, use that
        if self.MONGODB_URL and not self.MONGODB_URL.startswith("mongodb://admin:password123@mongodb"):
            return self.MONGODB_URL
        
        # Auto-detect and adjust host
        if self.is_docker:
            # Inside Docker: use service name
            return "mongodb://admin:password123@mongodb:27017/miniquest?authSource=admin"
        else:
            # Local development: use localhost
            return "mongodb://admin:password123@localhost:27017/miniquest?authSource=admin"
    
    def get_redis_url(self) -> str:
        """
        Get Redis URL with smart host detection.
        
        Returns:
            Redis URL appropriate for the environment
        """
        # If explicitly set in .env, use that
        if self.REDIS_URL and not self.REDIS_URL.startswith("redis://redis"):
            return self.REDIS_URL
        
        # Auto-detect and adjust host
        if self.is_docker:
            return "redis://redis:6379"
        else:
            return "redis://localhost:6379"

settings = Settings()