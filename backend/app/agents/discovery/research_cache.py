# backend/app/agents/research/research_cache.py
"""Simple in-memory cache for Tavily research results"""

from typing import Dict, Optional
from datetime import datetime, timedelta
import hashlib
import logging

logger = logging.getLogger(__name__)

class ResearchCache:
    """
    In-memory cache for venue research results.
    
    Benefits:
    - 90%+ time savings on cache hits
    - Reduces Tavily API costs
    - Consistent results for same venues
    
    Configuration:
    - TTL: 1 hour (balances freshness vs performance)
    - Max size: 200 venues (reasonable memory footprint)
    - Key: hash(venue_name + location)
    """
    
    def __init__(self, ttl_minutes: int = 60, max_size: int = 200):
        self.cache = {}
        self.ttl = timedelta(minutes=ttl_minutes)
        self.max_size = max_size
        self.hits = 0
        self.misses = 0
        logger.info(f"✅ Research cache initialized (TTL={ttl_minutes}m, Size={max_size})")
    
    def _make_key(self, venue_name: str, location: str) -> str:
        """Generate cache key from venue + location"""
        combined = f"{venue_name.lower().strip()}|{location.lower().strip()}"
        return hashlib.md5(combined.encode()).hexdigest()
    
    def get(self, venue_name: str, location: str) -> Optional[Dict]:
        """Get cached research if available and fresh"""
        key = self._make_key(venue_name, location)
        
        if key not in self.cache:
            self.misses += 1
            return None
        
        entry = self.cache[key]
        
        # Check if expired
        if datetime.now() > entry['expires_at']:
            del self.cache[key]
            self.misses += 1
            logger.debug(f"🗑️ Cache expired: {venue_name}")
            return None
        
        self.hits += 1
        logger.info(f"✅ Cache HIT: {venue_name} (saves ~2s)")
        return entry['data']
    
    def set(self, venue_name: str, location: str, data: Dict):
        """Cache research result"""
        # Evict oldest if at capacity
        if len(self.cache) >= self.max_size:
            oldest_key = min(self.cache.keys(), key=lambda k: self.cache[k]['created_at'])
            oldest_venue = self.cache[oldest_key]['venue_name']
            del self.cache[oldest_key]
            logger.debug(f"🗑️ Cache evicted: {oldest_venue}")
        
        key = self._make_key(venue_name, location)
        self.cache[key] = {
            'data': data,
            'venue_name': venue_name,
            'created_at': datetime.now(),
            'expires_at': datetime.now() + self.ttl
        }
        logger.debug(f"💾 Cache SET: {venue_name}")
    
    def clear(self):
        """Clear all cache"""
        count = len(self.cache)
        self.cache.clear()
        self.hits = 0
        self.misses = 0
        logger.info(f"🗑️ Cache cleared ({count} entries)")
    
    def get_stats(self) -> Dict:
        """Get cache statistics"""
        total = self.hits + self.misses
        hit_rate = (self.hits / total * 100) if total > 0 else 0
        
        return {
            'size': len(self.cache),
            'max_size': self.max_size,
            'ttl_minutes': self.ttl.total_seconds() / 60,
            'hits': self.hits,
            'misses': self.misses,
            'hit_rate': f"{hit_rate:.1f}%",
            'time_saved_estimate': f"{self.hits * 2}s"
        }
    
    def cleanup_expired(self):
        """Remove expired entries (call periodically)"""
        now = datetime.now()
        expired_keys = [
            key for key, entry in self.cache.items()
            if now > entry['expires_at']
        ]
        
        for key in expired_keys:
            del self.cache[key]
        
        if expired_keys:
            logger.info(f"🗑️ Cleaned up {len(expired_keys)} expired cache entries")