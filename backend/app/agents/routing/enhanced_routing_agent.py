# backend/app/agents/routing/enhanced_routing_agent.py
# KEY CHANGE: calls Directions API with optimize_waypoints=True when key is available,
# then reorders stops before building the Maps URL so the link reflects the optimal order.

import googlemaps
import urllib.parse
import logging
from typing import List, Dict, Optional
from ...core.config import settings

logger = logging.getLogger(__name__)


class EnhancedRoutingAgent:
    """Multi-stop routing with Google Directions API waypoint optimization"""

    def __init__(self):
        if settings.GOOGLE_MAPS_KEY:
            self.gmaps = googlemaps.Client(key=settings.GOOGLE_MAPS_KEY)
            self.enabled = True
        else:
            self.gmaps = None
            self.enabled = False
        logger.info("✅ Enhanced Routing Agent initialized")

    # ─── Public entry ─────────────────────────────────────────────────────────

    async def generate_intelligent_route(
        self,
        locations: List[Dict],
        user_address: Optional[str],
        target_location: str,
        user_preferences: Dict = None,
    ) -> Dict:
        if not locations:
            return {"error": "No locations provided"}

        logger.info(f"🗺️ ROUTING: {len(locations)} locations, origin={user_address}")

        try:
            route_data = self._prepare_complete_route_data(locations, user_address)
            if not route_data:
                return {"error": "Could not prepare route data"}

            # ── Try Google Directions API for waypoint optimization ────────────
            if self.enabled and len(route_data["all_stops"]) > 1:
                optimized = self._optimize_waypoints_via_api(route_data)
                if optimized:
                    route_data["all_stops"] = optimized
                    logger.info(f"✅ Waypoints optimized via Directions API")
                else:
                    logger.warning("⚠️ Directions API optimization failed - using original order")

            routing_options = self._generate_complete_routing_options(route_data, user_preferences)

            return {
                "routing_context": route_data["context"],
                "routing_options": routing_options,
                "primary_route_url": routing_options.get("primary_url"),
                "recommended_travel_mode": routing_options.get("recommended_mode"),
                "total_stops_included": len(route_data["all_stops"]),
                "routing_debug": {
                    "origin": route_data["origin"],
                    "all_stops": [s["name"] for s in route_data["all_stops"]],
                    "route_addresses": [s["address"] for s in route_data["all_stops"]],
                    "waypoints_optimized": route_data.get("waypoints_optimized", False),
                },
            }

        except Exception as e:
            logger.error(f"Routing generation error: {e}")
            return {"error": str(e)}

    # ─── Waypoint optimization via Directions API ─────────────────────────────

    def _optimize_waypoints_via_api(self, route_data: Dict) -> Optional[List[Dict]]:
        """
        Call gmaps.directions() with optimize_waypoints=True.
        Returns the stops reordered by the optimized waypoint_order,
        or None if the call fails.
        """
        try:
            origin = route_data["origin"]
            all_stops = route_data["all_stops"]
            stop_addresses = [s["address"] for s in all_stops]

            if len(stop_addresses) == 1:
                return all_stops  # Nothing to optimize

            final_dest = stop_addresses[-1]
            waypoints = stop_addresses[:-1]  # all but last

            directions = self.gmaps.directions(
                origin=origin,
                destination=final_dest,
                waypoints=waypoints,
                optimize_waypoints=True,
                mode="walking",
            )

            if not directions:
                return None

            # directions[0]['waypoint_order'] gives optimized indices into `waypoints`
            waypoint_order = directions[0].get("waypoint_order", [])
            if not waypoint_order:
                return all_stops  # No reordering needed

            # Rebuild stop list: optimized waypoints + final destination (unchanged)
            waypoint_stops = all_stops[:-1]  # mirrors `waypoints`
            final_stop = all_stops[-1]

            reordered = [waypoint_stops[i] for i in waypoint_order] + [final_stop]

            logger.info(f"  Original order: {[s['name'] for s in all_stops]}")
            logger.info(f"  Optimized order: {[s['name'] for s in reordered]}")

            route_data["waypoints_optimized"] = True
            return reordered

        except Exception as e:
            logger.warning(f"Waypoint optimization API call failed: {e}")
            return None

    # ─── Route data preparation ───────────────────────────────────────────────

    def _prepare_complete_route_data(
        self, locations: List[Dict], user_address: Optional[str]
    ) -> Optional[Dict]:
        logger.info(f"🔧 Preparing route data for {len(locations)} locations")

        all_valid_stops = []
        skipped = []

        for i, loc in enumerate(locations):
            name = loc.get("name", f"Location {i+1}")
            address = loc.get("address", "")
            if self._is_valid_address(address):
                all_valid_stops.append({
                    "name": name,
                    "address": self._clean_address(address),
                    "original_data": loc,
                })
                logger.info(f"  ✅ Stop {len(all_valid_stops)}: {name} → {address}")
            else:
                skipped.append(name)
                logger.warning(f"  ❌ Skipped: {name} → '{address}'")

        if not all_valid_stops:
            logger.error("❌ No valid addresses found")
            return None

        # Determine origin
        if user_address and self._is_valid_address(user_address):
            origin = self._clean_address(user_address)
            origin_name = "Your Location"
        else:
            first = all_valid_stops.pop(0)
            origin = first["address"]
            origin_name = first["name"]

        logger.info(f"🎯 Origin: {origin_name} | Stops: {len(all_valid_stops)}")

        return {
            "origin": origin,
            "origin_name": origin_name,
            "all_stops": all_valid_stops,
            "waypoints_optimized": False,
            "context": {
                "total_provided": len(locations),
                "valid_stops": len(all_valid_stops),
                "skipped": len(skipped),
                "user_origin_used": bool(user_address and self._is_valid_address(user_address)),
            },
        }

    # ─── Build routing options ────────────────────────────────────────────────

    def _generate_complete_routing_options(
        self, route_data: Dict, user_preferences: Dict = None
    ) -> Dict:
        origin = route_data["origin"]
        all_stops = route_data["all_stops"]

        if not all_stops:
            return {"primary_url": None, "recommended_mode": "walking", "options": []}

        logger.info(f"🗺️ Building routes for {len(all_stops)} stops")

        options = []
        for mode in ("walking", "transit", "driving"):
            url = self._build_maps_url(origin, all_stops, mode)
            if url:
                options.append({
                    "mode": mode,
                    "url": url,
                    "description": f"{mode.capitalize()} to {len(all_stops)} stop{'s' if len(all_stops) > 1 else ''}",
                    "recommended": mode == "walking",
                })

        primary = next((o for o in options if o["recommended"]), options[0] if options else None)

        logger.info(f"✅ {len(options)} route options | primary={primary['mode'] if primary else 'none'}")

        return {
            "primary_url": primary["url"] if primary else None,
            "recommended_mode": primary["mode"] if primary else "walking",
            "options": options,
            "total_stops": len(all_stops),
            "routing_summary": (
                f"{'Optimized' if route_data.get('waypoints_optimized') else 'Standard'} route "
                f"with {len(all_stops)} stop{'s' if len(all_stops) > 1 else ''}"
            ),
        }

    # ─── URL builder ──────────────────────────────────────────────────────────

    def _build_maps_url(
        self, origin: str, all_stops: List[Dict], travel_mode: str
    ) -> Optional[str]:
        try:
            stop_addresses = [s["address"] for s in all_stops]

            enc = urllib.parse.quote
            base = "https://www.google.com/maps/dir/?api=1"

            if len(stop_addresses) == 1:
                return (
                    f"{base}&origin={enc(origin)}"
                    f"&destination={enc(stop_addresses[0])}"
                    f"&travelmode={travel_mode}"
                )

            final_dest = stop_addresses[-1]
            waypoints = stop_addresses[:-1]

            # Google Maps URL limits: walking/transit = 9 waypoints, driving = 23
            max_wp = 9 if travel_mode in ("walking", "transit") else 23
            if len(waypoints) > max_wp:
                logger.warning(f"Truncating waypoints {len(waypoints)} → {max_wp} for {travel_mode}")
                waypoints = waypoints[:max_wp]

            wp_param = ("&waypoints=" + "|".join(enc(w) for w in waypoints)) if waypoints else ""

            url = (
                f"{base}&origin={enc(origin)}"
                f"&destination={enc(final_dest)}"
                f"{wp_param}"
                f"&travelmode={travel_mode}"
            )
            logger.info(f"  ✅ {travel_mode} URL ({len(url)} chars, {len(waypoints)} waypoints)")
            return url

        except Exception as e:
            logger.error(f"URL build error ({travel_mode}): {e}")
            return None

    # ─── Helpers ──────────────────────────────────────────────────────────────

    def _is_valid_address(self, address: str) -> bool:
        if not address or len(address.strip()) < 5:
            return False
        addr_lower = address.lower()
        geo_terms = [
            "street", "st", "avenue", "ave", "road", "rd", "drive", "dr",
            "boulevard", "blvd", "place", "pl", "way", "lane", "ln", "square",
            "parkway", "highway", "route", "trail", "circle", "court", "ct",
        ]
        location_terms = [
            "park", "museum", "center", "building", "house", "harbor", "beach",
            "campus", "hotel", "inn", "resort",
        ]
        has_geo = any(t in addr_lower for t in geo_terms)
        has_num = any(c.isdigit() for c in address)
        has_loc = "," in address and any(t in addr_lower for t in location_terms)
        return has_geo or has_num or has_loc

    def _clean_address(self, address: str) -> str:
        return " ".join(address.strip().replace('"', "").replace("'", "").split())