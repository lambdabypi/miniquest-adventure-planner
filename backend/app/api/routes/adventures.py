# backend/app/api/routes/adventures.py
"""Adventure generation endpoints - WITH PROGRESS TRACKING + LIGHTWEIGHT QUERY HISTORY + REMIX"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from typing import Dict, List, Optional
from pydantic import BaseModel
import logging
from datetime import datetime
import json
import asyncio
import os

from ...models import AdventureRequest, AdventureResponse
from ...agents.coordination import LangGraphCoordinator
from ..dependencies import get_coordinator, get_mongodb_client
from ..routes.auth import get_current_user
from ...database import MongoDBClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/adventures", tags=["adventures"])

# ========================================
# REMIX REQUEST MODEL
# ========================================

class RemixStopRequest(BaseModel):
    adventure: dict
    step_index: int
    location: str
    exclude_venues: Optional[List[str]] = []

# ========================================
# ✅ SSE STREAMING ENDPOINT
# ========================================

@router.post("/generate-stream")
async def create_adventures_stream(
    request: AdventureRequest,
    current_user: dict = Depends(get_current_user),
    coordinator: LangGraphCoordinator = Depends(get_coordinator),
    mongodb_client: MongoDBClient = Depends(get_mongodb_client)
):
    user_id = current_user.get("user_id")
    logger.info(f"🌊 SSE STREAM: Adventure request from user {user_id}")
    logger.info(f"   Input: {request.user_input[:50]}...")

    async def generate_sse_stream():
        progress_queue = asyncio.Queue()
        progress_log = []
        streamed_adventures: list = []

        def progress_callback(update: dict):
            progress_log.append(update)
            try:
                asyncio.create_task(progress_queue.put(update))
            except Exception as e:
                logger.error(f"Failed to queue progress update: {e}")

        try:
            logger.info("🚀 Starting background generation task...")
            generation_task = asyncio.create_task(
                coordinator.generate_adventures_with_progress(
                    user_input=request.user_input,
                    user_address=request.user_address,
                    user_id=user_id,
                    progress_callback=progress_callback,
                    generation_options=(
                        request.generation_options.model_dump()
                        if request.generation_options else {}
                    ),
                )
            )

            while not generation_task.done():
                try:
                    update = await asyncio.wait_for(progress_queue.get(), timeout=0.5)
                    if update.get("status") == "adventure_ready":
                        adventure = update.get("details", {}).get("adventure")
                        if adventure:
                            streamed_adventures.append(adventure)
                            payload = {
                                "type": "adventure_ready",
                                "adventure": adventure,
                                "adventure_index": update["details"].get("adventure_index", len(streamed_adventures) - 1),
                                "total_expected": update["details"].get("total_expected", 3),
                                "message": update.get("message", ""),
                                "progress": update.get("progress", 0),
                            }
                            logger.info(f"📤 Streaming adventure: {adventure.get('title')}")
                            yield f"data: {json.dumps(payload)}\n\n".encode("utf-8")
                    else:
                        yield f"data: {json.dumps(update)}\n\n".encode("utf-8")
                except asyncio.TimeoutError:
                    yield b": heartbeat\n\n"
                    continue
                except Exception as e:
                    logger.error(f"Error streaming progress: {e}")
                    continue

            logger.info("⏳ Generation complete, getting results...")
            adventures, metadata = await generation_task
            metadata["progress_log"] = progress_log

            error_data = metadata.get("error")
            if isinstance(error_data, dict) and error_data.get("type") == "clarification_needed":
                error_metadata = {"clarification_needed": True, "progress_log": progress_log}
                if error_data.get("unrelated_query"):
                    error_metadata.update({
                        "unrelated_query": True,
                        "clarification_message": error_data.get("clarification_message") or
                            "I'm MiniQuest, your local adventure planning assistant!",
                        "suggestions": error_data.get("suggestions") or [
                            "Museums and coffee shops in Boston",
                            "Parks and restaurants near me",
                        ],
                        "query_type": error_data.get("query_type")
                    })
                elif error_data.get("out_of_scope"):
                    error_metadata.update({
                        "out_of_scope": True,
                        "scope_issue": error_data.get("scope_issue", "multi_day_trip"),
                        "detected_city": error_data.get("detected_city"),
                        "clarification_message": error_data.get("clarification_message") or
                            "This request is outside MiniQuest's scope.",
                        "suggestions": error_data.get("suggestions", []),
                        "recommended_services": _get_recommended_services(error_data.get("scope_issue", "multi_day_trip"))
                    })
                else:
                    # ✅ Check for location_not_found specifically before the generic fallback
                    if error_data.get("location_not_found"):
                        error_metadata.update({
                            "location_not_found": True,
                            "clarification_message": error_data.get("clarification_message") or
                                "I couldn't find that neighborhood.",
                            "suggestions": error_data.get("suggestions") or [],
                        })
                    else:
                        error_metadata.update({
                            "clarification_message": error_data.get("clarification_message") or
                                "Please provide more details about what you'd like to explore.",
                            "suggestions": error_data.get("suggestions") or [
                                "Museums and coffee shops in Boston",
                                "Parks and restaurants in New York",
                            ]
                        })
                yield f"data: {json.dumps({'done': True, 'success': False, 'adventures': [], 'metadata': error_metadata, 'message': error_metadata.get('clarification_message', 'Clarification needed')})}\n\n".encode("utf-8")
                return

            if not adventures:
                yield f"data: {json.dumps({'done': True, 'success': False, 'error': metadata.get('error', 'No adventures generated'), 'metadata': metadata})}\n\n".encode("utf-8")
                return

            performance = metadata.get("performance", {})
            total_time = performance.get("total_time_seconds", 0)
            final_adventures = streamed_adventures if streamed_adventures else adventures

            response_metadata = {
                "target_location": metadata.get("target_location"),
                "total_adventures": len(final_adventures),
                "workflow_success": True,
                "personalization_applied": metadata.get("personalization_applied", False),
                "user_history": metadata.get("user_history"),
                "performance": performance,
                "research_stats": metadata.get("research_stats", {}),
                "progress_tracking_enabled": True,
                "progress_log": progress_log,
                "timestamp": datetime.now().isoformat()
            }

            final_response = {
                "done": True,
                "success": True,
                "adventures": final_adventures,
                "metadata": response_metadata,
                "message": f"Generated {len(final_adventures)} adventures in {total_time:.2f}s"
            }

            logger.info(f"✅ Streaming complete: {len(final_adventures)} adventures")
            yield f"data: {json.dumps(final_response)}\n\n".encode("utf-8")

            asyncio.create_task(
                save_query_metadata(
                    mongodb_client=mongodb_client,
                    user_id=user_id,
                    user_input=request.user_input,
                    user_address=request.user_address,
                    adventures=final_adventures,
                    metadata=metadata,
                    progress_log=progress_log
                )
            )

        except Exception as e:
            logger.error(f"❌ Stream generation error: {e}", exc_info=True)
            yield f"data: {json.dumps({'done': True, 'success': False, 'error': str(e), 'metadata': {'progress_log': progress_log}})}\n\n".encode("utf-8")

    return StreamingResponse(
        generate_sse_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

# ========================================
# REMIX STOP ENDPOINT
# ========================================

@router.post("/remix-stop")
async def remix_stop(
    request: RemixStopRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Replace one stop in an adventure with 3 fresh Tavily alternatives.
    Returns alternative venue options with research data for the user to pick from.
    """
    try:
        from tavily import AsyncTavilyClient

        user_id = current_user.get("user_id")
        steps = request.adventure.get("steps", [])

        if request.step_index >= len(steps):
            raise HTTPException(status_code=400, detail="step_index out of range")

        step = steps[request.step_index]
        current_activity = step.get("activity", "")
        theme = request.adventure.get("theme", "local attractions")
        location = request.location

        logger.info(f"🔀 Remix stop {request.step_index} for user {user_id}")
        logger.info(f"   Replacing: '{current_activity}' in {location}")

        tavily = AsyncTavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

        candidate_queries = [
            f"{theme} venues in {location}",
            f"similar to {current_activity} {location}",
            f"best {theme} spots {location}",
            f"hidden gems {theme} {location}",
            f"top rated {theme} {location}",
        ]

        async def search_one(q: str):
            try:
                res = await tavily.search(q, max_results=3, search_depth="basic")
                return res.get("results", [])
            except Exception:
                return []

        results = await asyncio.gather(*[search_one(q) for q in candidate_queries])

        # Flatten + deduplicate, filter out venues already in the adventure
        seen: set = set()
        excluded_lower = {v.lower() for v in (request.exclude_venues or [])}
        candidates = []

        for batch in results:
            for r in batch:
                title = r.get("title", "").strip()
                tl = title.lower()
                if (
                    title
                    and tl not in seen
                    and not any(ex in tl for ex in excluded_lower)
                    and len(candidates) < 9
                ):
                    seen.add(tl)
                    candidates.append({
                        "name": title,
                        "url": r.get("url", ""),
                        "snippet": r.get("content", "")[:300],
                        "score": r.get("score", 0),
                    })

        candidates.sort(key=lambda x: x["score"], reverse=True)
        top = candidates[:5]

        if not top:
            raise HTTPException(status_code=404, detail="No alternatives found for this stop")

        # Enrich top candidates with Tavily extract
        async def enrich(c: dict):
            try:
                ext = await tavily.extract(urls=[c["url"]])
                content = ""
                if ext and ext.get("results"):
                    content = ext["results"][0].get("raw_content", "")[:500]
                return {
                    "name": c["name"],
                    "url": c["url"],
                    "description": content or c["snippet"],
                    "research_confidence": min(0.95, c["score"] * 1.2),
                    "total_insights": len(content.split(".")) if content else 2,
                    "source_url": c["url"],
                    "website": c["url"],
                }
            except Exception:
                return {
                    "name": c["name"],
                    "url": c["url"],
                    "description": c["snippet"],
                    "research_confidence": 0.6,
                    "total_insights": 1,
                    "source_url": c["url"],
                    "website": c["url"],
                }

        enriched = await asyncio.gather(*[enrich(c) for c in top])
        alternatives = list(enriched)[:3]

        logger.info(f"✅ Remix: {len(alternatives)} alternatives found")
        return {
            "success": True,
            "step_index": request.step_index,
            "original_venue": current_activity,
            "alternatives": alternatives,
            "location": location,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Remix stop error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# STANDARD (NON-STREAMING) ENDPOINT
# ========================================

@router.post("", response_model=AdventureResponse)
async def create_adventures(
    request: AdventureRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    coordinator: LangGraphCoordinator = Depends(get_coordinator),
    mongodb_client: MongoDBClient = Depends(get_mongodb_client)
):
    try:
        user_id = current_user.get("user_id")
        enable_progress = getattr(request, 'enable_progress', False)
        logger.info(f"🚀 OPTIMIZED adventure request from user {user_id}: {request.user_input[:50]}...")

        progress_log = []

        def progress_callback(update: dict):
            progress_log.append(update)
            logger.info(f"📊 Progress: {update['agent']} - {update['message']} ({int(update['progress'] * 100)}%)")

        if enable_progress:
            adventures, metadata = await coordinator.generate_adventures(
                user_input=request.user_input,
                user_address=request.user_address,
                user_id=user_id,
                generation_options=(
                    request.generation_options.model_dump()
                    if request.generation_options else {}
                ),
            )
            metadata["progress_log"] = progress_log
        else:
            adventures, metadata = await coordinator.generate_adventures(
                user_input=request.user_input,
                user_address=request.user_address,
                user_id=user_id
            )

        error_data = metadata.get("error")
        if isinstance(error_data, dict) and error_data.get("type") == "clarification_needed":
            if error_data.get("unrelated_query"):
                return AdventureResponse(
                    success=False, adventures=[],
                    metadata={
                        "clarification_needed": True,
                        "unrelated_query": True,
                        "clarification_message": error_data.get("clarification_message"),
                        "suggestions": error_data.get("suggestions", []),
                        "progress_log": progress_log if enable_progress else []
                    },
                    message="Query not related to adventure planning"
                )
            if error_data.get("out_of_scope"):
                scope_issue = error_data.get("scope_issue", "multi_day_trip")
                return AdventureResponse(
                    success=False, adventures=[],
                    metadata={
                        "out_of_scope": True,
                        "scope_issue": scope_issue,
                        "detected_city": error_data.get("detected_city"),
                        "clarification_message": error_data.get("clarification_message"),
                        "suggestions": error_data.get("suggestions", []),
                        "recommended_services": _get_recommended_services(scope_issue),
                        "clarification_needed": False,
                        "progress_log": progress_log if enable_progress else []
                    },
                    message="Request outside MiniQuest's scope"
                )
            if error_data.get("location_not_found"):
                return AdventureResponse(
                    success=False, adventures=[],
                    metadata={
                        "clarification_needed": True,
                        "location_not_found": True,
                        "clarification_message": error_data.get("clarification_message"),
                        "suggestions": error_data.get("suggestions", []),
                        "progress_log": progress_log if enable_progress else []
                    },
                    message="Neighborhood not found in user's city"
                )
            return AdventureResponse(
                success=False, adventures=[],
                metadata={
                    "clarification_needed": True,
                    "clarification_message": error_data.get("clarification_message"),
                    "suggestions": error_data.get("suggestions", []),
                    "progress_log": progress_log if enable_progress else []
                },
                message="Clarification needed"
            )

        if not adventures:
            error_msg = metadata.get("error", "No adventures could be generated")
            if not isinstance(error_msg, dict):
                raise HTTPException(status_code=400, detail=f"Adventure generation failed: {error_msg}")

        performance = metadata.get("performance", {})
        total_time = performance.get("total_time_seconds", 0)
        cache_stats = performance.get("cache_stats", {})
        personalization_applied = metadata.get("personalization_applied", False)
        user_history = metadata.get("user_history", {})

        logger.info(f"✅ Generated {len(adventures)} adventures in {total_time:.2f}s")

        background_tasks.add_task(
            save_query_metadata,
            mongodb_client=mongodb_client,
            user_id=user_id,
            user_input=request.user_input,
            user_address=request.user_address,
            adventures=adventures,
            metadata=metadata,
            progress_log=progress_log if enable_progress else []
        )

        return AdventureResponse(
            success=True,
            adventures=adventures,
            metadata={
                "target_location": metadata.get("target_location"),
                "total_adventures": len(adventures),
                "workflow_success": True,
                "personalization_applied": personalization_applied,
                "user_history": user_history if personalization_applied else None,
                "performance": {
                    "total_time_seconds": total_time,
                    "cache_hit_rate": cache_stats.get("hit_rate", "0%"),
                    "cache_hits": cache_stats.get("hits", 0),
                    "cache_misses": cache_stats.get("misses", 0),
                    "time_saved_estimate": cache_stats.get("time_saved_estimate", "0s"),
                    "timing_breakdown": performance.get("timing_breakdown", {}),
                    "optimizations_enabled": performance.get("optimizations_enabled", {})
                },
                "research_stats": metadata.get("research_stats", {}),
                "progress_tracking_enabled": enable_progress,
                "progress_log": progress_log if enable_progress else [],
                "timestamp": datetime.now().isoformat()
            },
            message=f"Generated {len(adventures)} adventures in {total_time:.2f}s"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Adventure generation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# ========================================
# HELPERS
# ========================================

def _get_recommended_services(scope_issue: str) -> List[Dict]:
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
    try:
        logger.info(f"💾 Saving lightweight query metadata for user {user_id}...")

        adventure_metadata = []
        themes, total_cost, total_duration = [], 0, 0

        for adv in adventures:
            adventure_metadata.append({
                "title": adv.get("title"),
                "theme": adv.get("theme"),
                "duration": adv.get("duration", 0),
                "cost": adv.get("cost", 0),
                "tagline": adv.get("tagline")
            })
            if adv.get("theme"):
                themes.append(adv.get("theme"))
            total_cost += adv.get("cost", 0)
            total_duration += adv.get("duration", 0)

        query_record = {
            "user_id": user_id,
            "user_input": user_input,
            "user_address": user_address,
            "adventures_count": len(adventures),
            "adventure_metadata": adventure_metadata,
            "query_stats": {
                "themes": themes,
                "avg_cost": total_cost / len(adventures) if adventures else 0,
                "avg_duration": total_duration / len(adventures) if adventures else 0,
                "total_adventures": len(adventures)
            },
            "metadata": {
                "target_location": metadata.get("target_location"),
                "personalization_applied": metadata.get("personalization_applied", False),
                "performance": metadata.get("performance", {}),
                "research_stats": {
                    "successful_research": metadata.get("research_stats", {}).get("successful_research", 0),
                    "avg_confidence": metadata.get("research_stats", {}).get("avg_confidence", 0)
                },
                "progress_summary": {
                    "total_steps": len(progress_log),
                    "agents_used": list(set([p.get("agent") for p in progress_log])),
                    "completion_time": progress_log[-1].get("progress", 0) if progress_log else 0
                } if progress_log else None
            },
            "created_at": datetime.now(),
            "system_info": {
                "workflow": "LangGraph Multi-Agent",
                "version": "optimized_v2_with_progress",
                "data_policy": "lightweight_metadata_only",
                "progress_tracking": len(progress_log) > 0
            }
        }

        query_id = await mongodb_client.save_query(query_record)
        logger.info(f"✅ Lightweight query metadata saved: {query_id}")

    except Exception as e:
        logger.error(f"❌ Failed to save query metadata: {e}")

# ========================================
# UTILITY ENDPOINTS
# ========================================

@router.get("/about")
async def get_about_info():
    return {
        "mission": "Make spontaneous local exploration effortless",
        "tagline": "Not recommendations. Adventures. Powered by 6 AI agents.",
        "scope": {
            "what_we_do": [
                "Short, spontaneous adventures (2-6 hours)",
                "Local exploration anywhere in the US",
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
            "6 AI agents in a LangGraph pipeline",
            "Live venue research via Tavily (up to 18 parallel searches)",
            "Google Maps routing with per-step transit directions",
            "MBTA live transit integration for Boston",
            "RAG personalization - learns from your saved adventures",
            "Real-time streaming - adventures appear as each one finishes",
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
    try:
        stats = coordinator.get_cache_stats()
        return {"cache_stats": stats, "cache_enabled": coordinator.enable_cache}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/clear-cache")
async def clear_cache(
    current_user: dict = Depends(get_current_user),
    coordinator: LangGraphCoordinator = Depends(get_coordinator)
):
    try:
        coordinator.clear_research_cache()
        return {"success": True, "message": "Research cache cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))