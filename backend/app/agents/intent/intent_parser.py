# backend/app/agents/intent/intent_parser.py
"""Intent parsing agent with US-wide city support, vibe mapping, and rich preference extraction"""

from openai import AsyncOpenAI
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional
from ..base import BaseAgent

logger = logging.getLogger(__name__)


class IntentParserAgent(BaseAgent):
    """Parse user intent with US city support, scope guardrails, and vibe-to-venue mapping"""

    VIBE_TO_VENUES: Dict[str, List[str]] = {
        "party":          ["bars", "nightlife", "cocktail bars", "rooftop bars", "dance clubs"],
        "parties":        ["bars", "nightlife", "cocktail bars", "rooftop bars", "dance clubs"],
        "nightlife":      ["bars", "nightlife", "cocktail bars", "dance clubs", "lounges"],
        "clubbing":       ["nightclubs", "dance clubs", "bars", "nightlife"],
        "clubs":          ["nightclubs", "dance clubs", "bars", "nightlife"],
        "club":           ["nightclubs", "dance clubs", "bars", "nightlife"],
        "bar hopping":    ["bars", "pubs", "breweries", "cocktail bars"],
        "drinks":         ["bars", "cocktail bars", "breweries", "wine bars"],
        "going out":      ["bars", "nightlife", "cocktail bars", "rooftop bars"],
        "night out":      ["bars", "nightlife", "cocktail bars", "rooftop bars"],
        "chill":          ["coffee shops", "parks", "bookstores", "cafes"],
        "chilling":       ["coffee shops", "parks", "bookstores", "cafes"],
        "relax":          ["parks", "coffee shops", "spas", "gardens"],
        "relaxing":       ["parks", "coffee shops", "spas", "gardens"],
        "lazy":           ["coffee shops", "parks", "bookstores"],
        "slow":           ["coffee shops", "parks", "gardens", "bookstores"],
        "date":           ["restaurants", "wine bars", "rooftop bars", "parks", "art galleries"],
        "date night":     ["restaurants", "wine bars", "rooftop bars", "cocktail bars"],
        "romantic":       ["restaurants", "wine bars", "gardens", "waterfront"],
        "anniversary":    ["restaurants", "wine bars", "rooftop bars", "gardens"],
        "active":         ["parks", "hiking trails", "sports", "climbing gyms"],
        "workout":        ["parks", "sports", "fitness", "climbing gyms"],
        "outdoors":       ["parks", "gardens", "waterfronts", "trails"],
        "nature":         ["parks", "gardens", "arboretums", "waterfronts"],
        "adventure":      ["parks", "climbing gyms", "kayaking", "escape rooms"],
        "foodie":         ["restaurants", "food markets", "bakeries", "cafes"],
        "brunch":         ["brunch spots", "cafes", "bakeries", "coffee shops"],
        "lunch":          ["restaurants", "cafes", "food markets"],
        "dinner":         ["restaurants", "wine bars", "cocktail bars"],
        "coffee":         ["coffee shops", "cafes", "bakeries"],
        "boba":           ["boba shops", "cafes", "tea houses"],
        "artsy":          ["art galleries", "museums", "street art", "indie cinemas"],
        "cultural":       ["museums", "historic sites", "art galleries", "cultural centers"],
        "history":        ["historic sites", "museums", "historic districts"],
        "museums":        ["museums", "galleries", "science centers"],
        "shopping":       ["boutiques", "markets", "vintage shops", "bookstores"],
        "vintage":        ["vintage shops", "thrift stores", "antique shops"],
        "friends":        ["bars", "restaurants", "bowling", "escape rooms", "parks"],
        "group":          ["restaurants", "bars", "bowling", "arcades", "escape rooms"],
        "birthday":       ["bars", "restaurants", "rooftop bars", "cocktail bars", "bowling"],
        "celebration":    ["bars", "restaurants", "rooftop bars", "cocktail bars"],
        "hipster":        ["coffee shops", "vintage shops", "indie bookstores", "craft breweries"],
        "touristy":       ["historic sites", "museums", "famous landmarks", "waterfront"],
        "local":          ["neighborhood cafes", "local bars", "farmers markets", "parks"],
        "hidden gems":    ["dive bars", "independent cafes", "local parks", "indie shops"],
        "rainy day":      ["museums", "coffee shops", "bookstores", "indoor markets", "cinemas"],
        "hot day":        ["ice cream shops", "waterfronts", "parks", "air-conditioned museums"],
    }

    BUDGET_MAP = {
        "free":       (0, 0),
        "cheap":      (0, 20),
        "budget":     (0, 30),
        "affordable": (20, 50),
        "moderate":   (30, 75),
        "mid-range":  (30, 100),
        "splurge":    (100, 200),
        "fancy":      (100, 250),
        "luxury":     (150, 500),
    }

    def __init__(self):
        super().__init__("IntentParser")
        self.client = AsyncOpenAI()
        self.log_success("IntentParser initialized - US-wide city support")

    async def process(self, input_data: Dict) -> Dict:
        user_input    = input_data.get("user_input", "")
        user_location = input_data.get("user_address", "")
        request_time  = input_data.get("request_time")   # ✅ ISO string from frontend

        self.log_processing("Parsing and validating intent", f"Query: '{user_input[:60]}'")

        city_validation = self._validate_location_constraint(user_input)
        if not city_validation["valid"]:
            self.log_warning(f"International location detected: {city_validation['detected_city']}")
            return self.create_response(False, {
                "needs_clarification": True,
                "out_of_scope": True,
                "scope_issue": "unsupported_city",
                "clarification_message": city_validation["message"],
                "suggestions": city_validation["suggestions"],
                "detected_city": city_validation.get("detected_city"),
            })

        try:
            prompt = self._build_enhanced_prompt(user_input, user_location, request_time)
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=1200,
            )
            content = response.choices[0].message.content.strip()
            result = self._parse_json_response(content)

            if result.get("unrelated_query"):
                self.log_warning(f"Unrelated query: {result.get('query_type')}")
                return self.create_response(False, {
                    "needs_clarification": True,
                    "unrelated_query": True,
                    "clarification_message": result.get("clarification_message"),
                    "suggestions": result.get("suggestions", self._default_suggestions()),
                })

            if result.get("out_of_scope"):
                self.log_warning(f"Out of scope: {result.get('scope_issue')}")
                return self.create_response(False, {
                    "needs_clarification": True,
                    "out_of_scope": True,
                    "scope_issue": result.get("scope_issue"),
                    "clarification_message": result.get("clarification_message"),
                    "suggestions": result.get("suggestions", []),
                })

            if not result.get("is_actionable", True):
                self.log_warning(f"Query too vague: {result.get('clarification_needed')}")
                return self.create_response(False, {
                    "needs_clarification": True,
                    "clarification_message": result.get("clarification_needed"),
                    "suggestions": result.get("suggestions", self._default_suggestions()),
                })

            params = result.get("parsed_preferences", {})
            if not params:
                params = self._get_fallback_preferences()

            params["preferences"] = self._expand_vibe_preferences(
                params.get("preferences", [])
            )
            params = self._normalise_budget(params)
            params = self._infer_energy_level(params)

            # ✅ If the LLM left time_of_day as "any" but we have a real clock
            # time, derive it precisely rather than leaving it vague.
            if request_time and params.get("time_of_day") in ("any", None, ""):
                params["time_of_day"] = self._derive_time_of_day(request_time)
                self.log_processing(
                    "time_of_day derived from request_time",
                    f"{request_time} → {params['time_of_day']}"
                )

            self.log_success(f"Intent parsed: {params.get('preferences', [])}")
            return self.create_response(True, {
                "parsed_preferences": params,
                "is_actionable": True,
                "needs_clarification": False,
            })

        except Exception as e:
            self.log_error(f"Intent parsing failed: {e}")
            fallback = self._get_fallback_preferences()
            return self.create_response(True, {
                "parsed_preferences": fallback,
                "is_actionable": True,
                "needs_clarification": False,
            })

    # ─── Time derivation ──────────────────────────────────────────────────────

    def _derive_time_of_day(self, request_time: str) -> str:
        """
        Convert an ISO timestamp to a time_of_day label.
        Buckets: morning (6-11), afternoon (11-17), evening (17-21), night (21-6).
        Falls back to "any" on parse failure.
        """
        try:
            dt = datetime.fromisoformat(request_time)
            h = dt.hour
            if 6 <= h < 11:
                return "morning"
            if 11 <= h < 17:
                return "afternoon"
            if 17 <= h < 21:
                return "evening"
            return "night"
        except (ValueError, TypeError):
            return "any"

    # ─── Vibe expansion ────────────────────────────────────────────────────────

    def _expand_vibe_preferences(self, preferences: List[str]) -> List[str]:
        expanded = []
        for pref in preferences:
            mapped = self.VIBE_TO_VENUES.get(pref.lower().strip())
            if mapped:
                expanded.extend(mapped)
            else:
                expanded.append(pref)
        seen: set = set()
        result = []
        for p in expanded:
            if p not in seen:
                seen.add(p)
                result.append(p)
        return result

    # ─── Budget normalisation ─────────────────────────────────────────────────

    def _normalise_budget(self, params: Dict) -> Dict:
        raw = params.get("budget")
        if raw is None:
            params.setdefault("budget", 75.0)
            params["budget_min"] = 0
            params["budget_max"] = 150
            return params
        if isinstance(raw, str):
            label = raw.lower().strip()
            lo, hi = self.BUDGET_MAP.get(label, (20, 100))
            params["budget"] = (lo + hi) / 2
            params["budget_min"] = lo
            params["budget_max"] = hi
            params["budget_label"] = label
        else:
            val = float(raw)
            params["budget"] = val
            params["budget_min"] = 0
            params["budget_max"] = int(val * 1.5)
            if val == 0:
                params["budget_label"] = "free"
            elif val <= 30:
                params["budget_label"] = "budget"
            elif val <= 75:
                params["budget_label"] = "moderate"
            else:
                params["budget_label"] = "splurge"
        return params

    # ─── Energy-level inference ───────────────────────────────────────────────

    def _infer_energy_level(self, params: Dict) -> Dict:
        if params.get("energy_level"):
            return params
        high_energy = {"dance clubs", "clubbing", "climbing gyms", "kayaking", "sports", "hiking"}
        low_energy  = {"parks", "coffee shops", "bookstores", "cafes", "gardens", "spas"}
        pref_set = set(params.get("preferences", []))
        if pref_set & high_energy:
            params["energy_level"] = "high"
        elif pref_set & low_energy:
            params["energy_level"] = "low"
        else:
            params["energy_level"] = "medium"
        return params

    # ─── Prompt ───────────────────────────────────────────────────────────────

    def _build_enhanced_prompt(
        self, user_input: str, user_location: str, request_time: Optional[str] = None
    ) -> str:
        # Build a human-readable time context line for the LLM
        if request_time:
            try:
                dt = datetime.fromisoformat(request_time)
                time_label = self._derive_time_of_day(request_time)
                time_context = (
                    f'REQUEST TIME: {dt.strftime("%I:%M %p")} local time '
                    f'({time_label}) - use this to set time_of_day precisely.'
                )
            except (ValueError, TypeError):
                time_context = "REQUEST TIME: unknown"
        else:
            time_context = "REQUEST TIME: not provided - infer time_of_day from the query text if possible, otherwise use \"any\"."

        return f"""You are an intelligent intent parser for MiniQuest - a LOCAL ADVENTURE planning app.

USER REQUEST: "{user_input}"
USER LOCATION: "{user_location}"
{time_context}

APP SCOPE: MiniQuest creates SHORT, SPONTANEOUS local adventures (2-6 hours, single day) anywhere in the UNITED STATES.

TASK: Categorize this request into ONE of these categories:

1. UNRELATED QUERY  2. OUT OF SCOPE  3. NEEDS CLARIFICATION  4. IN SCOPE ✅

═══════════════════════════════════════════════════════════════
CATEGORY 1: UNRELATED QUERY
❌ "Who is Barack Obama?" ❌ "What's the weather?" ❌ "How do I code in Python?"
Response: {{"unrelated_query": true, "query_type": "general_knowledge", "clarification_message": "...", "suggestions": [...]}}

═══════════════════════════════════════════════════════════════
CATEGORY 2: OUT OF SCOPE
❌ "Plan my 1 week trip" ❌ "Where should I stay?" ❌ "$5000 vacation" ❌ "Paris trip"
Detection: "week", "days", "weekend trip", budget > $500, "hotel", "accommodation", non-US country/city
Response: {{"out_of_scope": true, "scope_issue": "multi_day_trip|accommodation_planning|trip_budget_detected|unsupported_city", "clarification_message": "...", "suggestions": [...]}}

NOTE: International locations (Paris, London, Tokyo, etc.) are out of scope.
US cities of ALL sizes are IN scope - Boston, NYC, Chicago, LA, Austin, Nashville, etc.

═══════════════════════════════════════════════════════════════
CATEGORY 3: NEEDS CLARIFICATION
⚠️ "Hi" ⚠️ "Show me places" ⚠️ "Things to do"
Response: {{"is_actionable": false, "clarification_needed": "...", "suggestions": [...]}}

═══════════════════════════════════════════════════════════════
CATEGORY 4: IN SCOPE ✅

VIBE / MOOD WORDS → translate to real venue types in preferences[]:
  "party" / "going out" / "night out"   → bars, nightlife, cocktail bars, rooftop bars, nightclubs, dance clubs, bars
  "clubbing" / "clubs" / "club"         → nightclubs, dance clubs, bars, nightlife
  "drinks" / "bar hopping"              → bars, breweries, cocktail bars, wine bars
  "date night" / "romantic"             → restaurants, wine bars, rooftop bars
  "chill" / "relaxing"                  → coffee shops, parks, bookstores
  "brunch" / "mimosas"                  → brunch spots, cafes, bakeries
  "foodie" / "lunch" / "dinner"         → restaurants, cafes, food markets
  "artsy" / "cultural"                  → art galleries, museums
  "friends" / "group"                   → bars, restaurants, bowling, escape rooms
  "birthday" / "celebration"            → bars, cocktail bars, restaurants, rooftop bars
  "hidden gems"                         → dive bars, local cafes, indie shops
  "rainy day"                           → museums, coffee shops, bookstores, cinemas
  IMPORTANT: Do NOT put the vibe word itself in preferences[]. Use venue types ONLY.

BUDGET PARSING - accept any of these forms:
  - Dollar amount: "$40", "40 dollars", "under $50" → numeric value
  - Label: "free", "cheap", "budget", "moderate", "splurge", "fancy", "luxury"
  - Default if not mentioned: 75.0

GROUP SIZE - extract if mentioned: "just me" → 1, "couple" → 2, "group of 5" → 5

TIME OF DAY - rules (in priority order):
  1. If the user explicitly states a time ("this morning", "tonight", "at 3pm") → use that
  2. If REQUEST TIME is provided above → use that time_label exactly
  3. Otherwise → "any"
  Valid values: "morning" | "afternoon" | "evening" | "night" | "any"

Response:
{{
  "is_actionable": true,
  "parsed_preferences": {{
    "mood": "cultural|romantic|exploratory|relaxed|adventurous|social|party|foodie",
    "time_available": 180,
    "budget": 75.0,
    "budget_label": "moderate",
    "preferences": ["bars", "cocktail bars"],
    "energy_level": "low|medium|high",
    "group_size": 2,
    "time_of_day": "evening|morning|afternoon|night|any",
    "constraints": [],
    "meal_context": "none|breakfast|lunch|dinner|brunch|drinks",
    "special_occasion": "none|birthday|date|anniversary|celebration"
  }}
}}

═══════════════════════════════════════════════════════════════
RULES:
1. CHECK UNRELATED first → OUT OF SCOPE second → CLARIFICATION third → IN SCOPE last
2. Any US city/town is valid - do NOT flag US cities as out of scope
3. Only international locations (non-US) are out of scope for city reasons
4. "party", "going out", "birthday" are IN SCOPE - map to nightlife venues
5. group_size defaults to 1, meal_context defaults to "none"
6. For time_of_day: explicit user wording beats REQUEST TIME beats "any"

CRITICAL: Return ONLY valid JSON. No explanation, no preamble."""

    # ─── Location validation (international only) ─────────────────────────────

    def _validate_location_constraint(self, user_input: str) -> Dict:
        text = user_input.lower()

        international_cities = [
            "paris", "london", "tokyo", "rome", "barcelona", "berlin", "amsterdam",
            "dubai", "singapore", "hong kong", "beijing", "shanghai", "sydney",
            "melbourne", "toronto", "vancouver", "mexico city", "mumbai", "delhi",
            "cairo", "istanbul", "moscow", "seoul", "bangkok", "jakarta",
        ]
        continents = ["europe", "asia", "africa", "australia", "south america"]
        countries = [
            "france", "uk", "england", "japan", "italy", "spain", "germany",
            "china", "india", "brazil", "canada", "mexico", "australia",
            "russia", "korea", "thailand", "indonesia",
        ]

        for city in international_cities:
            if city in text:
                return {
                    "valid": False, "detected_city": city.title(),
                    "message": f"MiniQuest currently operates within the US only. We don't support {city.title()} yet - try TripAdvisor for international adventures!",
                    "suggestions": self._default_suggestions(),
                }
        for continent in continents:
            if continent in text:
                return {
                    "valid": False, "detected_city": continent.title(),
                    "message": f"MiniQuest creates local adventures across the US. For {continent.title()} travel, try TripAdvisor!",
                    "suggestions": self._default_suggestions(),
                }
        for country in countries:
            if country in text:
                return {
                    "valid": False, "detected_city": country.title(),
                    "message": f"MiniQuest operates within the US only. For {country.title()} travel, try Google Travel!",
                    "suggestions": self._default_suggestions(),
                }
        return {"valid": True}

    # ─── Helpers ──────────────────────────────────────────────────────────────

    def _parse_json_response(self, content: str) -> Dict:
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
        return {
            "mood": "exploratory",
            "time_available": 180,
            "budget": 75.0,
            "budget_min": 0,
            "budget_max": 150,
            "budget_label": "moderate",
            "preferences": ["attractions"],
            "energy_level": "medium",
            "group_size": 1,
            "time_of_day": "any",
            "constraints": [],
            "meal_context": "none",
            "special_occasion": "none",
        }

    def _default_suggestions(self) -> List[str]:
        return [
            "Party spots and rooftop bars in Chicago",
            "Coffee shops and parks in Austin",
            "Art galleries and wine bars in San Francisco",
        ]