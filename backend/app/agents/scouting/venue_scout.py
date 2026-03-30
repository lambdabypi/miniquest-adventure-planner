# backend/app/agents/scouting/venue_scout.py
"""
Venue Scout — Google Places primary discovery + Tavily fallback.
Google Places is used for ALL city-level searches (not just specific addresses).
This gives proximity-ranked, geocoded venues with verified addresses from the start.
"""

from typing import List, Dict, Optional
from openai import AsyncOpenAI
import asyncio
import functools
import googlemaps
import json
import re
from datetime import datetime
from difflib import SequenceMatcher
from ..base import BaseAgent, ValidationError, ProcessingError
from ...core.config import settings
from .tavily_scout import TavilyVenueScout
import logging

logger = logging.getLogger(__name__)


# ─── Preference → Google Places type ─────────────────────────────────────────
PREF_TO_PLACE_TYPE: Dict[str, str] = {
    "bars":            "bar",
    "bar":             "bar",
    "nightlife":       "bar",
    "cocktail bars":   "bar",
    "rooftop bars":    "bar",
    "wine bars":       "bar",
    "breweries":       "brewery",
    "pubs":            "bar",
    "nightclubs":      "night_club",
    "dance clubs":     "night_club",
    "lounges":         "bar",
    "dive bars":       "bar",
    "restaurants":     "restaurant",
    "brunch spots":    "restaurant",
    "food markets":    "food",
    "bakeries":        "bakery",
    "cafes":           "cafe",
    "coffee shops":    "cafe",
    "coffee":          "cafe",
    "boba shops":      "cafe",
    "tea houses":      "cafe",
    "ice cream shops": "food",
    "museums":         "museum",
    "art galleries":   "art_gallery",
    "galleries":       "art_gallery",
    "historic sites":  "tourist_attraction",
    "famous landmarks":"tourist_attraction",
    "science centers": "museum",
    "cinemas":         "movie_theater",
    "indie cinemas":   "movie_theater",
    "parks":           "park",
    "gardens":         "park",
    "arboretums":      "park",
    "waterfronts":     "park",
    "trails":          "park",
    "boutiques":       "clothing_store",
    "vintage shops":   "store",
    "bookstores":      "book_store",
    "indie bookstores":"book_store",
    "antique shops":   "store",
    "thrift stores":   "store",
    "bowling":         "bowling_alley",
    "escape rooms":    "amusement_park",
    "arcades":         "amusement_park",
    "climbing gyms":   "gym",
    "spas":            "spa",
}

# keyword → Places text search query (used when type alone isn't specific enough)
PREF_TO_SEARCH_QUERY: Dict[str, str] = {
    "brunch spots":  "{city} brunch restaurant",
    "cocktail bars": "{city} cocktail bar",
    "rooftop bars":  "{city} rooftop bar",
    "wine bars":     "{city} wine bar",
    "breweries":     "{city} craft brewery taproom",
    "nightclubs":    "{city} nightclub",
    "dance clubs":   "{city} dance club",
    "indie bookstores": "{city} independent bookstore",
    "art galleries": "{city} art gallery",
    "escape rooms":  "{city} escape room",
    "climbing gyms": "{city} climbing gym",
}

# Known neighborhood aliases that Google Places addresses may use
_NEIGHBORHOOD_ALIASES: Dict[str, List[str]] = {
    "north end":    ["north end", "hanover st", "salem st", "prince st", "commercial st"],
    "south end":    ["south end", "tremont st", "columbus ave", "shawmut ave"],
    "back bay":     ["back bay", "boylston st", "newbury st", "commonwealth ave"],
    "beacon hill":  ["beacon hill", "charles st", "mt vernon st", "pinckney st"],
    "fenway":       ["fenway", "kenmore", "brookline ave", "park dr"],
    "seaport":      ["seaport", "fort point", "congress st", "summer st"],
    "cambridge":    ["cambridge", "harvard sq", "central sq", "kendall sq", "inman sq"],
    "brooklyn":     ["brooklyn", "williamsburg", "park slope", "dumbo", "bushwick"],
    "manhattan":    ["manhattan", "upper east", "upper west", "midtown", "downtown", "soho", "tribeca"],
    "chelsea":      ["chelsea"],
    "lower east side": ["lower east side", "les"],
    "east village": ["east village"],
    "west village": ["west village"],
}


class VenueScoutAgent(BaseAgent):
    """
    Venue discovery with three paths:
      Path 1 — Google Places Nearby  (city or specific address, Google Maps enabled)
      Path 2 — Tavily live discovery  (Google Maps unavailable, Tavily key present)
      Path 3 — GPT-4o knowledge       (last resort fallback)
    """

    def __init__(self):
        super().__init__("VenueScout")
        self.client = AsyncOpenAI()
        self.current_year = datetime.now().year

        if settings.GOOGLE_MAPS_KEY:
            self.gmaps = googlemaps.Client(key=settings.GOOGLE_MAPS_KEY)
            self.google_enabled = True
            logger.info("✅ Google Places venue discovery ENABLED (primary path)")
        else:
            self.gmaps = None
            self.google_enabled = False
            logger.warning("⚠️ Google Places disabled — using Tavily/GPT-4o fallback")

        if settings.TAVILY_API_KEY:
            self.tavily_scout = TavilyVenueScout(
                tavily_api_key=settings.TAVILY_API_KEY,
                openai_client=self.client,
            )
            self.tavily_enabled = True
        else:
            self.tavily_scout = None
            self.tavily_enabled = False

    # ─── Entry point ──────────────────────────────────────────────────────────

    async def process(self, input_data: Dict) -> Dict:
        required_fields = ["preferences", "location"]
        if not self.validate_input(input_data, required_fields):
            raise ValidationError(self.name, f"Missing required fields: {required_fields}")

        preferences        = input_data["preferences"]
        location           = input_data["location"]
        user_query         = input_data.get("user_query", "")
        parsed_prefs       = input_data.get("parsed_preferences", {})
        generation_options = input_data.get("generation_options", {})

        self.log_processing("Starting venue scouting", f"{preferences} in {location}")

        # Path 1 — Google Places (always preferred when available)
        if self.google_enabled:
            self.log_processing("Using GOOGLE PLACES discovery", location)
            return await self._google_places_search(
                preferences, location, user_query, generation_options
            )

        # Path 2 — Tavily
        if self.tavily_enabled:
            self.log_processing("Using TAVILY discovery", location)
            return await self._tavily_discovery_search(
                preferences, location, user_query, parsed_prefs, generation_options
            )

        # Path 3 — GPT-4o knowledge fallback
        self.log_processing("Using GPT-4o fallback", location)
        return await self._knowledge_based_search(preferences, location, user_query, parsed_prefs)

    # ─── Path 1: Google Places ────────────────────────────────────────────────

    async def _google_places_search(
        self,
        preferences: List[str],
        location: str,
        user_query: str,
        generation_options: Dict,
    ) -> Dict:
        try:
            # Geocode the city/address to get a lat/lng origin
            geocode = self.gmaps.geocode(location)
            if not geocode:
                logger.warning("Geocoding failed — falling back to Tavily/GPT")
                return await self._fallback(preferences, location, user_query, {})

            lat = geocode[0]["geometry"]["location"]["lat"]
            lng = geocode[0]["geometry"]["location"]["lng"]
            self.log_processing("Geocoded origin", f"{lat:.4f}, {lng:.4f}")

            loop = asyncio.get_event_loop()

            async def search_pref(pref: str) -> List[Dict]:
                return await loop.run_in_executor(
                    None,
                    functools.partial(
                        self._search_places_for_preference, lat, lng, pref, location
                    ),
                )

            results = await asyncio.gather(*[search_pref(p) for p in preferences[:6]])
            all_venues = [v for sublist in results for v in sublist]

            unique  = self._deduplicate_venues(all_venues)

            # ✅ Filter to requested neighborhood if one is present in location
            neighborhood = self._extract_neighborhood_from_location(location)
            if neighborhood:
                unique = self._filter_by_neighborhood(unique, neighborhood)
                self.log_processing(
                    "Neighborhood filter applied",
                    f"'{neighborhood}' — {len(unique)} venues remain"
                )

            diverse  = self._select_diverse_venues(unique, target_count=12)
            enhanced = [self._enhance_venue(v, location) for v in diverse]

            self.log_success(f"Google Places discovery: {len(enhanced)} venues")
            return self.create_response(True, {
                "venues": enhanced,
                "total_found": len(enhanced),
                "total_processed": len(all_venues),
                "location": location,
                "preferences": preferences,
                "search_strategy": "google_places_primary",
                "origin_coordinates": {"lat": lat, "lng": lng},
            })

        except Exception as e:
            self.log_error(f"Google Places search failed: {e}")
            return await self._fallback(preferences, location, user_query, {})

    def _search_places_for_preference(
        self, lat: float, lng: float, preference: str, location: str
    ) -> List[Dict]:
        """Run a synchronous Google Places search for one preference."""
        pref_lower = preference.lower().strip()
        city = location.split(",")[0].strip()

        venues: List[Dict] = []

        # Strategy A: text search (better for specific categories like "brunch spots")
        text_query_tmpl = PREF_TO_SEARCH_QUERY.get(pref_lower)
        if text_query_tmpl:
            text_query = text_query_tmpl.format(city=city)
            try:
                results = self.gmaps.places(
                    query=text_query,
                    location=(lat, lng),
                    radius=3000,
                )
                for place in results.get("results", [])[:8]:
                    v = self._convert_place(place, location, preference)
                    if v:
                        venues.append(v)
            except Exception as e:
                logger.warning(f"Text search failed for '{preference}': {e}")

        # Strategy B: nearby search by type (good for bars, cafes, parks, etc.)
        if len(venues) < 4:
            place_type = self._pref_to_type(pref_lower)
            try:
                results = self.gmaps.places_nearby(
                    location=(lat, lng),
                    radius=3000,
                    type=place_type,
                    open_now=False,
                )
                for place in results.get("results", [])[:8]:
                    v = self._convert_place(place, location, preference)
                    if v and v["name"] not in {x["name"] for x in venues}:
                        venues.append(v)
            except Exception as e:
                logger.warning(f"Nearby search failed for '{preference}': {e}")

        return venues[:6]

    def _convert_place(self, place: Dict, location: str, preference: str) -> Optional[Dict]:
        """Convert a Google Places result to the internal venue dict."""
        name = place.get("name", "")
        if not name or len(name) < 3:
            return None

        status = place.get("business_status", "")
        if status in ("CLOSED_PERMANENTLY", "CLOSED_TEMPORARILY"):
            return None

        address = (
            place.get("formatted_address")
            or place.get("vicinity")
            or ""
        )
        geo = place.get("geometry", {}).get("location", {})

        return {
            "name": name,
            "address": address,
            "address_hint": place.get("vicinity", address),
            "neighborhood": self._extract_neighborhood(address),
            "type": self._google_types_to_venue_type(place.get("types", [])),
            "category": preference.lower(),
            "google_place_id": place.get("place_id", ""),
            "google_rating": place.get("rating"),
            "google_user_ratings_total": place.get("user_ratings_total", 0),
            "business_status": status or "OPERATIONAL",
            "lat": geo.get("lat"),
            "lng": geo.get("lng"),
            "current_status_confidence": "High",
            "establishment_type": "Verified",
            "proximity_based": True,
            "website": None,
        }

    def _fetch_place_website(self, place_id: str) -> Optional[str]:
        if not place_id or not self.google_enabled:
            return None
        try:
            details = self.gmaps.place(
                place_id=place_id,
                fields=["website", "url"],
            )
            result = details.get("result", {})
            return result.get("website") or result.get("url")
        except Exception as e:
            logger.warning(f"Place details fetch failed for {place_id}: {e}")
            return None

    async def _fetch_websites_for_venues(self, venues: List[Dict]) -> List[Dict]:
        loop = asyncio.get_event_loop()

        async def fetch_one(venue: Dict) -> Dict:
            place_id = venue.get("google_place_id")
            if place_id and not venue.get("website"):
                website = await loop.run_in_executor(
                    None,
                    functools.partial(self._fetch_place_website, place_id),
                )
                if website:
                    venue = {**venue, "website": website}
            return venue

        return list(await asyncio.gather(*[fetch_one(v) for v in venues]))

    # ─── Neighborhood filtering ───────────────────────────────────────────────

    def _extract_neighborhood_from_location(self, location: str) -> Optional[str]:
        """
        Return the neighborhood component if location is 'Neighborhood, City, ST'
        rather than just a city. E.g. 'North End, Boston, MA' → 'north end'.
        A plain city string like 'Boston, MA' returns None.
        """
        parts = [p.strip() for p in location.split(",")]
        if len(parts) < 3:
            return None

        # First segment is a neighborhood only if it doesn't look like a street
        # address and isn't just a city/state abbreviation
        candidate = parts[0].lower()
        if any(c.isdigit() for c in candidate):
            return None
        if len(candidate) <= 2:
            return None
        # Reject bare city names that happen to be the first part
        city_part = parts[1].strip().lower()
        if candidate == city_part:
            return None
        return candidate

    def _neighborhood_match_score(self, neighborhood_query: str, venue: Dict) -> float:
        """
        Return a match score [0, 1] between a requested neighborhood and a venue.
        Checks the venue's neighborhood field and address against known aliases.
        """
        nq = neighborhood_query.lower().strip()

        # Direct alias lookup
        aliases = _NEIGHBORHOOD_ALIASES.get(nq, [nq])

        venue_neighborhood = (venue.get("neighborhood") or "").lower()
        venue_address      = (venue.get("address") or "").lower()
        search_text        = f"{venue_neighborhood} {venue_address}"

        # Exact alias match anywhere in address/neighborhood
        for alias in aliases:
            if alias in search_text:
                return 1.0

        # Fuzzy match on the neighborhood field itself
        if venue_neighborhood:
            score = SequenceMatcher(None, nq, venue_neighborhood).ratio()
            if score >= 0.7:
                return score

        return 0.0

    def _filter_by_neighborhood(
        self, venues: List[Dict], neighborhood: str, min_score: float = 0.7
    ) -> List[Dict]:
        """
        Keep only venues that match the requested neighborhood.
        If fewer than 3 venues pass, return all (prevents empty results for
        neighbourhoods where Google geocodes to the right lat/lng but uses
        slightly different address labeling).
        """
        scored = [
            (v, self._neighborhood_match_score(neighborhood, v))
            for v in venues
        ]
        filtered = [v for v, score in scored if score >= min_score]

        if len(filtered) < 3:
            logger.warning(
                f"Neighborhood filter for '{neighborhood}' matched only "
                f"{len(filtered)}/{len(venues)} venues — relaxing filter"
            )
            return venues  # Graceful fallback: return all rather than starve the pipeline

        return filtered

    # ─── Path 2: Tavily ───────────────────────────────────────────────────────

    async def _tavily_discovery_search(
        self,
        preferences: List[str],
        location: str,
        user_query: str,
        parsed_prefs: Dict,
        generation_options: Dict,
    ) -> Dict:
        try:
            raw = await self.tavily_scout.discover_venues(
                preferences=preferences,
                location=location,
                parsed_prefs=parsed_prefs,
                user_query=user_query,
                generation_options=generation_options,
            )
            if not raw:
                return await self._knowledge_based_search(preferences, location, user_query, parsed_prefs)

            validated = [
                self._enhance_venue(v, location)
                for v in raw
                if self._validate_venue(v)
            ]
            if not validated:
                return await self._knowledge_based_search(preferences, location, user_query, parsed_prefs)

            self.log_success(f"Tavily discovery: {len(validated)} venues")
            return self.create_response(True, {
                "venues": validated,
                "total_found": len(validated),
                "total_processed": len(raw),
                "location": location,
                "preferences": preferences,
                "search_strategy": "tavily_discovery",
            })
        except Exception as e:
            self.log_error(f"Tavily discovery failed: {e}")
            return await self._knowledge_based_search(preferences, location, user_query, parsed_prefs)

    # ─── Path 3: GPT-4o knowledge fallback ───────────────────────────────────

    async def _knowledge_based_search(
        self,
        preferences: List[str],
        location: str,
        user_query: str,
        parsed_prefs: Dict = None,
    ) -> Dict:
        try:
            prompt = self._build_scout_prompt(preferences, location, user_query, parsed_prefs or {})
            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=3000,
            )
            raw = json.loads(self._clean_json(response.choices[0].message.content))
            validated = [
                {**self._enhance_venue(v, location), "proximity_based": False}
                for v in raw
                if self._validate_venue(v)
            ]
            self.log_success(f"Knowledge-based search: {len(validated)} venues")
            return self.create_response(True, {
                "venues": validated,
                "total_found": len(validated),
                "total_processed": len(raw),
                "location": location,
                "preferences": preferences,
                "search_strategy": "knowledge_based",
            })
        except Exception as e:
            self.log_error(f"Knowledge-based search failed: {e}")
            raise ProcessingError(self.name, str(e))

    async def _fallback(self, preferences, location, user_query, parsed_prefs) -> Dict:
        if self.tavily_enabled:
            return await self._tavily_discovery_search(
                preferences, location, user_query, parsed_prefs, {}
            )
        return await self._knowledge_based_search(preferences, location, user_query, parsed_prefs)

    # ─── Helpers ──────────────────────────────────────────────────────────────

    def _pref_to_type(self, pref: str) -> str:
        if pref in PREF_TO_PLACE_TYPE:
            return PREF_TO_PLACE_TYPE[pref]
        for key, gtype in PREF_TO_PLACE_TYPE.items():
            if key in pref or pref in key:
                return gtype
        return "point_of_interest"

    def _google_types_to_venue_type(self, types: List[str]) -> str:
        mapping = {
            "cafe": "coffee_shop", "museum": "museum", "park": "park",
            "restaurant": "restaurant", "bar": "bar", "night_club": "nightclub",
            "store": "shopping", "art_gallery": "gallery", "spa": "spa",
            "bowling_alley": "bowling", "movie_theater": "cinema",
            "book_store": "bookstore", "bakery": "bakery",
        }
        for t in types:
            if t in mapping:
                return mapping[t]
        return "attraction"

    def _extract_neighborhood(self, address: str) -> str:
        if not address:
            return ""
        parts = address.split(",")
        if len(parts) >= 2:
            candidate = parts[1].strip()
            if len(candidate) > 2 and not candidate.isdigit():
                return candidate
        return ""

    def _deduplicate_venues(self, venues: List[Dict]) -> List[Dict]:
        seen: set = set()
        unique = []
        for v in venues:
            key = v.get("name", "").lower().strip()
            if key and key not in seen:
                seen.add(key)
                unique.append(v)
        return unique

    def _select_diverse_venues(self, venues: List[Dict], target_count: int = 12) -> List[Dict]:
        if len(venues) <= target_count:
            return venues
        by_type: Dict[str, List] = {}
        for v in venues:
            t = v.get("type", "other")
            by_type.setdefault(t, []).append(v)
        diverse = []
        for vlist in by_type.values():
            sorted_v = sorted(vlist, key=lambda x: x.get("google_rating") or 0, reverse=True)
            diverse.extend(sorted_v[:3])
        return diverse[:target_count]

    def _validate_venue(self, venue: Dict) -> bool:
        if not venue.get("name"):
            return False
        name_lower = venue.get("name", "").lower()
        closure_patterns = [
            r"\b(closed|former|defunct|abandoned|shut down)\b",
            r"^(old|previous)\s",
            r"\bno longer\b",
        ]
        for pat in closure_patterns:
            if re.search(pat, name_lower):
                return False
        if venue.get("proximity_based"):
            return True
        confidence = venue.get("current_status_confidence", "").lower()
        return confidence in ("high", "medium")

    def _enhance_venue(self, venue: Dict, location: str) -> Dict:
        enhanced = venue.copy()
        enhanced["data_validation"] = {
            "current_year_validated": self.current_year,
            "validation_confidence": venue.get("current_status_confidence", "Medium"),
            "validation_timestamp": datetime.now().isoformat(),
        }
        enhanced["research_priority"] = "verify_current_status"
        enhanced["enhanced_search_query"] = (
            f"{venue.get('name')} {venue.get('address', '')} "
            f"current {self.current_year} hours"
        )
        return enhanced

    def _build_scout_prompt(
        self, preferences: List[str], location: str, user_query: str, parsed_prefs: Dict
    ) -> str:
        return f"""You are a local expert for {location} ({self.current_year}).
Find 8-10 CURRENTLY OPERATING venues for: {preferences}
User query: "{user_query}"

Return ONLY valid JSON array:
[{{
  "name": "Venue Name",
  "address": "123 Main St, Boston, MA 02116",
  "address_hint": "123 Main St",
  "neighborhood": "South End",
  "type": "bar|restaurant|cafe|park|museum|gallery|shop|spa|bowling",
  "category": "nightlife|food|coffee|outdoors|culture|shopping|entertainment",
  "description": "One sentence",
  "estimated_cost": "$|$$|$$$|$$$$",
  "current_status_confidence": "High|Medium",
  "establishment_type": "Business|Institution|Landmark"
}}]
CRITICAL: Only venues confirmed open in {self.current_year}. Return ONLY JSON."""

    def _clean_json(self, content: str) -> str:
        content = content.strip()
        for prefix in ("```json", "```"):
            if content.startswith(prefix):
                content = content[len(prefix):]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        if "[" in content:
            start = content.find("[")
            depth = 0
            for i, ch in enumerate(content[start:], start):
                if ch == "[":
                    depth += 1
                elif ch == "]":
                    depth -= 1
                    if depth == 0:
                        return content[start: i + 1]
        return content