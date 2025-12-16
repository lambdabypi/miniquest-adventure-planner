# backend/app/agents/intent/intent_parser.py
"""Intent parsing agent with enhanced scope guardrails - ASYNC"""

from openai import AsyncOpenAI
import json
import logging
from typing import Dict
from ..base import BaseAgent

logger = logging.getLogger(__name__)

class IntentParserAgent(BaseAgent):
    """Parse user intent with scope guardrails for out-of-scope requests"""
    
    def __init__(self):
        super().__init__("IntentParser")
        self.client = AsyncOpenAI()
        self.log_success("IntentParser initialized with scope guardrails (ASYNC)")
    
    async def process(self, input_data: Dict) -> Dict:
        """Parse user intent and detect out-of-scope requests"""
        user_input = input_data.get("user_input", "")
        
        self.log_processing("Parsing and validating intent", f"Query: '{user_input[:50]}...'")
        
        try:
            prompt = self._build_enhanced_prompt(user_input)
            
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
                        "Parks and restaurants near me",
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
                        "Parks and coffee shops",
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
    
    def _build_enhanced_prompt(self, user_input: str) -> str:
        """Enhanced prompt with scope detection"""
        return f"""You are an intelligent intent parser for MiniQuest - a LOCAL ADVENTURE planning app.

USER REQUEST: "{user_input}"

APP SCOPE: MiniQuest creates SHORT, SPONTANEOUS local adventures (2-6 hours, single day, local exploration).

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
❌ "What's the capital of France?"

Response:
{{
  "unrelated_query": true,
  "query_type": "general_knowledge" | "person_info" | "technical_help" | "other",
  "clarification_message": "I'm MiniQuest, your local adventure planning assistant! I help you discover museums, restaurants, coffee shops, and other fun places to explore in your city. Ask me about places you'd like to visit!",
  "suggestions": [
    "Museums and coffee shops in Boston",
    "Parks and restaurants near me",
    "Art galleries and breweries"
  ]
}}

═══════════════════════════════════════════════════════════════

CATEGORY 2: OUT OF SCOPE
Travel planning beyond single-day local exploration.

Examples:
❌ "Plan my 1 week trip to Chicago" → multi_day_trip
❌ "Weekend in NYC" → multi_day_trip
❌ "5 day itinerary for Boston" → multi_day_trip
❌ "Trip to Paris" → international_travel
❌ "Japan vacation" → international_travel
❌ "Where should I stay in Boston?" → accommodation_planning
❌ "Find me a hotel" → accommodation_planning
❌ "Plan a trip with $2000 budget" → trip_budget_detected
❌ "$5000 vacation" → trip_budget_detected

Response:
{{
  "out_of_scope": true,
  "scope_issue": "multi_day_trip" | "international_travel" | "accommodation_planning" | "trip_budget_detected",
  "clarification_message": "MiniQuest is designed for short, spontaneous local adventures (2-6 hours, single day). For [multi-day/international] trip planning, we recommend trying TripAdvisor or Google Travel.",
  "suggestions": [
    "Museums and restaurants in [City] (today)",
    "Coffee shops and parks in [City] (afternoon)",
    "Things to do in downtown [City] (4-6 hours)"
  ]
}}

DETECTION KEYWORDS FOR OUT OF SCOPE:
- "week", "days", "weekend trip", "5 days", "itinerary" → multi_day_trip
- Budget > $500 → trip_budget_detected  
- Non-US cities: "Paris", "Tokyo", "London", "Europe" → international_travel
- "hotel", "stay", "accommodation", "airbnb", "lodging" → accommodation_planning

═══════════════════════════════════════════════════════════════

CATEGORY 3: NEEDS CLARIFICATION
Too vague or missing critical information.

Examples:
⚠️ "Hi" | "Hello" | "Help me"
⚠️ "Show me places"
⚠️ "Things to do"
⚠️ "Recommendations please"

Response:
{{
  "is_actionable": false,
  "clarification_needed": "What kind of places would you like to visit? (museums, restaurants, parks, etc.)",
  "suggestions": [
    "Museums and coffee shops in Boston",
    "Parks and restaurants near me",
    "Art galleries and wine bars"
  ]
}}

═══════════════════════════════════════════════════════════════

CATEGORY 4: IN SCOPE ✅
Perfect for MiniQuest - local, single-day exploration.

Examples:
✅ "Museums in Boston"
✅ "Coffee shops and parks near me"
✅ "Restaurants and museums this afternoon"
✅ "Things to do in Chicago today"
✅ "Art galleries and wine bars"
✅ "Museums and restaurants, budget $100"
✅ "Breweries and food trucks"
✅ "Family-friendly museums"

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
   - Look for: "week", "days", "weekend trip", budget > $500, international cities
   - Look for: "hotel", "stay", "accommodation"
   
3. CHECK FOR CLARIFICATION THIRD:
   - If too vague (no specific activities/places mentioned)

4. ONLY THEN: Parse as IN SCOPE
   - Extract preferences, mood, budget, etc.

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