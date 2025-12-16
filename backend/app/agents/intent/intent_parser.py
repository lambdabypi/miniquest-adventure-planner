# backend/app/agents/intent/intent_parser.py
"""Intent parsing agent with built-in validation - ASYNC"""

from openai import AsyncOpenAI
import json
import logging
from typing import Dict
from ..base import BaseAgent

logger = logging.getLogger(__name__)

class IntentParserAgent(BaseAgent):
    """Parse user intent, extract preferences, AND validate query specificity"""
    
    def __init__(self):
        super().__init__("IntentParser")
        self.client = AsyncOpenAI()  # ✅ ASYNC client
        self.log_success("IntentParser initialized with validation (ASYNC)")
    
    async def process(self, input_data: Dict) -> Dict:
        """Parse user intent and validate if query is actionable"""
        user_input = input_data.get("user_input", "")
        
        self.log_processing("Parsing and validating intent", f"Query: '{user_input[:50]}...'")
        
        try:
            prompt = self._build_combined_prompt(user_input)
            
            # ✅ ASYNC call
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=1000
            )
            
            content = response.choices[0].message.content.strip()
            result = self._parse_json_response(content)
            
            # Check if query needs clarification
            if not result.get("is_actionable", True):
                self.log_warning(f"Query too vague: {result.get('clarification_needed')}")
                return self.create_response(False, {
                    "needs_clarification": True,
                    "clarification_message": result.get("clarification_needed"),
                    "suggestions": result.get("suggestions", [
                        "Museums and Indian restaurants",
                        "Parks and coffee shops",
                        "Art galleries and wine bars"
                    ])
                })
            
            # Query is good - return parsed preferences
            params = result.get("parsed_preferences", {})
            
            # ✅ CRITICAL: Ensure all required fields exist
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
            # On error, return fallback preferences (fail open)
            fallback = self._get_fallback_preferences()
            return self.create_response(True, {
                "parsed_preferences": fallback,
                "is_actionable": True,
                "needs_clarification": False
            })
    
    def _build_combined_prompt(self, user_input: str) -> str:
        """Build prompt that validates AND parses in one call"""
        return f"""You are an intelligent intent parser for adventure planning.

USER REQUEST: "{user_input}"

TASK: Determine if this query is ACTIONABLE and extract preferences.

ACTIONABLE QUERIES (specific enough to plan adventures):
✅ "Museums" → specific venue type
✅ "Museums nearby" → specific venue type
✅ "Museums and Indian restaurants" → multiple specific types
✅ "Coffee shops" → clear activity type
✅ "Parks and restaurants in Boston" → multiple specific types
✅ "Art galleries" → specific venue type
✅ "Romantic dinner spots" → specific context
✅ "Indian restaurants" → specific cuisine
✅ "Breweries" → specific venue type

NOT ACTIONABLE (too vague, need clarification):
❌ "Hi" → greeting only, no intent
❌ "Hello" → greeting only
❌ "Help me" → no preferences mentioned
❌ "What should I do?" → no specific direction
❌ "Something fun" → too generic, no venue types
❌ "Show me places" → what KIND of places?
❌ "I'm bored" → no specific preferences
❌ "Plan something" → no venue types mentioned

CRITICAL RULE: If the query mentions ANY specific venue type or activity (museums, restaurants, parks, coffee, places to stay at, etc.), it's ACTIONABLE.

Return ONLY valid JSON:

IF ACTIONABLE:
{{
  "is_actionable": true,
  "parsed_preferences": {{
    "mood": "cultural/romantic/exploratory/etc",
    "time_available": 120,
    "budget": 50.0,
    "preferences": ["museums", "restaurants"],
    "energy_level": "medium",
    "constraints": []
  }}
}}

IF NOT ACTIONABLE:
{{
  "is_actionable": false,
  "clarification_needed": "What kind of places would you like to visit?",
  "suggestions": [
    "Museums and coffee shops in Boston",
    "Parks and restaurants near me",
    "Art galleries and wine bars"
  ]
}}

EXTRACTION RULES (when actionable):
- BE EXACT - only extract what's mentioned
- "museums" → ["museums"]
- "museums and restaurants" → ["museums", "restaurants"]
- "coffee shops" → ["coffee shops"]
- "Indian restaurants" → ["Indian restaurants"]
- Don't invent preferences user didn't mention

Return ONLY the JSON."""
    
    def _parse_json_response(self, content: str) -> Dict:
        """Parse JSON response from OpenAI"""
        # Clean markdown code blocks
        if content.startswith("```json"):
            content = content.split("```json")[1].split("```")[0]
        elif content.startswith("```"):
            content = content.split("```")[1].split("```")[0]
        
        return json.loads(content.strip())
    
    def _get_fallback_preferences(self) -> Dict:
        """Return fallback preferences"""
        return {
            "mood": "exploratory",
            "time_available": 120,
            "budget": 50.0,
            "preferences": ["attractions"],
            "energy_level": "medium",
            "constraints": []
        }