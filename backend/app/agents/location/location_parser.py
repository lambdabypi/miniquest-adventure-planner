# backend/app/agents/location/location_parser.py
"""
LocationParser — Query Location Takes Priority Over user_address
Supports all US cities. Defaults to user_address if no query location is found.
"""

from typing import Dict, Optional, List
from openai import AsyncOpenAI
import re
from ..base import BaseAgent, ValidationError, ProcessingError


class LocationParserAgent(BaseAgent):
    """Location parsing with query location priority over user_address"""

    def __init__(self):
        super().__init__("LocationParser")
        self.client = AsyncOpenAI()
        # Used only for _is_likely_location heuristic — not for blocking
        self.known_us_cities = [
            'new york', 'nyc', 'manhattan', 'brooklyn', 'queens', 'bronx',
            'san francisco', 'sf', 'los angeles', 'la', 'chicago', 'boston',
            'seattle', 'miami', 'atlanta', 'denver', 'austin', 'portland',
            'washington', 'dc', 'philadelphia', 'philly', 'houston', 'dallas',
            'phoenix', 'nashville', 'new orleans', 'las vegas', 'san diego',
            'minneapolis', 'detroit', 'baltimore', 'charlotte', 'raleigh',
            'pittsburgh', 'cleveland', 'columbus', 'indianapolis', 'memphis',
            'louisville', 'richmond', 'salt lake city', 'kansas city',
            'san antonio', 'el paso', 'tucson', 'fresno', 'sacramento',
            'portland', 'oklahoma city', 'albuquerque', 'milwaukee',
        ]

    async def process(self, input_data: Dict) -> Dict:
        """
        Priority:
        1. Explicit location in query (e.g., "near Millennium Park")
        2. user_address
        3. No default city — let VenueScout/RoutingAgent handle missing location gracefully
        """
        if not self.validate_input(input_data, ["user_input"]):
            raise ValidationError(self.name, "Missing required 'user_input' field")

        user_input = input_data["user_input"]
        user_address = input_data.get("user_address")

        self.log_processing("Starting location parsing", f"Query: '{user_input[:50]}...'")

        try:
            # PRIORITY 1: Explicit location in query
            explicit_location = self._extract_explicit_location(user_input)

            if explicit_location:
                self.log_processing("Explicit location found", explicit_location)
                normalized_location = await self._normalize_with_ai(explicit_location, user_input)

                if normalized_location:
                    result = self._create_location_result(
                        target_location=normalized_location,
                        source='user_query',
                        original_query_location=explicit_location,
                        user_address_ignored=True,
                        confidence=0.9,
                    )
                    self.log_success(f"✅ Location from query: '{normalized_location}'")
                    return self.create_response(True, result)

            # PRIORITY 2: user_address
            if user_address:
                result = self._create_location_result(
                    target_location=user_address,
                    source='user_address',
                    original_query_location=None,
                    user_address_ignored=False,
                    confidence=0.8,
                )
                self.log_success(f"✅ Using user_address: '{user_address}'")
                return self.create_response(True, result)

            # PRIORITY 3: No location — signal to downstream agents
            # VenueScout will ask the LLM to infer the city from the query itself
            result = self._create_location_result(
                target_location="",
                source='none',
                original_query_location=None,
                user_address_ignored=False,
                confidence=0.3,
            )
            self.log_warning("No location found — downstream agents will infer from query")
            return self.create_response(True, result)

        except Exception as e:
            self.log_error(f"Location parsing failed: {e}")
            raise ProcessingError(self.name, str(e))

    def _extract_explicit_location(self, user_input: str) -> Optional[str]:
        """Extract location from query patterns."""
        text = user_input.lower()

        patterns = [
            r'\b(?:near|around|at|by)\s+([a-z][a-z\s]+(?:park|national|monument|beach|island|mountain|lake|river|bridge|tower|square|plaza|district|neighborhood|area|mall|center|station))',
            r'\b(?:near|around|at|by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
            r'\bin\s+([a-z\s]+(?:city|york|francisco|angeles|chicago|boston|seattle|miami|atlanta|denver|austin|portland|washington|philadelphia|houston|dallas|phoenix|nevada|california|florida|texas|massachusetts|illinois|new york|new orleans|las vegas|san diego|nashville|minneapolis|baltimore|charlotte|pittsburgh|cleveland|columbus|indianapolis|memphis|louisville|richmond|salt lake|kansas city|san antonio|albuquerque|milwaukee|sacramento))',
            r'\bin\s+(nyc|sf|la|dc|philly|nola)',
            r'\bvisit\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
            r'\bgo\s+to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                location = match.group(1).strip()
                if self._is_likely_location(location):
                    self.log_processing("Location extracted", f"'{location}' from query")
                    return location

        if self._is_proximity_query_without_location(text):
            return None

        return None

    def _is_likely_location(self, text: str) -> bool:
        text_lower = text.lower()
        if any(city in text_lower for city in self.known_us_cities):
            return True
        location_indicators = [
            'park', 'national', 'monument', 'beach', 'island', 'mountain',
            'lake', 'river', 'bridge', 'tower', 'square', 'plaza',
            'city', 'county', 'state', 'district', 'neighborhood', 'area',
        ]
        if any(ind in text_lower for ind in location_indicators):
            return True
        words = text.split()
        if len(words) >= 1 and any(w[0].isupper() for w in words if w):
            return True
        non_locations = [
            'new', 'the', 'and', 'or', 'with', 'for', 'from', 'about', 'like',
            'places', 'spots', 'areas', 'good', 'great', 'fun', 'cool', 'nice',
            'museums', 'restaurants', 'coffee', 'shops', 'parks', 'bars',
            'things', 'stuff', 'activities', 'attractions',
        ]
        if text_lower in non_locations or len(text) < 3:
            return False
        return len(text.split()) <= 5

    def _is_proximity_query_without_location(self, text: str) -> bool:
        proximity_keywords = ['nearby', 'near me', 'around here', 'close by', 'in the area']
        if any(kw in text for kw in proximity_keywords):
            standalone_patterns = [
                r'\bnearby\b(?!\s+[A-Z])',
                r'\bnear me\b',
                r'\baround here\b',
                r'\bclose by\b',
            ]
            return any(re.search(p, text, re.IGNORECASE) for p in standalone_patterns)
        return False

    async def _normalize_with_ai(self, location: str, context: str) -> Optional[str]:
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": self._create_normalization_prompt(location, context)}],
                temperature=0.1,
                max_tokens=100,
            )
            normalized = response.choices[0].message.content.strip()
            if normalized == "INVALID" or not normalized:
                return None
            self.log_processing("AI normalized", f"'{location}' → '{normalized}'")
            return normalized
        except Exception as e:
            self.log_error(f"Location normalization error: {e}")
            return None

    def _create_normalization_prompt(self, location: str, context: str) -> str:
        return f"""You are a location expert. Normalize the extracted location to a standard format suitable for venue searches.

USER QUERY: "{context}"
EXTRACTED LOCATION: "{location}"

Return the normalized, full location name. Examples:
- "nyc" → "New York, NY"
- "sf" → "San Francisco, CA"
- "chi" → "Chicago, IL"
- "boston" → "Boston, MA"
- "nola" → "New Orleans, LA"
- "la" → "Los Angeles, CA"
- "nashville" → "Nashville, TN"
- "acadia national park" → "Acadia National Park, ME"
- "yellowstone" → "Yellowstone National Park, WY"
- "golden gate bridge" → "Golden Gate Bridge, San Francisco, CA"
- "soho" (NYC context) → "SoHo, New York, NY"
- "north end" (Boston context) → "North End, Boston, MA"
- "wicker park" → "Wicker Park, Chicago, IL"
- "french quarter" → "French Quarter, New Orleans, LA"

RULES:
1. Return full standardized location name with state abbreviation
2. For national parks: include "National Park" and state
3. For neighborhoods: include city if determinable from context
4. If not a real US place, return "INVALID"
5. Only locations within the United States

Return ONLY the normalized location or "INVALID". No explanations."""

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