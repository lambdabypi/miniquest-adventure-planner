# backend/app/core/rag/tavily_discovery.py
"""Tavily API integration for discovering insider tips"""

from tavily import TavilyClient
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

class TavilyDiscovery:
    """Handles Tavily API searches for insider knowledge discovery"""
    
    def __init__(self, tavily_api_key: str):
        """
        Initialize Tavily discovery.
        
        Args:
            tavily_api_key: Tavily API key
        """
        self.tavily_client = TavilyClient(api_key=tavily_api_key)
        logger.info("✅ TavilyDiscovery initialized")
    
    def search_insider_tips(self, query: str) -> List[Dict]:
        """
        Search for insider tips using Tavily API.
        
        Args:
            query: Search query string
            
        Returns:
            List of search result dictionaries
        """
        try:
            logger.info(f"🔍 Tavily search: {query}")
            
            search_results = self.tavily_client.search(
                query=query,
                max_results=5,
                search_depth="advanced",
                include_domains=self._get_trusted_domains()
            )
            
            results = search_results.get("results", [])
            logger.info(f"✅ Found {len(results)} results")
            
            return results
            
        except Exception as e:
            logger.warning(f"Tavily search failed for '{query}': {e}")
            return []
    
    def generate_discovery_queries(self, location: str, preferences: List[str]) -> List[str]:
        """
        Generate smart search queries for insider discovery.
        
        Args:
            location: Target location
            preferences: User preferences
            
        Returns:
            List of search query strings
        """
        # Base insider discovery queries
        base_queries = [
            f"{location} hidden gems locals recommend",
            f"{location} insider secrets reddit",
            f"{location} locals only spots avoid tourists",
            f"{location} best kept secrets off beaten path",
            f"things locals do {location} visitors don't know"
        ]
        
        # Preference-specific queries
        pref_queries = []
        for pref in preferences[:3]:  # Limit to 3 main preferences
            pref_lower = pref.lower()
            
            if 'coffee' in pref_lower or 'cafe' in pref_lower:
                pref_queries.extend([
                    f"{location} best coffee shops locals go to",
                    f"{location} hidden coffee gems reddit recommendations"
                ])
            elif 'food' in pref_lower or 'restaurant' in pref_lower:
                pref_queries.extend([
                    f"{location} local favorite restaurants hidden gems",
                    f"{location} where locals eat avoid tourist traps"
                ])
            elif 'park' in pref_lower or 'nature' in pref_lower:
                pref_queries.extend([
                    f"{location} secret parks locals know",
                    f"{location} hidden nature spots off beaten path"
                ])
            elif 'culture' in pref_lower or 'art' in pref_lower:
                pref_queries.extend([
                    f"{location} local cultural spots tourists miss",
                    f"{location} underground art scene insider tips"
                ])
            elif 'nightlife' in pref_lower or 'bar' in pref_lower:
                pref_queries.extend([
                    f"{location} local bars avoid tourist crowds",
                    f"{location} where locals drink nightlife secrets"
                ])
            else:
                pref_queries.append(f"{location} {pref} locals recommend hidden")
        
        # Combine and limit
        all_queries = base_queries + pref_queries
        return all_queries[:8]  # Limit to 8 to avoid rate limits
    
    def _get_trusted_domains(self) -> List[str]:
        """Get list of trusted domains for insider knowledge"""
        return [
            "reddit.com",
            "yelp.com",
            "tripadvisor.com",
            "timeout.com",
            "thrillist.com",
            "eater.com",
            "secretcity.com",
            "atlasinsider.com",
            "local-guide.com",
            "hiddengems.com"
        ]