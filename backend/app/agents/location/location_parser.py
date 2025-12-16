# backend/app/agents/location/location_parser.py
"""
FIXED LocationParser - Query Location Takes Priority Over user_address

Changes:
1. ✅ Extracts locations from "near/at/around [location]" patterns
2. ✅ Handles national parks, landmarks, neighborhoods (not just major cities)
3. ✅ Only uses user_address when query says "nearby" without location
4. ✅ Keeps user_address available for routing origin in coordinator
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
        self.major_cities = [
            'new york', 'nyc', 'manhattan', 'brooklyn', 'san francisco', 'sf', 
            'los angeles', 'la', 'chicago', 'boston', 'seattle', 'miami',
            'atlanta', 'denver', 'austin', 'portland', 'washington', 'dc',
            'philadelphia', 'philly', 'houston', 'dallas', 'phoenix'
        ]
    
    async def process(self, input_data: Dict) -> Dict:
        """
        Main processing with PRIORITY:
        1. Extract explicit location from query (e.g., "near Acadia")
        2. Normalize with AI
        3. Fallback to user_address only if no query location
        """
        if not self.validate_input(input_data, ["user_input"]):
            raise ValidationError(self.name, "Missing required 'user_input' field")
        
        user_input = input_data["user_input"]
        user_address = input_data.get("user_address")
        
        self.log_processing("Starting location parsing", f"Query: '{user_input[:50]}...'")
        
        try:
            # ✅ PRIORITY 1: Extract explicit location from query
            explicit_location = self._extract_explicit_location(user_input)
            
            if explicit_location:
                self.log_processing("Explicit location found", explicit_location)
                
                # Normalize with OpenAI (handles parks, landmarks, cities)
                normalized_location = await self._normalize_with_ai(explicit_location, user_input)
                
                if normalized_location:
                    result = self._create_location_result(
                        target_location=normalized_location,
                        source='user_query',
                        original_query_location=explicit_location,
                        user_address_ignored=True,
                        confidence=0.9
                    )
                    self.log_success(f"✅ Location override: '{normalized_location}' (user_address saved for routing)")
                    return self.create_response(True, result)
            
            # ✅ PRIORITY 2: Use user_address (for "nearby" or when no query location)
            final_location = user_address or "Boston, MA"
            source = 'user_address' if user_address else 'default'
            
            result = self._create_location_result(
                target_location=final_location,
                source=source,
                original_query_location=None,
                user_address_ignored=False,
                confidence=0.8 if user_address else 0.5
            )
            
            if source == 'user_address':
                self.log_success(f"✅ Using user_address for search: '{final_location}'")
            else:
                self.log_success(f"⚠️ No location found - using default: '{final_location}'")
            
            return self.create_response(True, result)
            
        except Exception as e:
            self.log_error(f"Location parsing failed: {e}")
            raise ProcessingError(self.name, str(e))
    
    def _extract_explicit_location(self, user_input: str) -> Optional[str]:
        """
        Extract location from query with ENHANCED patterns:
        - "restaurants near Acadia National Park" ✅
        - "coffee at Golden Gate Bridge" ✅
        - "museums around Yellowstone" ✅
        - "things to do in Boston" ✅
        """
        text = user_input.lower()
        
        # ✅ ENHANCED: Catch parks, landmarks, neighborhoods, cities
        patterns = [
            # Priority 1: "near/around/at/by [location with indicator]"
            r'\b(?:near|around|at|by)\s+([a-z][a-z\s]+(?:park|national|monument|beach|island|mountain|lake|river|bridge|tower|square|plaza|district|neighborhood|area|mall|center|station))',
            
            # Priority 2: "near/around/at/by [proper noun]" (catches "near Acadia")
            r'\b(?:near|around|at|by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
            
            # Priority 3: "in [location with city indicators]"
            r'\bin\s+([a-z\s]+(?:city|york|francisco|angeles|chicago|boston|seattle|miami|atlanta|denver|austin|portland|washington|philadelphia|houston|dallas|phoenix|nevada|california|florida|texas|massachusetts|new york))',
            r'\bin\s+(nyc|sf|la|dc|philly)',
            
            # Priority 4: "visit [proper noun]"
            r'\bvisit\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
            
            # Priority 5: "go to [proper noun]"
            r'\bgo\s+to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                location = match.group(1).strip()
                if self._is_likely_location(location):
                    self.log_processing("Location extracted", f"'{location}' from query")
                    return location
        
        # ✅ Check if query is "nearby" without location
        if self._is_proximity_query_without_location(text):
            self.log_processing("Proximity query detected", "Will use user_address")
            return None  # Signal to use user_address
        
        return None
    
    def _is_likely_location(self, text: str) -> bool:
        """
        Validate if extracted text is a real location.
        Now handles: cities, parks, landmarks, neighborhoods
        """
        text_lower = text.lower()
        
        # Check against known cities
        if any(city in text_lower for city in self.major_cities):
            return True
        
        # ✅ NEW: Check for location indicators
        location_indicators = [
            'park', 'national', 'monument', 'beach', 'island', 'mountain', 
            'lake', 'river', 'bridge', 'tower', 'square', 'plaza',
            'city', 'county', 'state', 'district', 'neighborhood', 'area'
        ]
        if any(indicator in text_lower for indicator in location_indicators):
            return True
        
        # ✅ NEW: Check for proper nouns (capitalized words)
        words = text.split()
        if len(words) >= 1 and any(word[0].isupper() for word in words if word):
            return True
        
        # Filter out non-locations
        non_locations = [
            'new', 'the', 'and', 'or', 'with', 'for', 'from', 'about', 'like',
            'places', 'spots', 'areas', 'good', 'great', 'fun', 'cool', 'nice',
            'museums', 'restaurants', 'coffee', 'shops', 'parks', 'bars',
            'things', 'stuff', 'activities', 'attractions'
        ]
        
        if text_lower in non_locations or len(text) < 3:
            return False
        
        return len(text.split()) <= 5  # ✅ Allow "Acadia National Park" (3 words)
    
    def _is_proximity_query_without_location(self, text: str) -> bool:
        """
        Check if query is "nearby" WITHOUT specifying where.
        Examples:
        - "restaurants nearby" → True (use user_address)
        - "restaurants near Acadia" → False (explicit location)
        """
        proximity_keywords = ['nearby', 'near me', 'around here', 'close by', 'in the area']
        
        has_proximity = any(keyword in text for keyword in proximity_keywords)
        
        if has_proximity:
            # Check if standalone (not "near [location]")
            standalone_patterns = [
                r'\bnearby\b(?!\s+[A-Z])',  # "nearby" not followed by capital
                r'\bnear me\b',
                r'\baround here\b',
                r'\bclose by\b'
            ]
            return any(re.search(pattern, text, re.IGNORECASE) for pattern in standalone_patterns)
        
        return False
    
    async def _normalize_with_ai(self, location: str, context: str) -> Optional[str]:
        """Use OpenAI to normalize location (cities, parks, landmarks)"""
        try:
            prompt = self._create_normalization_prompt(location, context)
            
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=100
            )
            
            normalized = response.choices[0].message.content.strip()
            
            if normalized == "INVALID" or not normalized:
                self.log_warning(f"OpenAI rejected location: '{location}'")
                return None
            
            self.log_processing("AI normalized", f"'{location}' → '{normalized}'")
            return normalized
            
        except Exception as e:
            self.log_error(f"Location normalization error: {e}")
            return None
    
    def _create_normalization_prompt(self, location: str, context: str) -> str:
        """
        Prompt for normalizing ALL types of locations:
        - Major cities
        - National parks
        - Landmarks
        - Neighborhoods
        """
        return f"""You are a location expert. Normalize the extracted location to standard format for venue searches.

USER QUERY: "{context}"
EXTRACTED LOCATION: "{location}"

Return the normalized, full location name suitable for searching venues.

EXAMPLES:
Cities:
- "new york" → "New York, NY"
- "nyc" → "New York, NY"  
- "sf" → "San Francisco, CA"
- "boston" → "Boston, MA"

National Parks/Landmarks:
- "acadia national park" → "Acadia National Park, ME"
- "yellowstone" → "Yellowstone National Park, WY"
- "grand canyon" → "Grand Canyon, AZ"
- "yosemite" → "Yosemite National Park, CA"
- "golden gate bridge" → "Golden Gate Bridge, San Francisco, CA"

Neighborhoods/Districts:
- "soho" → "SoHo, New York, NY"
- "north end" (with Boston context) → "North End, Boston, MA"

RULES:
1. Return full, standardized location name
2. Include state/region for clarity
3. For national parks: include "National Park" and primary state
4. For neighborhoods: include city if clear from context
5. If ambiguous or not a real place, return "INVALID"  
6. Only tourism/activity locations (not businesses)

Return ONLY the normalized location or "INVALID". No explanations."""
    
    def _create_location_result(self, target_location: str, source: str, 
                               original_query_location: Optional[str], 
                               user_address_ignored: bool, confidence: float) -> Dict:
        """Create standardized location parsing result"""
        return {
            'target_location': target_location,
            'location_source': source,
            'original_query_location': original_query_location,
            'user_address_ignored': user_address_ignored,
            'confidence': confidence
        }