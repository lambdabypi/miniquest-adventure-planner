# backend/app/agents/research/query_strategy.py
"""Query strategy agent for generating intelligent Tavily search queries"""

import openai
import json
import logging
from typing import List, Dict, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class QueryStrategyAgent:
    """Uses OpenAI to intelligently generate venue-specific research queries for Tavily"""
    
    def __init__(self):
        logger.info("✅ OpenAI-Powered Query Strategy Agent initialized")
    
    def build_venue_queries(self, venue: Dict, location: str) -> List[str]:
        """
        Use OpenAI to generate intelligent, venue-specific research queries.
        
        Args:
            venue: Venue dictionary with name, type, category, etc.
            location: Target location for the venue
            
        Returns:
            List of intelligent search query strings
        """
        venue_name = venue.get('name', '')
        venue_type = venue.get('type', '').lower()
        venue_category = venue.get('category', '').lower()
        address_hint = venue.get('address_hint', '')
        neighborhood = venue.get('neighborhood', '')
        
        logger.info(f"🤖 Using OpenAI to build queries for {venue_name} ({venue_type})")
        
        try:
            # Use OpenAI to generate contextually appropriate queries
            queries = self._generate_smart_queries(
                venue_name, venue_type, venue_category, location, address_hint, neighborhood
            )
            
            # Validate and clean queries
            cleaned_queries = self._validate_and_clean_queries(queries, venue_name)
            
            logger.info(f"✅ Generated {len(cleaned_queries)} intelligent queries:")
            for i, query in enumerate(cleaned_queries, 1):
                logger.info(f"   {i}. {query}")
            
            return cleaned_queries
            
        except Exception as e:
            logger.error(f"OpenAI query generation failed: {e}")
            # Fallback to basic queries
            return self._fallback_queries(venue_name, venue_type, location)
    
    def _generate_smart_queries(
        self, 
        venue_name: str, 
        venue_type: str, 
        category: str, 
        location: str, 
        address_hint: str, 
        neighborhood: str
    ) -> List[str]:
        """Use OpenAI to generate contextually appropriate research queries"""
        
        query_prompt = f"""You are an expert researcher who creates targeted search queries for venue research.

VENUE CONTEXT:
- Name: "{venue_name}"
- Type: {venue_type}
- Category: {category}
- Location: {location}
- Neighborhood: {neighborhood}
- Address hint: {address_hint}

TASK: Generate 6-8 highly specific, realistic search queries to research this venue using web search.

QUERY REQUIREMENTS:
1. **Be venue-type appropriate**: 
   - Coffee shops: hours, menu, wifi, atmosphere, parking
   - Parks: trails, activities, facilities, safety, wildlife
   - Museums: exhibitions, collections, admission, hours, highlights
   - Restaurants: menu, cuisine, reservations, ambiance, popular dishes

2. **Include venue name in quotes**: Always use exact venue names in quotes for precision

3. **Focus on actionable visitor information**:
   - Current hours and access
   - What to see/do/order
   - Practical visitor tips
   - Current status and recent updates

4. **Avoid inappropriate queries**:
   ❌ Don't ask about "exhibitions" for coffee shops
   ❌ Don't ask about "admission prices" for parks
   ❌ Don't ask about "menu" for museums

EXAMPLES:
For "Jamaica Pond" (park):
✅ "Jamaica Pond" walking trail loop distance activities
✅ "Jamaica Pond" Boston parking facilities restrooms
✅ "Jamaica Pond" boating kayak rental seasonal

For "Thinking Cup" (coffee shop):
✅ "Thinking Cup" menu coffee drinks pastries hours
✅ "Thinking Cup" wifi laptop friendly atmosphere study
✅ "Thinking Cup" Boston location seating parking

For "Museum of Fine Arts" (museum):
✅ "Museum of Fine Arts" current exhibitions 2024 highlights
✅ "Museum of Fine Arts" admission tickets hours visitor guide
✅ "Museum of Fine Arts" must see collections permanent

Return ONLY a JSON array of query strings:
["query 1", "query 2", "query 3", ...]

Make queries specific to THIS venue type and what visitors actually need to know."""

        response = openai.chat.completions.create(
            model="gpt-4o-mini",  # Fast and good for this task
            messages=[{"role": "user", "content": query_prompt}],
            temperature=0.3,  # Balanced creativity with consistency
            max_tokens=1000
        )
        
        content = self._clean_json_response(response.choices[0].message.content)
        queries = json.loads(content)
        
        if isinstance(queries, list) and all(isinstance(q, str) for q in queries):
            return queries
        else:
            raise ValueError("Invalid query format from OpenAI")
    
    def _validate_and_clean_queries(self, queries: List[str], venue_name: str) -> List[str]:
        """
        Validate and clean the generated queries.
        
        Args:
            queries: List of generated queries
            venue_name: Venue name to ensure it's included
            
        Returns:
            List of cleaned, validated queries
        """
        cleaned_queries = []
        
        for query in queries:
            # Basic validation
            if not query or len(query.strip()) < 10:
                continue
            
            query = query.strip()
            
            # Ensure venue name is included (add if missing)
            if venue_name.lower() not in query.lower():
                query = f'"{venue_name}" {query}'
            
            # Remove duplicates and overly similar queries
            if not self._is_duplicate_query(query, cleaned_queries):
                cleaned_queries.append(query)
        
        # Add current year context to one query for freshness
        if cleaned_queries:
            current_year = datetime.now().year
            cleaned_queries[0] += f" {current_year} current"
        
        return cleaned_queries[:8]  # Limit to 8 queries max
    
    def _is_duplicate_query(self, new_query: str, existing_queries: List[str]) -> bool:
        """
        Check if query is too similar to existing ones.
        
        Args:
            new_query: New query to check
            existing_queries: List of existing queries
            
        Returns:
            True if duplicate, False otherwise
        """
        new_words = set(new_query.lower().split())
        
        for existing in existing_queries:
            existing_words = set(existing.lower().split())
            
            # Calculate similarity
            intersection = new_words.intersection(existing_words)
            union = new_words.union(existing_words)
            
            if union:
                similarity = len(intersection) / len(union)
                if similarity > 0.7:  # Too similar
                    return True
        
        return False
    
    def _fallback_queries(self, venue_name: str, venue_type: str, location: str) -> List[str]:
        """
        Fallback queries when OpenAI fails.
        
        Args:
            venue_name: Venue name
            venue_type: Venue type
            location: Target location
            
        Returns:
            List of basic fallback queries
        """
        logger.warning(f"Using fallback queries for {venue_name}")
        
        current_year = datetime.now().year
        
        base_queries = [
            f'"{venue_name}" {location} reviews visitor experience',
            f'"{venue_name}" hours location address directions',
            f'"{venue_name}" {current_year} current status updates'
        ]
        
        # Type-specific fallbacks
        if venue_type in ['museum', 'gallery']:
            base_queries.extend([
                f'"{venue_name}" exhibitions collections what to see',
                f'"{venue_name}" admission tickets visitor guide'
            ])
        elif venue_type in ['park', 'garden']:
            base_queries.extend([
                f'"{venue_name}" trails activities things to do',
                f'"{venue_name}" facilities parking visitor tips'
            ])
        elif venue_type in ['coffee_shop', 'cafe']:
            base_queries.extend([
                f'"{venue_name}" menu coffee drinks atmosphere',
                f'"{venue_name}" wifi seating study laptop friendly'
            ])
        elif venue_type in ['restaurant']:
            base_queries.extend([
                f'"{venue_name}" menu cuisine popular dishes',
                f'"{venue_name}" reservations dining experience'
            ])
        else:
            base_queries.extend([
                f'"{venue_name}" what to expect visitor guide',
                f'"{venue_name}" popular recommended highlights'
            ])
        
        return base_queries[:6]
    
    def _clean_json_response(self, content: str) -> str:
        """
        Clean OpenAI response to extract valid JSON.
        
        Args:
            content: Raw OpenAI response content
            
        Returns:
            Cleaned JSON string
        """
        content = content.strip()
        
        # Remove markdown code blocks
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        
        if content.endswith("```"):
            content = content[:-3]
        
        content = content.strip()
        
        # Extract JSON array if present
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


class VenueTypeDetector:
    """
    Detects and normalizes venue types for better query generation.
    
    Helps the Query Strategy Agent understand what kind of information
    to search for based on the venue type.
    """
    
    @staticmethod
    def detect_venue_type(venue: Dict) -> str:
        """
        Detect the most specific venue type from available information.
        
        Args:
            venue: Venue dictionary
            
        Returns:
            Detected venue type string
        """
        venue_name = venue.get('name', '').lower()
        venue_type = venue.get('type', '').lower()
        category = venue.get('category', '').lower()
        
        # Coffee/Cafe detection
        coffee_indicators = ['coffee', 'cafe', 'coffeehouse', 'espresso', 'latte']
        if (any(indicator in venue_name for indicator in coffee_indicators) or
            any(indicator in venue_type for indicator in coffee_indicators) or
            'coffee' in category):
            return 'coffee_shop'
        
        # Park/Nature detection
        park_indicators = ['park', 'pond', 'garden', 'arboretum', 'trail', 'green', 'nature']
        if (any(indicator in venue_name for indicator in park_indicators) or
            venue_type in ['park', 'garden', 'nature'] or
            'park' in category):
            return 'park'
        
        # Museum/Gallery detection
        museum_indicators = ['museum', 'gallery', 'collection', 'exhibit']
        if (any(indicator in venue_name for indicator in museum_indicators) or
            venue_type in ['museum', 'gallery'] or
            'museum' in category or 'art' in category):
            return 'museum'
        
        # Restaurant detection
        restaurant_indicators = ['restaurant', 'bistro', 'eatery', 'dining', 'grill', 'kitchen']
        if (any(indicator in venue_name for indicator in restaurant_indicators) or
            venue_type in ['restaurant', 'dining'] or
            'food' in category or 'dining' in category):
            return 'restaurant'
        
        # Bar/Nightlife detection
        bar_indicators = ['bar', 'pub', 'brewery', 'tavern', 'lounge']
        if (any(indicator in venue_name for indicator in bar_indicators) or
            venue_type in ['bar', 'pub', 'brewery'] or
            'bar' in category or 'nightlife' in category):
            return 'bar'
        
        # Shopping detection
        shopping_indicators = ['shop', 'store', 'boutique', 'market', 'mall']
        if (any(indicator in venue_name for indicator in shopping_indicators) or
            venue_type in ['shop', 'store', 'retail'] or
            'shopping' in category):
            return 'shopping'
        
        # Default fallback
        return venue_type or 'attraction'
    
    @staticmethod  
    def get_venue_research_focus(venue_type: str) -> List[str]:
        """
        Get the key research areas for each venue type.
        
        Args:
            venue_type: Type of venue
            
        Returns:
            List of research focus areas
        """
        focus_areas = {
            'coffee_shop': ['hours', 'menu', 'atmosphere', 'wifi', 'seating', 'specialties'],
            'park': ['trails', 'activities', 'facilities', 'safety', 'seasonal', 'wildlife'],
            'museum': ['exhibitions', 'collections', 'admission', 'highlights', 'tours', 'events'],
            'restaurant': ['menu', 'cuisine', 'reservations', 'ambiance', 'popular_dishes', 'pricing'],
            'bar': ['drinks', 'atmosphere', 'music', 'crowd', 'happy_hour', 'specialties'],
            'shopping': ['products', 'brands', 'pricing', 'hours', 'location', 'specialties'],
            'attraction': ['highlights', 'activities', 'access', 'visitor_tips', 'best_time']
        }
        
        return focus_areas.get(venue_type, focus_areas['attraction'])
    
    @staticmethod
    def get_smart_domains(venue: Dict) -> List[str]:
        """
        Get smart domain filtering based on venue type.
        
        Args:
            venue: Venue dictionary
            
        Returns:
            List of recommended domains for searching
        """
        venue_type = VenueTypeDetector.detect_venue_type(venue)
        venue_name = venue.get('name', '').lower()
        
        # Base domains that are always useful
        base_domains = [
            "yelp.com",
            "tripadvisor.com",
            "google.com",
            "timeout.com"
        ]
        
        # Venue-specific domains
        if venue_type == 'coffee_shop':
            base_domains.extend(["foursquare.com"])
            if 'starbucks' in venue_name:
                base_domains.append("starbucks.com")
            elif 'dunkin' in venue_name:
                base_domains.append("dunkindonuts.com")
                
        elif venue_type == 'park':
            base_domains.extend([
                ".gov",  # Government sites for parks
                "nps.gov",  # National Park Service
                "alltrails.com"
            ])
            
        elif venue_type == 'museum':
            base_domains.extend([
                ".edu",  # Educational institutions
                ".org"   # Non-profit organizations
            ])
            
        elif venue_type == 'restaurant':
            base_domains.extend([
                "opentable.com",
                "eater.com",
                "zagat.com"
            ])
        
        return base_domains