# backend/app/agents/creation/adventure_creator.py
"""ASYNC Adventure creation agent - FIXED VENUE HALLUCINATIONS + VENUE URL PROPAGATION + DIVERSITY"""

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
        researched_venues  = input_data.get("researched_venues", [])
        enhanced_locations = input_data.get("enhanced_locations", [])
        preferences        = input_data.get("parsed_preferences", {})
        target_location    = input_data.get("target_location", "Boston, MA")
        generation_options = input_data.get("generation_options", {})  # ✅ NEW

        self.log_processing("Creating adventures", f"{len(researched_venues)} venues")

        try:
            adventures = await self._create_base_adventures(
                researched_venues, enhanced_locations, preferences,
                target_location, generation_options
            )

            for adventure in adventures:
                self._integrate_research_data(adventure, researched_venues)

            result = {
                "adventures": adventures,
                "total_created": len(adventures),
                "target_location": target_location,
            }

            self.log_success(f"Created {len(adventures)} adventures with research integration")
            return self.create_response(True, result)

        except Exception as e:
            self.log_error(f"Adventure creation failed: {e}")
            raise ProcessingError(self.name, str(e))

    # ─── Base adventure creation ───────────────────────────────────────────────

    async def _create_base_adventures(
        self,
        researched_venues: List[Dict],
        enhanced_locations: List[Dict],
        preferences: Dict,
        target_location: str,
        generation_options: Dict,
    ) -> List[Dict]:
        stops = int(generation_options.get("stops_per_adventure", 3))
        stops = max(1, min(6, stops))

        venue_profiles = self._build_venue_profiles(
            researched_venues, enhanced_locations, target_location, stops  # ✅ pass stops
        )
        prompt = self._build_adventure_prompt(
            venue_profiles, preferences, target_location, generation_options
        )

        response = await self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=3500,
        )

        content = self._clean_json_response(response.choices[0].message.content)
        return json.loads(content)

    def _build_venue_profiles(
        self,
        researched_venues: List[Dict],
        enhanced_locations: List[Dict],
        target_location: str,
        stops: int = 3,
    ) -> List[Dict]:
        # Need stops*3 venues so 3 adventures can each pick a non-overlapping set.
        # Cap at 18 to support up to 6 stops (6*3=18), matching the research node ceiling.
        pool_size = min(max(stops * 3, 8), 18)
        profiles = []
        for i, venue in enumerate(researched_venues[:pool_size]):
            maps_data = enhanced_locations[i] if i < len(enhanced_locations) else {}
            profiles.append({
                "name":         venue.get("name", "Unknown"),
                "location":     target_location,
                "type":         venue.get("type", "attraction"),
                "neighborhood": venue.get("neighborhood", ""),
                "address":      maps_data.get("address", ""),
                "rating":       maps_data.get("rating"),
                "current_info": venue.get("current_info", "")[:200],
            })
        return profiles

    def _build_adventure_prompt(
        self,
        venue_profiles: List[Dict],
        preferences: Dict,
        target_location: str,
        generation_options: Dict,
    ) -> str:
        exact_venue_names = [v["name"] for v in venue_profiles]
        venue_names_list  = "\n".join(
            f"  {i+1}. {name}" for i, name in enumerate(exact_venue_names)
        )

        stops = int(generation_options.get("stops_per_adventure", 3))
        stops = max(1, min(6, stops))

        # Build concrete non-overlapping example slices
        n = len(exact_venue_names)
        if stops == 1:
            stops_rule = "Each adventure MUST use EXACTLY 1 venue (single-stop adventure)."
            example_sets = [
                [exact_venue_names[0]] if n > 0 else ["Venue A"],
                [exact_venue_names[n // 2]] if n > 1 else ["Venue B"],
                [exact_venue_names[-1]] if n > 2 else ["Venue C"],
            ]
        else:
            stops_rule = (
                f"Each adventure MUST use EXACTLY {stops} DIFFERENT venues. "
                f"No two adventures may share the same venue."
            )
            slice_a = exact_venue_names[:stops]
            slice_b = (exact_venue_names[stops:stops*2]
                       if n >= stops*2 else exact_venue_names[max(0, n-stops):])
            slice_c = (exact_venue_names[stops*2:stops*3]
                       if n >= stops*3 else exact_venue_names[:stops][::-1])
            example_sets = [slice_a, slice_b, slice_c]

        diversity_mode = generation_options.get("diversity_mode", "standard")
        diversity_note = {
            "standard": "",
            "high":     "\n🎲 DIVERSITY MODE: HIGH — make adventures feel noticeably different in theme and vibe.",
            "fresh":    "\n✨ DIVERSITY MODE: FRESH — maximise contrast; avoid any thematic overlap between adventures.",
        }.get(diversity_mode, "")

        exclude_venues = generation_options.get("exclude_venues", [])
        exclude_block  = (
            f"\n🚫 EXCLUDED VENUES (never use): {', '.join(exclude_venues)}"
            if exclude_venues else ""
        )

        return f"""Create 3 exceptional adventure itineraries for {target_location}.
{diversity_note}{exclude_block}

TARGET LOCATION: {target_location}
USER REQUESTED: {preferences.get('preferences', [])}

🎯 AVAILABLE VENUES — USE ONLY THESE EXACT NAMES:
{venue_names_list}

VENUE DETAILS:
{json.dumps(venue_profiles, indent=2)}

⚠️ CRITICAL RULES:
1. ONLY use venue names from the numbered list above.
2. Use EXACT names in "venues_used" (copy verbatim).
3. You MAY shorten names in "activity" text for readability.
4. NEVER invent venues: no "a Boston Pub", "local restaurant", "nearby cafe".
5. {stops_rule}
6. Each adventure MUST use a completely DIFFERENT set of venues — no sharing.
7. Verify every entry in "venues_used" exists in the numbered list.

✅ EXAMPLE — three non-overlapping {stops}-stop adventures:
  Adventure 1 venues_used: {json.dumps(example_sets[0])}
  Adventure 2 venues_used: {json.dumps(example_sets[1])}
  Adventure 3 venues_used: {json.dumps(example_sets[2])}

Return ONLY a valid JSON array with 3 adventures:
[
  {{
    "title": "Adventure Title",
    "tagline": "One-line description",
    "description": "Rich 2-3 sentence narrative",
    "duration": {preferences.get('time_available', 180)},
    "cost": 35,
    "theme": "Theme Name",
    "location": "{target_location}",
    "steps": [
      {{
        "time": "2:00 PM",
        "activity": "Visit [VENUE FROM LIST]",
        "details": "Specific activity details"
      }}
    ],
    "venues_used": ["Exact Name 1"],
    "data_sources": ["Tavily Research", "Enhanced Google Maps"]
  }}
]

FINAL CHECK:
✅ All "venues_used" entries exist verbatim in the numbered list?
✅ No invented venues?
✅ Each adventure uses exactly {stops} venue{'s' if stops != 1 else ''}?
✅ Three adventures use completely non-overlapping venue sets?
"""

    # ─── Research integration ──────────────────────────────────────────────────

    def _integrate_research_data(self, adventure: Dict, researched_venues: List[Dict]):
        venues_used = adventure.get("venues_used", [])
        adventure["venues_research"] = []

        logger.info(f"🔍 Integrating research for adventure '{adventure.get('title')}'")
        logger.info(f"   Venues to match: {venues_used}")

        research_by_name: Dict[str, Dict] = {}

        for venue_name in venues_used:
            research = self._find_matching_research(venue_name, researched_venues)

            if research:
                venue_url = (
                    research.get("website")
                    or research.get("source_url")
                    or research.get("tavily_url")
                    or research.get("yelp_url")
                )

                adventure["venues_research"].append({
                    "venue_name":          venue_name,
                    "matched_to":          research.get("name"),
                    "name":                research.get("name"),
                    "research_summary":    research.get("research_summary", ""),
                    "current_info":        research.get("current_info", ""),
                    "hours_info":          research.get("hours_info", ""),
                    "visitor_tips":        research.get("visitor_tips", []),
                    "research_confidence": research.get("research_confidence", 0.0),
                    "total_insights":      research.get("total_insights", 0),
                    "research_status":     research.get("research_status", "unknown"),
                    "venue_summary":       research.get("venue_summary", ""),
                    "top_source":          research.get("top_source"),
                    "source_url":          research.get("source_url"),
                    "tavily_url":          research.get("tavily_url"),
                    "website":             research.get("website"),
                    "yelp_url":            research.get("yelp_url"),
                })

                if venue_url:
                    research_by_name[venue_name.lower().strip()] = {"url": venue_url}

                logger.info(f"   ✅ Matched '{venue_name}' -> '{research.get('name')}'")
            else:
                logger.warning(f"   ⚠️ No research match for '{venue_name}'")

        logger.info(f"   📊 Total venues with research: {len(adventure['venues_research'])}")
        self._attach_venue_urls_to_steps(adventure, research_by_name)

    def _attach_venue_urls_to_steps(self, adventure: Dict, research_by_name: Dict[str, Dict]):
        steps = adventure.get("steps", [])
        for step in steps:
            activity_lower = step.get("activity", "").lower()
            for name_key, data in research_by_name.items():
                if name_key and name_key in activity_lower:
                    step["venue_url"] = data["url"]
                    break

    def _find_matching_research(
        self, venue_name: str, researched_venues: List[Dict]
    ) -> Optional[Dict]:
        venue_lower = venue_name.lower().strip()
        for research in researched_venues:
            research_lower = research.get("name", "").lower().strip()
            if (venue_lower == research_lower
                    or venue_lower in research_lower
                    or research_lower in venue_lower):
                return research
        return None

    def _clean_json_response(self, content: str) -> str:
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

        if "[" in content:
            start = content.find("[")
            depth = 0
            end   = start
            for i, ch in enumerate(content[start:], start):
                if ch == "[":
                    depth += 1
                elif ch == "]":
                    depth -= 1
                    if depth == 0:
                        end = i + 1
                        break
            if depth == 0:
                return content[start:end]

        return content