# backend/app/database/connection.py
"""Database connection management"""

from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class DatabaseConnection:
    """Manages MongoDB connection lifecycle"""
    
    def __init__(self, mongodb_url: str):
        """
        Initialize database connection.
        
        Args:
            mongodb_url: MongoDB connection URL
        """
        self.mongodb_url = mongodb_url
        self.client: Optional[AsyncIOMotorClient] = None
        self.db = None
        self._connected = False  # ✅ Add explicit connection flag
    
    async def connect(self, database_name: str = "miniquest_dev"):
        """
        Connect to MongoDB.
        
        Args:
            database_name: Name of the database to use
        """
        try:
            self.client = AsyncIOMotorClient(self.mongodb_url)
            
            # Test connection
            await self.client.admin.command('ping')
            
            # Get database
            self.db = self.client[database_name]
            self._connected = True  # ✅ Set flag
            
            logger.info(f"✅ MongoDB connected: {database_name}")
            
        except Exception as e:
            logger.error(f"❌ MongoDB connection failed: {e}")
            self._connected = False  # ✅ Clear flag on failure
            raise
    
    async def close(self):
        """Close MongoDB connection"""
        if self.client is not None:  # ✅ Check against None, not truthiness
            self.client.close()
            self._connected = False
            logger.info("✅ MongoDB connection closed")
    
    def get_database(self):
        """Get database instance"""
        # ✅ FIXED: Check connection flag instead of db truthiness
        if not self._connected or self.db is None:
            raise RuntimeError("Database not connected. Call connect() first.")
        return self.db
    
    async def is_connected(self) -> bool:
        """Check if database is connected"""
        if self.client is None:
            return False
        
        try:
            await self.client.admin.command('ping')
            return True
        except:
            return False