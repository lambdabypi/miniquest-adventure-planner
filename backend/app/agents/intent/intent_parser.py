# backend/app/agents/intent/intent_parser.py
"""Intent parsing agent with city constraints, vibe mapping, and rich preference extraction"""

from openai import AsyncOpenAI
import json
import logging
from typing import Dict, List
from ..base import BaseAgent

logger = logging.getLogger(__name__)


class IntentParserAgent(BaseAgent):
    """Parse user intent with city constraints, scope guardrails, and vibe-to-venue mapping"""

    ALLOWED_CITIES = ["Boston", "New York", "New York City", "NYC"]
    ALLOWED_STATES = ["MA", "Massachusetts", "NY", "New York"]

    # ─── Vibe/mood → concrete venue categories ───────────────────────────────
    VIBE_TO_VENUES: Dict[str, List[str]] = {
        # Nightlife / party
        "party":          ["bars", "nightlife", "cocktail bars", "rooftop bars", "dance clubs"],
        "parties":        ["bars", "nightlife", "cocktail bars", "rooftop bars", "dance clubs"],
        "nightlife":      ["bars", "nightlife", "cocktail bars", "dance clubs", "lounges"],
        "clubbing":       ["nightclubs", "dance clubs", "bars", "nightlife"],
        "bar hopping":    ["bars", "pubs", "breweries", "cocktail bars"],
        "drinks":         ["bars", "cocktail bars", "breweries", "wine bars"],
        "going out":      ["bars", "nightlife", "cocktail bars", "rooftop bars"],
        "night out":      ["bars", "nightlife", "cocktail bars", "rooftop bars"],
        # Chill / relax
        "chill":          ["coffee shops", "parks", "bookstores", "cafes"],
        "chilling":       ["coffee shops", "parks", "bookstores", "cafes"],
        "relax":          ["parks", "coffee shops", "spas", "gardens"],
        "relaxing":       ["parks", "coffee shops", "spas", "gardens"],
        "lazy":           ["coffee shops", "parks", "bookstores"],
        "slow":           ["coffee shops", "parks", "gardens", "bookstores"],
        # Romantic
        "date":           ["restaurants", "wine bars", "rooftop bars", "parks", "art galleries"],
        "date night":     ["restaurants", "wine bars", "rooftop bars", "cocktail bars"],
        "romantic":       ["restaurants", "wine bars", "gardens", "waterfront"],
        "anniversary":    ["restaurants", "wine bars", "rooftop bars", "gardens"],
        # Active / outdoors
        "active":         ["parks", "hiking trails", "sports", "climbing gyms"],
        "workout":        ["parks", "sports", "fitness", "climbing gyms"],
        "outdoors":       ["parks", "gardens", "waterfronts", "trails"],
        "nature":         ["parks", "gardens", "arboretums", "waterfronts"],
        "adventure":      ["parks", "climbing gyms", "kayaking", "escape rooms"],
        # Food / drink
        "foodie":         ["restaurants", "food markets", "bakeries", "cafes"],
        "brunch":         ["brunch spots", "cafes", "bakeries", "coffee shops"],
        "lunch":          ["restaurants", "cafes", "food markets"],
        "dinner":         ["restaurants", "wine bars", "cocktail bars"],
        "coffee":         ["coffee shops", "cafes", "bakeries"],
        "boba":           ["boba shops", "cafes", "tea houses"],
        # Culture / arts
        "artsy":          ["art galleries", "museums", "street art", "indie cinemas"],
        "cultural":       ["museums", "historic sites", "art galleries", "cultural centers"],
        "history":        ["historic sites", "museums", "historic districts"],
        "museums":        ["museums", "galleries", "science centers"],
        # Shopping
        "shopping":       ["boutiques", "markets", "vintage shops", "bookstores"],
        "vintage":        ["vintage shops", "thrift stores", "antique shops"],
        # Social / group
        "friends":        ["bars", "restaurants", "bowling", "escape rooms", "parks"],
        "group":          ["restaurants", "bars", "bowling", "arcades", "escape rooms"],
        "birthday":       ["bars", "restaurants", "rooftop bars", "cocktail bars", "bowling"],
        "celebration":    ["bars", "restaurants", "rooftop bars", "cocktail bars"],
        # Specific vibes
        "hipster":        ["coffee shops", "vintage shops", "indie bookstores", "craft breweries"],
        "touristy":       ["historic sites", "museums", "famous landmarks", "waterfront"],
        "local":          ["neighborhood cafes", "local bars", "farmers markets", "parks"],
        "hidden gems":    ["dive bars", "independent cafes", "local parks", "indie shops"],
        "rainy day":      ["museums", "coffee shops", "bookstores", "indoor markets", "cinemas"],
        "hot day":        ["ice cream shops", "waterfronts", "parks", "air-conditioned museums"],
    }

    # ─── Budget string → dollar range ─────────────────────────────────────────
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
        self.log_success("IntentParser initialized with vibe mapping + rich preferences")

    async def process(self, input_data: Dict) -> Dict:
        user_input = input_data.get("user_input", "")
        user_location = input_data.get("user_address", "")

        self.log_processing("Parsing and validating intent", f"Query: '{user_input[:60]}'")

        # Early city-constraint check
        city_validation = self._validate_city_constraint(user_input, user_location)
        if not city_validation["valid"]:
            self.log_warning(f"Invalid city: {city_validation['detected_city']}")
            return self.create_response(False, {
                "needs_clarification": True,
                "out_of_scope": True,
                "scope_issue": "unsupported_city",
                "clarification_message": city_validation["message"],
                "suggestions": city_validation["suggestions"],
                "detected_city": city_validation.get("detected_city"),
            })

        try:
            prompt = self._build_enhanced_prompt(user_input, user_location)
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

            # ── Post-processing: expand vibes, normalise budget ──────────────
            params["preferences"] = self._expand_vibe_preferences(
                params.get("preferences", [])
            )
            params = self._normalise_budget(params)
            params = self._infer_energy_level(params)

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

    # ─── Vibe expansion ────────────────────────────────────────────────────────

    def _expand_vibe_preferences(self, preferences: List[str]) -> List[str]:
        """
        Translate vibe/mood words into concrete venue categories.
        E.g. ["party"] → ["bars", "nightlife", "cocktail bars", "rooftop bars", "dance clubs"]
        Concrete categories (coffee shops, museums, etc.) are kept as-is.
        """
        expanded = []
        for pref in preferences:
            pref_lower = pref.lower().strip()
            mapped = self.VIBE_TO_VENUES.get(pref_lower)
            if mapped:
                expanded.extend(mapped)
            else:
                expanded.append(pref)

        # Deduplicate, preserve order
        seen: set = set()
        result = []
        for p in expanded:
            if p not in seen:
                seen.add(p)
                result.append(p)
        return result

    # ─── Budget normalisation ─────────────────────────────────────────────────

    def _normalise_budget(self, params: Dict) -> Dict:
        """
        Accept budget as a dollar float OR a string label (cheap / moderate / splurge).
        Adds budget_min / budget_max for downstream agents.
        """
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
            # numeric — infer label
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
        """Infer energy_level from preferences if not set explicitly."""
        if params.get("energy_level"):
            return params

        prefs_str = " ".join(params.get("preferences", [])).lower()
        high_energy = {"dance clubs", "clubbing", "climbing gyms", "kayaking", "sports", "hiking"}
        low_energy = {"parks", "coffee shops", "bookstores", "cafes", "gardens", "spas"}

        pref_set = set(params.get("preferences", []))
        if pref_set & high_energy:
            params["energy_level"] = "high"
        elif pref_set & low_energy:
            params["energy_level"] = "low"
        else:
            params["energy_level"] = "medium"

        return params

    # ─── Prompt ───────────────────────────────────────────────────────────────

    def _build_enhanced_prompt(self, user_input: str, user_location: str) -> str:
        allowed = " or ".join(self.ALLOWED_CITIES[:2])
        return f"""You are an intelligent intent parser for MiniQuest - a LOCAL ADVENTURE planning app.

USER REQUEST: "{user_input}"
USER LOCATION: "{user_location}"

APP SCOPE: MiniQuest creates SHORT, SPONTANEOUS local adventures (2-6 hours, single day) in {allowed} ONLY.

TASK: Categorize this request into ONE of these categories:

1. UNRELATED QUERY  2. OUT OF SCOPE  3. NEEDS CLARIFICATION  4. IN SCOPE ✅

═══════════════════════════════════════════════════════════════
CATEGORY 1: UNRELATED QUERY
❌ "Who is Barack Obama?" ❌ "What's the weather?" ❌ "How do I code in Python?"
Response: {{"unrelated_query": true, "query_type": "general_knowledge", "clarification_message": "...", "suggestions": [...]}}

═══════════════════════════════════════════════════════════════
CATEGORY 2: OUT OF SCOPE
❌ "Plan my 1 week trip" ❌ "Where should I stay?" ❌ "$5000 vacation"
Detection: "week", "days", "weekend trip", budget > $500, "hotel", "accommodation"
Response: {{"out_of_scope": true, "scope_issue": "multi_day_trip|accommodation_planning|trip_budget_detected", "clarification_message": "...", "suggestions": [...]}}

═══════════════════════════════════════════════════════════════
CATEGORY 3: NEEDS CLARIFICATION
⚠️ "Hi" ⚠️ "Show me places" ⚠️ "Things to do"
Response: {{"is_actionable": false, "clarification_needed": "...", "suggestions": [...]}}

═══════════════════════════════════════════════════════════════
CATEGORY 4: IN SCOPE ✅

VIBE / MOOD WORDS → you MUST translate to real venue types in preferences[]:
  "party" / "going out" / "night out"  → bars, nightlife, cocktail bars, rooftop bars
  "clubbing"                           → nightclubs, dance clubs, bars
  "drinks" / "bar hopping"             → bars, breweries, cocktail bars, wine bars
  "date night" / "romantic"            → restaurants, wine bars, rooftop bars
  "chill" / "relaxing"                 → coffee shops, parks, bookstores
  "foodie" / "brunch"                  → restaurants, cafes, food markets
  "artsy" / "cultural"                 → art galleries, museums
  "friends" / "group"                  → bars, restaurants, bowling, escape rooms
  "birthday" / "celebration"           → bars, cocktail bars, restaurants, rooftop bars
  "hidden gems"                        → dive bars, local cafes, indie shops
  "rainy day"                          → museums, coffee shops, bookstores, cinemas
  IMPORTANT: Do NOT put the vibe word itself in preferences[]. Use venue types ONLY.

BUDGET PARSING — accept any of these forms:
  - Dollar amount: "$40", "40 dollars", "under $50"   → numeric value
  - Label: "free", "cheap", "budget", "moderate", "splurge", "fancy", "luxury"
  - Default if not mentioned: 75.0

GROUP SIZE — extract if mentioned: "just me" → 1, "couple" → 2, "group of 5" → 5

TIME OF DAY — extract if mentioned: "morning", "afternoon", "evening", "night", "now"

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
2. MiniQuest ONLY operates in Boston and New York City (city filter already applied)
3. "party", "going out", "birthday" are IN SCOPE — map to nightlife venues
4. group_size defaults to 1 if not mentioned
5. time_of_day defaults to "any" if not mentioned
6. meal_context defaults to "none" unless food is central to the request
7. special_occasion defaults to "none"

CRITICAL: Return ONLY valid JSON. No explanation, no preamble."""

    # ─── Helpers ──────────────────────────────────────────────────────────────

    def _validate_city_constraint(self, user_input: str, user_location: str) -> Dict:
        user_input_lower = user_input.lower()

        international_cities = [
            "paris", "london", "tokyo", "rome", "barcelona", "berlin", "amsterdam",
            "dubai", "singapore", "hong kong", "beijing", "shanghai", "sydney",
            "melbourne", "toronto", "vancouver", "mexico city", "mumbai", "delhi",
        ]
        us_cities_outside_scope = [
            "chicago", "los angeles", "la ", " la", "san francisco", "sf ", " sf",
            "seattle", "miami", "austin", "denver", "portland", "las vegas",
            "atlanta", "dallas", "houston", "philadelphia", "phoenix", "san diego",
        ]
        continents = ["europe", "asia", "africa", "australia", "south america"]
        countries = ["france", "uk", "england", "japan", "italy", "spain", "germany"]

        for city in international_cities:
            if city in user_input_lower:
                return {
                    "valid": False, "detected_city": city.title(),
                    "message": f"MiniQuest currently operates in Boston and NYC only. We don't support {city.title()} yet.",
                    "suggestions": self._default_suggestions(),
                }
        for city in us_cities_outside_scope:
            if city in user_input_lower:
                name = city.title().strip()
                return {
                    "valid": False, "detected_city": name,
                    "message": f"MiniQuest currently operates in Boston and NYC only. We'd love to expand to {name} in the future!",
                    "suggestions": self._default_suggestions(),
                }
        for continent in continents:
            if continent in user_input_lower:
                return {
                    "valid": False, "detected_city": continent.title(),
                    "message": f"MiniQuest creates local adventures in Boston and NYC. For {continent.title()} travel, try TripAdvisor!",
                    "suggestions": self._default_suggestions(),
                }
        for country in countries:
            if country in user_input_lower:
                return {
                    "valid": False, "detected_city": country.title(),
                    "message": f"MiniQuest operates in Boston and NYC only. For {country.title()} travel, try Google Travel!",
                    "suggestions": self._default_suggestions(),
                }
        return {"valid": True}

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
            "Party spots and rooftop bars in Boston",
            "Coffee shops and parks in New York",
            "Art galleries and wine bars in Boston",
        ]