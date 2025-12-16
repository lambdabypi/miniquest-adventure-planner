# backend/app/database/mongodb_client.py
"""Clean MongoDB client - ONLY used collections"""

from pymongo import ASCENDING, DESCENDING, TEXT
from typing import Dict, List, Optional
import logging

from .connection import DatabaseConnection
from .repositories import QueryRepository, UserRepository, AnalyticsRepository, ChatRepository

logger = logging.getLogger(__name__)

class MongoDBClient:
    """
    Clean MongoDB client - orchestrates repositories.
    
    Responsibilities:
    - Connection management
    - Index creation (ONLY for used collections)
    - Repository coordination
    
    Collections Used:
    - user_queries: Lightweight query metadata
    - saved_adventures: User-saved full adventures
    - users: User accounts
    - chat_conversations: Chat history (NOT conversations)
    """
    
    def __init__(self, mongodb_url: str):
        """
        Initialize MongoDB client.
        
        Args:
            mongodb_url: MongoDB connection URL
        """
        self.connection = DatabaseConnection(mongodb_url)
        
        # Repositories (initialized after connection)
        self.query_repo: Optional[QueryRepository] = None
        self.user_repo: Optional[UserRepository] = None
        self.analytics_repo: Optional[AnalyticsRepository] = None
        self.chat_repo: Optional[ChatRepository] = None
    
    async def connect(self):
        """Connect to MongoDB and initialize repositories"""
        try:
            await self.connection.connect()
            
            db = self.connection.get_database()
            
            # Initialize repositories
            self.query_repo = QueryRepository(db)
            self.user_repo = UserRepository(db)
            self.analytics_repo = AnalyticsRepository(db)
            self.chat_repo = ChatRepository(db)
            
            # Create indexes
            await self._create_indexes(db)
            
            logger.info("✅ MongoDB client initialized")
            
        except Exception as e:
            logger.error(f"❌ MongoDB client initialization failed: {e}")
            raise
    
    async def close(self):
        """Close MongoDB connection"""
        await self.connection.close()
    
    async def _create_indexes(self, db):
        """Create database indexes - ONLY for collections we actually use"""
        try:
            # ========================================
            # USER QUERIES COLLECTION (Lightweight metadata)
            # ========================================
            logger.info("Creating indexes for user_queries (lightweight metadata)...")
            
            # Primary query index
            await db["user_queries"].create_index([
                ("user_id", ASCENDING),
                ("created_at", DESCENDING)
            ], name="user_queries_primary_idx")
            
            # Performance analytics index
            await db["user_queries"].create_index([
                ("metadata.performance.total_time_seconds", DESCENDING)
            ], name="user_queries_performance_idx")
            
            # Location analytics index
            await db["user_queries"].create_index([
                ("metadata.target_location", ASCENDING),
                ("created_at", DESCENDING)
            ], name="user_queries_location_idx")
            
            logger.info("✅ user_queries indexes created")
            
            # ========================================
            # SAVED ADVENTURES COLLECTION (User-saved full data)
            # ========================================
            logger.info("Creating indexes for saved_adventures (full adventure data)...")
            
            # Primary index
            await db["saved_adventures"].create_index([
                ("user_id", ASCENDING),
                ("saved_at", DESCENDING)
            ], name="saved_adventures_primary_idx")
            
            # Completion status index
            await db["saved_adventures"].create_index([
                ("user_id", ASCENDING),
                ("completed", ASCENDING),
                ("saved_at", DESCENDING)
            ], name="saved_adventures_completed_idx")
            
            # Rating index for filtering
            await db["saved_adventures"].create_index([
                ("user_id", ASCENDING),
                ("rating", DESCENDING)
            ], name="saved_adventures_rating_idx")
            
            # Location index for search
            await db["saved_adventures"].create_index([
                ("user_id", ASCENDING),
                ("metadata.location", ASCENDING)
            ], name="saved_adventures_location_idx")
            
            # Tags index for filtering
            await db["saved_adventures"].create_index([
                ("user_id", ASCENDING),
                ("tags", ASCENDING)
            ], name="saved_adventures_tags_idx")
            
            # Text search index
            await db["saved_adventures"].create_index([
                ("adventure_data.title", TEXT),
                ("adventure_data.description", TEXT),
                ("notes", TEXT)
            ], name="saved_adventures_text_search")
            
            # Date range queries
            await db["saved_adventures"].create_index([
                ("user_id", ASCENDING),
                ("saved_at", ASCENDING)
            ], name="saved_adventures_date_range_idx")
            
            # Updated timestamp index
            await db["saved_adventures"].create_index([
                ("updated_at", DESCENDING)
            ], name="saved_adventures_updated_idx")
            
            logger.info("✅ saved_adventures indexes created")
            
            # ========================================
            # USERS COLLECTION
            # ========================================
            logger.info("Creating indexes for users...")
            
            await db["users"].create_index(
                [("email", ASCENDING)], 
                unique=True,
                name="users_email_unique_idx"
            )
            
            await db["users"].create_index([
                ("username", ASCENDING)
            ], name="users_username_idx")
            
            logger.info("✅ users indexes created")
            
            # ========================================
            # CHAT CONVERSATIONS COLLECTION
            # ========================================
            logger.info("Creating indexes for chat_conversations...")
            
            await db["chat_conversations"].create_index([
                ("user_id", ASCENDING),
                ("updated_at", DESCENDING)
            ], name="chat_conversations_user_idx")
            
            await db["chat_conversations"].create_index([
                ("created_at", DESCENDING)
            ], name="chat_conversations_created_idx")
            
            logger.info("✅ chat_conversations indexes created")
            
            # ========================================
            # SUMMARY
            # ========================================
            logger.info("📊 MongoDB index summary:")
            logger.info("   ✅ user_queries: 3 indexes (lightweight metadata)")
            logger.info("   ✅ saved_adventures: 8 indexes (user-saved full data)")
            logger.info("   ✅ users: 2 indexes")
            logger.info("   ✅ chat_conversations: 2 indexes")
            
        except Exception as e:
            logger.error(f"⚠️ Error creating indexes: {e}")
    
    # ========================================
    # DELEGATE TO REPOSITORIES
    # ========================================
    
    # Query methods
    async def save_query(self, query_record: Dict) -> str:
        """Save query (delegates to QueryRepository)"""
        return await self.query_repo.save_query(query_record)
    
    async def get_user_history(self, user_id: str, limit: int = 10) -> List[Dict]:
        """Get user history (delegates to QueryRepository)"""
        return await self.query_repo.get_user_queries(user_id, limit)
    
    # User methods
    async def create_user(self, user_data: Dict) -> str:
        """Create user (delegates to UserRepository)"""
        return await self.user_repo.create_user(user_data)
    
    async def get_user_by_email(self, email: str) -> Optional[Dict]:
        """Get user by email (delegates to UserRepository)"""
        return await self.user_repo.get_user_by_email(email)
    
    # Analytics methods
    async def get_analytics_summary(self) -> Dict:
        """Get analytics (delegates to AnalyticsRepository)"""
        return await self.analytics_repo.get_analytics_summary()
    
    # Chat methods
    async def save_conversation(self, conversation_data: Dict) -> str:
        """Save chat conversation (delegates to ChatRepository)"""
        return await self.chat_repo.save_conversation(conversation_data)

    async def update_conversation(self, conversation_id: str, new_messages: List[Dict]) -> bool:
        """Update conversation (delegates to ChatRepository)"""
        return await self.chat_repo.update_conversation(conversation_id, new_messages)

    async def get_conversation(self, conversation_id: str) -> Optional[Dict]:
        """Get conversation (delegates to ChatRepository)"""
        return await self.chat_repo.get_conversation(conversation_id)

    async def get_user_conversations(self, user_id: str, limit: int = 20) -> List[Dict]:
        """Get user conversations (delegates to ChatRepository)"""
        return await self.chat_repo.get_user_conversations(user_id, limit)

    async def delete_conversation(self, conversation_id: str, user_id: str) -> bool:
        """Delete conversation (delegates to ChatRepository)"""
        return await self.chat_repo.delete_conversation(conversation_id, user_id)