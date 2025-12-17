# backend/app/agents/creation/adventure_creator.py
"""ASYNC Adventure creation agent - FIXED VENUE HALLUCINATIONS"""

from openai import AsyncOpenAI
import json
import logging
from typing import Dict, List, Optional
from ..base import BaseAgent, ProcessingError

logger = logging.getLogger(__name__)

class AdventureCreatorAgent(BaseAgent):
    """Create final adventures from researched venues with ASYNC OpenAI"""
    
    def __init__(self):
        super().__init__("AdventureCreator")
        self.client = AsyncOpenAI()
        self.log_success("AdventureCreator initialized (ASYNC)")
    
    async def process(self, input_data: Dict) -> Dict:
        """Create adventures with research integration"""
        researched_venues = input_data.get("researched_venues", [])
        enhanced_locations = input_data.get("enhanced_locations", [])
        preferences = input_data.get("parsed_preferences", {})
        target_location = input_data.get("target_location", "Boston, MA")
        
        self.log_processing("Creating adventures", f"{len(researched_venues)} venues")
        
        try:
            # ✅ Create base adventures using ASYNC OpenAI with STRICT venue rules
            adventures = await self._create_base_adventures(
                researched_venues, enhanced_locations, preferences, target_location
            )
            
            # Integrate research data INCLUDING research_summary
            for adventure in adventures:
                self._integrate_research_data(adventure, researched_venues)
            
            result = {
                "adventures": adventures,
                "total_created": len(adventures),
                "target_location": target_location
            }
            
            self.log_success(f"Created {len(adventures)} adventures with research integration")
            return self.create_response(True, result)
            
        except Exception as e:
            self.log_error(f"Adventure creation failed: {e}")
            raise ProcessingError(self.name, str(e))
    
    async def _create_base_adventures(
        self, 
        researched_venues: List[Dict], 
        enhanced_locations: List[Dict],
        preferences: Dict, 
        target_location: str
    ) -> List[Dict]:
        """✅ FIXED: Create base adventures with STRICT venue validation"""
        
        # Build venue profiles for OpenAI
        venue_profiles = self._build_venue_profiles(
            researched_venues, enhanced_locations, target_location
        )
        
        # ✅ FIXED: Generate adventures with STRICT prompt
        prompt = self._build_adventure_prompt(
            venue_profiles, preferences, target_location
        )
        
        # ASYNC call
        response = await self.client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=3500
        )
        
        content = self._clean_json_response(response.choices[0].message.content)
        return json.loads(content)
    
    def _build_venue_profiles(
        self, 
        researched_venues: List[Dict], 
        enhanced_locations: List[Dict],
        target_location: str
    ) -> List[Dict]:
        """Build venue profiles for OpenAI prompt"""
        venue_profiles = []
        
        for i, venue in enumerate(researched_venues[:8]):
            maps_data = enhanced_locations[i] if i < len(enhanced_locations) else {}
            
            profile = {
                "name": venue.get("name", "Unknown"),
                "location": target_location,
                "type": venue.get("type", "attraction"),
                "neighborhood": venue.get("neighborhood", ""),
                "address": maps_data.get("address", ""),
                "rating": maps_data.get("rating"),
                "current_info": venue.get("current_info", "")[:200]
            }
            venue_profiles.append(profile)
        
        return venue_profiles
    
    def _build_adventure_prompt(
        self, 
        venue_profiles: List[Dict], 
        preferences: Dict, 
        target_location: str
    ) -> str:
        """✅ FIXED: Build adventure prompt with STRICT venue rules to prevent hallucinations"""
        
        # Extract EXACT venue names for validation
        exact_venue_names = [v["name"] for v in venue_profiles]
        venue_names_list = "\n".join([f"  {i+1}. {name}" for i, name in enumerate(exact_venue_names)])
        
        return f"""Create 3 exceptional adventure itineraries for {target_location} using these venues:

TARGET LOCATION: {target_location}
USER REQUESTED: {preferences.get('preferences', [])}

🎯 AVAILABLE RESEARCHED VENUES (YOU MUST USE THESE EXACT NAMES):
{venue_names_list}

VENUE DETAILS:
{json.dumps(venue_profiles, indent=2)}

⚠️ CRITICAL RULES - PREVENT HALLUCINATIONS:
1. **ONLY use venue names from the numbered list above**
2. **Use EXACT names in "venues_used" array** (copy from list)
3. **You CAN shorten names in "activity" text** for readability
4. **NEVER invent generic venues** like:
   ❌ "a Boston Pub"
   ❌ "local restaurant"
   ❌ "nearby cafe"
   ❌ "popular bar"
5. **If user wants something not in list** (e.g., "beer" but no bars), use available venues creatively
6. **Each adventure MUST use 2-4 venues from the list**
7. **Verify each venue in "venues_used" exists in the numbered list above**

✅ CORRECT EXAMPLE:
{{
  "steps": [
    {{
      "time": "2:00 PM",
      "activity": "Grab coffee at Cutty's",  // ✅ Shortened for readability
      "details": "..."
    }}
  ],
  "venues_used": ["Cutty's", "Isabella Stewart Gardner Museum"]  // ✅ EXACT names from list
}}

❌ WRONG EXAMPLE (NEVER DO THIS):
{{
  "steps": [
    {{
      "activity": "Visit a local Boston pub"  // ❌ Generic, not from list
    }}
  ],
  "venues_used": ["Dunkin'", "a Boston pub"]  // ❌ "a Boston pub" NOT in research
}}

Return ONLY valid JSON array with 3 adventures:
[
  {{
    "title": "Adventure Title",
    "tagline": "One-line description",
    "description": "Rich narrative description (2-3 sentences)",
    "duration": {preferences.get('time_available', 180)},
    "cost": 35,
    "theme": "Theme Name",
    "location": "{target_location}",
    "steps": [
      {{
        "time": "2:00 PM",
        "activity": "Visit [VENUE FROM LIST]",
        "details": "Specific activity details"
      }},
      {{
        "time": "3:30 PM",
        "activity": "Explore [ANOTHER VENUE FROM LIST]",
        "details": "More activity details"
      }}
    ],
    "venues_used": ["Exact Name 1", "Exact Name 2"],
    "data_sources": ["OpenAI Scout", "Tavily Research", "Enhanced Google Maps"]
  }},
  ... 2 more adventures
]

FINAL CHECK BEFORE RETURNING:
✅ All venues in "venues_used" exist in numbered list?
✅ No generic venue names like "a pub", "local cafe"?
✅ Each adventure has 2-4 stops?
✅ Adventures tell coherent stories?
"""
    
    def _integrate_research_data(self, adventure: Dict, researched_venues: List[Dict]):
        """Integrate ALL research data into adventure including research_summary"""
        venues_used = adventure.get("venues_used", [])
        adventure["venues_research"] = []
        
        logger.info(f"🔍 Integrating research for adventure '{adventure.get('title')}'")
        logger.info(f"   Venues to match: {venues_used}")
        
        for venue_name in venues_used:
            research = self._find_matching_research(venue_name, researched_venues)
            
            if research:
                adventure["venues_research"].append({
                    "venue_name": venue_name,
                    "matched_to": research.get("name"),
                    "name": research.get("name"),
                    "research_summary": research.get("research_summary", ""),
                    "current_info": research.get("current_info", ""),
                    "hours_info": research.get("hours_info", ""),
                    "visitor_tips": research.get("visitor_tips", []),
                    "research_confidence": research.get("research_confidence", 0.0),
                    "total_insights": research.get("total_insights", 0),
                    "research_status": research.get("research_status", "unknown"),
                    "venue_summary": research.get("venue_summary", ""),
                    "top_source": research.get("top_source")
                })
                logger.info(f"   ✅ Matched '{venue_name}' -> '{research.get('name')}'")
            else:
                logger.warning(f"   ⚠️ No research match for '{venue_name}'")
        
        logger.info(f"   📊 Total venues with research: {len(adventure['venues_research'])}")
    
    def _find_matching_research(
        self, 
        venue_name: str, 
        researched_venues: List[Dict]
    ) -> Optional[Dict]:
        """Find matching research data for venue"""
        venue_name_lower = venue_name.lower().strip()
        
        # Try exact and partial matches
        for research in researched_venues:
            research_name_lower = research.get("name", "").lower().strip()
            
            if (venue_name_lower == research_name_lower or
                venue_name_lower in research_name_lower or 
                research_name_lower in venue_name_lower):
                return research
        
        return None
    
    def _clean_json_response(self, content: str) -> str:
        """Clean OpenAI response to extract valid JSON"""
        content = content.strip()
        
        # Remove markdown code blocks
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
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