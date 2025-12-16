# backend/app/database/repositories/analytics_repository.py
"""Analytics repository - LIGHTWEIGHT metadata compatible"""

from typing import Dict, List, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class AnalyticsRepository:
    """Repository for analytics and performance data - works with lightweight queries"""
    
    def __init__(self, db):
        """
        Initialize analytics repository.
        
        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.queries_collection = db["user_queries"]
        self.users_collection = db["users"]
    
    async def get_analytics_summary(self) -> Dict:
        """
        Get basic analytics summary.
        
        Works with both:
        - Lightweight queries (only metadata)
        - Full queries (with embedded adventures)
        
        Returns:
            Dict with total queries, users, themes, etc.
        """
        try:
            # Total queries
            total_queries = await self.queries_collection.count_documents({})
            
            # Total users
            total_users = await self.users_collection.count_documents({})
            
            # Recent queries (24h)
            yesterday = datetime.now() - timedelta(days=1)
            recent_queries_24h = await self.queries_collection.count_documents({
                "created_at": {"$gte": yesterday}
            })
            
            # ✅ UPDATED: Average adventures per query (lightweight compatible)
            pipeline = [
                {
                    "$project": {
                        # Handle both lightweight (adventures_count) and full (adventures array)
                        "adventure_count": {
                            "$ifNull": [
                                "$adventures_count",  # Lightweight field
                                {"$size": {"$ifNull": ["$adventures", []]}}  # Full field (legacy)
                            ]
                        }
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "avg_adventures": {"$avg": "$adventure_count"}
                    }
                }
            ]
            
            result = await self.queries_collection.aggregate(pipeline).to_list(length=1)
            avg_adventures_per_query = result[0]["avg_adventures"] if result else 0
            
            # ✅ UPDATED: Top adventure themes (lightweight compatible)
            theme_pipeline = [
                # Unwind adventure metadata (lightweight) OR full adventures (legacy)
                {"$project": {
                    "themes": {
                        "$ifNull": [
                            "$query_stats.themes",  # Lightweight: themes array
                            "$adventures.theme"      # Legacy: extract from full adventures
                        ]
                    }
                }},
                {"$unwind": "$themes"},
                {
                    "$group": {
                        "_id": "$themes",
                        "count": {"$sum": 1}
                    }
                },
                {"$sort": {"count": -1}},
                {"$limit": 5}
            ]
            
            themes_result = await self.queries_collection.aggregate(theme_pipeline).to_list(length=5)
            top_adventure_themes = [
                {"theme": t["_id"], "count": t["count"]}
                for t in themes_result
            ]
            
            return {
                "total_queries": total_queries,
                "total_users": total_users,
                "recent_queries_24h": recent_queries_24h,
                "avg_adventures_per_query": round(avg_adventures_per_query, 2),
                "top_adventure_themes": top_adventure_themes,
                "generated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting analytics summary: {e}")
            raise
    
    async def get_recent_queries_with_performance(
        self, 
        limit: int = 100,
        days: Optional[int] = None
    ) -> List[Dict]:
        """
        Get recent queries with performance metadata.
        
        Args:
            limit: Maximum number of queries to return
            days: Optional number of days to look back
            
        Returns:
            List of query documents with performance data
        """
        try:
            # Build query filter
            query_filter = {}
            
            if days:
                cutoff_date = datetime.now() - timedelta(days=days)
                query_filter["created_at"] = {"$gte": cutoff_date}
            
            # Get queries with performance metadata
            queries = await self.queries_collection.find(
                query_filter,
                {
                    "created_at": 1,
                    "metadata.performance": 1,
                    "adventures_count": 1,  # ✅ Lightweight field
                    "adventure_metadata": 1,  # ✅ Just titles/themes
                    "metadata.target_location": 1
                }
            ).sort("created_at", -1).limit(limit).to_list(length=limit)
            
            return queries
            
        except Exception as e:
            logger.error(f"Error getting queries with performance: {e}")
            return []
    
    async def get_performance_stats_by_period(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict:
        """
        Get aggregated performance statistics for a time period.
        
        Args:
            start_date: Start of period
            end_date: End of period
            
        Returns:
            Dict with aggregated performance metrics
        """
        try:
            pipeline = [
                {
                    "$match": {
                        "created_at": {
                            "$gte": start_date,
                            "$lte": end_date
                        }
                    }
                },
                {
                    "$project": {
                        "response_time": "$metadata.performance.total_time_seconds",
                        "cache_hits": "$metadata.performance.cache_hits",
                        "cache_misses": "$metadata.performance.cache_misses",
                        # ✅ Handle both lightweight and full schemas
                        "adventure_count": {
                            "$ifNull": [
                                "$adventures_count",
                                {"$size": {"$ifNull": ["$adventures", []]}}
                            ]
                        }
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "avg_response_time": {"$avg": "$response_time"},
                        "min_response_time": {"$min": "$response_time"},
                        "max_response_time": {"$max": "$response_time"},
                        "total_cache_hits": {"$sum": "$cache_hits"},
                        "total_cache_misses": {"$sum": "$cache_misses"},
                        "avg_adventures": {"$avg": "$adventure_count"},
                        "total_queries": {"$sum": 1}
                    }
                }
            ]
            
            result = await self.queries_collection.aggregate(pipeline).to_list(length=1)
            
            if not result:
                return {
                    "total_queries": 0,
                    "avg_response_time": 0,
                    "cache_hit_rate": "0%"
                }
            
            stats = result[0]
            
            # Calculate cache hit rate
            total_cache_attempts = stats.get("total_cache_hits", 0) + stats.get("total_cache_misses", 0)
            cache_hit_rate = "0%"
            if total_cache_attempts > 0:
                hit_rate = (stats.get("total_cache_hits", 0) / total_cache_attempts) * 100
                cache_hit_rate = f"{hit_rate:.1f}%"
            
            return {
                "total_queries": stats.get("total_queries", 0),
                "avg_response_time": round(stats.get("avg_response_time", 0), 2),
                "min_response_time": round(stats.get("min_response_time", 0), 2),
                "max_response_time": round(stats.get("max_response_time", 0), 2),
                "cache_hit_rate": cache_hit_rate,
                "total_cache_hits": stats.get("total_cache_hits", 0),
                "total_cache_misses": stats.get("total_cache_misses", 0),
                "avg_adventures": round(stats.get("avg_adventures", 0), 1)
            }
            
        except Exception as e:
            logger.error(f"Error getting performance stats: {e}")
            return {}
    
    async def get_slowest_queries(self, limit: int = 10) -> List[Dict]:
        """
        Get the slowest queries for performance analysis.
        
        Args:
            limit: Number of slow queries to return
            
        Returns:
            List of slowest query documents
        """
        try:
            queries = await self.queries_collection.find(
                {"metadata.performance.total_time_seconds": {"$exists": True}},
                {
                    "user_input": 1,
                    "created_at": 1,
                    "metadata.performance.total_time_seconds": 1,
                    "metadata.target_location": 1,
                    "adventures_count": 1  # ✅ Lightweight field
                }
            ).sort("metadata.performance.total_time_seconds", -1).limit(limit).to_list(length=limit)
            
            return queries
            
        except Exception as e:
            logger.error(f"Error getting slowest queries: {e}")
            return []
    
    async def get_cache_effectiveness_by_location(self) -> List[Dict]:
        """
        Get cache effectiveness grouped by location.
        
        Returns:
            List of locations with their cache statistics
        """
        try:
            pipeline = [
                {
                    "$match": {
                        "metadata.target_location": {"$exists": True}
                    }
                },
                {
                    "$group": {
                        "_id": "$metadata.target_location",
                        "total_queries": {"$sum": 1},
                        "total_cache_hits": {"$sum": "$metadata.performance.cache_hits"},
                        "total_cache_attempts": {
                            "$sum": {
                                "$add": [
                                    {"$ifNull": ["$metadata.performance.cache_hits", 0]},
                                    {"$ifNull": ["$metadata.performance.cache_misses", 0]}
                                ]
                            }
                        }
                    }
                },
                {
                    "$project": {
                        "location": "$_id",
                        "total_queries": 1,
                        "cache_hit_rate": {
                            "$cond": [
                                {"$gt": ["$total_cache_attempts", 0]},
                                {
                                    "$multiply": [
                                        {"$divide": ["$total_cache_hits", "$total_cache_attempts"]},
                                        100
                                    ]
                                },
                                0
                            ]
                        }
                    }
                },
                {"$sort": {"total_queries": -1}},
                {"$limit": 10}
            ]
            
            results = await self.queries_collection.aggregate(pipeline).to_list(length=10)
            
            return [
                {
                    "location": r["location"],
                    "total_queries": r["total_queries"],
                    "cache_hit_rate": f"{r['cache_hit_rate']:.1f}%"
                }
                for r in results
            ]
            
        except Exception as e:
            logger.error(f"Error getting cache effectiveness by location: {e}")
            return []