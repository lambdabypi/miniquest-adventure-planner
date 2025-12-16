# backend/app/core/rag/rag_system.py
"""Clean RAG system - orchestration only"""

import logging
from typing import List, Dict, Optional

from .tavily_discovery import TavilyDiscovery
from .chroma_manager import ChromaManager
from .tip_processor import TipProcessor

logger = logging.getLogger(__name__)

class DynamicTavilyRAGSystem:
    """
    Clean RAG system orchestrator.
    
    Coordinates:
    - Tavily API for insider knowledge discovery
    - ChromaDB for caching and personalization
    - Tip processing for extraction and validation
    """
    
    def __init__(self, openai_api_key: str, tavily_api_key: str, chromadb_path: str = "./chromadb"):
        """
        Initialize RAG system.
        
        Args:
            openai_api_key: OpenAI API key for embeddings
            tavily_api_key: Tavily API key for searches
            chromadb_path: Path to ChromaDB storage
        """
        # Initialize components
        self.tavily_discovery = TavilyDiscovery(tavily_api_key)
        self.chroma_manager = ChromaManager(openai_api_key, chromadb_path)
        self.tip_processor = TipProcessor()
        
        logger.info("✅ Dynamic Tavily RAG System initialized")
    
    async def discover_location_insider_tips(self, location: str, preferences: List[str]) -> List[Dict]:
        """
        Discover insider tips for ANY location using Tavily API.
        
        Args:
            location: Target location
            preferences: User preferences
            
        Returns:
            List of insider tip dictionaries
        """
        logger.info(f"🔍 Discovering insider tips for {location}")
        
        try:
            # Step 1: Check cache
            cached_tips = self.chroma_manager.get_cached_tips(location, preferences)
            if cached_tips:
                logger.info(f"✅ Using {len(cached_tips)} cached tips")
                return cached_tips
            
            # Step 2: Generate search queries
            queries = self.tavily_discovery.generate_discovery_queries(location, preferences)
            
            # Step 3: Search with Tavily
            all_tips = []
            for query in queries:
                results = self.tavily_discovery.search_insider_tips(query)
                
                # Process each result
                for result in results:
                    tip_data = self.tip_processor.extract_tip_from_result(
                        result, location, query
                    )
                    if tip_data:
                        all_tips.append(tip_data)
            
            # Step 4: Deduplicate and clean
            cleaned_tips = self.tip_processor.deduplicate_tips(all_tips)
            
            # Step 5: Cache for future use
            if cleaned_tips:
                self.chroma_manager.cache_tips(location, cleaned_tips, preferences)
            
            logger.info(f"✅ Discovered {len(cleaned_tips)} insider tips")
            return cleaned_tips
            
        except Exception as e:
            logger.error(f"❌ Error discovering tips: {e}")
            return []
    
    def store_user_adventure(self, user_id: str, adventure_data: Dict, rating: Optional[int] = None):
        """
        Store user adventure for personalization.
        
        Args:
            user_id: User ID
            adventure_data: Adventure data
            rating: Optional user rating
        """
        self.chroma_manager.store_user_adventure(user_id, adventure_data, rating)
    
    def get_user_personalization(self, user_id: str, location: str) -> Dict:
        """
        Get user personalization data.
        
        Args:
            user_id: User ID
            location: Target location
            
        Returns:
            Dict with personalization data
        """
        return self.chroma_manager.get_user_personalization(user_id, location)