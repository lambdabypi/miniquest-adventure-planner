# backend/app/api/routes/analytics.py
"""Enhanced analytics endpoints with performance metrics"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, Optional
import logging

from ...database import MongoDBClient
from ..dependencies import get_mongodb_client, get_coordinator
from .auth import get_current_user
from ...services.analytics_service import AnalyticsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/summary")
async def get_analytics_summary(
    current_user: dict = Depends(get_current_user),
    db_client: MongoDBClient = Depends(get_mongodb_client),
    coordinator = Depends(get_coordinator)
) -> Dict:
    """
    Get comprehensive system analytics with performance metrics.
    
    Returns:
    - Basic analytics (queries, users, themes)
    - Performance metrics (response times, cache stats)
    - Cache statistics (hit rate, time saved)
    - Insights and trends
    """
    try:
        # Initialize analytics service with coordinator for cache stats
        analytics_service = AnalyticsService(db_client, coordinator)
        
        # Get comprehensive analytics
        analytics = await analytics_service.get_system_analytics()
        
        if "error" in analytics:
            raise HTTPException(status_code=500, detail=analytics["error"])
        
        return analytics
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analytics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/performance")
async def get_performance_metrics(
    current_user: dict = Depends(get_current_user),
    db_client: MongoDBClient = Depends(get_mongodb_client),
    days: Optional[int] = Query(7, ge=1, le=30)
) -> Dict:
    """
    Get detailed performance metrics.
    
    Args:
        days: Number of days of history to analyze (1-30)
    
    Returns detailed performance breakdown including:
    - Response time statistics
    - Cache performance
    - Time series data
    - Performance trends
    """
    try:
        analytics_service = AnalyticsService(db_client)
        
        # Get performance data
        performance = await analytics_service._get_performance_metrics()
        
        return {
            "success": True,
            "time_period_days": days,
            "performance": performance
        }
        
    except Exception as e:
        logger.error(f"Performance metrics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cache/stats")
async def get_cache_statistics(
    current_user: dict = Depends(get_current_user),
    coordinator = Depends(get_coordinator)
) -> Dict:
    """
    Get current cache statistics.
    
    Returns real-time cache performance data.
    """
    try:
        analytics_service = AnalyticsService(None, coordinator)
        cache_stats = analytics_service._get_cache_statistics()
        
        return {
            "success": True,
            "cache": cache_stats
        }
        
    except Exception as e:
        logger.error(f"Cache stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/insights")
async def get_analytics_insights(
    current_user: dict = Depends(get_current_user),
    db_client: MongoDBClient = Depends(get_mongodb_client),
    coordinator = Depends(get_coordinator)
) -> Dict:
    """
    Get AI-generated insights about system performance and usage.
    
    Returns actionable insights based on analytics data.
    """
    try:
        analytics_service = AnalyticsService(db_client, coordinator)
        
        # Get full analytics
        analytics = await analytics_service.get_system_analytics()
        
        return {
            "success": True,
            "insights": analytics.get("insights", []),
            "generated_at": analytics.get("processed_at")
        }
        
    except Exception as e:
        logger.error(f"Insights error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/trends")
async def get_performance_trends(
    current_user: dict = Depends(get_current_user),
    db_client: MongoDBClient = Depends(get_mongodb_client)
) -> Dict:
    """
    Get performance trends over time.
    
    Returns time series data showing how performance has changed.
    """
    try:
        # Get queries with timestamps
        queries = await db_client.analytics_repo.get_recent_queries_with_performance(
            limit=100
        )
        
        # Group by time periods
        trends = _calculate_time_series_trends(queries)
        
        return {
            "success": True,
            "trends": trends
        }
        
    except Exception as e:
        logger.error(f"Trends error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def _calculate_time_series_trends(queries: list) -> Dict:
    """Calculate time series trends from queries"""
    from collections import defaultdict
    from datetime import datetime
    
    # Group queries by date
    daily_data = defaultdict(lambda: {
        "count": 0,
        "total_time": 0,
        "cache_hits": 0,
        "cache_attempts": 0
    })
    
    for query in queries:
        # Get date
        created_at = query.get("created_at")
        if not created_at:
            continue
        
        date_str = created_at.split("T")[0]  # Get YYYY-MM-DD
        
        # Get performance data
        perf = query.get("metadata", {}).get("performance", {})
        
        daily_data[date_str]["count"] += 1
        
        if "total_time_seconds" in perf:
            daily_data[date_str]["total_time"] += perf["total_time_seconds"]
        
        daily_data[date_str]["cache_hits"] += perf.get("cache_hits", 0)
        daily_data[date_str]["cache_attempts"] += (
            perf.get("cache_hits", 0) + perf.get("cache_misses", 0)
        )
    
    # Calculate averages
    trends = []
    for date_str, data in sorted(daily_data.items()):
        avg_time = data["total_time"] / data["count"] if data["count"] > 0 else 0
        hit_rate = (
            (data["cache_hits"] / data["cache_attempts"] * 100)
            if data["cache_attempts"] > 0 else 0
        )
        
        trends.append({
            "date": date_str,
            "query_count": data["count"],
            "avg_response_time": round(avg_time, 2),
            "cache_hit_rate": round(hit_rate, 1)
        })
    
    return {
        "daily_trends": trends,
        "total_days": len(trends)
    }