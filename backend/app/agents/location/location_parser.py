# backend/app/agents/location/location_parser.py
"""
LocationParser - Query location takes priority over user_address.

Priority order:
1. Explicit location in query  ("in the North End", "near Acadia", "in Boston")
2. Normalize with AI, using user_address only as a tiebreaker for ambiguous neighborhoods
3. Verify ambiguous neighborhoods exist in the user's city via Google geocoding
4. Fall back to user_address when no query location is found
"""

from typing import Dict, Optional, List
from openai import AsyncOpenAI
import re
import logging
from ..base import BaseAgent, ValidationError, ProcessingError

logger = logging.getLogger(__name__)


# Neighborhoods that exist in multiple major US cities - need city context to resolve
_AMBIGUOUS_NEIGHBORHOODS = {
    "north end", "south end", "west end", "east end",
    "chinatown", "little italy", "financial district", "downtown",
    "waterfront", "old town", "midtown", "uptown", "downtown crossing",
}

# Known neighborhoods keyed by city, for fast existence checking
_NEIGHBORHOODS_BY_CITY: Dict[str, List[str]] = {
    "boston": [
        "north end", "south end", "back bay", "beacon hill", "fenway", "kenmore",
        "seaport", "fort point", "charlestown", "east boston", "jamaica plain",
        "roslindale", "hyde park", "dorchester", "roxbury", "south boston",
        "allston", "brighton", "west roxbury", "mission hill", "chinatown",
        "downtown crossing", "financial district", "theater district", "bay village",
        "west end", "north station", "leather district",
    ],
    "new york": [
        "soho", "tribeca", "dumbo", "williamsburg", "bushwick", "astoria",
        "park slope", "crown heights", "harlem", "upper east side", "upper west side",
        "lower east side", "east village", "west village", "chelsea", "hell's kitchen",
        "midtown", "financial district", "flushing", "jackson heights",
        "greenpoint", "bed-stuy", "flatbush", "bay ridge", "forest hills",
        "north end",  # small neighborhood in Staten Island
    ],
    "chicago": [
        "wicker park", "logan square", "pilsen", "bridgeport", "andersonville",
        "lincoln park", "lakeview", "lincoln square", "humboldt park", "old town",
        "river north", "gold coast", "streeterville", "south loop",
    ],
    "san francisco": [
        "mission district", "castro", "haight", "nob hill", "north beach",
        "soma", "tenderloin", "richmond", "sunset", "marina", "pacific heights",
        "financial district", "chinatown", "japantown",
    ],
    "los angeles": [
        "silver lake", "echo park", "los feliz", "koreatown", "mid-city",
        "west hollywood", "culver city", "santa monica", "venice", "downtown",
        "arts district", "little tokyo", "chinatown",
    ],
}


class LocationParserAgent(BaseAgent):
    """Location parsing with query location priority over user_address"""

    KNOWN_NEIGHBORHOODS = {n for neighborhoods in _NEIGHBORHOODS_BY_CITY.values() for n in neighborhoods}

    def __init__(self):
        super().__init__("LocationParser")
        self.client = AsyncOpenAI()
        self.major_cities = [
            'new york', 'nyc', 'manhattan', 'brooklyn', 'san francisco', 'sf',
            'los angeles', 'la', 'chicago', 'boston', 'seattle', 'miami',
            'atlanta', 'denver', 'austin', 'portland', 'washington', 'dc',
            'philadelphia', 'philly', 'houston', 'dallas', 'phoenix',
        ]

    async def process(self, input_data: Dict) -> Dict:
        if not self.validate_input(input_data, ["user_input"]):
            raise ValidationError(self.name, "Missing required 'user_input' field")

        user_input   = input_data["user_input"]
        user_address = input_data.get("user_address")

        self.log_processing("Starting location parsing", f"Query: '{user_input[:50]}'")

        try:
            explicit_location = self._extract_explicit_location(user_input)

            if explicit_location:
                self.log_processing("Explicit location found", explicit_location)

                normalized = await self._normalize_with_ai(
                    explicit_location, user_input, user_address
                )

                if normalized:
                    # If normalization flagged the neighborhood as not existing in
                    # the user's city, surface a clarification rather than silently
                    # searching the wrong place.
                    if normalized.startswith("NOT_FOUND:"):
                        city = normalized.split(":", 1)[1].strip()
                        self.log_warning(
                            f"Neighborhood '{explicit_location}' not found in '{city}'"
                        )
                        return self.create_response(False, {
                            "needs_clarification": True,
                            "clarification_message": (
                                f"I couldn't find a '{explicit_location.title()}' neighborhood "
                                f"in {city}. Did you mean somewhere else, or would you like "
                                f"adventures anywhere in {city}?"
                            ),
                            "suggestions": [
                                f"Adventures anywhere in {city}",
                                f"A specific neighborhood in {city}",
                            ],
                        })

                    result = self._create_location_result(
                        target_location=normalized,
                        source='user_query',
                        original_query_location=explicit_location,
                        user_address_ignored=True,
                        confidence=0.9,
                    )
                    self.log_success(
                        f"✅ Location from query: '{normalized}' "
                        f"(user_address '{user_address}' saved for routing only)"
                    )
                    return self.create_response(True, result)

            # No explicit location in query - use user_address as search target
            final_location = user_address or "Boston, MA"
            source = 'user_address' if user_address else 'default'
            result = self._create_location_result(
                target_location=final_location,
                source=source,
                original_query_location=None,
                user_address_ignored=False,
                confidence=0.8 if user_address else 0.5,
            )
            self.log_success(f"✅ Using {source} for search: '{final_location}'")
            return self.create_response(True, result)

        except Exception as e:
            self.log_error(f"Location parsing failed: {e}")
            raise ProcessingError(self.name, str(e))

    # ─── Extraction ───────────────────────────────────────────────────────────

    def _extract_explicit_location(self, user_input: str) -> Optional[str]:
        text = user_input.lower()

        patterns = [
            # Priority 0: "in the [Neighborhood]" - "afternoon in the North End"
            r'\bin\s+the\s+([a-z][a-z\s]{2,30}?)(?:\s*,|\s+(?:museums|coffee|bars|restaurants|parks|shops|area|neighborhood|district|for|with|and|under|\d)|\s*$)',

            # Priority 1: "near/around/at/by [location with geographic indicator]"
            r'\b(?:near|around|at|by)\s+([a-z][a-z\s]+(?:park|national|monument|beach|island|mountain|lake|river|bridge|tower|square|plaza|district|neighborhood|area|mall|center|station))',

            # Priority 2: "near/around/at/by [Proper Noun]"
            r'\b(?:near|around|at|by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',

            # Priority 2b: "in [Proper Noun]" without "the"
            r'\bin\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})(?=\s*,|\s+(?:museums|coffee|bars|restaurants|parks|shops|for|with|and|under|\d)|\s*$)',

            # Priority 3: "in [city with keyword]"
            r'\bin\s+([a-z\s]+(?:city|york|francisco|angeles|chicago|boston|seattle|miami|atlanta|denver|austin|portland|washington|philadelphia|houston|dallas|phoenix|nevada|california|florida|texas|massachusetts|new york))',
            r'\bin\s+(nyc|sf|la|dc|philly)',

            # Priority 4: "visit [Proper Noun]"
            r'\bvisit\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',

            # Priority 5: "go to [Proper Noun]"
            r'\bgo\s+to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                location = match.group(1).strip().rstrip(',')
                if self._is_likely_location(location):
                    self.log_processing("Location extracted", f"'{location}' from query")
                    return location

        if self._is_proximity_query_without_location(text):
            self.log_processing("Proximity query detected", "Will use user_address")
            return None

        return None

    # ─── Normalization ────────────────────────────────────────────────────────

    async def _normalize_with_ai(
        self, location: str, context: str, user_address: Optional[str] = None
    ) -> Optional[str]:
        try:
            prompt = self._create_normalization_prompt(location, context, user_address)
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=120,
            )
            normalized = response.choices[0].message.content.strip()

            if normalized == "INVALID" or not normalized:
                self.log_warning(f"AI rejected location: '{location}'")
                return None

            self.log_processing("AI normalized", f"'{location}' → '{normalized}'")
            return normalized

        except Exception as e:
            self.log_error(f"Location normalization error: {e}")
            return None

    def _create_normalization_prompt(
        self, location: str, context: str, user_address: Optional[str] = None
    ) -> str:
        # Build city context line - used only to disambiguate, never to override
        if user_address:
            # Extract just the city portion for the prompt
            city_hint = user_address.split(",")[0].strip()
            city_context_line = (
                f'USER\'S CITY (tiebreaker only - use when the neighborhood is ambiguous): "{city_hint}"'
            )
        else:
            city_context_line = "USER'S CITY: unknown"

        return f"""You are a location expert for a US adventure planning app.

USER QUERY: "{context}"
EXTRACTED LOCATION: "{location}"
{city_context_line}

TASK: Return the normalized, full location name for venue searching.

NEIGHBORHOOD DISAMBIGUATION RULES:
- If the neighborhood clearly exists in ONE city (e.g. "back bay" → Boston, "soho" → NYC), return that city.
- If the neighborhood is AMBIGUOUS (could be multiple cities), use USER'S CITY to resolve.
- If USER'S CITY is provided AND the neighborhood does NOT exist there, return: NOT_FOUND:[City, ST]
  Example: user is in "New York, NY" and asks for "Back Bay" → return NOT_FOUND:New York, NY
- If USER'S CITY is unknown and neighborhood is ambiguous, use the most well-known city for it.

EXAMPLES:
Cities:
  "boston" → "Boston, MA"
  "nyc" → "New York, NY"
  "sf" → "San Francisco, CA"

Neighborhoods (unambiguous - return regardless of user city):
  "back bay" → "Back Bay, Boston, MA"
  "beacon hill" → "Beacon Hill, Boston, MA"
  "soho" → "SoHo, New York, NY"
  "williamsburg" → "Williamsburg, Brooklyn, NY"
  "mission district" → "Mission District, San Francisco, CA"

Neighborhoods (ambiguous - use user city):
  "north end" + user in Boston → "North End, Boston, MA"
  "north end" + user in New York → NOT_FOUND:New York, NY   (no North End neighborhood in NYC)
  "chinatown" + user in Boston → "Chinatown, Boston, MA"
  "chinatown" + user in NYC → "Chinatown, New York, NY"
  "downtown" + user in Chicago → "Downtown, Chicago, IL"

Parks/Landmarks:
  "acadia national park" → "Acadia National Park, ME"
  "golden gate bridge" → "Golden Gate Bridge, San Francisco, CA"

RULES:
1. Return ONLY the normalized location string, or NOT_FOUND:[City, ST], or INVALID.
2. Never add explanations.
3. INVALID only for completely nonsensical inputs (e.g. "good", "fun").
4. User city is a TIEBREAKER - never override a clearly unambiguous location."""

    # ─── Validation helpers ───────────────────────────────────────────────────

    def _is_likely_location(self, text: str) -> bool:
        text_lower = text.lower().strip()

        if len(text_lower) < 3:
            return False

        non_locations = {
            'new', 'the', 'and', 'or', 'with', 'for', 'from', 'about', 'like',
            'places', 'spots', 'areas', 'good', 'great', 'fun', 'cool', 'nice',
            'museums', 'restaurants', 'coffee', 'shops', 'parks', 'bars',
            'things', 'stuff', 'activities', 'attractions',
        }
        if text_lower in non_locations:
            return False

        # Known neighborhood
        if text_lower in self.KNOWN_NEIGHBORHOODS:
            return True

        # Known city
        if any(city in text_lower for city in self.major_cities):
            return True

        # Geographic indicator word
        location_indicators = [
            'park', 'national', 'monument', 'beach', 'island', 'mountain',
            'lake', 'river', 'bridge', 'tower', 'square', 'plaza',
            'city', 'county', 'state', 'district', 'neighborhood', 'area',
            'end', 'hill', 'heights', 'village', 'quarter',
        ]
        if any(ind in text_lower for ind in location_indicators):
            return True

        # Proper noun
        if any(w[0].isupper() for w in text.split() if w):
            return True

        return len(text.split()) <= 5

    def _is_proximity_query_without_location(self, text: str) -> bool:
        proximity_keywords = ['nearby', 'near me', 'around here', 'close by', 'in the area']
        has_proximity = any(keyword in text for keyword in proximity_keywords)
        if has_proximity:
            standalone_patterns = [
                r'\bnearby\b(?!\s+[A-Z])',
                r'\bnear me\b',
                r'\baround here\b',
                r'\bclose by\b',
            ]
            return any(re.search(p, text, re.IGNORECASE) for p in standalone_patterns)
        return False

    # ─── Result builder ───────────────────────────────────────────────────────

    def _create_location_result(
        self,
        target_location: str,
        source: str,
        original_query_location: Optional[str],
        user_address_ignored: bool,
        confidence: float,
    ) -> Dict:
        return {
            'target_location': target_location,
            'location_source': source,
            'original_query_location': original_query_location,
            'user_address_ignored': user_address_ignored,
            'confidence': confidence,
        }