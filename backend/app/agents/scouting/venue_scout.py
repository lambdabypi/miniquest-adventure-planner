# backend/app/agents/scouting/venue_scout.py
"""PROXIMITY-AWARE Venue Scout — Google Places (address) → Tavily (city) → GPT-4o (fallback)"""

from typing import List, Dict, Optional
from openai import AsyncOpenAI
import asyncio
import functools
import googlemaps
import json
import re
from datetime import datetime
from ..base import BaseAgent, ValidationError, ProcessingError
from ...core.config import settings
from .tavily_scout import TavilyVenueScout
import logging

logger = logging.getLogger(__name__)


# ─── Category → Google Places type ───────────────────────────────────────────
PREF_TO_PLACE_TYPE: Dict[str, str] = {
    # Nightlife
    "bars":           "bar",
    "bar":            "bar",
    "nightlife":      "bar",
    "cocktail bars":  "bar",
    "rooftop bars":   "bar",
    "wine bars":      "bar",
    "breweries":      "bar",
    "pubs":           "bar",
    "nightclubs":     "night_club",
    "dance clubs":    "night_club",
    "lounges":        "bar",
    "dive bars":      "bar",
    # Food
    "restaurants":    "restaurant",
    "brunch spots":   "restaurant",
    "food markets":   "food",
    "bakeries":       "bakery",
    "cafes":          "cafe",
    "coffee shops":   "cafe",
    "coffee":         "cafe",
    "boba shops":     "cafe",
    "tea houses":     "cafe",
    "ice cream shops":"food",
    # Culture
    "museums":        "museum",
    "art galleries":  "art_gallery",
    "galleries":      "art_gallery",
    "historic sites": "tourist_attraction",
    "famous landmarks": "tourist_attraction",
    "science centers":"museum",
    "cinemas":        "movie_theater",
    "indie cinemas":  "movie_theater",
    # Outdoors
    "parks":          "park",
    "gardens":        "park",
    "arboretums":     "park",
    "waterfronts":    "park",
    "trails":         "park",
    # Shopping
    "boutiques":      "clothing_store",
    "vintage shops":  "store",
    "bookstores":     "book_store",
    "indie bookstores":"book_store",
    "antique shops":  "store",
    "thrift stores":  "store",
    # Entertainment
    "bowling":        "bowling_alley",
    "escape rooms":   "amusement_park",
    "arcades":        "amusement_park",
    "climbing gyms":  "gym",
    "spas":           "spa",
}

# ─── Category → scout prompt guidance ────────────────────────────────────────
CATEGORY_GUIDANCE: Dict[str, str] = {
    "bars":          "cocktail bars, craft beer bars, wine bars, rooftop bars, speakeasies, brewery taprooms, dive bars",
    "nightlife":     "cocktail bars, rooftop bars, wine bars, brewery taprooms, jazz bars, lounges, dance clubs, live music venues",
    "nightclubs":    "nightclubs, dance clubs, live music venues with dancing, rooftop bars with DJs",
    "cocktail bars": "craft cocktail bars, speakeasies, hotel rooftop bars, mixology lounges",
    "rooftop bars":  "rooftop bars, rooftop lounges, skyline bars, elevated patios",
    "restaurants":   "local favorites, trendy bistros, hidden gems, diverse cuisines",
    "brunch spots":  "brunch restaurants, all-day breakfast cafes, mimosa brunch spots",
    "coffee shops":  "specialty coffee shops, third-wave cafes, bakeries with great coffee, cozy study cafes",
    "museums":       "art museums, history museums, science centers, independent galleries",
    "art galleries": "contemporary art galleries, indie galleries, street art areas, artist studios",
    "parks":         "named parks, public gardens, waterfronts, community parks, botanical gardens",
    "bookstores":    "independent bookstores, used bookstores, bookstores with cafes",
    "shopping":      "boutiques, local markets, vintage shops, artisan shops",
    "escape rooms":  "escape rooms, puzzle bars, immersive experiences",
    "bowling":       "bowling alleys, bowling bars, retro bowling lounges",
    "spas":          "day spas, wellness centers, massage studios",
}


class VenueScoutAgent(BaseAgent):
    """
    Three-path venue scouting:
      Path 1 — Google Places Nearby Search  (specific address provided)
      Path 2 — Tavily live web discovery    (city-level query, Tavily key present)
      Path 3 — GPT-4o knowledge-based       (fallback when Tavily unavailable or returns nothing)
    """

    def __init__(self):
        super().__init__("VenueScout")
        self.client = AsyncOpenAI()
        self.current_year = datetime.now().year

        # ── Path 1: Google Places (proximity) ────────────────────────────────
        if settings.GOOGLE_MAPS_KEY:
            self.gmaps = googlemaps.Client(key=settings.GOOGLE_MAPS_KEY)
            self.proximity_enabled = True
            logger.info("✅ Google Places proximity search ENABLED")
        else:
            self.gmaps = None
            self.proximity_enabled = False
            logger.warning("⚠️ Google Places disabled — proximity search unavailable")

        # ── Path 2: Tavily live discovery (city-level) ────────────────────────
        if settings.TAVILY_API_KEY:
            self.tavily_scout = TavilyVenueScout(
                tavily_api_key=settings.TAVILY_API_KEY,
                openai_client=self.client,
            )
            self.tavily_discovery_enabled = True
            logger.info("✅ Tavily-first venue discovery ENABLED")
        else:
            self.tavily_scout = None
            self.tavily_discovery_enabled = False
            logger.warning("⚠️ Tavily key missing — will fall back to GPT-4o knowledge search")

    # ─── Entry point ──────────────────────────────────────────────────────────

    async def process(self, input_data: Dict) -> Dict:
        required_fields = ["preferences", "location"]
        if not self.validate_input(input_data, required_fields):
            raise ValidationError(self.name, f"Missing required fields: {required_fields}")

        preferences      = input_data["preferences"]
        location         = input_data["location"]
        user_query       = input_data.get("user_query", "")
        parsed_prefs     = input_data.get("parsed_preferences", {})
        generation_options = input_data.get("generation_options", {})  # ✅ NEW

        self.log_processing("Starting venue scouting", f"{preferences} in {location}")

        is_specific_location = self._is_specific_address(location)

        if is_specific_location and self.proximity_enabled:
            self.log_processing("Using PROXIMITY search", f"Near {location}")
            return await self._proximity_search(preferences, location, user_query, parsed_prefs)

        elif self.tavily_discovery_enabled:
            self.log_processing("Using TAVILY discovery", f"Live web search in {location}")
            return await self._tavily_discovery_search(
                preferences, location, user_query, parsed_prefs, generation_options
            )

        else:
            self.log_processing("Using GPT-4o fallback", f"Knowledge-based search in {location}")
            return await self._knowledge_based_sea

    # ─── Path 1: Google Places proximity ──────────────────────────────────────

    async def _proximity_search(self, preferences, location, user_query, parsed_prefs):
        try:
            geocode_result = self.gmaps.geocode(location)
            if not geocode_result:
                return await self._tavily_or_knowledge_fallback(preferences, location, user_query, parsed_prefs)

            lat = geocode_result[0]["geometry"]["location"]["lat"]
            lng = geocode_result[0]["geometry"]["location"]["lng"]

            loop = asyncio.get_event_loop()

            async def search_one(pref):
                return await loop.run_in_executor(
                    None,
                    functools.partial(self._search_nearby_by_preference, lat, lng, pref, location),
                )

            results   = await asyncio.gather(*[search_one(p) for p in preferences[:6]])
            all_nearby = [v for sublist in results for v in sublist]
            unique    = self._deduplicate_venues(all_nearby)
            diverse   = self._select_diverse_venues(unique, target_count=10)
            enhanced  = [self._enhance_venue(v, location) for v in diverse]

            self.log_success(f"Proximity search: {len(enhanced)} venues")
            return self.create_response(True, {
                "venues": enhanced,
                "total_found": len(enhanced),
                "total_processed": len(all_nearby),
                "location": location,
                "preferences": preferences,
                "search_strategy": "proximity_based",
                "user_coordinates": {"lat": lat, "lng": lng},
            })
        except Exception as e:
            self.log_error(f"Proximity search failed: {e}")
            return await self._tavily_or_knowledge_fallback(preferences, location, user_query, parsed_prefs)

    def _search_nearby_by_preference(self, lat, lng, preference, location) -> List[Dict]:
        place_type = self._preference_to_place_type(preference)
        try:
            places_result = self.gmaps.places_nearby(
                location=(lat, lng),
                radius=2000,
                type=place_type,
                open_now=False,
            )
            venues = []
            for place in places_result.get("results", [])[:10]:
                status = place.get("business_status")
                if status in ["CLOSED_PERMANENTLY", "CLOSED_TEMPORARILY"]:
                    logger.warning(f"⚠️ Skipping closed: {place.get('name')} ({status})")
                    continue
                venue = self._convert_google_place_to_venue(place, location, preference)
                if venue:
                    venues.append(venue)
                if len(venues) >= 5:
                    break
            return venues
        except Exception as e:
            logger.warning(f"Google Places search failed for '{preference}': {e}")
            return []

    def _preference_to_place_type(self, preference: str) -> str:
        pref_lower = preference.lower().strip()
        if pref_lower in PREF_TO_PLACE_TYPE:
            return PREF_TO_PLACE_TYPE[pref_lower]
        for key, gtype in PREF_TO_PLACE_TYPE.items():
            if key in pref_lower or pref_lower in key:
                return gtype
        return "point_of_interest"

    def _convert_google_place_to_venue(self, place: Dict, location: str, preference: str) -> Optional[Dict]:
        try:
            name = place.get("name", "")
            if not name or len(name) < 3:
                return None

            status = place.get("business_status")
            if status in ["CLOSED_PERMANENTLY", "CLOSED_TEMPORARILY"]:
                return None

            full_address = place.get("formatted_address", "") or place.get("vicinity", "")
            venue_type   = self._google_types_to_venue_type(place.get("types", []))
            neighborhood = self._extract_neighborhood(full_address)

            return {
                "name": name,
                "address": full_address,
                "address_hint": place.get("vicinity", full_address),
                "neighborhood": neighborhood or location.split(",")[0],
                "type": venue_type,
                "category": preference.lower(),
                "current_status_confidence": "High",
                "establishment_type": "Verified",
                "google_place_id": place.get("place_id", ""),
                "google_rating": place.get("rating"),
                "google_user_ratings_total": place.get("user_ratings_total", 0),
                "business_status": status or "OPERATIONAL",
                "proximity_based": True,
            }
        except Exception as e:
            logger.warning(f"Error converting Google place: {e}")
            return None

    def _google_types_to_venue_type(self, types: List[str]) -> str:
        type_mapping = {
            "cafe": "coffee_shop", "museum": "museum", "park": "park",
            "restaurant": "restaurant", "bar": "bar", "night_club": "nightclub",
            "store": "shopping", "art_gallery": "gallery", "spa": "spa",
            "bowling_alley": "bowling", "movie_theater": "cinema",
        }
        for gtype in types:
            if gtype in type_mapping:
                return type_mapping[gtype]
        return "attraction"

    # ─── Path 2: Tavily live discovery ────────────────────────────────────────

    async def _tavily_discovery_search(
        self,
        preferences: List[str],
        location: str,
        user_query: str,
        parsed_prefs: Dict,
        generation_options: Dict = None,  # ✅ NEW
    ) -> Dict:
        try:
            raw_venues = await self.tavily_scout.discover_venues(
                preferences=preferences,
                location=location,
                parsed_prefs=parsed_prefs,
                user_query=user_query,
                generation_options=generation_options or {},  # ✅ NEW
            )

            if not raw_venues:
                logger.warning("Tavily discovery returned 0 venues — falling back to GPT-4o")
                return await self._knowledge_based_search(preferences, location, user_query, parsed_prefs)

            validated = []
            for venue in raw_venues:
                if self._validate_venue(venue):
                    ev = self._enhance_venue(venue, location)
                    validated.append(ev)

            if not validated:
                logger.warning("All Tavily venues failed validation — falling back to GPT-4o")
                return await self._knowledge_based_search(preferences, location, user_query, parsed_prefs)

            self.log_success(f"Tavily discovery: {len(validated)} venues")
            return self.create_response(True, {
                "venues": validated,
                "total_found": len(validated),
                "total_processed": len(raw_venues),
                "location": location,
                "preferences": preferences,
                "search_strategy": "tavily_discovery",
            })

        except Exception as e:
            self.log_error(f"Tavily discovery failed: {e} — falling back to GPT-4o")
            return await self._knowledge_based_search(preferences, location, user_query, parsed_prefs)

    # ─── Path 3: GPT-4o knowledge-based (fallback) ────────────────────────────

    async def _knowledge_based_search(
        self, preferences: List[str], location: str, user_query: str, parsed_prefs: Dict = None
    ) -> Dict:
        try:
            scout_prompt = self._build_scout_prompt(preferences, location, user_query, parsed_prefs or {})
            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": scout_prompt}],
                temperature=0.2,
                max_tokens=3000,
            )
            content    = self._clean_json_response(response.choices[0].message.content)
            raw_venues = json.loads(content)

            validated = []
            for venue in raw_venues:
                if self._validate_venue(venue):
                    ev = self._enhance_venue(venue, location)
                    ev["proximity_based"] = False
                    validated.append(ev)
                    self.log_processing("Validated venue", venue.get("name"))

            self.log_success(f"Knowledge-based search: {len(validated)} venues")
            return self.create_response(True, {
                "venues": validated,
                "total_found": len(validated),
                "total_processed": len(raw_venues),
                "location": location,
                "preferences": preferences,
                "search_strategy": "knowledge_based",
            })
        except Exception as e:
            self.log_error(f"Knowledge-based search failed: {e}")
            raise ProcessingError(self.name, str(e))

    # ─── Shared fallback helper ────────────────────────────────────────────────

    async def _tavily_or_knowledge_fallback(
        self, preferences, location, user_query, parsed_prefs
    ) -> Dict:
        """Used when proximity search fails — tries Tavily before GPT-4o."""
        if self.tavily_discovery_enabled:
            return await self._tavily_discovery_search(preferences, location, user_query, parsed_prefs)
        return await self._knowledge_based_search(preferences, location, user_query, parsed_prefs)

    # ─── Scout prompt (GPT-4o fallback only) ──────────────────────────────────

    def _build_scout_prompt(
        self, preferences: List[str], location: str, user_query: str, parsed_prefs: Dict
    ) -> str:
        category_hints = []
        for pref in preferences:
            pref_lower = pref.lower().strip()
            guidance = CATEGORY_GUIDANCE.get(pref_lower)
            if guidance:
                category_hints.append(f"  • {pref} → {guidance}")

        category_block = "\n".join(category_hints) if category_hints else "  • Mix of relevant local venues"

        budget_label     = parsed_prefs.get("budget_label", "moderate")
        budget_max       = parsed_prefs.get("budget_max", 100)
        group_size       = parsed_prefs.get("group_size", 1)
        time_of_day      = parsed_prefs.get("time_of_day", "any")
        special_occasion = parsed_prefs.get("special_occasion", "none")
        meal_context     = parsed_prefs.get("meal_context", "none")
        mood             = parsed_prefs.get("mood", "exploratory")

        context_lines = [f"  Budget: {budget_label} (max ~${budget_max}/person)"]
        if group_size > 1:
            context_lines.append(f"  Group size: {group_size} people")
        if time_of_day != "any":
            context_lines.append(f"  Time of day: {time_of_day}")
        if special_occasion != "none":
            context_lines.append(f"  Special occasion: {special_occasion}")
        if meal_context != "none":
            context_lines.append(f"  Meal context: {meal_context}")
        context_lines.append(f"  Overall mood: {mood}")
        context_block = "\n".join(context_lines)

        return f"""You are a local expert for {location} with CURRENT knowledge as of {self.current_year}.

USER REQUEST: "{user_query}"
USER WANTS: {preferences}

CONTEXT:
{context_block}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 CATEGORY GUIDANCE — suggest venues of THESE specific types:
{category_block}

🚨 MATCH PREFERENCES STRICTLY:
  If user wants "bars / nightlife" → suggest bars, NOT museums or parks
  If user wants "party" preferences → suggest nightlife venues, NOT tourist attractions
  If user wants "coffee shops" → suggest cafes, NOT restaurants

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏙️ ADDRESS RULES (mandatory):

Boston metro — use CORRECT city name:
  • Cambridge venues (Harvard Sq, MIT, Kendall) → "Cambridge, MA"
  • Somerville venues (Davis Sq, Union Sq)       → "Somerville, MA"
  • Brookline venues (Coolidge Corner)           → "Brookline, MA"
  • Actually in Boston proper                    → "Boston, MA"

NYC — use borough:
  • Manhattan, Brooklyn, Queens, Bronx, Staten Island

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ OTHER REQUIREMENTS:
  1. ONLY venues CURRENTLY OPEN AND OPERATIONAL in {self.current_year}
  2. NEVER suggest permanently closed venues
  3. 8-12 venues total, diverse within the requested categories
  4. Include ZIP codes where known

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 REQUIRED JSON FORMAT:
[
  {{
    "name": "Venue Name",
    "address": "123 Main St, Boston, MA 02116",
    "address_hint": "123 Main St",
    "neighborhood": "South End",
    "type": "bar|nightclub|restaurant|cafe|park|museum|gallery|shop|spa|bowling",
    "category": "nightlife|food|coffee|outdoors|culture|shopping|entertainment|wellness",
    "description": "One sentence why this fits the request and context",
    "estimated_cost": "$|$$|$$$|$$$$",
    "price_per_person": 25,
    "google_rating": 4.3,
    "current_status_confidence": "High|Medium",
    "establishment_type": "Business|Institution|Landmark",
    "good_for_groups": true,
    "indoor": true,
    "age_requirement": "21+|18+|all ages"
  }}
]

CRITICAL: Return ONLY valid JSON array. No preamble."""

    # ─── Validation & enhancement ──────────────────────────────────────────────

    def _validate_venue(self, venue: Dict) -> bool:
        required_fields = ["name", "address", "type", "category"]
        for field in required_fields:
            if not venue.get(field):
                logger.warning(f"❌ Missing '{field}' for: {venue.get('name')}")
                return False

        address       = venue.get("address", "")
        address_lower = address.lower()

        state_pattern = r",\s*[A-Z]{2}(\s+\d{5})?"
        has_state     = bool(re.search(state_pattern, address))
        has_comma     = "," in address
        common_states = ["ma", "ny", "ca", "il", "tx", "fl", "wa", "pa", "nj", "ct"]
        has_state_abbrev = any(
            f" {s} " in address_lower or f", {s}" in address_lower for s in common_states
        )
        is_valid_address = has_state or (has_comma and has_state_abbrev)

        if not is_valid_address:
            logger.warning(f"❌ Incomplete address: {venue.get('name')} → {address}")
            return False

        name_lower = venue.get("name", "").lower()
        closure_patterns = [
            r"\b(closed|former|defunct|abandoned|shut down)\b",
            r"^(old|previous)\s",
            r"\bno longer\b",
        ]
        for pat in closure_patterns:
            if re.search(pat, name_lower):
                logger.warning(f"❌ Closure indicator in name: {venue.get('name')}")
                return False

        if venue.get("proximity_based"):
            return True

        confidence = venue.get("current_status_confidence", "").lower()
        if confidence not in ["high", "medium"]:
            logger.warning(f"⚠️ Low confidence venue: {venue.get('name')}")
            return False

        return True

    def _enhance_venue(self, venue: Dict, location: str) -> Dict:
        enhanced = venue.copy()
        enhanced.update({
            "data_validation": {
                "current_year_validated": self.current_year,
                "validation_confidence": venue.get("current_status_confidence", "Medium"),
                "establishment_reliability": venue.get("establishment_type", "Unknown"),
                "validation_timestamp": datetime.now().isoformat(),
            },
            "research_priority": "verify_current_status",
            "enhanced_search_query": (
                f"{venue.get('name')} {venue.get('address', venue.get('address_hint', ''))} "
                f"current {self.current_year} hours status"
            ),
        })
        return enhanced

    # ─── Diversity selection ───────────────────────────────────────────────────

    def _deduplicate_venues(self, venues: List[Dict]) -> List[Dict]:
        seen: set = set()
        unique = []
        for v in venues:
            key = v.get("name", "").lower().strip()
            if key and key not in seen:
                seen.add(key)
                unique.append(v)
        return unique

    def _select_diverse_venues(self, venues: List[Dict], target_count: int = 10) -> List[Dict]:
        if len(venues) <= target_count:
            return venues
        by_type: Dict[str, List] = {}
        for v in venues:
            t = v.get("type", "other")
            by_type.setdefault(t, []).append(v)
        diverse = []
        for venues_of_type in by_type.values():
            sorted_v = sorted(venues_of_type, key=lambda x: x.get("google_rating", 0), reverse=True)
            diverse.extend(sorted_v[:3])
            if len(diverse) >= target_count:
                break
        return diverse[:target_count]

    # ─── Utility helpers ───────────────────────────────────────────────────────

    def _is_specific_address(self, location: str) -> bool:
        loc_lower = location.lower()
        address_indicators = [
            "street", "st ", "avenue", "ave ", "road", "rd ", "drive", "dr ",
            "boulevard", "blvd", "place", "pl ", "lane", "ln ", "square",
            "near ", "at ",
        ]
        has_numbers = any(c.isdigit() for c in location)
        has_term    = any(ind in loc_lower for ind in address_indicators)
        return has_numbers or has_term

    def _extract_neighborhood(self, address: str) -> str:
        if not address:
            return ""
        parts = address.split(",")
        if len(parts) >= 2:
            candidate = parts[1].strip()
            if len(candidate) > 2 and not candidate.isdigit():
                return candidate
        return ""

    def _clean_json_response(self, content: str) -> str:
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