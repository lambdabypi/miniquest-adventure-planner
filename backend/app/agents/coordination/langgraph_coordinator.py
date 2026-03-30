# backend/app/agents/coordination/langgraph_coordinator.py
"""LangGraph coordinator - WITH GOOGLE MAPS ROUTE OPTIMIZATION + TYPO-TOLERANT MATCHING"""

from langgraph.graph import StateGraph, END
from openai import AsyncOpenAI
import logging
from datetime import datetime
from typing import Optional, Tuple, List, Dict, Callable
import os
import time
import re
import asyncio
import googlemaps
import urllib.parse
from difflib import SequenceMatcher
from ...core.telemetry import get_tracer

from .workflow_state import AdventureState
from ..location import LocationParserAgent
from ..intent import IntentParserAgent
from ..scouting import VenueScoutAgent
from ..discovery import TavilyResearchAgent
from ..routing import EnhancedRoutingAgent
from ..creation import AdventureCreatorAgent
from ...core.config import settings

logger = logging.getLogger(__name__)


class LangGraphCoordinator:
    """
    OPTIMIZED LangGraph coordinator WITH GOOGLE MAPS ROUTE OPTIMIZATION + TYPO-TOLERANT MATCHING
    - Parallel venue research (60-75% faster)
    - Research result caching (90%+ faster on hits)
    - Async adventure creation (20-30% faster)
    - RAG personalization
    - ✅ Google Maps route optimization (optimal waypoint ordering)
    - ✅ Typo-tolerant venue matching (handles LLM-introduced typos)
    - ✅ Real-time progress tracking
    - ✅ Research summary node removed (saves 3-15s)
    - ✅ Parallel nearest-branch lookups
    - ✅ Name-similarity guard on branch swaps (prevents wrong-business substitution)
    """

    def __init__(self, rag_system=None, enable_cache=True):
        self.name = "LangGraphCoordinator"
        self.logger = logging.getLogger(f"coordinator.{self.name.lower()}")

        self.rag_system = rag_system
        self.enable_cache = enable_cache
        self.progress_callback = None

        if settings.GOOGLE_MAPS_KEY:
            self.gmaps = googlemaps.Client(key=settings.GOOGLE_MAPS_KEY)
            self.route_optimization_enabled = True
        else:
            self.gmaps = None
            self.route_optimization_enabled = False

        self._validate_api_keys()
        self._initialize_agents()
        self.workflow = self._build_workflow()
        self.timing_data = {}

        self.logger.info("✅ OPTIMIZED LangGraph Coordinator initialized")
        self.logger.info("   - Parallel research: ENABLED")
        self.logger.info(f"   - Research caching: {'ENABLED' if enable_cache else 'DISABLED'}")
        self.logger.info("   - Async adventure creation: ENABLED")
        self.logger.info(f"   - Google Maps route optimization: {'ENABLED' if self.route_optimization_enabled else 'DISABLED'}")
        self.logger.info("   - Typo-tolerant matching: ENABLED")
        self.logger.info("   - Real-time progress: ENABLED")
        self.logger.info("   - Research summary node: REMOVED (faster)")
        self.logger.info("   - Parallel branch lookups: ENABLED")
        self.logger.info("   - Branch-swap name guard: ENABLED")
        if rag_system:
            self.logger.info("   - RAG personalization: ENABLED")

    def _validate_api_keys(self):
        openai_key = os.getenv("OPENAI_API_KEY")
        tavily_key = os.getenv("TAVILY_API_KEY")
        if not openai_key:
            raise ValueError("OPENAI_API_KEY required")
        if not tavily_key:
            raise ValueError("TAVILY_API_KEY required")
        self.openai_key = openai_key
        self.tavily_key = tavily_key

    def _initialize_agents(self):
        self.location_parser = LocationParserAgent()
        self.intent_parser = IntentParserAgent()
        self.venue_scout = VenueScoutAgent()
        self.research_agent = TavilyResearchAgent(
            tavily_api_key=self.tavily_key,
            use_cache=self.enable_cache
        )
        self.routing_agent = EnhancedRoutingAgent()
        self.adventure_creator = AdventureCreatorAgent()
        self.logger.info("✅ All OPTIMIZED agents initialized")

    def _build_workflow(self) -> StateGraph:
        workflow = StateGraph(AdventureState)

        workflow.add_node("parse_location",     self._parse_location_node)
        workflow.add_node("get_personalization", self._get_personalization_node)
        workflow.add_node("parse_intent",       self._parse_intent_node)
        workflow.add_node("scout_venues",       self._scout_venues_node)
        workflow.add_node("research_venues",    self._research_venues_node)
        workflow.add_node("enhance_routing",    self._enhance_routing_node)
        workflow.add_node("create_adventures",  self._create_adventures_node)

        # ✅ Stop early if LocationParser set a clarification (e.g. NOT_FOUND neighborhood)
        workflow.add_conditional_edges(
            "parse_location",
            self._should_continue_after_location,
            {"continue": "get_personalization", "stop": END}
        )
        workflow.add_edge("get_personalization", "parse_intent")
        workflow.add_conditional_edges(
            "parse_intent",
            self._should_continue_after_intent,
            {"continue": "scout_venues", "stop": END}
        )
        workflow.add_edge("scout_venues",    "research_venues")
        workflow.add_edge("research_venues", "enhance_routing")
        workflow.add_edge("enhance_routing", "create_adventures")
        workflow.add_edge("create_adventures", END)

        workflow.set_entry_point("parse_location")
        return workflow.compile()

    def _should_continue_after_location(self, state: AdventureState) -> str:
        error = state.get("error")
        if isinstance(error, dict) and error.get("type") == "clarification_needed":
            logger.info("🛑 Stopping after location parse - clarification needed")
            return "stop"
        return "continue"

    def _should_continue_after_intent(self, state: AdventureState) -> str:
        error = state.get("error")
        if isinstance(error, dict) and error.get("type") == "clarification_needed":
            logger.info("🛑 Stopping - clarification needed")
            return "stop"
        if not state.get("parsed_preferences"):
            state["error"] = {
                "type": "clarification_needed",
                "message": "What would you like to explore?",
                "suggestions": ["Museums and coffee shops", "Parks and restaurants"]
            }
            return "stop"
        return "continue"

    # =========================================================================
    # PROGRESS TRACKING
    # =========================================================================

    def _emit_progress(self, update: Dict):
        if self.progress_callback:
            try:
                if asyncio.iscoroutinefunction(self.progress_callback):
                    asyncio.create_task(self.progress_callback(update))
                else:
                    self.progress_callback(update)
            except Exception as e:
                self.logger.error(f"Progress callback error: {e}")

    # =========================================================================
    # GOOGLE MAPS ROUTE OPTIMIZATION
    # =========================================================================

    async def _get_optimized_route_from_google(
        self,
        origin: str,
        locations: List[Dict],
        mode: str = "walking"
    ) -> Tuple[Optional[str], Optional[List[Dict]], Optional[Dict]]:
        if not self.route_optimization_enabled or not locations:
            return None, locations, None

        try:
            logger.info(f"🗺️ Using Google Maps to optimize {len(locations)} waypoints")
            location_addresses = [loc.get('address') for loc in locations if loc.get('address')]
            if not location_addresses:
                return None, locations, None

            destination = location_addresses[-1]
            waypoints   = location_addresses[:-1] if len(location_addresses) > 1 else []

            logger.info(f"   Origin: {origin}")
            logger.info(f"   Waypoints: {len(waypoints)}")
            logger.info(f"   Destination: {destination}")

            result = self.gmaps.directions(
                origin=origin,
                destination=destination,
                waypoints=waypoints,
                optimize_waypoints=True,
                mode=mode,
                units="metric"
            )

            if not result or not result[0]:
                return None, locations, None

            optimized_order = result[0].get("waypoint_order", [])
            logger.info(f"   ✅ Google optimized order: {optimized_order}")

            optimized_locations = []
            for idx in optimized_order:
                if idx < len(locations) - 1:
                    optimized_locations.append(locations[idx])
            optimized_locations.append(locations[-1])

            route_details = {
                "total_distance_km": sum(
                    leg.get("distance", {}).get("value", 0)
                    for leg in result[0].get("legs", [])
                ) / 1000,
                "total_duration_min": sum(
                    leg.get("duration", {}).get("value", 0)
                    for leg in result[0].get("legs", [])
                ) / 60,
                "optimization_savings": self._calculate_optimization_savings(optimized_order)
            }

            optimized_url = self._build_google_maps_url_from_directions(
                origin, optimized_locations, mode
            )

            logger.info(f"   🎯 Optimized route:")
            logger.info(f"      Distance: {route_details['total_distance_km']:.1f} km")
            logger.info(f"      Duration: {route_details['total_duration_min']:.0f} min")
            logger.info(f"      Order: {' → '.join([l.get('name', 'Unknown') for l in optimized_locations])}")

            return optimized_url, optimized_locations, route_details

        except Exception as e:
            logger.error(f"Google Maps optimization failed: {e}")
            return None, locations, None

    def _calculate_optimization_savings(self, optimized_order: List[int]) -> str:
        try:
            if optimized_order == list(range(len(optimized_order))):
                return "No reordering needed (already optimal)"
            reordered_count = sum(1 for i, idx in enumerate(optimized_order) if i != idx)
            return f"Reordered {reordered_count} waypoints for efficiency"
        except:
            return "Optimized"

    def _build_google_maps_url_from_directions(self, origin: str, locations: List[Dict], mode: str) -> str:
        if not locations:
            return None
        destination = locations[-1].get('address')
        waypoints   = [loc.get('address') for loc in locations[:-1]]
        enc_origin  = urllib.parse.quote(origin)
        enc_dest    = urllib.parse.quote(destination)
        wp_param    = ("&waypoints=" + "|".join(urllib.parse.quote(wp) for wp in waypoints if wp)) if waypoints else ""
        return (f"https://www.google.com/maps/dir/?api=1"
                f"&origin={enc_origin}&destination={enc_dest}{wp_param}&travelmode={mode}")

    def _reorder_steps_by_locations(self, steps: List[Dict], optimized_locations: List[Dict]) -> List[Dict]:
        if not steps or not optimized_locations:
            return steps
        step_map = {}
        for step in steps:
            activity = step.get("activity", "").lower()
            for loc in optimized_locations:
                if loc.get("name", "").lower() in activity:
                    step_map[loc.get("name")] = step
                    break
        reordered = []
        base_hour = 9
        for i, loc in enumerate(optimized_locations):
            step = step_map.get(loc.get("name"))
            if step:
                hour = base_hour + (i * 2)
                am_pm = 'PM' if hour >= 12 else 'AM'
                display_hour = hour % 12 if hour % 12 != 0 else 12
                step["time"] = f"{display_hour}:00 {am_pm}"
                reordered.append(step)
        return reordered if reordered else steps

    # =========================================================================
    # MAIN ROUTING METHOD
    # =========================================================================

    async def _add_individual_routing_to_adventures(
        self,
        adventures: list,
        all_enhanced_locations: list,
        user_address: Optional[str],
        target_location: str,
    ) -> list:
        logger.info(f"🗺️ Generating routes for {len(adventures)} adventures")

        for idx, adventure in enumerate(adventures):
            try:
                self._emit_progress({
                    "step": "create_adventures", "agent": "RoutingAgent",
                    "status": "in_progress",
                    "message": f"Building Google Maps route for '{adventure.get('title')}' ({idx+1}/{len(adventures)})",
                    "progress": 0.92 + (0.08 * (idx / len(adventures))),
                })

                venues_used = adventure.get("venues_used", [])
                if not venues_used:
                    logger.warning(f"   ⚠️ No venues_used for '{adventure.get('title')}'")
                    continue

                seen: set = set()
                unique_venues: List[str] = []
                for v in venues_used:
                    key = v.lower().strip()
                    if key not in seen:
                        seen.add(key)
                        unique_venues.append(v)

                logger.info(f"📍 '{adventure.get('title')}': {unique_venues}")

                adventure_locations = self._match_venues_to_locations_with_typo_tolerance(
                    unique_venues, all_enhanced_locations
                )
                logger.info(f"   ✅ Matched {len(adventure_locations)}/{len(unique_venues)} venues")

                if not adventure_locations:
                    continue

                origin = (
                    user_address.strip()
                    if user_address and user_address.strip()
                    else target_location
                )

                if len(adventure_locations) > 1:
                    optimized_url, optimized_locs, route_details = (
                        await self._get_optimized_route_from_google(
                            origin=origin,
                            locations=adventure_locations,
                            mode="walking",
                        )
                    )
                    if optimized_url and optimized_locs:
                        adventure["map_url"] = optimized_url
                        adventure["routing_info"] = {
                            "routing_available": True,
                            "optimized": True,
                            "optimization_method": "google_maps_directions_api",
                            "recommended_mode": "walking",
                            "total_stops": len(optimized_locs),
                            "matched_stops": len(optimized_locs),
                            "requested_stops": len(unique_venues),
                            "route_details": route_details,
                        }
                        adventure["steps"] = self._reorder_steps_by_locations(
                            adventure.get("steps", []), optimized_locs
                        )
                        logger.info(
                            f"   🎯 Google-optimized: "
                            f"{route_details.get('optimization_savings')} | "
                            f"{route_details.get('total_distance_km', 0):.1f} km"
                        )
                    else:
                        logger.warning("   ⚠️ Google optimization failed - using fallback")
                        url = self._build_basic_route_url(origin, adventure_locations)
                        if url:
                            adventure["map_url"] = url
                            adventure["routing_info"] = {
                                "routing_available": True, "optimized": False,
                                "optimization_method": "basic_fallback",
                                "recommended_mode": "walking",
                                "total_stops": len(adventure_locations),
                            }
                else:
                    url = self._build_basic_route_url(origin, adventure_locations)
                    if url:
                        adventure["map_url"] = url
                        adventure["routing_info"] = {
                            "routing_available": True, "optimized": False,
                            "optimization_method": "single_destination", "total_stops": 1,
                        }

            except Exception as e:
                logger.error(f"Routing error for '{adventure.get('title')}': {e}")

        return adventures

    def _build_basic_route_url(self, origin: str, locations: List[Dict]) -> Optional[str]:
        if not locations:
            return None
        enc = urllib.parse.quote
        stop_addresses = [loc["address"] for loc in locations if loc.get("address")]
        if not stop_addresses:
            return None
        base = "https://www.google.com/maps/dir/?api=1"
        if len(stop_addresses) == 1:
            return f"{base}&origin={enc(origin)}&destination={enc(stop_addresses[0])}&travelmode=walking"
        dest     = stop_addresses[-1]
        wps      = stop_addresses[:-1]
        wp_param = ("&waypoints=" + "|".join(enc(w) for w in wps[:9])) if wps else ""
        return f"{base}&origin={enc(origin)}&destination={enc(dest)}{wp_param}&travelmode=walking"

    # =========================================================================
    # HELPER METHODS
    # =========================================================================

    def _track_timing(self, operation: str, elapsed: float):
        self.timing_data[operation] = elapsed
        self.logger.debug(f"⏱️ {operation}: {elapsed:.2f}s")

    def _extract_city_name(self, location: str) -> str:
        """
        Return a routable city string from a location that may be:
          - "Boston, MA"                → "Boston, MA"
          - "North End, Boston, MA"     → "Boston, MA"   ✅ was returning "North End"
          - "SoHo, New York, NY"        → "New York, NY"
          - "123 Main St, Boston, MA"   → "Boston, MA"
        """
        if not location:
            return "Boston, MA"
        parts = [p.strip() for p in location.split(",")]

        # 3-part string: could be "Neighborhood, City, ST" or "Street, City, ST"
        # In both cases the city is parts[-2] + parts[-1]
        if len(parts) >= 3:
            return f"{parts[-2]}, {parts[-1]}"

        # 2-part: already "City, ST"
        if len(parts) == 2 and not any(c.isdigit() for c in parts[0]):
            return location

        return location

    def _find_nearest_branch(self, venue_name: str, resolved_address: str, origin: str) -> Optional[str]:
        """
        Synchronous Google Places lookup - called via run_in_executor.
        Only swaps the address when the nearest Places result actually matches
        the venue we searched for (name similarity >= 0.6), preventing wrong-
        business substitutions (e.g. Flour Bakery → unrelated street address).
        """
        if not self.route_optimization_enabled:
            return resolved_address
        try:
            origin_geocode = self.gmaps.geocode(origin)
            if not origin_geocode:
                return resolved_address

            origin_lat = origin_geocode[0]["geometry"]["location"]["lat"]
            origin_lng = origin_geocode[0]["geometry"]["location"]["lng"]

            results = self.gmaps.places(
                query=venue_name,
                location=(origin_lat, origin_lng),
                radius=5000,
            )
            candidates = results.get("results", [])
            if not candidates:
                return resolved_address

            def _dist_sq(place):
                loc = place["geometry"]["location"]
                return (loc["lat"] - origin_lat) ** 2 + (loc["lng"] - origin_lng) ** 2

            nearest = min(candidates, key=_dist_sq)
            nearest_address = nearest.get("formatted_address") or nearest.get("vicinity", "")
            nearest_name    = nearest.get("name", "")

            # ✅ Guard: only accept the swap if the returned name actually matches
            # what we searched for - prevents wrong-business substitutions
            name_similarity = SequenceMatcher(
                None,
                venue_name.lower().strip(),
                nearest_name.lower().strip(),
            ).ratio()

            if name_similarity < 0.6:
                logger.info(
                    f"   🚫 Branch swap rejected: '{nearest_name}' (sim={name_similarity:.2f}) "
                    f"doesn't match '{venue_name}' - keeping '{resolved_address}'"
                )
                return resolved_address

            if nearest_address and nearest_address != resolved_address:
                logger.info(
                    f"   🏪 Nearest branch swap: '{resolved_address}' → '{nearest_address}' "
                    f"(sim={name_similarity:.2f}, closer to origin '{origin}')"
                )
                return nearest_address

            return resolved_address

        except Exception as e:
            logger.warning(f"Nearest branch lookup failed for '{venue_name}': {e}")
            return resolved_address

    async def _convert_to_enhanced_locations(
        self,
        researched_venues: list,
        city_name: str,
        origin: Optional[str] = None,
    ) -> list:
        """
        ✅ ASYNC: Convert researched venues to routable location dicts.
        Nearest-branch Google Places lookups run in parallel via run_in_executor.

        Address priority:
          0. verified_address from TavilyResearch → nearest branch swap (parallel)
          1. Full street address on the venue dict
          2. address_hint + city
          3. venue name + neighbourhood + city
          4. venue name + city (geocodable fallback)
        """
        effective_origin = origin or city_name
        loop = asyncio.get_event_loop()

        def _clean(s: str) -> str:
            return re.sub(r"\s+", " ", s.strip())

        def _has_street(s: str) -> bool:
            if not s:
                return False
            s = _clean(s)
            return any(c.isdigit() for c in s) or any(
                kw in s.lower() for kw in (
                    "street", "st ", "ave", "avenue", "rd ", "road",
                    "blvd", "boulevard", "drive", "dr ", "lane", "ln ",
                    "place", "pl ", "way ", "court", "ct ",
                )
            )

        def _is_city_only(s: str) -> bool:
            return bool(s) and not _has_street(s)

        async def _resolve_one(venue: Dict) -> Dict:
            venue_name = venue.get("name", "Unknown")

            # Priority 0: Tavily-verified address → parallel nearest-branch swap
            raw_verified = venue.get("verified_address") or ""
            if raw_verified:
                cleaned = _clean(raw_verified)
                if _has_street(cleaned):
                    final_address = await loop.run_in_executor(
                        None, self._find_nearest_branch, venue_name, cleaned, effective_origin
                    )
                    logger.debug(f"✅ [{venue_name}] research-verified: {final_address}")
                    return {"name": venue_name, "address": final_address, "type": venue.get("type", "attraction")}

            address = venue.get("address", "").strip()
            hint    = venue.get("address_hint", "").strip()
            hood    = venue.get("neighborhood", "").strip()

            if _has_street(address):
                routable = address
                logger.debug(f"✅ [{venue_name}] full street address: {routable}")
            elif _has_street(hint):
                city_part = city_name.split(",")[0].strip()
                routable = hint if city_part.lower() in hint.lower() else f"{hint}, {city_name}"
                logger.debug(f"✅ [{venue_name}] hint + city: {routable}")
            elif hood and not _is_city_only(hood):
                routable = f"{venue_name}, {hood}, {city_name}"
                logger.info(f"⚠️ [{venue_name}] name + neighbourhood: {routable}")
            else:
                routable = f"{venue_name}, {city_name}"
                logger.warning(f"⚠️ [{venue_name}] name + city fallback: {routable}")

            return {"name": venue_name, "address": routable, "type": venue.get("type", "attraction")}

        results = await asyncio.gather(*[_resolve_one(v) for v in researched_venues])
        logger.info(f"✅ Converted {len(results)} venues to enhanced locations (parallel)")
        return list(results)

    def _calculate_string_similarity(self, str1: str, str2: str) -> float:
        if abs(len(str1) - len(str2)) > 5:
            return 0.0
        return SequenceMatcher(None, str1, str2).ratio()

    def _match_venues_to_locations_with_typo_tolerance(
        self, venues_used: List[str], locations: list
    ) -> list:
        matched = []
        used_indices = set()

        for venue_name in venues_used:
            venue_lower = venue_name.lower().strip()
            venue_words = set(venue_lower.split())
            best_match, best_score, best_idx, match_type = None, 0, None, None

            for idx, loc in enumerate(locations):
                if idx in used_indices:
                    continue
                loc_name  = loc.get("name", "").lower().strip()
                loc_words = set(loc_name.split())

                if venue_lower == loc_name:
                    best_match, best_idx, best_score, match_type = loc, idx, 1.0, "exact"
                    break

                if venue_lower in loc_name or loc_name in venue_lower:
                    if 0.9 > best_score:
                        best_score, best_match, best_idx, match_type = 0.9, loc, idx, "substring"
                    continue

                char_sim = self._calculate_string_similarity(venue_lower, loc_name)
                if char_sim >= 0.85 and char_sim > best_score:
                    best_score, best_match, best_idx, match_type = char_sim, loc, idx, "typo_tolerant"
                    continue

                if venue_words and loc_words:
                    overlap = len(venue_words & loc_words)
                    total   = len(venue_words | loc_words)
                    score   = overlap / total if total > 0 else 0
                    if score >= 0.5 and score > best_score:
                        best_score, best_match, best_idx, match_type = score, loc, idx, "word_overlap"

            if best_match and best_score >= 0.5:
                matched.append(best_match)
                used_indices.add(best_idx)
                if match_type == "typo_tolerant":
                    logger.info(f"   ✅ '{venue_name}' → '{best_match.get('name')}' (score: {best_score:.2f}, TYPO-CORRECTED)")
                else:
                    logger.debug(f"   ✅ '{venue_name}' → '{best_match.get('name')}' (score: {best_score:.2f}, {match_type})")
            else:
                logger.warning(f"   ⚠️ No match for '{venue_name}' (best: {best_score:.2f})")

        return matched

    def _match_venues_to_locations(self, venues_used: List[str], locations: list) -> list:
        return self._match_venues_to_locations_with_typo_tolerance(venues_used, locations)

    # =========================================================================
    # MAIN ENTRY POINTS
    # =========================================================================

    async def generate_adventures(
        self,
        user_input: str,
        user_address: Optional[str] = None,
        user_id: Optional[str] = None,
        generation_options: Optional[Dict] = None,
    ) -> Tuple[List[Dict], Dict]:
        self.logger.info(f"🔄 Starting OPTIMIZED workflow: '{user_input[:50]}...'")
        start_time = time.time()
        self.timing_data = {}
        initial_state = self._create_initial_state(user_input, user_address, user_id, generation_options)
        tracer = get_tracer()

        with tracer.start_as_current_span("miniquest.generate_adventures") as span:
            span.set_attribute("service.name", "miniquest")
            span.set_attribute("user.input", user_input[:200])
            span.set_attribute("user.id", user_id or "anonymous")
            span.set_attribute("location.provided", bool(user_address))
            try:
                final_state = await self.workflow.ainvoke(initial_state)

                error = final_state.get("error")
                if isinstance(error, dict) and error.get("type") == "clarification_needed":
                    span.set_attribute("workflow.outcome", "clarification_needed")
                    return [], {"error": error}
                if final_state.get("error"):
                    span.set_attribute("workflow.outcome", "error")
                    return [], {"error": final_state["error"]}

                adventures = final_state.get("final_adventures", [])
                total_time = time.time() - start_time
                metadata   = self._build_completion_metadata(final_state, total_time)

                span.set_attribute("workflow.outcome", "success")
                span.set_attribute("adventures.count", len(adventures))
                span.set_attribute("workflow.duration_seconds", round(total_time, 2))
                span.set_attribute("target.location", final_state.get("target_location", "unknown"))

                self.logger.info(f"✅ Workflow complete: {len(adventures)} adventures in {total_time:.2f}s")
                return adventures, metadata

            except Exception as e:
                span.set_attribute("workflow.outcome", "exception")
                span.set_attribute("error.message", str(e))
                self.logger.error(f"❌ Failed: {e}")
                return [], {"error": str(e)}

    async def generate_adventures_with_progress(
        self,
        user_input: str,
        user_address: Optional[str] = None,
        user_id: Optional[str] = None,
        progress_callback: Optional[Callable] = None,
        generation_options: Optional[Dict] = None,
    ) -> Tuple[List[Dict], Dict]:
        self.progress_callback = progress_callback

        self._emit_progress({
            "step": "initialize", "agent": "Coordinator",
            "status": "in_progress", "message": "Starting adventure generation...", "progress": 0.0
        })

        self.logger.info(f"🔄 Starting OPTIMIZED workflow WITH PROGRESS: '{user_input[:50]}...'")
        if user_id:
            self.logger.info(f"👤 User: {user_id}")

        start_time = time.time()
        self.timing_data = {}
        initial_state = self._create_initial_state(user_input, user_address, user_id, generation_options)
        tracer = get_tracer()

        with tracer.start_as_current_span("miniquest.generate_adventures") as span:
            span.set_attribute("service.name", "miniquest")
            span.set_attribute("user.input", user_input[:200])
            span.set_attribute("user.id", user_id or "anonymous")
            span.set_attribute("location.provided", bool(user_address))
            span.set_attribute("streaming", True)

            try:
                final_state = await self.workflow.ainvoke(initial_state)

                error = final_state.get("error")
                if isinstance(error, dict) and error.get("type") == "clarification_needed":
                    span.set_attribute("workflow.outcome", "clarification_needed")
                    self._emit_progress({
                        "step": "complete", "agent": "Coordinator",
                        "status": "clarification_needed",
                        "message": error.get("message", "Need more information"),
                        "progress": 1.0, "error": error
                    })
                    return [], {"error": error}

                if final_state.get("error"):
                    span.set_attribute("workflow.outcome", "error")
                    self._emit_progress({
                        "step": "complete", "agent": "Coordinator", "status": "error",
                        "message": f"Error: {final_state['error']}", "progress": 1.0,
                        "error": final_state["error"]
                    })
                    return [], {"error": final_state["error"]}

                adventures = final_state.get("final_adventures", [])
                total_time = time.time() - start_time
                metadata   = self._build_completion_metadata(final_state, total_time)

                span.set_attribute("workflow.outcome", "success")
                span.set_attribute("adventures.count", len(adventures))
                span.set_attribute("workflow.duration_seconds", round(total_time, 2))
                span.set_attribute("target.location", final_state.get("target_location", "unknown"))

                cache_stats = metadata.get("performance", {}).get("cache_stats", {})
                self._emit_progress({
                    "step": "complete", "agent": "Coordinator", "status": "complete",
                    "message": f"✅ Created {len(adventures)} adventures in {total_time:.1f}s",
                    "progress": 1.0,
                    "details": {
                        "adventure_count": len(adventures),
                        "total_time": total_time,
                        "cache_stats": cache_stats
                    }
                })

                self.logger.info(f"✅ OPTIMIZED workflow complete: {len(adventures)} adventures in {total_time:.2f}s")
                return adventures, metadata

            except Exception as e:
                span.set_attribute("workflow.outcome", "exception")
                span.set_attribute("error.message", str(e))
                self.logger.error(f"❌ Workflow error: {e}")
                self._emit_progress({
                    "step": "complete", "agent": "Coordinator", "status": "error",
                    "message": f"Failed: {str(e)}", "progress": 1.0, "error": str(e)
                })
                return [], {"error": str(e)}
            finally:
                self.progress_callback = None

    def _create_initial_state(
        self,
        user_input: str,
        user_address: Optional[str],
        user_id: Optional[str],
        generation_options: Optional[Dict] = None,
    ) -> AdventureState:
        return AdventureState(
            user_input=user_input,
            user_address=user_address,
            user_id=user_id,
            generation_options=generation_options or {},
            target_location=None,
            location_parsing_info=None,
            parsed_preferences=None,
            user_personalization=None,
            scouted_venues=[],
            researched_venues=[],
            enhanced_locations=[],
            final_adventures=[],
            metadata={"workflow_start": datetime.now().isoformat()},
            performance_metrics={},
            error=None,
            progress_updates=[],
            current_step=None,
            current_agent=None,
            step_progress=None,
        )

    def _build_completion_metadata(self, final_state: dict, total_time: float) -> dict:
        metadata = final_state.get("metadata", {})
        metadata.update({
            "workflow_success": True,
            "total_adventures": len(final_state.get("final_adventures", [])),
            "target_location": final_state.get("target_location")
        })
        performance = {
            "total_time_seconds": total_time,
            "timing_breakdown": self.timing_data,
            "optimizations_enabled": {
                "parallel_research": True,
                "research_caching": self.enable_cache,
                "async_adventure_creation": True,
                "google_route_optimization": self.route_optimization_enabled,
                "typo_tolerant_matching": True,
                "progress_tracking": True,
                "summary_node_removed": True,
                "parallel_branch_lookups": True,
                "branch_swap_name_guard": True,
            }
        }
        if hasattr(self.research_agent, 'get_cache_stats'):
            cache_stats = self.research_agent.get_cache_stats()
            performance["cache_stats"] = cache_stats
            hits   = cache_stats.get('hits', 0)
            misses = cache_stats.get('misses', 0)
            total  = hits + misses
            if total > 0:
                performance["cache_hit_rate"] = f"{(hits / total * 100):.1f}%"
                performance["cache_hits"] = hits
                performance["time_saved_estimate"] = f"{hits * 2}s"
        metadata["performance"] = performance
        if final_state.get("user_personalization"):
            metadata["personalization_applied"] = True
            metadata["user_history"] = {
                "has_history": final_state["user_personalization"].get("has_history", False),
                "total_adventures": final_state["user_personalization"].get("total_adventures", 0)
            }
        return metadata

    # =========================================================================
    # WORKFLOW NODES
    # =========================================================================

    async def _parse_location_node(self, state: AdventureState) -> AdventureState:
        """Node 1/6"""
        start_time = time.time()
        tracer = get_tracer()

        with tracer.start_as_current_span("miniquest.agent.location_parser") as span:
            span.set_attribute("agent.name", "LocationParser")
            span.set_attribute("agent.step", "1/6")

            self._emit_progress({
                "step": "parse_location", "agent": "LocationParser",
                "status": "in_progress",
                "message": "Detecting your city from the query...",
                "progress": 0.14
            })

            try:
                result = await self.location_parser.process({
                    "user_input": state["user_input"],
                    "user_address": state.get("user_address")
                })

                if result["success"]:
                    state["target_location"] = result["data"]["target_location"]
                    state["location_parsing_info"] = result["data"]
                    span.set_attribute("output.target_location", state["target_location"])
                    span.set_attribute("agent.outcome", "success")
                    self._emit_progress({
                        "step": "parse_location", "agent": "LocationParser",
                        "status": "complete",
                        "message": f"📍 Searching in: {state['target_location']}",
                        "progress": 0.14,
                        "details": {"location": state["target_location"]}
                    })

                else:
                    # ✅ LocationParser returned needs_clarification (e.g. NOT_FOUND neighborhood).
                    # Surface this to the user instead of silently falling back.
                    error_data = result.get("data", {})
                    if error_data.get("needs_clarification"):
                        state["error"] = {
                            "type": "clarification_needed",
                            "location_not_found": True,          # ✅ distinct flag for frontend
                            "clarification_message": error_data.get("clarification_message"),
                            "suggestions": error_data.get("suggestions", []),
                        }
                        span.set_attribute("agent.outcome", "clarification_needed")
                        self._emit_progress({
                            "step": "parse_location", "agent": "LocationParser",
                            "status": "clarification_needed",
                            "message": error_data.get("clarification_message", "Location not found"),
                            "progress": 0.14,
                        })
                    else:
                        # Generic failure - fall back to user_address
                        state["target_location"] = state.get("user_address", "Boston, MA")
                        span.set_attribute("agent.outcome", "fallback")

            except Exception as e:
                state["target_location"] = state.get("user_address", "Boston, MA")
                span.set_attribute("agent.outcome", "error")
                span.set_attribute("error.message", str(e))
                self.logger.error(f"Location parsing error: {e}")

            elapsed = time.time() - start_time
            span.set_attribute("agent.duration_seconds", round(elapsed, 3))
            self._track_timing("parse_location", elapsed)

        return state

    async def _get_personalization_node(self, state: AdventureState) -> AdventureState:
        """Node 1.5/6"""
        start_time = time.time()
        tracer = get_tracer()

        with tracer.start_as_current_span("miniquest.agent.personalization") as span:
            span.set_attribute("agent.name", "RAG")
            span.set_attribute("agent.step", "1.5/6")

            self._emit_progress({
                "step": "personalization", "agent": "RAG",
                "status": "in_progress",
                "message": "Checking your adventure history...",
                "progress": 0.21
            })

            user_id = state.get("user_id")
            if not user_id or not self.rag_system:
                span.set_attribute("agent.outcome", "skipped")
                self._emit_progress({
                    "step": "personalization", "agent": "RAG",
                    "status": "complete",
                    "message": "No past history - generating fresh recommendations",
                    "progress": 0.21
                })
                state["user_personalization"] = None
                elapsed = time.time() - start_time
                span.set_attribute("agent.duration_seconds", round(elapsed, 3))
                self._track_timing("personalization", elapsed)
                return state

            try:
                target_location  = state.get("target_location", "general")
                personalization  = self.rag_system.get_user_personalization(
                    user_id=user_id, location=target_location
                )
                state["user_personalization"] = personalization
                span.set_attribute("agent.outcome", "success")
                span.set_attribute("output.has_history", personalization.get("has_history", False))
                span.set_attribute("output.total_adventures", personalization.get("total_adventures", 0))

                if personalization.get("has_history"):
                    self._emit_progress({
                        "step": "personalization", "agent": "RAG",
                        "status": "complete",
                        "message": f"Found {personalization['total_adventures']} past adventures - personalising results",
                        "progress": 0.21
                    })
                else:
                    self._emit_progress({
                        "step": "personalization", "agent": "RAG",
                        "status": "complete",
                        "message": "First time here - no history yet",
                        "progress": 0.21
                    })
            except Exception as e:
                span.set_attribute("agent.outcome", "error")
                span.set_attribute("error.message", str(e))
                self.logger.error(f"Personalization error: {e}")
                state["user_personalization"] = None

            elapsed = time.time() - start_time
            span.set_attribute("agent.duration_seconds", round(elapsed, 3))
            self._track_timing("personalization", elapsed)

        return state

    async def _parse_intent_node(self, state: AdventureState) -> AdventureState:
        """Node 2/6"""
        start_time = time.time()
        tracer = get_tracer()

        with tracer.start_as_current_span("miniquest.agent.intent_parser") as span:
            span.set_attribute("agent.name", "IntentParser")
            span.set_attribute("agent.step", "2/6")

            self._emit_progress({
                "step": "parse_intent", "agent": "IntentParser",
                "status": "in_progress",
                "message": "Interpreting your vibe and preferences...",
                "progress": 0.28
            })

            try:
                personalization = state.get("user_personalization")
                context_additions = []
                if personalization and personalization.get("has_history"):
                    context_additions.append(
                        f"User has {personalization['total_adventures']} saved adventures "
                        f"with avg rating {personalization['average_rating']:.1f}/5"
                    )

                result = await self.intent_parser.process({
                    "user_input": state["user_input"],
                    "user_address": state.get("user_address"),
                    "personalization_context": " | ".join(context_additions) if context_additions else None
                })

                if not result["success"] or result["data"].get("needs_clarification"):
                    error_data = result["data"]
                    state["error"] = {
                        "type": "clarification_needed",
                        "message": error_data.get("clarification_message", "Please be more specific"),
                        "suggestions": error_data.get("suggestions", []),
                        "out_of_scope": error_data.get("out_of_scope", False),
                        "scope_issue": error_data.get("scope_issue"),
                        "detected_city": error_data.get("detected_city"),
                        "unrelated_query": error_data.get("unrelated_query", False),
                        "query_type": error_data.get("query_type"),
                    }
                    span.set_attribute("agent.outcome", "clarification_needed")
                    return state

                state["parsed_preferences"] = result["data"]["parsed_preferences"]
                prefs = result["data"]["parsed_preferences"].get("preferences", [])
                mood  = result["data"]["parsed_preferences"].get("mood", "exploratory")
                stops = state.get("generation_options", {}).get("stops_per_adventure", 3)

                span.set_attribute("agent.outcome", "success")
                span.set_attribute("intent.preferences", str(prefs))
                span.set_attribute("intent.mood", mood)

                self._emit_progress({
                    "step": "parse_intent", "agent": "IntentParser",
                    "status": "complete",
                    "message": (
                        f"Vibe: {mood} · Looking for: {', '.join(prefs[:3])}"
                        f"{'...' if len(prefs) > 3 else ''} · {stops} stops each"
                    ),
                    "progress": 0.28,
                    "details": {"preferences": prefs, "mood": mood}
                })

            except Exception as e:
                span.set_attribute("agent.outcome", "error")
                span.set_attribute("error.message", str(e))
                logger.error(f"Intent error: {e}")

            elapsed = time.time() - start_time
            span.set_attribute("agent.duration_seconds", round(elapsed, 3))
            self._track_timing("parse_intent", elapsed)

        return state

    async def _scout_venues_node(self, state: AdventureState) -> AdventureState:
        """Node 3/6"""
        start_time = time.time()
        tracer = get_tracer()

        with tracer.start_as_current_span("miniquest.agent.venue_scout") as span:
            span.set_attribute("agent.name", "VenueScout")
            span.set_attribute("agent.step", "3/6")

            prefs    = state.get("parsed_preferences", {}).get("preferences", [])
            location = state.get("target_location", "Boston, MA")
            city     = location.split(",")[0].strip()

            self._emit_progress({
                "step": "scout_venues", "agent": "VenueScout",
                "status": "in_progress",
                "message": f"Searching Google Places for {', '.join(prefs[:2]) or 'venues'} in {city}...",
                "progress": 0.43
            })

            try:
                result = await self.venue_scout.process({
                    "preferences":        prefs,
                    "location":           location,
                    "user_query":         state.get("user_input", ""),
                    "generation_options": state.get("generation_options", {}),
                    # ✅ proximity_mode = True when location came from user_address
                    # (i.e. the user said "near me" / "nearby" with no explicit place)
                    "proximity_mode": (
                        state.get("location_parsing_info", {}).get("location_source")
                        == "user_address"
                    ),
                })

                if result["success"]:
                    venues   = result["data"]["venues"]
                    strategy = result["data"].get("search_strategy", "unknown")

                    if strategy == "google_places_primary":
                        venues = await self.venue_scout._fetch_websites_for_venues(venues)
                        logger.info(f"   🌐 Websites fetched for {sum(1 for v in venues if v.get('website'))} venues")

                    state["scouted_venues"] = venues
                    span.set_attribute("agent.outcome", "success")
                    span.set_attribute("output.venues_found", len(venues))
                    span.set_attribute("output.search_strategy", strategy)

                    strategy_label = {
                        "google_places_primary": "Google Places",
                        "tavily_discovery": "Tavily web search",
                        "knowledge_based": "AI knowledge base",
                    }.get(strategy, strategy)

                    self._emit_progress({
                        "step": "scout_venues", "agent": "VenueScout",
                        "status": "complete",
                        "message": f"Found {len(venues)} venues via {strategy_label}",
                        "progress": 0.43,
                        "details": {"venue_count": len(venues), "strategy": strategy}
                    })

            except Exception as e:
                span.set_attribute("agent.outcome", "error")
                span.set_attribute("error.message", str(e))
                logger.error(f"Scout error: {e}")

            elapsed = time.time() - start_time
            span.set_attribute("agent.duration_seconds", round(elapsed, 3))
            self._track_timing("scout_venues", elapsed)

        return state

    async def _research_venues_node(self, state: AdventureState) -> AdventureState:
        """Node 4/6"""
        start_time = time.time()
        tracer = get_tracer()
        venues = state.get("scouted_venues", [])

        with tracer.start_as_current_span("miniquest.agent.tavily_research") as span:
            span.set_attribute("agent.name", "TavilyResearch")
            span.set_attribute("agent.step", "4/6")
            span.set_attribute("input.venues_to_research", len(venues))

            stops      = max(1, min(6, int(state.get("generation_options", {}).get("stops_per_adventure", 3))))
            max_venues = min(stops * 3, 18)
            venue_names = [v.get("name", "?") for v in venues[:max_venues]]

            self._emit_progress({
                "step": "research_venues", "agent": "TavilyResearch",
                "status": "in_progress",
                "message": (
                    f"Live-researching {min(len(venues), max_venues)} venues in parallel: "
                    f"{', '.join(venue_names[:3])}{'...' if len(venue_names) > 3 else ''}"
                ),
                "progress": 0.57
            })

            try:
                result = await self.research_agent.process({
                    "venues":      venues,
                    "location":    state.get("target_location", "Boston, MA"),
                    "max_venues":  max_venues,
                })

                if result["success"]:
                    state["researched_venues"] = result["data"]["researched_venues"]
                    state["metadata"]["research_stats"] = result["data"]["research_stats"]

                    stats = result["data"]["research_stats"]
                    cache_rate = stats.get("cache_hit_rate", "0%")
                    cache_note = f" ({cache_rate} from cache)" if cache_rate != "0%" else " (all fresh)"

                    span.set_attribute("agent.outcome", "success")
                    span.set_attribute("output.venues_researched", stats.get("total_venues", 0))
                    span.set_attribute("output.total_insights", stats.get("total_insights", 0))
                    span.set_attribute("output.cache_hit_rate", cache_rate)
                    span.set_attribute("output.max_venues_requested", max_venues)

                    self._emit_progress({
                        "step": "research_venues", "agent": "TavilyResearch",
                        "status": "complete",
                        "message": (
                            f"Gathered {stats.get('total_insights', 0)} live insights across "
                            f"{stats.get('total_venues', 0)} venues{cache_note}"
                        ),
                        "progress": 0.71,
                        "details": {
                            "insights": stats.get("total_insights", 0),
                            "venues": stats.get("total_venues", 0),
                            "cache_hit_rate": cache_rate,
                        }
                    })

            except Exception as e:
                span.set_attribute("agent.outcome", "error")
                span.set_attribute("error.message", str(e))
                logger.error(f"Research error: {e}")

            elapsed = time.time() - start_time
            span.set_attribute("agent.duration_seconds", round(elapsed, 3))
            self._track_timing("research_venues", elapsed)

        return state

    async def _enhance_routing_node(self, state: AdventureState) -> AdventureState:
        """Node 5/6 - async with parallel branch lookups"""
        start_time = time.time()
        tracer = get_tracer()

        with tracer.start_as_current_span("miniquest.agent.routing") as span:
            span.set_attribute("agent.name", "RoutingAgent")
            span.set_attribute("agent.step", "5/6")

            researched = state.get("researched_venues", [])
            self._emit_progress({
                "step": "enhance_routing", "agent": "RoutingAgent",
                "status": "in_progress",
                "message": f"Resolving addresses for {len(researched)} venues in parallel...",
                "progress": 0.78
            })

            try:
                city_name = self._extract_city_name(state.get("target_location", "Boston, MA"))
                enhanced_locations = await self._convert_to_enhanced_locations(
                    researched,
                    city_name,
                    origin=state.get("user_address") or state.get("target_location"),
                )
                state["enhanced_locations"] = enhanced_locations

                verified = sum(1 for loc in enhanced_locations if any(
                    c.isdigit() for c in loc.get("address", "")
                ))
                span.set_attribute("agent.outcome", "success")
                span.set_attribute("output.locations_prepared", len(enhanced_locations))
                span.set_attribute("output.addresses_verified", verified)

                self._emit_progress({
                    "step": "enhance_routing", "agent": "RoutingAgent",
                    "status": "complete",
                    "message": f"Addresses resolved: {verified}/{len(enhanced_locations)} street-level",
                    "progress": 0.85,
                    "details": {"total": len(enhanced_locations), "verified": verified}
                })

            except Exception as e:
                span.set_attribute("agent.outcome", "error")
                span.set_attribute("error.message", str(e))
                logger.error(f"Routing prep error: {e}")

            elapsed = time.time() - start_time
            span.set_attribute("agent.duration_seconds", round(elapsed, 3))
            self._track_timing("enhance_routing", elapsed)

        return state

    async def _create_adventures_node(self, state: AdventureState) -> AdventureState:
        """Node 6/6 - emits each adventure via SSE as soon as it's ready"""
        start_time = time.time()
        tracer = get_tracer()

        with tracer.start_as_current_span("miniquest.agent.adventure_creator") as span:
            span.set_attribute("agent.name", "AdventureCreator")
            span.set_attribute("agent.step", "6/6")
            span.set_attribute("input.venues_available", len(state.get("researched_venues", [])))

            stops    = state.get("generation_options", {}).get("stops_per_adventure", 3)
            location = state.get("target_location", "Boston, MA").split(",")[0].strip()

            self._emit_progress({
                "step": "create_adventures", "agent": "AdventureCreator",
                "status": "in_progress",
                "message": f"Crafting 3 unique {stops}-stop adventures in {location}...",
                "progress": 0.85
            })

            completed_adventures: List[Dict] = []

            async def on_adventure_ready(adventure: Dict, count: int):
                try:
                    routed = await self._add_individual_routing_to_adventures(
                        [adventure],
                        state.get("enhanced_locations", []),
                        state.get("user_address"),
                        state.get("target_location", "Boston, MA"),
                    )
                    adventure = routed[0] if routed else adventure
                    completed_adventures.append(adventure)

                    title = adventure.get("title", f"Adventure {count}")
                    self._emit_progress({
                        "step": "create_adventures",
                        "agent": "AdventureCreator",
                        "status": "adventure_ready",
                        "message": f"Adventure {count}/3 ready: {title}",
                        "progress": 0.85 + (0.15 * count / 3),
                        "details": {
                            "adventure": adventure,
                            "adventure_index": count - 1,
                            "total_expected": 3,
                        }
                    })
                    logger.info(f"   ✅ Adventure {count}/3 emitted: '{title}'")
                except Exception as e:
                    logger.error(f"Per-adventure routing/emit failed: {e}")
                    completed_adventures.append(adventure)

            try:
                result = await self.adventure_creator.process({
                    "researched_venues":    state.get("researched_venues", []),
                    "enhanced_locations":   state.get("enhanced_locations", []),
                    "parsed_preferences":   state.get("parsed_preferences", {}),
                    "target_location":      state.get("target_location", "Boston, MA"),
                    "user_personalization": state.get("user_personalization"),
                    "generation_options":   state.get("generation_options", {}),
                    "on_adventure_ready":   on_adventure_ready,
                })

                if completed_adventures:
                    adventures = completed_adventures
                elif result["success"]:
                    adventures = await self._add_individual_routing_to_adventures(
                        result["data"]["adventures"],
                        state.get("enhanced_locations", []),
                        state.get("user_address"),
                        state.get("target_location", "Boston, MA"),
                    )
                else:
                    adventures = []

                state["final_adventures"] = adventures
                titles = [a.get("title", "Untitled") for a in adventures]

                span.set_attribute("agent.outcome", "success")
                span.set_attribute("output.adventures_created", len(adventures))
                span.set_attribute("output.google_routes_used",
                    sum(1 for a in adventures
                        if a.get("routing_info", {}).get("optimization_method") == "google_maps_directions_api")
                )

                self._emit_progress({
                    "step": "create_adventures", "agent": "AdventureCreator",
                    "status": "complete",
                    "message": f"All done! {len(adventures)} adventures ready: {' · '.join(titles)}",
                    "progress": 1.0,
                    "details": {"titles": titles}
                })

            except Exception as e:
                span.set_attribute("agent.outcome", "error")
                span.set_attribute("error.message", str(e))
                logger.error(f"Creation error: {e}")

            elapsed = time.time() - start_time
            span.set_attribute("agent.duration_seconds", round(elapsed, 3))
            self._track_timing("create_adventures", elapsed)

        return state

    # =========================================================================
    # CACHE MANAGEMENT
    # =========================================================================

    def get_cache_stats(self) -> Dict:
        if hasattr(self.research_agent, 'get_cache_stats'):
            return self.research_agent.get_cache_stats()
        return {}

    def clear_research_cache(self):
        if hasattr(self.research_agent, 'clear_cache'):
            self.research_agent.clear_cache()
            self.logger.info("🗑️ Research cache cleared")