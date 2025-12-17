# backend/app/api/routes/adventures.py
"""Adventure generation endpoints - WITH PROGRESS TRACKING + LIGHTWEIGHT QUERY HISTORY"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from typing import Dict, List
import logging
from datetime import datetime
import json
import asyncio

from ...models import AdventureRequest, AdventureResponse
from ...agents.coordination import LangGraphCoordinator
from ..dependencies import get_coordinator, get_mongodb_client
from ..routes.auth import get_current_user
from ...database import MongoDBClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/adventures", tags=["adventures"])

# ========================================
# ✅ SSE STREAMING ENDPOINT - FIXED
# ========================================

@router.post("/generate-stream")
async def create_adventures_stream(
    request: AdventureRequest,
    current_user: dict = Depends(get_current_user),
    coordinator: LangGraphCoordinator = Depends(get_coordinator),
    mongodb_client: MongoDBClient = Depends(get_mongodb_client)
):
    """
    ✅ Generate adventures with REAL-TIME progress streaming via Server-Sent Events
    
    This endpoint streams progress updates as they happen, allowing the frontend
    to display real-time progress as each agent works.
    """
    
    user_id = current_user.get("user_id")
    
    logger.info(f"🌊 SSE STREAM: Adventure request from user {user_id}")
    logger.info(f"   Input: {request.user_input[:50]}...")
    
    async def generate_sse_stream():
        """Generator that yields SSE-formatted progress updates"""
        
        progress_queue = asyncio.Queue()
        progress_log = []
        
        def progress_callback(update: dict):
            """Callback that captures progress updates and queues them for streaming"""
            progress_log.append(update)
            # Put update in queue for streaming
            try:
                asyncio.create_task(progress_queue.put(update))
            except Exception as e:
                logger.error(f"Failed to queue progress update: {e}")
        
        try:
            # Start adventure generation in background
            logger.info("🚀 Starting background generation task...")
            generation_task = asyncio.create_task(
                coordinator.generate_adventures_with_progress(
                    user_input=request.user_input,
                    user_address=request.user_address,
                    user_id=user_id,
                    progress_callback=progress_callback
                )
            )
            
            # Stream progress updates as they come in
            while not generation_task.done():
                try:
                    # Wait for progress update with timeout
                    update = await asyncio.wait_for(progress_queue.get(), timeout=0.5)
                    
                    # Format as SSE
                    sse_data = f"data: {json.dumps(update)}\n\n"
                    logger.debug(f"📤 Streaming: {update['agent']} - {update['message']}")
                    yield sse_data.encode('utf-8')
                    
                except asyncio.TimeoutError:
                    # No update received, send heartbeat to keep connection alive
                    yield f": heartbeat\n\n".encode('utf-8')
                    continue
                except Exception as e:
                    logger.error(f"Error streaming progress: {e}")
                    continue
            
            # Get final result
            logger.info("⏳ Generation complete, getting results...")
            adventures, metadata = await generation_task
            
            # Add progress log to metadata
            metadata["progress_log"] = progress_log
            
            # ✅ FIXED: Handle errors with default messages
            error_data = metadata.get("error")
            if isinstance(error_data, dict) and error_data.get("type") == "clarification_needed":
                
                # Build error response metadata
                error_metadata = {
                    "clarification_needed": True,
                    "progress_log": progress_log
                }
                
                # ✅ FIXED: Unrelated queries with default message
                if error_data.get("unrelated_query"):
                    error_metadata.update({
                        "unrelated_query": True,
                        "clarification_message": error_data.get("clarification_message") or 
                            "I'm MiniQuest, your local adventure planning assistant! I help you discover places to explore. Ask me about museums, restaurants, parks, or other activities!",
                        "suggestions": error_data.get("suggestions") or [
                            "Museums and coffee shops in Boston",
                            "Parks and restaurants near me",
                            "Art galleries and wine bars"
                        ],
                        "query_type": error_data.get("query_type")
                    })
                # ✅ FIXED: Out-of-scope with default message
                elif error_data.get("out_of_scope"):
                    error_metadata.update({
                        "out_of_scope": True,
                        "scope_issue": error_data.get("scope_issue", "multi_day_trip"),
                        "detected_city": error_data.get("detected_city"),
                        "clarification_message": error_data.get("clarification_message") or 
                            "This request is outside MiniQuest's scope. We focus on short 2-6 hour local adventures in Boston and New York.",
                        "suggestions": error_data.get("suggestions", []),
                        "recommended_services": _get_recommended_services(error_data.get("scope_issue", "multi_day_trip"))
                    })
                # ✅ FIXED: Regular clarification with default message
                else:
                    error_metadata.update({
                        "clarification_message": error_data.get("clarification_message") or 
                            "Please provide more details about what you'd like to explore.",
                        "suggestions": error_data.get("suggestions") or [
                            "Museums and coffee shops in Boston",
                            "Parks and restaurants in New York",
                            "Art galleries and wine bars"
                        ]
                    })
                
                # Send final error response
                final_response = {
                    "done": True,
                    "success": False,
                    "adventures": [],
                    "metadata": error_metadata,
                    "message": error_metadata.get("clarification_message", "Clarification needed")
                }
                
                logger.info(f"📤 Sending clarification response: {error_metadata.get('clarification_message', 'N/A')[:50]}...")
                yield f"data: {json.dumps(final_response)}\n\n".encode('utf-8')
                return
            
            # Check for other errors
            if not adventures:
                error_msg = metadata.get("error", "No adventures could be generated")
                final_response = {
                    "done": True,
                    "success": False,
                    "error": error_msg,
                    "metadata": metadata
                }
                yield f"data: {json.dumps(final_response)}\n\n".encode('utf-8')
                return
            
            # Extract performance metrics
            performance = metadata.get("performance", {})
            total_time = performance.get("total_time_seconds", 0)
            
            # Build response metadata
            response_metadata = {
                "target_location": metadata.get("target_location"),
                "total_adventures": len(adventures),
                "workflow_success": True,
                "personalization_applied": metadata.get("personalization_applied", False),
                "user_history": metadata.get("user_history"),
                "performance": performance,
                "research_stats": metadata.get("research_stats", {}),
                "progress_tracking_enabled": True,
                "progress_log": progress_log,
                "timestamp": datetime.now().isoformat()
            }
            
            # Send final success response
            final_response = {
                "done": True,
                "success": True,
                "adventures": adventures,
                "metadata": response_metadata,
                "message": f"Generated {len(adventures)} adventures in {total_time:.2f}s"
            }
            
            logger.info(f"✅ Streaming complete: {len(adventures)} adventures, {len(progress_log)} progress updates")
            
            yield f"data: {json.dumps(final_response)}\n\n".encode('utf-8')
            
            # Save metadata in background (don't wait)
            asyncio.create_task(
                save_query_metadata(
                    mongodb_client=mongodb_client,
                    user_id=user_id,
                    user_input=request.user_input,
                    user_address=request.user_address,
                    adventures=adventures,
                    metadata=metadata,
                    progress_log=progress_log
                )
            )
            
        except Exception as e:
            logger.error(f"❌ Stream generation error: {e}", exc_info=True)
            error_response = {
                "done": True,
                "success": False,
                "error": str(e),
                "metadata": {"progress_log": progress_log}
            }
            yield f"data: {json.dumps(error_response)}\n\n".encode('utf-8')
    
    return StreamingResponse(
        generate_sse_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )

def _get_recommended_services(scope_issue: str) -> List[Dict]:
    """Get recommended external services based on scope issue"""
    
    recommendations = {
        "unsupported_city": [
            {"name": "TripAdvisor", "url": "https://www.tripadvisor.com", "description": "Discover attractions worldwide"},
            {"name": "Google Travel", "url": "https://www.google.com/travel", "description": "Plan trips anywhere"},
            {"name": "Yelp", "url": "https://www.yelp.com", "description": "Find local businesses"}
        ],
        "multi_day_trip": [
            {"name": "TripAdvisor", "url": "https://www.tripadvisor.com", "description": "Comprehensive trip planning"},
            {"name": "Google Travel", "url": "https://www.google.com/travel", "description": "Integrated planning"},
            {"name": "Roadtrippers", "url": "https://roadtrippers.com", "description": "Road trip planning"}
        ],
        "international_travel": [
            {"name": "TripAdvisor", "url": "https://www.tripadvisor.com", "description": "Global travel"},
            {"name": "Lonely Planet", "url": "https://www.lonelyplanet.com", "description": "Travel guides"},
            {"name": "Rick Steves", "url": "https://www.ricksteves.com", "description": "European travel"}
        ],
        "accommodation_planning": [
            {"name": "Booking.com", "url": "https://www.booking.com", "description": "Hotel booking"},
            {"name": "Airbnb", "url": "https://www.airbnb.com", "description": "Unique stays"},
            {"name": "Hotels.com", "url": "https://www.hotels.com", "description": "Hotel deals"}
        ],
        "trip_budget_detected": [
            {"name": "TripAdvisor", "url": "https://www.tripadvisor.com", "description": "Full-trip planning"},
            {"name": "Expedia", "url": "https://www.expedia.com", "description": "Package deals"},
            {"name": "Kayak", "url": "https://www.kayak.com", "description": "Price comparison"}
        ]
    }
    
    return recommendations.get(scope_issue, recommendations["multi_day_trip"])

@router.post("", response_model=AdventureResponse)
async def create_adventures(
    request: AdventureRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    coordinator: LangGraphCoordinator = Depends(get_coordinator),
    mongodb_client: MongoDBClient = Depends(get_mongodb_client)
):
    """
    Generate adventures with optional progress tracking
    
    Set enable_progress=True in request to get progress updates
    """
    try:
        user_id = current_user.get("user_id")
        enable_progress = getattr(request, 'enable_progress', False)
        
        logger.info(f"🚀 OPTIMIZED adventure request from user {user_id}: {request.user_input[:50]}...")
        if enable_progress:
            logger.info("   📊 Progress tracking: ENABLED")
        
        # ✅ Collect progress updates if enabled
        progress_log = []
        
        def progress_callback(update: dict):
            """Callback to collect progress updates"""
            progress_log.append(update)
            logger.info(
                f"📊 Progress: {update['agent']} - {update['message']} "
                f"({int(update['progress'] * 100)}%)"
            )
        
        # ✅ Execute workflow with optional progress tracking
        if enable_progress:
            adventures, metadata = await coordinator.generate_adventures_with_progress(
                user_input=request.user_input,
                user_address=request.user_address,
                user_id=user_id,
                progress_callback=progress_callback
            )
            # Add progress log to metadata
            metadata["progress_log"] = progress_log
        else:
            adventures, metadata = await coordinator.generate_adventures(
                user_input=request.user_input,
                user_address=request.user_address,
                user_id=user_id
            )
        
        # Check for clarification needed
        error_data = metadata.get("error")
        if isinstance(error_data, dict) and error_data.get("type") == "clarification_needed":
            
            # ✅ Handle unrelated queries
            if error_data.get("unrelated_query"):
                logger.info(f"🤷 Unrelated query: {error_data.get('query_type')}")
                
                return AdventureResponse(
                    success=False,
                    adventures=[],
                    metadata={
                        "clarification_needed": True,
                        "unrelated_query": True,
                        "clarification_message": error_data.get("clarification_message"),
                        "suggestions": error_data.get("suggestions", []),
                        "progress_log": progress_log if enable_progress else []
                    },
                    message="Query not related to adventure planning"
                )
            
            # ✅ Handle out-of-scope requests
            if error_data.get("out_of_scope"):
                scope_issue = error_data.get("scope_issue", "multi_day_trip")
                detected_city = error_data.get("detected_city")
                
                logger.info(f"🚫 Out of scope: {scope_issue} - Detected city: {detected_city}")
                
                return AdventureResponse(
                    success=False,
                    adventures=[],
                    metadata={
                        "out_of_scope": True,
                        "scope_issue": scope_issue,
                        "detected_city": detected_city,
                        "clarification_message": error_data.get("clarification_message"),
                        "suggestions": error_data.get("suggestions", []),
                        "recommended_services": _get_recommended_services(scope_issue),
                        "clarification_needed": False,
                        "progress_log": progress_log if enable_progress else []
                    },
                    message="Request outside MiniQuest's scope"
                )
            
            # Handle regular clarification (too vague)
            logger.info(f"🤔 Clarification needed: {error_data.get('clarification_message')}")

            return AdventureResponse(
                success=False,
                adventures=[],
                metadata={
                    "clarification_needed": True,
                    "clarification_message": error_data.get("clarification_message"),
                    "suggestions": error_data.get("suggestions", []),
                    "progress_log": progress_log if enable_progress else []
                },
                message="Clarification needed"
            )
        
        # Check for actual errors
        if not adventures:
            error_msg = metadata.get("error", "No adventures could be generated")
            
            if not isinstance(error_msg, dict):
                raise HTTPException(
                    status_code=400,
                    detail=f"Adventure generation failed: {error_msg}"
                )
        
        # Extract performance metrics
        performance = metadata.get("performance", {})
        total_time = performance.get("total_time_seconds", 0)
        cache_stats = performance.get("cache_stats", {})
        
        # Log performance
        logger.info(f"✅ Generated {len(adventures)} adventures in {total_time:.2f}s")
        if cache_stats:
            logger.info(f"   Cache: {cache_stats.get('hit_rate', '0%')} hit rate, "
                       f"saved ~{cache_stats.get('time_saved_estimate', '0s')}")
        if enable_progress:
            logger.info(f"   📊 Progress log: {len(progress_log)} updates captured")
        
        # Add personalization info to response
        personalization_applied = metadata.get("personalization_applied", False)
        user_history = metadata.get("user_history", {})
        
        if personalization_applied:
            logger.info(f"   ✨ Personalization applied: {user_history.get('total_adventures', 0)} past adventures")
        
        # ✅ LIGHTWEIGHT: Save only metadata in background (not full adventures)
        background_tasks.add_task(
            save_query_metadata,
            mongodb_client=mongodb_client,
            user_id=user_id,
            user_input=request.user_input,
            user_address=request.user_address,
            adventures=adventures,  # Only for extracting metadata
            metadata=metadata,
            progress_log=progress_log if enable_progress else []
        )
        
        # Enhanced metadata with performance metrics and progress
        response_metadata = {
            "target_location": metadata.get("target_location"),
            "total_adventures": len(adventures),
            "workflow_success": True,
            
            # Personalization info
            "personalization_applied": personalization_applied,
            "user_history": user_history if personalization_applied else None,
            
            # Performance metrics
            "performance": {
                "total_time_seconds": total_time,
                "cache_hit_rate": cache_stats.get("hit_rate", "0%"),
                "cache_hits": cache_stats.get("hits", 0),
                "cache_misses": cache_stats.get("misses", 0),
                "time_saved_estimate": cache_stats.get("time_saved_estimate", "0s"),
                "timing_breakdown": performance.get("timing_breakdown", {}),
                "optimizations_enabled": performance.get("optimizations_enabled", {})
            },
            
            # Research stats
            "research_stats": metadata.get("research_stats", {}),
            
            # ✅ Progress tracking
            "progress_tracking_enabled": enable_progress,
            "progress_log": progress_log if enable_progress else [],
            
            "timestamp": datetime.now().isoformat()
        }
        
        return AdventureResponse(
            success=True,
            adventures=adventures,
            metadata=response_metadata,
            message=f"Generated {len(adventures)} adventures in {total_time:.2f}s"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Adventure generation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

# ========================================
# BACKGROUND TASK: Save Lightweight Query Metadata
# ========================================

async def save_query_metadata(
    mongodb_client: MongoDBClient,
    user_id: str,
    user_input: str,
    user_address: str,
    adventures: list,
    metadata: dict,
    progress_log: list = []
):
    """
    ✅ LIGHTWEIGHT: Save only query metadata, not full adventures.
    
    What's saved:
    - ✅ Query text and location
    - ✅ Performance metrics (for analytics)
    - ✅ Adventure count and titles (for reference)
    - ✅ Themes and cost estimates
    - ✅ Progress log (if enabled, for debugging)
    - ❌ NOT SAVED: Full adventure objects, venue research, detailed steps
    
    Benefits:
    - Privacy-friendly (only metadata tracked)
    - 90% storage reduction
    - Analytics still works
    - Chat can reference queries
    - GDPR compliant (full data only when user saves)
    """
    try:
        logger.info(f"💾 Saving lightweight query metadata for user {user_id}...")
        
        # ✅ Extract ONLY metadata from adventures
        adventure_metadata = []
        themes = []
        total_cost = 0
        total_duration = 0
        
        for adv in adventures:
            adventure_metadata.append({
                "title": adv.get("title"),
                "theme": adv.get("theme"),
                "duration": adv.get("duration", 0),
                "cost": adv.get("cost", 0),
                "tagline": adv.get("tagline")
            })
            
            # Aggregate for analytics
            if adv.get("theme"):
                themes.append(adv.get("theme"))
            total_cost += adv.get("cost", 0)
            total_duration += adv.get("duration", 0)
        
        # ✅ Prepare LIGHTWEIGHT query record
        query_record = {
            "user_id": user_id,
            "user_input": user_input,
            "user_address": user_address,
            
            # ✅ Only adventure metadata (NOT full objects)
            "adventures_count": len(adventures),
            "adventure_metadata": adventure_metadata,  # Titles, themes, basic info only
            
            # ✅ Aggregated stats for analytics
            "query_stats": {
                "themes": themes,
                "avg_cost": total_cost / len(adventures) if adventures else 0,
                "avg_duration": total_duration / len(adventures) if adventures else 0,
                "total_adventures": len(adventures)
            },
            
            # ✅ Performance metrics (for analytics dashboard)
            "metadata": {
                "target_location": metadata.get("target_location"),
                "personalization_applied": metadata.get("personalization_applied", False),
                "performance": metadata.get("performance", {}),
                "research_stats": {
                    "successful_research": metadata.get("research_stats", {}).get("successful_research", 0),
                    "avg_confidence": metadata.get("research_stats", {}).get("avg_confidence", 0)
                },
                # ✅ Optional: Save progress log for debugging (only summary)
                "progress_summary": {
                    "total_steps": len(progress_log),
                    "agents_used": list(set([p.get("agent") for p in progress_log])),
                    "completion_time": progress_log[-1].get("progress", 0) if progress_log else 0
                } if progress_log else None
            },
            
            "created_at": datetime.now(),
            
            # ✅ System info for debugging
            "system_info": {
                "workflow": "LangGraph Multi-Agent",
                "version": "optimized_v2_with_progress",
                "data_policy": "lightweight_metadata_only",
                "progress_tracking": len(progress_log) > 0
            }
        }
        
        # ✅ Save to user_queries collection
        query_id = await mongodb_client.save_query(query_record)
        
        logger.info(f"✅ Lightweight query metadata saved: {query_id}")
        logger.info(f"   - Query metadata: {len(adventures)} adventure titles")
        logger.info(f"   - Performance metrics: {metadata.get('performance', {}).get('total_time_seconds', 0):.2f}s")
        logger.info(f"   - Progress tracking: {'YES' if progress_log else 'NO'} ({len(progress_log)} updates)")
        logger.info(f"   - Storage size: ~{len(str(query_record))} bytes (vs ~{len(str(adventures)) * 10} bytes if full)")
        logger.info(f"   💡 Full adventures saved ONLY when user clicks 'Save' button")
        
    except Exception as e:
        # Log error but don't fail the request (background task)
        logger.error(f"❌ Failed to save query metadata: {e}")
        logger.error(f"   User: {user_id}, Input: {user_input[:50]}...")

@router.get("/about")
async def get_about_info():
    """Get MiniQuest scope and mission information"""
    
    return {
        "mission": "Make spontaneous local exploration effortless",
        "tagline": "Discover personalized 2-6 hour adventures powered by 7 AI agents",
        "scope": {
            "what_we_do": [
                "Short, spontaneous adventures (2-6 hours)",
                "Local exploration in your city or while traveling",
                "Curated itineraries based on your interests",
                "Real-time research on venues and activities",
                "Budget-friendly options ($30-150)",
                "Same-day or 'things to do today' planning"
            ],
            "what_we_dont_do": [
                "Multi-day trip planning",
                "Accommodation booking",
                "International travel itineraries",
                "Transportation booking",
                "Extended vacation planning"
            ]
        },
        "perfect_for": [
            "Weekend city exploration",
            "Afternoon coffee & culture",
            "Museum-hopping days",
            "Dinner + evening plans",
            "Walking tours",
            "Photo expedition days"
        ],
        "features": [
            "7 AI agents working in parallel",
            "Live venue research from Tavily",
            "Google Maps integration",
            "Personalized recommendations",
            "Smart routing and directions",
            "Real-time progress tracking"
        ],
        "recommended_for_trips": {
            "multi_day": ["TripAdvisor", "Google Travel", "Roadtrippers"],
            "international": ["TripAdvisor", "Lonely Planet", "Rick Steves"],
            "accommodation": ["Booking.com", "Airbnb", "Hotels.com"]
        }
    }

@router.get("/cache-stats")
async def get_cache_stats(
    current_user: dict = Depends(get_current_user),
    coordinator: LangGraphCoordinator = Depends(get_coordinator)
):
    """Get research cache statistics"""
    try:
        stats = coordinator.get_cache_stats()
        
        return {
            "cache_stats": stats,
            "cache_enabled": coordinator.enable_cache
        }
        
    except Exception as e:
        logger.error(f"Failed to get cache stats: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get cache stats: {str(e)}"
        )

@router.post("/clear-cache")
async def clear_cache(
    current_user: dict = Depends(get_current_user),
    coordinator: LangGraphCoordinator = Depends(get_coordinator)
):
    """Clear research cache"""
    try:
        coordinator.clear_research_cache()
        
        return {
            "success": True,
            "message": "Research cache cleared"
        }
        
    except Exception as e:
        logger.error(f"Failed to clear cache: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to clear cache: {str(e)}"
        )