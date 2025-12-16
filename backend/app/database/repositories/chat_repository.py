# backend/app/database/repositories/chat_repository.py
"""Repository for chat conversation history operations"""

from typing import Dict, List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ChatRepository:
    """Handles chat conversation history database operations"""
    
    def __init__(self, db):
        """
        Initialize chat repository.
        
        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.collection = db["chat_conversations"]
    
    async def save_conversation(self, conversation_data: Dict) -> str:
        """
        Save a chat conversation.
        
        Args:
            conversation_data: Conversation data with messages
            
        Returns:
            Conversation ID string
        """
        try:
            # Add metadata
            conversation_data.update({
                "created_at": datetime.now(),
                "updated_at": datetime.now(),
                "message_count": len(conversation_data.get("messages", [])),
            })
            
            # Insert conversation
            result = await self.collection.insert_one(conversation_data)
            conversation_id = str(result.inserted_id)
            
            logger.info(f"✅ Chat conversation saved: {conversation_id}")
            return conversation_id
            
        except Exception as e:
            logger.error(f"❌ Error saving conversation: {e}")
            raise
    
    async def update_conversation(self, conversation_id: str, new_messages: List[Dict]) -> bool:
        """
        Append new messages to an existing conversation.
        
        Args:
            conversation_id: Conversation ID
            new_messages: List of new message dictionaries
            
        Returns:
            Success boolean
        """
        try:
            from bson import ObjectId
            
            result = await self.collection.update_one(
                {"_id": ObjectId(conversation_id)},
                {
                    "$push": {"messages": {"$each": new_messages}},
                    "$set": {"updated_at": datetime.now()},
                    "$inc": {"message_count": len(new_messages)}
                }
            )
            
            success = result.modified_count > 0
            if success:
                logger.info(f"✅ Updated conversation {conversation_id} with {len(new_messages)} messages")
            
            return success
            
        except Exception as e:
            logger.error(f"❌ Error updating conversation: {e}")
            return False
    
    async def get_conversation(self, conversation_id: str) -> Optional[Dict]:
        """
        Get a specific conversation by ID.
        
        Args:
            conversation_id: Conversation ID
            
        Returns:
            Conversation dictionary or None
        """
        try:
            from bson import ObjectId
            
            doc = await self.collection.find_one({"_id": ObjectId(conversation_id)})
            
            if doc:
                doc["_id"] = str(doc["_id"])
                return doc
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Error getting conversation: {e}")
            return None
    
    async def get_user_conversations(self, user_id: str, limit: int = 20) -> List[Dict]:
        """
        Get user's conversation history.
        
        Args:
            user_id: User ID
            limit: Maximum number of conversations to return
            
        Returns:
            List of conversation dictionaries
        """
        try:
            cursor = self.collection.find(
                {"user_id": user_id}
            ).sort("updated_at", -1).limit(limit)
            
            conversations = []
            async for doc in cursor:
                doc["_id"] = str(doc["_id"])
                # Don't return full message content, just metadata
                doc["preview"] = doc["messages"][-1]["content"][:100] if doc.get("messages") else ""
                doc.pop("messages", None)  # Remove full messages to save bandwidth
                conversations.append(doc)
            
            logger.info(f"✅ Retrieved {len(conversations)} conversations for user {user_id}")
            return conversations
            
        except Exception as e:
            logger.error(f"❌ Error getting user conversations: {e}")
            return []
    
    async def delete_conversation(self, conversation_id: str, user_id: str) -> bool:
        """
        Delete a conversation (with user ownership check).
        
        Args:
            conversation_id: Conversation ID
            user_id: User ID (for ownership verification)
            
        Returns:
            Success boolean
        """
        try:
            from bson import ObjectId
            
            result = await self.collection.delete_one({
                "_id": ObjectId(conversation_id),
                "user_id": user_id  # Ensure user owns the conversation
            })
            
            success = result.deleted_count > 0
            if success:
                logger.info(f"✅ Deleted conversation {conversation_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"❌ Error deleting conversation: {e}")
            return False