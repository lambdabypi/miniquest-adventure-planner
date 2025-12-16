# backend/app/services/analytics_service.py
"""Analytics service with performance metrics integration"""

from typing import Dict, List, Optional
import logging
from datetime import datetime, timedelta
from statistics import mean, median

logger = logging.getLogger(__name__)

class AnalyticsService:
    """
    Enhanced Analytics service with performance tracking.
    
    Responsibilities:
    - Process analytics data
    - Track performance metrics
    - Generate insights
    - Format analytics responses
    """
    
    def __init__(self, mongodb_client, coordinator=None):
        """
        Initialize analytics service.
        
        Args:
            mongodb_client: MongoDB client instance
            coordinator: LangGraph coordinator (for cache stats)
        """
        self.mongodb_client = mongodb_client
        self.coordinator = coordinator
        logger.info("✅ AnalyticsService initialized (with performance tracking)")
    
    async def get_system_analytics(self) -> Dict:
        """
        Get comprehensive system analytics with performance data.
        
        Returns:
            Dict with analytics data, performance metrics, and insights
        """
        try:
            # Get raw analytics from database
            raw_analytics = await self.mongodb_client.analytics_repo.get_analytics_summary()
            
            # ✅ NEW: Get performance metrics
            performance_metrics = await self._get_performance_metrics()
            
            # ✅ NEW: Get cache statistics
            cache_stats = self._get_cache_statistics()
            
            # Generate insights (now includes performance insights)
            insights = self._generate_insights(raw_analytics, performance_metrics, cache_stats)
            
            # Format comprehensive response
            return {
                # Original analytics
                **raw_analytics,
                
                # ✅ NEW: Performance metrics
                "performance": performance_metrics,
                
                # ✅ NEW: Cache statistics
                "cache": cache_stats,
                
                # Enhanced insights
                "insights": insights,
                "processed_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Analytics service error: {e}")
            return {"error": str(e)}
    
    async def _get_performance_metrics(self) -> Dict:
        """
        Get performance metrics from query history.
        
        Returns aggregated performance data including:
        - Average response time
        - Response time trends
        - Fastest/slowest queries
        - Performance breakdown by time period
        """
        try:
            # Query database for recent queries with performance data
            queries = await self.mongodb_client.analytics_repo.get_recent_queries_with_performance(
                limit=100
            )
            
            if not queries:
                return {
                    "total_queries_tracked": 0,
                    "avg_response_time": 0,
                    "median_response_time": 0,
                    "fastest_query": 0,
                    "slowest_query": 0,
                    "cache_hit_rate": "0%",
                    "avg_adventures_generated": 0,
                    "performance_trend": "no_data"
                }
            
            # Extract performance data
            response_times = []
            cache_hits_total = 0
            cache_attempts_total = 0
            adventures_counts = []
            
            for query in queries:
                # Get performance data from metadata
                perf = query.get("metadata", {}).get("performance", {})
                
                # Response time
                if "total_time_seconds" in perf:
                    response_times.append(perf["total_time_seconds"])
                
                # Cache stats
                cache_hits = perf.get("cache_hits", 0)
                cache_misses = perf.get("cache_misses", 0)
                cache_hits_total += cache_hits
                cache_attempts_total += (cache_hits + cache_misses)
                
                # Adventures generated
                adventures_count = len(query.get("adventures", []))
                adventures_counts.append(adventures_count)
            
            # Calculate statistics
            avg_response_time = mean(response_times) if response_times else 0
            median_response_time = median(response_times) if response_times else 0
            fastest = min(response_times) if response_times else 0
            slowest = max(response_times) if response_times else 0
            
            # Cache hit rate
            cache_hit_rate = "0%"
            if cache_attempts_total > 0:
                hit_rate = (cache_hits_total / cache_attempts_total) * 100
                cache_hit_rate = f"{hit_rate:.1f}%"
            
            # Adventures per query
            avg_adventures = mean(adventures_counts) if adventures_counts else 0
            
            # Performance trend (compare recent vs older queries)
            trend = self._calculate_performance_trend(response_times)
            
            # Time saved by caching
            time_saved = cache_hits_total * 2  # Assume 2s saved per cache hit
            
            return {
                "total_queries_tracked": len(queries),
                "avg_response_time": round(avg_response_time, 2),
                "median_response_time": round(median_response_time, 2),
                "fastest_query": round(fastest, 2),
                "slowest_query": round(slowest, 2),
                "cache_hit_rate": cache_hit_rate,
                "cache_hits_total": cache_hits_total,
                "cache_attempts_total": cache_attempts_total,
                "time_saved_by_cache": f"{time_saved}s",
                "avg_adventures_generated": round(avg_adventures, 1),
                "performance_trend": trend,
                "performance_baseline": 120.0,
                "improvement_vs_baseline": self._calculate_improvement(avg_response_time, 120.0)
            }
            
        except Exception as e:
            logger.error(f"Error getting performance metrics: {e}")
            return {
                "error": str(e),
                "total_queries_tracked": 0
            }
    
    def _calculate_performance_trend(self, response_times: List[float]) -> str:
        """
        Calculate performance trend from response times.
        
        Args:
            response_times: List of response times in chronological order
            
        Returns:
            "improving", "stable", or "degrading"
        """
        if len(response_times) < 10:
            return "insufficient_data"
        
        # Compare first half vs second half
        mid = len(response_times) // 2
        first_half_avg = mean(response_times[:mid])
        second_half_avg = mean(response_times[mid:])
        
        diff_pct = ((second_half_avg - first_half_avg) / first_half_avg) * 100
        
        if diff_pct < -5:
            return "improving"  # Getting faster
        elif diff_pct > 5:
            return "degrading"  # Getting slower
        else:
            return "stable"
    
    def _calculate_improvement(self, current: float, baseline: float) -> str:
        """Calculate improvement percentage vs baseline"""
        if baseline == 0:
            return "N/A"
        improvement = ((baseline - current) / baseline) * 100
        return f"{improvement:.1f}%"
    
    def _get_cache_statistics(self) -> Dict:
        """
        Get current cache statistics from coordinator.
        
        Returns:
            Cache statistics including size, hit rate, etc.
        """
        try:
            if self.coordinator and hasattr(self.coordinator, 'get_cache_stats'):
                stats = self.coordinator.get_cache_stats()
                
                return {
                    "enabled": True,
                    "current_size": stats.get("size", 0),
                    "max_size": stats.get("max_size", 200),
                    "capacity_used": f"{(stats.get('size', 0) / stats.get('max_size', 200) * 100):.1f}%",
                    "lifetime_hits": stats.get("hits", 0),
                    "lifetime_misses": stats.get("misses", 0),
                    "lifetime_hit_rate": stats.get("hit_rate", "0%"),
                    "estimated_time_saved": stats.get("time_saved_estimate", "0s"),
                    "ttl_minutes": stats.get("ttl_minutes", 60)
                }
            else:
                return {
                    "enabled": False,
                    "message": "Cache not available"
                }
                
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {
                "enabled": False,
                "error": str(e)
            }
    
    def _generate_insights(
        self, 
        analytics: Dict, 
        performance: Dict, 
        cache: Dict
    ) -> List[str]:
        """
        Generate enhanced insights including performance data.
        
        Args:
            analytics: Basic analytics data
            performance: Performance metrics
            cache: Cache statistics
            
        Returns:
            List of insight strings
        """
        insights = []
        
        # ===== USAGE INSIGHTS =====
        total_queries = analytics.get("total_queries", 0)
        if total_queries > 100:
            insights.append(f"🎯 System has processed {total_queries} queries successfully")
        elif total_queries > 0:
            insights.append(f"📊 Early adoption: {total_queries} queries processed so far")
        
        total_users = analytics.get("total_users", 0)
        if total_users > 50:
            insights.append(f"👥 Strong user base: {total_users} active users")
        elif total_users > 10:
            insights.append(f"👥 Growing user base: {total_users} active users")
        
        # ===== QUALITY INSIGHTS =====
        avg_adventures = analytics.get("avg_adventures_per_query", 0)
        if avg_adventures > 2.5:
            insights.append(f"✨ High quality output: {avg_adventures:.1f} adventures per query")
        
        # ===== PERFORMANCE INSIGHTS =====
        avg_time = performance.get("avg_response_time", 0)
        if avg_time > 0:
            if avg_time < 3:
                insights.append(f"⚡ Excellent performance: {avg_time:.1f}s average response time")
            elif avg_time < 5:
                insights.append(f"🚀 Good performance: {avg_time:.1f}s average response time")
            elif avg_time < 10:
                insights.append(f"⏱️ Moderate performance: {avg_time:.1f}s average response time")
        
        improvement = performance.get("improvement_vs_baseline")
        if improvement and improvement != "N/A":
            try:
                imp_val = float(improvement.replace("%", ""))
                if imp_val > 70:
                    insights.append(f"🎉 Outstanding optimization: {improvement} faster than baseline")
                elif imp_val > 50:
                    insights.append(f"📈 Strong optimization: {improvement} faster than baseline")
            except:
                pass
        
        # ===== CACHE INSIGHTS =====
        if cache.get("enabled"):
            hit_rate = cache.get("lifetime_hit_rate", "0%")
            try:
                hit_rate_val = float(hit_rate.replace("%", ""))
                if hit_rate_val > 50:
                    insights.append(f"💾 Cache highly effective: {hit_rate} hit rate")
                elif hit_rate_val > 25:
                    insights.append(f"💾 Cache performing well: {hit_rate} hit rate")
                
                time_saved = cache.get("estimated_time_saved", "0s")
                if time_saved != "0s":
                    insights.append(f"⏰ Cache saved approximately {time_saved} of processing time")
            except:
                pass
        
        # ===== TREND INSIGHTS =====
        trend = performance.get("performance_trend")
        if trend == "improving":
            insights.append("📊 Performance trend: Improving over time")
        elif trend == "degrading":
            insights.append("⚠️ Performance trend: May need optimization review")
        
        # ===== POPULAR THEMES =====
        top_themes = analytics.get("top_adventure_themes", [])
        if top_themes:
            top_theme = top_themes[0]
            insights.append(f"🔥 Most popular theme: {top_theme.get('theme')} ({top_theme.get('count')} adventures)")
        
        return insights