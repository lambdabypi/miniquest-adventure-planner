# backend/app/agents/scouting/venue_scout.py
"""PROXIMITY-AWARE Venue Scout - Finds venues NEAR user location using Google Places"""

from typing import List, Dict, Optional
from openai import AsyncOpenAI
import googlemaps
import json
from datetime import datetime
from ..base import BaseAgent, ValidationError, ProcessingError
from ...core.config import settings
import logging

logger = logging.getLogger(__name__)

class VenueScoutAgent(BaseAgent):
    """
    PROXIMITY-AWARE venue scouting with dual strategy:
    
    Strategy 1: Google Places Nearby Search (if specific address provided)
      → Finds ACTUAL venues within walking distance
      → Uses real-time business data
      → Prioritizes proximity over fame
    
    Strategy 2: OpenAI Knowledge (if only city name provided)
      → Suggests well-known venues
      → Good for general exploration
      → Uses famous/popular spots
    """
    
    def __init__(self):
        super().__init__("VenueScout")
        self.client = AsyncOpenAI()
        self.current_year = datetime.now().year
        
        # Initialize Google Maps for proximity search
        if settings.GOOGLE_MAPS_KEY:
            self.gmaps = googlemaps.Client(key=settings.GOOGLE_MAPS_KEY)
            self.proximity_enabled = True
            logger.info("✅ Google Places proximity search ENABLED")
        else:
            self.gmaps = None
            self.proximity_enabled = False
            logger.warning("⚠️ Google Places disabled - will use OpenAI knowledge only")
    
    async def process(self, input_data: Dict) -> Dict:
        """Scout venues with proximity awareness"""
        required_fields = ["preferences", "location"]
        if not self.validate_input(input_data, required_fields):
            raise ValidationError(self.name, f"Missing required fields: {required_fields}")
        
        preferences = input_data["preferences"]
        location = input_data["location"]
        user_query = input_data.get("user_query", "")
        
        self.log_processing("Starting venue scouting", f"{preferences} in {location}")
        
        # ✅ PROXIMITY CHECK: Determine if we have specific address
        is_specific_location = self._is_specific_address(location)
        
        if is_specific_location and self.proximity_enabled:
            self.log_processing("Using PROXIMITY search", f"Finding venues near {location}")
            return await self._proximity_search(preferences, location, user_query)
        else:
            self.log_processing("Using KNOWLEDGE-BASED search", f"Finding popular venues in {location}")
            return await self._knowledge_based_search(preferences, location, user_query)
    
    async def _proximity_search(self, preferences: List[str], location: str, user_query: str) -> Dict:
        """
        Use Google Places to find ACTUAL nearby venues.
        
        Strategy: Geocode user address → Search within radius → Filter by preferences
        """
        try:
            # Step 1: Geocode user location
            self.log_processing("Geocoding location", location)
            geocode_result = self.gmaps.geocode(location)
            
            if not geocode_result:
                self.log_warning("Geocoding failed - falling back to knowledge-based")
                return await self._knowledge_based_search(preferences, location, user_query)
            
            lat = geocode_result[0]['geometry']['location']['lat']
            lng = geocode_result[0]['geometry']['location']['lng']
            
            self.log_processing("Location found", f"{lat}, {lng}")
            
            # Step 2: Search nearby for each preference
            all_nearby_venues = []
            
            for pref in preferences[:5]:  # Limit to 5 preferences
                nearby = self._search_nearby_by_preference(lat, lng, pref, location)
                all_nearby_venues.extend(nearby)
                self.log_processing(f"Found {len(nearby)} venues for '{pref}'")
            
            # Step 3: Deduplicate and diversify
            unique_venues = self._deduplicate_venues(all_nearby_venues)
            diverse_venues = self._select_diverse_venues(unique_venues, target_count=10)
            
            # Step 4: Enhance with metadata
            enhanced_venues = [self._enhance_venue(v, location) for v in diverse_venues]
            
            result = {
                "venues": enhanced_venues,
                "total_found": len(enhanced_venues),
                "total_processed": len(all_nearby_venues),
                "location": location,
                "preferences": preferences,
                "search_strategy": "proximity_based",
                "user_coordinates": {"lat": lat, "lng": lng}
            }
            
            self.log_success(f"Proximity search: {len(enhanced_venues)} nearby venues")
            return self.create_response(True, result)
            
        except Exception as e:
            self.log_error(f"Proximity search failed: {e}")
            # Fallback to knowledge-based
            return await self._knowledge_based_search(preferences, location, user_query)
    
    def _search_nearby_by_preference(self, lat: float, lng: float, preference: str, location: str) -> List[Dict]:
        """
        ✅ FIXED: Search Google Places and filter out closed venues
        """
        
        # Map preference to Google Places types
        place_type = self._preference_to_place_type(preference)
        
        try:
            # Search within 2km radius (walkable distance)
            places_result = self.gmaps.places_nearby(
                location=(lat, lng),
                radius=2000,  # 2km radius
                type=place_type,
                open_now=False  # Don't filter by currently open (but we want operating businesses)
            )
            
            venues = []
            for place in places_result.get('results', [])[:10]:  # Get more to account for filtering
                # ✅ CHECK BUSINESS STATUS EARLY
                business_status = place.get('business_status')
                if business_status in ['CLOSED_PERMANENTLY', 'CLOSED_TEMPORARILY']:
                    logger.warning(f"⚠️ Skipping closed venue: {place.get('name')} ({business_status})")
                    continue
                
                venue = self._convert_google_place_to_venue(place, location, preference)
                if venue:
                    venues.append(venue)
                
                # Stop if we have enough valid venues
                if len(venues) >= 5:
                    break
            
            return venues
            
        except Exception as e:
            logger.warning(f"Google Places search failed for '{preference}': {e}")
            return []
    
    def _preference_to_place_type(self, preference: str) -> str:
        """Convert user preference to Google Places type"""
        pref_lower = preference.lower()
        
        # Mapping of preferences to Google Places types
        if 'coffee' in pref_lower or 'cafe' in pref_lower:
            return 'cafe'
        elif 'museum' in pref_lower or 'art' in pref_lower:
            return 'museum'
        elif 'park' in pref_lower or 'nature' in pref_lower or 'garden' in pref_lower:
            return 'park'
        elif 'restaurant' in pref_lower or 'food' in pref_lower or 'dining' in pref_lower:
            return 'restaurant'
        elif 'bar' in pref_lower or 'pub' in pref_lower or 'nightlife' in pref_lower:
            return 'bar'
        elif 'shop' in pref_lower or 'shopping' in pref_lower:
            return 'store'
        else:
            return 'point_of_interest'  # Generic catch-all
    
    def _convert_google_place_to_venue(self, place: Dict, location: str, preference: str) -> Optional[Dict]:
        """
        ✅ FIXED: Convert Google Place to venue format with business_status
        """
        try:
            name = place.get('name', '')
            if not name or len(name) < 3:
                return None
            
            # ✅ DOUBLE-CHECK: Ensure not closed (defensive programming)
            business_status = place.get('business_status')
            if business_status in ['CLOSED_PERMANENTLY', 'CLOSED_TEMPORARILY']:
                logger.warning(f"⚠️ Filtering closed venue in conversion: {name}")
                return None
            
            # Get address
            address = place.get('vicinity', '') or place.get('formatted_address', '')
            
            # Extract neighborhood from address
            neighborhood = self._extract_neighborhood(address)
            
            # Determine venue type
            venue_type = self._google_types_to_venue_type(place.get('types', []))
            
            return {
                "name": name,
                "address_hint": address,
                "neighborhood": neighborhood or location.split(',')[0],
                "type": venue_type,
                "category": preference.lower(),
                "current_status_confidence": "High",  # Google only returns operating businesses
                "establishment_type": "Verified",
                "google_place_id": place.get('place_id', ''),
                "google_rating": place.get('rating'),
                "google_user_ratings_total": place.get('user_ratings_total', 0),
                "business_status": business_status or "OPERATIONAL",  # ✅ Track status
                "proximity_based": True
            }
            
        except Exception as e:
            logger.warning(f"Error converting Google place: {e}")
            return None
    
    def _google_types_to_venue_type(self, types: List[str]) -> str:
        """Convert Google Place types to our venue type"""
        type_mapping = {
            'cafe': 'coffee_shop',
            'museum': 'museum',
            'park': 'park',
            'restaurant': 'restaurant',
            'bar': 'bar',
            'store': 'shopping',
            'art_gallery': 'gallery'
        }
        
        for gtype in types:
            if gtype in type_mapping:
                return type_mapping[gtype]
        
        return 'attraction'
    
    def _extract_neighborhood(self, address: str) -> str:
        """Extract neighborhood from address"""
        if not address:
            return ""
        
        # Try to extract neighborhood (usually after street, before city)
        parts = address.split(',')
        if len(parts) >= 2:
            potential_neighborhood = parts[1].strip()
            if len(potential_neighborhood) > 2 and not potential_neighborhood.isdigit():
                return potential_neighborhood
        
        return ""
    
    def _deduplicate_venues(self, venues: List[Dict]) -> List[Dict]:
        """Remove duplicate venues"""
        seen_names = set()
        unique = []
        
        for venue in venues:
            name_lower = venue.get('name', '').lower().strip()
            if name_lower and name_lower not in seen_names:
                seen_names.add(name_lower)
                unique.append(venue)
        
        return unique
    
    def _select_diverse_venues(self, venues: List[Dict], target_count: int = 10) -> List[Dict]:
        """Select diverse venues by type"""
        if len(venues) <= target_count:
            return venues
        
        # Group by type
        by_type = {}
        for venue in venues:
            vtype = venue.get('type', 'other')
            if vtype not in by_type:
                by_type[vtype] = []
            by_type[vtype].append(venue)
        
        # Take up to 3 per type for diversity
        diverse = []
        for vtype, venues_of_type in by_type.items():
            # Sort by rating if available
            sorted_venues = sorted(
                venues_of_type, 
                key=lambda v: v.get('google_rating', 0), 
                reverse=True
            )
            diverse.extend(sorted_venues[:3])
            
            if len(diverse) >= target_count:
                break
        
        return diverse[:target_count]
    
    async def _knowledge_based_search(self, preferences: List[str], location: str, user_query: str) -> Dict:
        """Fallback: Use OpenAI knowledge for well-known venues"""
        try:
            scout_prompt = self._build_scout_prompt(preferences, location, user_query)
            
            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": scout_prompt}],
                temperature=0.2,
                max_tokens=2500
            )
            
            content = self._clean_json_response(response.choices[0].message.content)
            raw_venues = json.loads(content)
            
            # Validate venues
            validated_venues = []
            for venue in raw_venues:
                if self._validate_venue(venue):
                    enhanced_venue = self._enhance_venue(venue, location)
                    enhanced_venue['proximity_based'] = False
                    validated_venues.append(enhanced_venue)
                    self.log_processing("Validated venue", venue.get('name'))
            
            result = {
                "venues": validated_venues,
                "total_found": len(validated_venues),
                "total_processed": len(raw_venues),
                "location": location,
                "preferences": preferences,
                "search_strategy": "knowledge_based"
            }
            
            self.log_success(f"Knowledge-based search: {len(validated_venues)} venues")
            return self.create_response(True, result)
            
        except Exception as e:
            self.log_error(f"Knowledge-based search failed: {e}")
            raise ProcessingError(self.name, str(e))
    
    def _is_specific_address(self, location: str) -> bool:
        """Check if location is a specific address (vs just city name)"""
        location_lower = location.lower()
        
        # Indicators of specific address
        address_indicators = [
            'street', 'st ', 'avenue', 'ave ', 'road', 'rd ', 'drive', 'dr ',
            'boulevard', 'blvd', 'place', 'pl ', 'lane', 'ln ', 'square',
            'near ', 'at '
        ]
        
        # Check for street numbers
        has_numbers = any(char.isdigit() for char in location)
        
        # Check for address indicators
        has_address_term = any(indicator in location_lower for indicator in address_indicators)
        
        return has_numbers or has_address_term
    
    def _build_scout_prompt(self, preferences: List[str], location: str, user_query: str) -> str:
        """
        ✅ FIXED: Build scouting prompt with stronger closure warnings
        """
        return f"""You are a local expert for {location} with CURRENT knowledge as of {self.current_year}.
Find 8-10 diverse, well-known venues that are CURRENTLY OPERATING for: {preferences}.

USER LOCATION: {location}
USER REQUEST: "{user_query}"
USER INTERESTS: {preferences}

🚨 CRITICAL REQUIREMENTS:
1. **ONLY venues that are CURRENTLY OPEN AND OPERATIONAL** in {self.current_year}
2. **NEVER suggest permanently closed venues** - double-check before including
3. **NEVER suggest temporarily closed venues** - verify they are accepting visitors
4. **DIVERSE types** - mix of museums, cafes, parks, restaurants, bars, galleries
5. **WELL-ESTABLISHED** venues with good reputations and active operations

⚠️ COMMON MISTAKES TO AVOID:
- DO NOT include venues that closed in recent years
- DO NOT include venues "under renovation" unless they have partial access
- DO NOT include venues that have moved/relocated without noting the new location
- DO NOT include seasonal venues outside their operating season

Return ONLY valid JSON array of 8-10 diverse, OPERATING venues:
[
  {{
    "name": "Museum of Fine Arts, Boston",
    "address_hint": "465 Huntington Ave",
    "neighborhood": "Fenway",
    "type": "museum",
    "category": "art",
    "current_status_confidence": "High",
    "establishment_type": "Institution"
  }},
  {{
    "name": "Thinking Cup",
    "address_hint": "165 Tremont St",
    "neighborhood": "Downtown",
    "type": "coffee_shop",
    "category": "coffee",
    "current_status_confidence": "High",
    "establishment_type": "Business"
  }}
]

Focus ONLY on venues you are confident are currently operating in {self.current_year}."""
    
    def _validate_venue(self, venue: Dict) -> bool:
        """
        ✅ FIXED: Validate venue with stricter closure checking
        """
        required_fields = ['name', 'type', 'category']
        for field in required_fields:
            if not venue.get(field):
                return False
        
        name = venue.get('name', '').lower()
        
        # ✅ EXPANDED: More closure indicators
        closure_indicators = [
            'closed', 'former', 'old', 'previous', 'was', 'used to be',
            'defunct', 'abandoned', 'no longer', 'shut down', 'discontinued'
        ]
        if any(indicator in name for indicator in closure_indicators):
            logger.warning(f"❌ Rejecting venue with closure indicator: {venue.get('name')}")
            return False
        
        # Google Places results are pre-validated
        if venue.get('proximity_based'):
            return True
        
        # For OpenAI results, check confidence
        confidence = venue.get('current_status_confidence', '').lower()
        if confidence not in ['high', 'medium']:
            logger.warning(f"⚠️ Rejecting low-confidence venue: {venue.get('name')}")
            return False
        
        return True
    
    def _enhance_venue(self, venue: Dict, location: str) -> Dict:
        """Enhance venue with validation context"""
        enhanced = venue.copy()
        
        enhanced.update({
            'data_validation': {
                'current_year_validated': self.current_year,
                'validation_confidence': venue.get('current_status_confidence', 'Medium'),
                'establishment_reliability': venue.get('establishment_type', 'Unknown'),
                'validation_timestamp': datetime.now().isoformat()
            },
            'research_priority': 'verify_current_status',
            'enhanced_search_query': (
                f"{venue.get('name')} {venue.get('address_hint', '')} {location} "
                f"current {self.current_year} operating hours status"
            )
        })
        
        return enhanced
    
    def _clean_json_response(self, content: str) -> str:
        """Clean OpenAI response to extract valid JSON"""
        content = content.strip()
        
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        
        if content.endswith("```"):
            content = content[:-3]
        
        content = content.strip()
        
        # Extract JSON array
        if '[' in content:
            start = content.find('[')
            bracket_count = 0
            end = start
            
            for i, char in enumerate(content[start:], start):
                if char == '[':
                    bracket_count += 1
                elif char == ']':
                    bracket_count -= 1
                    if bracket_count == 0:
                        end = i + 1
                        break
            
            if bracket_count == 0:
                return content[start:end]
        
        return content