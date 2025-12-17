# backend/app/agents/intent/intent_parser.py
"""Intent parsing agent with city constraints - ASYNC"""

from openai import AsyncOpenAI
import json
import logging
from typing import Dict
from ..base import BaseAgent

logger = logging.getLogger(__name__)

class IntentParserAgent(BaseAgent):
    """Parse user intent with city constraints and scope guardrails"""
    
    # ✅ ALLOWED CITIES - Constrain to Boston and NYC only
    ALLOWED_CITIES = ["Boston", "New York", "New York City", "NYC"]
    ALLOWED_STATES = ["MA", "Massachusetts", "NY", "New York"]
    
    def __init__(self):
        super().__init__("IntentParser")
        self.client = AsyncOpenAI()
        self.log_success("IntentParser initialized with city constraints (Boston, NYC only)")
    
    async def process(self, input_data: Dict) -> Dict:
        """Parse user intent and detect out-of-scope requests"""
        user_input = input_data.get("user_input", "")
        user_location = input_data.get("user_address", "")
        
        self.log_processing("Parsing and validating intent", f"Query: '{user_input[:50]}...'")
        
        # ✅ EARLY CHECK: Validate city constraint
        city_validation = self._validate_city_constraint(user_input, user_location)
        if not city_validation["valid"]:
            self.log_warning(f"Invalid city detected: {city_validation['detected_city']}")
            return self.create_response(False, {
                "needs_clarification": True,
                "out_of_scope": True,
                "scope_issue": "unsupported_city",
                "clarification_message": city_validation["message"],
                "suggestions": city_validation["suggestions"],
                "detected_city": city_validation.get("detected_city")
            })
        
        try:
            prompt = self._build_enhanced_prompt(user_input, user_location)
            
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=1000
            )
            
            content = response.choices[0].message.content.strip()
            result = self._parse_json_response(content)
            
            # ✅ Check for completely unrelated queries
            if result.get("unrelated_query"):
                self.log_warning(f"Unrelated query detected: {result.get('query_type')}")
                return self.create_response(False, {
                    "needs_clarification": True,
                    "unrelated_query": True,
                    "clarification_message": result.get("clarification_message"),
                    "suggestions": result.get("suggestions", [
                        "Museums and coffee shops in Boston",
                        "Parks and restaurants in New York",
                        "Art galleries and wine bars"
                    ])
                })
            
            # ✅ Check if request is out of scope
            if result.get("out_of_scope"):
                self.log_warning(f"Out of scope: {result.get('scope_issue')}")
                return self.create_response(False, {
                    "needs_clarification": True,
                    "out_of_scope": True,
                    "scope_issue": result.get("scope_issue"),
                    "clarification_message": result.get("clarification_message"),
                    "suggestions": result.get("suggestions", [])
                })
            
            # Check if query needs clarification (too vague)
            if not result.get("is_actionable", True):
                self.log_warning(f"Query too vague: {result.get('clarification_needed')}")
                return self.create_response(False, {
                    "needs_clarification": True,
                    "clarification_message": result.get("clarification_needed"),
                    "suggestions": result.get("suggestions", [
                        "Museums and restaurants in Boston",
                        "Parks and coffee shops in New York",
                        "Art galleries and wine bars"
                    ])
                })
            
            # Query is good - return parsed preferences
            params = result.get("parsed_preferences", {})
            
            if not params:
                params = self._get_fallback_preferences()
            
            self.log_success(f"Intent parsed: {params.get('preferences', [])}")
            
            return self.create_response(True, {
                "parsed_preferences": params,
                "is_actionable": True,
                "needs_clarification": False
            })
            
        except Exception as e:
            self.log_error(f"Intent parsing failed: {e}")
            fallback = self._get_fallback_preferences()
            return self.create_response(True, {
                "parsed_preferences": fallback,
                "is_actionable": True,
                "needs_clarification": False
            })
    
    def _validate_city_constraint(self, user_input: str, user_location: str) -> Dict:
        """
        ✅ NEW: Validate that the query is for Boston or NYC only
        
        Returns:
            Dict with 'valid', 'message', 'suggestions', 'detected_city'
        """
        user_input_lower = user_input.lower()
        user_location_lower = user_location.lower() if user_location else ""
        
        # List of major cities/countries that indicate out-of-scope geography
        international_cities = [
            "paris", "london", "tokyo", "rome", "barcelona", "berlin", "amsterdam",
            "dubai", "singapore", "hong kong", "beijing", "shanghai", "sydney",
            "melbourne", "toronto", "vancouver", "mexico city", "mumbai", "delhi"
        ]
        
        us_cities_outside_scope = [
            "chicago", "los angeles", "la ", " la", "san francisco", "sf ", " sf",
            "seattle", "miami", "austin", "denver", "portland", "las vegas",
            "atlanta", "dallas", "houston", "philadelphia", "phoenix", "san diego"
        ]
        
        continents = ["europe", "asia", "africa", "australia", "south america"]
        countries = ["france", "uk", "england", "japan", "italy", "spain", "germany"]
        
        # Check for international/out-of-scope locations
        detected_city = None
        
        # Check international cities
        for city in international_cities:
            if city in user_input_lower:
                detected_city = city.title()
                return {
                    "valid": False,
                    "detected_city": detected_city,
                    "message": f"MiniQuest currently operates in Boston and New York City only. We don't support adventures in {detected_city} yet.",
                    "suggestions": [
                        "Museums and coffee shops in Boston",
                        "Parks and restaurants in New York",
                        "Art galleries and wine bars in Boston"
                    ]
                }
        
        # Check US cities outside scope
        for city in us_cities_outside_scope:
            if city in user_input_lower:
                detected_city = city.title().strip()
                return {
                    "valid": False,
                    "detected_city": detected_city,
                    "message": f"MiniQuest currently operates in Boston and New York City only. We'd love to expand to {detected_city} in the future!",
                    "suggestions": [
                        "Museums and coffee shops in Boston",
                        "Parks and restaurants in New York City",
                        "Art galleries and wine bars in Boston"
                    ]
                }
        
        # Check continents
        for continent in continents:
            if continent in user_input_lower:
                return {
                    "valid": False,
                    "detected_city": continent.title(),
                    "message": f"MiniQuest creates local adventures in Boston and New York City. For {continent.title()} travel, try TripAdvisor or Lonely Planet!",
                    "suggestions": [
                        "Museums and restaurants in Boston",
                        "Parks and galleries in New York",
                        "Coffee shops and parks in Boston"
                    ]
                }
        
        # Check countries
        for country in countries:
            if country in user_input_lower:
                return {
                    "valid": False,
                    "detected_city": country.title(),
                    "message": f"MiniQuest operates in Boston and New York City only. For {country.title()} travel, try TripAdvisor or Google Travel!",
                    "suggestions": [
                        "Museums and coffee shops in Boston",
                        "Parks and restaurants in NYC",
                        "Art galleries in New York"
                    ]
                }
        
        # If we get here, the city is either allowed or not specified (which is fine)
        return {"valid": True}
    
    def _build_enhanced_prompt(self, user_input: str, user_location: str) -> str:
        """Enhanced prompt with city constraints"""
        
        allowed_cities_str = " or ".join(self.ALLOWED_CITIES[:2])  # "Boston or New York"
        
        return f"""You are an intelligent intent parser for MiniQuest - a LOCAL ADVENTURE planning app.

USER REQUEST: "{user_input}"
USER LOCATION: "{user_location}"

APP SCOPE: MiniQuest creates SHORT, SPONTANEOUS local adventures (2-6 hours, single day) in {allowed_cities_str} ONLY.

TASK: Categorize this request into ONE of these categories:

1. UNRELATED QUERY - Not about places/activities
2. OUT OF SCOPE - Travel/planning beyond our capability  
3. NEEDS CLARIFICATION - Too vague to process
4. IN SCOPE - Perfect for MiniQuest

═══════════════════════════════════════════════════════════════

CATEGORY 1: UNRELATED QUERY
Questions about people, facts, general knowledge, technical help, etc.

Examples:
❌ "Who is Barack Obama?"
❌ "What's the weather?"
❌ "How do I code in Python?"
❌ "What's 2+2?"
❌ "Tell me a joke"

Response:
{{
  "unrelated_query": true,
  "query_type": "general_knowledge" | "person_info" | "technical_help" | "other",
  "clarification_message": "I'm MiniQuest, your local adventure planning assistant! I help you discover museums, restaurants, coffee shops, and other fun places to explore in Boston and New York City. Ask me about places you'd like to visit!",
  "suggestions": [
    "Museums and coffee shops in Boston",
    "Parks and restaurants in New York",
    "Art galleries and breweries in Boston"
  ]
}}

═══════════════════════════════════════════════════════════════

CATEGORY 2: OUT OF SCOPE
Travel planning beyond single-day local exploration in Boston/NYC.

Examples:
❌ "Plan my 1 week trip to Boston" → multi_day_trip
❌ "Weekend in NYC" → multi_day_trip
❌ "Where should I stay in Boston?" → accommodation_planning
❌ "$5000 vacation" → trip_budget_detected

Response:
{{
  "out_of_scope": true,
  "scope_issue": "multi_day_trip" | "accommodation_planning" | "trip_budget_detected",
  "clarification_message": "MiniQuest is designed for short, spontaneous local adventures (2-6 hours, single day) in Boston and New York City. For [multi-day/accommodation] planning, we recommend TripAdvisor or Google Travel.",
  "suggestions": [
    "Museums and restaurants in Boston today",
    "Coffee shops and parks in NYC this afternoon",
    "Things to do in downtown Boston (4-6 hours)"
  ]
}}

DETECTION KEYWORDS FOR OUT OF SCOPE:
- "week", "days", "weekend trip", "5 days", "itinerary" → multi_day_trip
- Budget > $500 → trip_budget_detected  
- "hotel", "stay", "accommodation", "airbnb", "lodging" → accommodation_planning

═══════════════════════════════════════════════════════════════

CATEGORY 3: NEEDS CLARIFICATION
Too vague or missing critical information.

Examples:
⚠️ "Hi" | "Hello" | "Help me"
⚠️ "Show me places"
⚠️ "Things to do"

Response:
{{
  "is_actionable": false,
  "clarification_needed": "What kind of places would you like to visit in Boston or New York? (museums, restaurants, parks, etc.)",
  "suggestions": [
    "Museums and coffee shops in Boston",
    "Parks and restaurants in New York",
    "Art galleries and wine bars in Boston"
  ]
}}

═══════════════════════════════════════════════════════════════

CATEGORY 4: IN SCOPE ✅
Perfect for MiniQuest - local, single-day exploration in Boston or NYC.

Examples:
✅ "Museums in Boston"
✅ "Coffee shops and parks in New York"
✅ "Restaurants in NYC this afternoon"
✅ "Art galleries and wine bars in Boston"
✅ "Things to do in downtown NYC today"

Response:
{{
  "is_actionable": true,
  "parsed_preferences": {{
    "mood": "cultural" | "romantic" | "exploratory" | "relaxed" | "adventurous",
    "time_available": 180,  // minutes, default 2-4 hours
    "budget": 75.0,  // dollars, default $30-150
    "preferences": ["museums", "restaurants"],  // extracted categories
    "energy_level": "low" | "medium" | "high",
    "constraints": []  // dietary, accessibility, etc.
  }}
}}

═══════════════════════════════════════════════════════════════

IMPORTANT DETECTION RULES:

1. CHECK FOR UNRELATED FIRST:
   - If asking about people, facts, weather, coding, math → UNRELATED

2. CHECK FOR OUT OF SCOPE SECOND:
   - Look for: "week", "days", "weekend trip", budget > $500
   - Look for: "hotel", "stay", "accommodation"
   
3. CHECK FOR CLARIFICATION THIRD:
   - If too vague (no specific activities/places mentioned)

4. ONLY THEN: Parse as IN SCOPE
   - Extract preferences, mood, budget, etc.

NOTE: MiniQuest ONLY operates in Boston and New York City. Queries for other cities have already been filtered out before reaching you.

CRITICAL: Return ONLY valid JSON. No explanation, no preamble."""
    
    def _parse_json_response(self, content: str) -> Dict:
        """Parse JSON response from OpenAI"""
        # Remove markdown code blocks if present
        if content.startswith("```json"):
            content = content.split("```json")[1].split("```")[0]
        elif content.startswith("```"):
            content = content.split("```")[1].split("```")[0]
        
        try:
            return json.loads(content.strip())
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {content[:200]}")
            raise e
    
    def _get_fallback_preferences(self) -> Dict:
        """Return fallback preferences for unclear queries"""
        return {
            "mood": "exploratory",
            "time_available": 180,
            "budget": 75.0,
            "preferences": ["attractions"],
            "energy_level": "medium",
            "constraints": []
        }