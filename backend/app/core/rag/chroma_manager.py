# backend/app/core/rag/chroma_manager.py
"""ChromaDB collection management"""

import chromadb
from chromadb.utils import embedding_functions
import logging
from typing import List, Dict, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class ChromaManager:
    """Manages ChromaDB collections for RAG system"""
    
    def __init__(self, openai_api_key: str, chromadb_path: str = "./chromadb"):
        """
        Initialize ChromaDB manager.
        
        Args:
            openai_api_key: OpenAI API key for embeddings
            chromadb_path: Path to ChromaDB storage
        """
        self.chromadb_client = chromadb.PersistentClient(path=chromadb_path)
        self.embedding_function = embedding_functions.OpenAIEmbeddingFunction(
            api_key=openai_api_key,
            model_name="text-embedding-3-small"
        )
        
        self._initialize_collections()
        logger.info("✅ ChromaManager initialized")
    
    def _initialize_collections(self):
        """Initialize all ChromaDB collections (without deleting existing data)"""
        
        # Collection 1: Location insider tips
        try:
            self.location_tips_collection = self.chromadb_client.get_collection(
                name="dynamic_location_tips",
                embedding_function=self.embedding_function
            )
            logger.info("✅ Loaded existing location tips collection")
        except Exception:
            # Collection doesn't exist, create it
            self.location_tips_collection = self.chromadb_client.create_collection(
                name="dynamic_location_tips",
                embedding_function=self.embedding_function,
                metadata={"description": "Dynamically discovered location insider tips via Tavily"}
            )
            logger.info("✅ Created new location tips collection")
        
        # Collection 2: User adventure history
        try:
            self.user_history_collection = self.chromadb_client.get_collection(
                name="user_adventure_history",
                embedding_function=self.embedding_function
            )
            logger.info("✅ Loaded existing user adventure history collection")
        except Exception:
            # Collection doesn't exist, create it
            self.user_history_collection = self.chromadb_client.create_collection(
                name="user_adventure_history",
                embedding_function=self.embedding_function,
                metadata={"description": "User adventure history for personalization"}
            )
            logger.info("✅ Created new user adventure history collection")
        
        logger.info("✅ ChromaDB collections initialized")
    
    def cache_tips(self, location: str, tips: List[Dict], preferences: List[str]):
        """
        Cache location tips in ChromaDB.
        
        Args:
            location: Location name
            tips: List of tip dictionaries
            preferences: User preferences context
        """
        try:
            for tip in tips[:5]:  # Cache top 5 tips
                tip_id = self._generate_tip_id(location, tip["tip"])
                
                self.location_tips_collection.add(
                    ids=[tip_id],
                    documents=[tip["tip"]],
                    metadatas=[{
                        "location": location,
                        "category": tip["category"],
                        "authenticity_score": tip["authenticity_score"],
                        "source_domain": tip.get("source_domain", "unknown"),
                        "discovered_at": tip["discovered_at"],
                        "preferences_context": ",".join(preferences[:3])
                    }]
                )
            
            logger.info(f"✅ Cached {len(tips[:5])} tips for {location}")
            
        except Exception as e:
            logger.error(f"Error caching tips: {e}")
    
    def get_cached_tips(
        self, 
        location: str, 
        preferences: List[str], 
        max_age_hours: int = 24
    ) -> List[Dict]:
        """
        Get cached location tips if they exist and are recent.
        
        Args:
            location: Location name
            preferences: User preferences
            max_age_hours: Maximum age of tips in hours
            
        Returns:
            List of cached tip dictionaries
        """
        try:
            search_text = f"{location} {' '.join(preferences[:3])}"
            
            results = self.location_tips_collection.query(
                query_texts=[search_text],
                where={"location": location},
                n_results=10
            )
            
            if not results['documents'] or not results['documents'][0]:
                return []
            
            cached_tips = []
            for i, doc in enumerate(results['documents'][0]):
                metadata = results['metadatas'][0][i] if results['metadatas'] else {}
                discovered_at = metadata.get('discovered_at')
                
                if discovered_at and self._is_recent(discovered_at, max_age_hours):
                    cached_tips.append({
                        "tip": doc,
                        "location": location,
                        "category": metadata.get("category", "general"),
                        "authenticity_score": metadata.get("authenticity_score", 0.5),
                        "source_domain": metadata.get("source_domain", "unknown"),
                        "cached": True
                    })
            
            return cached_tips
            
        except Exception as e:
            logger.warning(f"Error retrieving cached tips: {e}")
            return []
    
    def store_user_adventure(self, user_id: str, adventure_data: Dict, rating: Optional[int] = None):
        """
        Store user adventure in ChromaDB.
        
        Args:
            user_id: User ID
            adventure_data: Adventure data dictionary
            rating: Optional user rating
        """
        try:
            adventure_id = self._generate_adventure_id(
                user_id, 
                adventure_data.get("title", "adventure")
            )
            
            adventure_doc = self._format_adventure_document(user_id, adventure_data, rating)
            
            self.user_history_collection.add(
                ids=[adventure_id],
                documents=[adventure_doc],
                metadatas=[self._format_adventure_metadata(user_id, adventure_data, rating)]
            )
            
            logger.info(f"✅ Stored adventure for user {user_id}")
            
        except Exception as e:
            logger.error(f"Error storing adventure: {e}")
    
    def get_user_personalization(self, user_id: str, location: str) -> Dict:
        """
        Get user personalization data from adventure history.
        
        Args:
            user_id: User ID
            location: Target location
            
        Returns:
            Dict with personalization data
        """
        try:
            results = self.user_history_collection.query(
                query_texts=[f"user {user_id} adventures {location}"],
                where={"user_id": user_id},
                n_results=10
            )
            
            if not results['documents'] or not results['documents'][0]:
                return {"has_history": False, "recommendations": []}
            
            return self._analyze_user_patterns(results['metadatas'][0])
            
        except Exception as e:
            logger.error(f"Error getting personalization: {e}")
            return {"has_history": False, "recommendations": []}
    
    # ========================================
    # PRIVATE HELPER METHODS
    # ========================================
    
    def _generate_tip_id(self, location: str, tip_text: str) -> str:
        """Generate unique ID for tip"""
        import hashlib
        content_hash = hashlib.md5(f"{location}_{tip_text}".encode()).hexdigest()
        return f"tip_{location}_{content_hash[:12]}"
    
    def _generate_adventure_id(self, user_id: str, adventure_title: str) -> str:
        """Generate unique ID for adventure"""
        import hashlib
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        content_hash = hashlib.md5(f"{user_id}_{adventure_title}".encode()).hexdigest()
        return f"adventure_{user_id}_{timestamp}_{content_hash[:8]}"
    
    def _is_recent(self, discovered_at: str, max_hours: int) -> bool:
        """Check if timestamp is recent enough"""
        try:
            tip_time = datetime.fromisoformat(discovered_at.replace('Z', '+00:00'))
            hours_old = (datetime.now() - tip_time.replace(tzinfo=None)).total_seconds() / 3600
            return hours_old <= max_hours
        except:
            return False
    
    def _format_adventure_document(self, user_id: str, adventure_data: Dict, rating: Optional[int]) -> str:
        """Format adventure as document string"""
        return f"""
User: {user_id}
Adventure: {adventure_data.get('title', 'Unknown')}
Location: {adventure_data.get('location', 'Unknown')}
Theme: {adventure_data.get('theme', 'general')}
Rating: {rating or 'Not rated'}
Completed: {datetime.now().isoformat()}
"""
    
    def _format_adventure_metadata(self, user_id: str, adventure_data: Dict, rating: Optional[int]) -> Dict:
        """Format adventure metadata"""
        return {
            "user_id": user_id,
            "adventure_title": adventure_data.get("title", "Unknown"),
            "location": adventure_data.get("location", "Unknown"),
            "rating": rating or 0,
            "timestamp": datetime.now().isoformat()
        }
    
    def _analyze_user_patterns(self, metadatas: List[Dict]) -> Dict:
        """Analyze user patterns from metadata"""
        from collections import Counter
        
        all_ratings = [m.get("rating", 0) for m in metadatas if m.get("rating", 0) > 0]
        all_locations = [m.get("location") for m in metadatas if m.get("location")]
        
        return {
            "has_history": True,
            "total_adventures": len(metadatas),
            "average_rating": sum(all_ratings) / len(all_ratings) if all_ratings else 0,
            "favorite_locations": [loc for loc, _ in Counter(all_locations).most_common(3)],
            "recommendations": []
        }