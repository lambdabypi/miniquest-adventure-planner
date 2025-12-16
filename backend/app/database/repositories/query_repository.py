# backend/app/database/repositories/query_repository.py
"""Repository for query-related database operations - LIGHTWEIGHT schema"""

from typing import Dict, List, Optional
from datetime import datetime
import logging
from bson import ObjectId

logger = logging.getLogger(__name__)

class QueryRepository:
    """Handles query-related database operations with lightweight schema"""
    
    def __init__(self, db):
        """
        Initialize query repository.
        
        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.collection = db["user_queries"]
        self.saved_adventures_collection = db["saved_adventures"]
    
    # ========================================
    # LIGHTWEIGHT QUERY HISTORY METHODS
    # ========================================
    
    async def save_query(self, query_record: Dict) -> str:
        """
        ✅ LIGHTWEIGHT: Save query metadata only.
        
        Schema:
        - user_input: Query text
        - adventures_count: Number generated
        - adventure_metadata: Titles, themes, basic info only
        - metadata: Performance, location, personalization
        - created_at: Timestamp
        
        Args:
            query_record: Query data dictionary
            
        Returns:
            Query ID string
        """
        try:
            # Validate lightweight schema
            if "adventures_count" not in query_record:
                logger.warning("Query record missing adventures_count - adding default")
                query_record["adventures_count"] = 0
            
            # Ensure required fields
            query_record.setdefault("created_at", datetime.now())
            query_record.setdefault("metadata", {})
            
            # Add system info if not present
            if "system_info" not in query_record:
                query_record["system_info"] = {
                    "workflow": "LangGraph Multi-Agent",
                    "data_source": "Tavily API",
                    "llm_provider": "OpenAI",
                    "schema_version": "lightweight_v1"
                }
            
            # Insert query
            result = await self.collection.insert_one(query_record)
            query_id = str(result.inserted_id)
            
            logger.info(f"✅ Lightweight query saved: {query_id}")
            logger.info(f"   - Adventures: {query_record.get('adventures_count', 0)} (metadata only)")
            logger.info(f"   - Storage: ~{len(str(query_record))} bytes")
            
            return query_id
            
        except Exception as e:
            logger.error(f"❌ Error saving query: {e}")
            raise
    
    async def get_user_queries(self, user_id: str, limit: int = 10) -> List[Dict]:
        """
        Get user's query history.
        
        Returns lightweight query records with metadata.
        
        Args:
            user_id: User ID
            limit: Maximum number of queries to return
            
        Returns:
            List of query dictionaries
        """
        try:
            cursor = self.collection.find(
                {"user_id": user_id}
            ).sort("created_at", -1).limit(limit)
            
            queries = []
            async for doc in cursor:
                doc["_id"] = str(doc["_id"])
                queries.append(doc)
            
            logger.info(f"✅ Retrieved {len(queries)} queries for user {user_id}")
            return queries
            
        except Exception as e:
            logger.error(f"❌ Error getting user queries: {e}")
            return []
    
    async def get_query_by_id(self, query_id: str, user_id: str) -> Optional[Dict]:
        """
        Get a specific query by ID.
        
        Args:
            query_id: Query ID
            user_id: User ID (for authorization)
            
        Returns:
            Query dictionary or None
        """
        try:
            doc = await self.collection.find_one({
                "_id": ObjectId(query_id),
                "user_id": user_id
            })
            
            if doc:
                doc["_id"] = str(doc["_id"])
                return doc
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Error getting query: {e}")
            return None
    
    # ========================================
    # SAVED ADVENTURES METHODS
    # ========================================
    
    async def save_saved_adventure(self, adventure_record: Dict) -> str:
        """
        Save a user-selected adventure (FULL DATA).
        
        This is where complete adventure data is stored.
        
        Args:
            adventure_record: Adventure data with user selections
            
        Returns:
            Adventure ID string
        """
        try:
            result = await self.saved_adventures_collection.insert_one(adventure_record)
            adventure_id = str(result.inserted_id)
            
            logger.info(f"✅ Full adventure saved: {adventure_id}")
            logger.info(f"   - User chose to save this adventure")
            logger.info(f"   - Complete data stored for future reference")
            
            return adventure_id
            
        except Exception as e:
            logger.error(f"❌ Error saving adventure: {e}")
            raise
    
    async def get_saved_adventures(
        self, 
        user_id: str, 
        limit: int = 20,
        completed: Optional[bool] = None
    ) -> List[Dict]:
        """
        Get user's saved adventures.
        
        Args:
            user_id: User ID
            limit: Maximum results
            completed: Filter by completion status
            
        Returns:
            List of saved adventure dictionaries
        """
        try:
            query = {"user_id": user_id}
            if completed is not None:
                query["completed"] = completed
            
            cursor = self.saved_adventures_collection.find(query).sort(
                "saved_at", -1
            ).limit(limit)
            
            adventures = []
            async for doc in cursor:
                doc["_id"] = str(doc["_id"])
                adventures.append(doc)
            
            logger.info(f"✅ Retrieved {len(adventures)} saved adventures for user {user_id}")
            return adventures
            
        except Exception as e:
            logger.error(f"❌ Error getting saved adventures: {e}")
            return []
    
    async def get_saved_adventure(self, adventure_id: str, user_id: str) -> Optional[Dict]:
        """
        Get a specific saved adventure.
        
        Args:
            adventure_id: Adventure ID
            user_id: User ID (for authorization)
            
        Returns:
            Adventure dictionary or None
        """
        try:
            doc = await self.saved_adventures_collection.find_one({
                "_id": ObjectId(adventure_id),
                "user_id": user_id
            })
            
            if doc:
                doc["_id"] = str(doc["_id"])
                return doc
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Error getting saved adventure: {e}")
            return None
    
    async def update_saved_adventure(
        self, 
        adventure_id: str, 
        user_id: str, 
        updates: Dict
    ) -> bool:
        """
        Update a saved adventure.
        
        Args:
            adventure_id: Adventure ID
            user_id: User ID (for authorization)
            updates: Fields to update
            
        Returns:
            Success boolean
        """
        try:
            # Add updated timestamp
            updates["updated_at"] = datetime.now()
            
            result = await self.saved_adventures_collection.update_one(
                {"_id": ObjectId(adventure_id), "user_id": user_id},
                {"$set": updates}
            )
            
            success = result.modified_count > 0
            
            if success:
                logger.info(f"✅ Updated saved adventure: {adventure_id}")
            else:
                logger.warning(f"⚠️ No changes made to adventure: {adventure_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"❌ Error updating saved adventure: {e}")
            return False
    
    async def delete_saved_adventure(self, adventure_id: str, user_id: str) -> bool:
        """
        Delete a saved adventure.
        
        Args:
            adventure_id: Adventure ID
            user_id: User ID (for authorization)
            
        Returns:
            Success boolean
        """
        try:
            result = await self.saved_adventures_collection.delete_one({
                "_id": ObjectId(adventure_id),
                "user_id": user_id
            })
            
            success = result.deleted_count > 0
            
            if success:
                logger.info(f"✅ Deleted saved adventure: {adventure_id}")
            else:
                logger.warning(f"⚠️ Adventure not found: {adventure_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"❌ Error deleting saved adventure: {e}")
            return False
    
    async def search_saved_adventures(self, filters: Dict, limit: int = 20, offset: int = 0) -> List[Dict]:
        """
        Search saved adventures with filters.
        
        Args:
            filters: MongoDB query filters
            limit: Maximum results
            offset: Skip offset for pagination
            
        Returns:
            List of saved adventure dictionaries
        """
        try:
            cursor = self.saved_adventures_collection.find(filters).sort(
                "saved_at", -1
            ).skip(offset).limit(limit)
            
            adventures = []
            async for doc in cursor:
                doc["_id"] = str(doc["_id"])
                adventures.append(doc)
            
            logger.info(f"✅ Found {len(adventures)} adventures with filters")
            return adventures
            
        except Exception as e:
            logger.error(f"❌ Error searching saved adventures: {e}")
            return []
    
    async def count_saved_adventures(self, filters: Dict) -> int:
        """
        Count saved adventures matching filters.
        
        Args:
            filters: MongoDB query filters
            
        Returns:
            Count of matching adventures
        """
        try:
            count = await self.saved_adventures_collection.count_documents(filters)
            return count
            
        except Exception as e:
            logger.error(f"❌ Error counting saved adventures: {e}")
            return 0
    
    # ========================================
    # AGGREGATION METHODS
    # ========================================
    
    async def get_user_adventure_themes(self, user_id: str, limit: int = 10) -> List[Dict]:
        """
        Get user's most common adventure themes from SAVED adventures.
        
        Args:
            user_id: User ID
            limit: Maximum themes to return
            
        Returns:
            List of theme dictionaries with counts
        """
        try:
            pipeline = [
                {"$match": {"user_id": user_id}},
                {"$group": {
                    "_id": "$metadata.theme",
                    "count": {"$sum": 1},
                    "avg_rating": {"$avg": "$rating"}
                }},
                {"$sort": {"count": -1}},
                {"$limit": limit}
            ]
            
            cursor = self.saved_adventures_collection.aggregate(pipeline)
            themes = []
            async for doc in cursor:
                themes.append({
                    "theme": doc["_id"],
                    "count": doc["count"],
                    "avg_rating": doc.get("avg_rating", 0)
                })
            
            return themes
            
        except Exception as e:
            logger.error(f"❌ Error getting adventure themes: {e}")
            return []
    
    async def get_user_location_history(self, user_id: str, limit: int = 10) -> List[Dict]:
        """
        Get user's most visited locations from query history.
        
        Args:
            user_id: User ID
            limit: Maximum locations
            
        Returns:
            List of location dictionaries
        """
        try:
            pipeline = [
                {"$match": {"user_id": user_id}},
                {"$group": {
                    "_id": "$metadata.target_location",
                    "query_count": {"$sum": 1},
                    "last_visited": {"$max": "$created_at"}
                }},
                {"$sort": {"query_count": -1}},
                {"$limit": limit}
            ]
            
            cursor = self.collection.aggregate(pipeline)
            locations = []
            async for doc in cursor:
                locations.append({
                    "location": doc["_id"],
                    "query_count": doc["query_count"],
                    "last_visited": doc["last_visited"]
                })
            
            return locations
            
        except Exception as e:
            logger.error(f"❌ Error getting location history: {e}")
            return []