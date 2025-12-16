# backend/app/database/repositories/user_repository.py
"""Repository for user-related database operations"""

from typing import Dict, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class UserRepository:
    """Handles user-related database operations"""
    
    def __init__(self, db):
        """
        Initialize user repository.
        
        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.collection = db["users"]
    
    async def create_user(self, user_data: Dict) -> str:
        """
        Create a new user.
        
        Args:
            user_data: User data dictionary
            
        Returns:
            User ID string
        """
        try:
            result = await self.collection.insert_one(user_data)
            user_id = str(result.inserted_id)
            logger.info(f"✅ User created: {user_id}")
            return user_id
            
        except Exception as e:
            logger.error(f"❌ Error creating user: {e}")
            raise
    
    async def get_user_by_email(self, email: str) -> Optional[Dict]:
        """
        Get user by email.
        
        Args:
            email: User email
            
        Returns:
            User dictionary or None
        """
        try:
            user = await self.collection.find_one({"email": email})
            return user
            
        except Exception as e:
            logger.error(f"❌ Error getting user: {e}")
            return None
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        """
        Get user by ID.
        
        Args:
            user_id: User ID
            
        Returns:
            User dictionary or None
        """
        try:
            from bson import ObjectId
            user = await self.collection.find_one({"_id": ObjectId(user_id)})
            return user
            
        except Exception as e:
            logger.error(f"❌ Error getting user: {e}")
            return None
    
    async def update_user_stats(self, user_id: str, adventures_generated: int):
        """
        Update user statistics.
        
        Args:
            user_id: User ID
            adventures_generated: Number of adventures generated
        """
        if not user_id or user_id == "anonymous":
            return
        
        try:
            await self.collection.update_one(
                {"user_id": user_id},
                {
                    "$inc": {
                        "total_queries": 1,
                        "total_adventures_generated": adventures_generated
                    },
                    "$set": {
                        "last_query_at": datetime.now()
                    },
                    "$setOnInsert": {
                        "created_at": datetime.now(),
                        "first_query_at": datetime.now()
                    }
                },
                upsert=True
            )
            
            logger.info(f"✅ User stats updated: {user_id}")
            
        except Exception as e:
            logger.error(f"❌ Error updating user stats: {e}")
    
    async def get_user_stats(self, user_id: str) -> Optional[Dict]:
        """
        Get user statistics.
        
        Args:
            user_id: User ID
            
        Returns:
            User stats dictionary or None
        """
        try:
            stats = await self.collection.find_one({"user_id": user_id})
            if stats:
                stats["_id"] = str(stats["_id"])
            return stats
            
        except Exception as e:
            logger.error(f"❌ Error getting user stats: {e}")
            return None
    
    async def delete_user_data(self, user_id: str) -> Dict:
        """
        Delete all user data (GDPR compliance).
        
        Args:
            user_id: User ID
            
        Returns:
            Deletion summary dictionary
        """
        try:
            result = await self.collection.delete_many({"user_id": user_id})
            
            return {
                "user_id": user_id,
                "deleted_at": datetime.now().isoformat(),
                "records_deleted": result.deleted_count,
                "success": True
            }
            
        except Exception as e:
            logger.error(f"❌ Error deleting user data: {e}")
            return {"error": str(e), "success": False}