# backend/app/agents/creation/adventure_creator.py
"""ASYNC Adventure creation agent — one adventure per call for progressive streaming"""

from openai import AsyncOpenAI
import json
import asyncio
import logging
from typing import Dict, List, Optional, Callable
from ..base import BaseAgent, ProcessingError

logger = logging.getLogger(__name__)

ADVENTURE_COUNT = 3


class AdventureCreatorAgent(BaseAgent):

    def __init__(self):
        super().__init__("AdventureCreator")
        self.client = AsyncOpenAI()
        self.log_success("AdventureCreator initialized (ASYNC, per-adventure streaming)")

    # ─── Entry point ──────────────────────────────────────────────────────────

    async def process(self, input_data: Dict) -> Dict:
        researched_venues  = input_data.get("researched_venues", [])
        enhanced_locations = input_data.get("enhanced_locations", [])
        preferences        = input_data.get("parsed_preferences", {})
        target_location    = input_data.get("target_location", "Boston, MA")
        generation_options = input_data.get("generation_options", {})
        on_adventure_ready: Optional[Callable] = input_data.get("on_adventure_ready")

        stops = max(1, min(6, int(generation_options.get("stops_per_adventure", 3))))
        self.log_processing("Creating adventures", f"{len(researched_venues)} venues, {stops} stops each")

        try:
            adventures = await self._create_adventures_progressively(
                researched_venues, enhanced_locations, preferences,
                target_location, generation_options, on_adventure_ready
            )
            self.log_success(f"Created {len(adventures)} adventures with research integration")
            return self.create_response(True, {
                "adventures": adventures,
                "total_created": len(adventures),
                "target_location": target_location,
            })
        except Exception as e:
            self.log_error(f"Adventure creation failed: {e}")
            raise ProcessingError(self.name, str(e))

    # ─── Per-adventure generation ──────────────────────────────────────────────

    async def _create_adventures_progressively(
        self,
        researched_venues: List[Dict],
        enhanced_locations: List[Dict],
        preferences: Dict,
        target_location: str,
        generation_options: Dict,
        on_adventure_ready: Optional[Callable],
    ) -> List[Dict]:
        stops    = max(1, min(6, int(generation_options.get("stops_per_adventure", 3))))
        profiles = self._build_venue_profiles(researched_venues, enhanced_locations, target_location, stops)
        used_sets: List[List[str]] = []
        adventures: List[Dict] = []

        tasks = [
            self._create_single_adventure(
                idx=i,
                venue_profiles=profiles,
                preferences=preferences,
                target_location=target_location,
                generation_options=generation_options,
                used_sets=used_sets,
                researched_venues=researched_venues,
            )
            for i in range(ADVENTURE_COUNT)
        ]

        for coro in asyncio.as_completed(tasks):
            try:
                adventure = await coro
                if adventure:
                    adventures.append(adventure)
                    if on_adventure_ready:
                        try:
                            if asyncio.iscoroutinefunction(on_adventure_ready):
                                await on_adventure_ready(adventure, len(adventures))
                            else:
                                on_adventure_ready(adventure, len(adventures))
                        except Exception as cb_err:
                            logger.warning(f"on_adventure_ready callback error: {cb_err}")
            except Exception as e:
                logger.error(f"Adventure creation task failed: {e}")

        return adventures

    async def _create_single_adventure(
        self,
        idx: int,
        venue_profiles: List[Dict],
        preferences: Dict,
        target_location: str,
        generation_options: Dict,
        used_sets: List[List[str]],
        researched_venues: List[Dict],
    ) -> Optional[Dict]:
        stops = max(1, min(6, int(generation_options.get("stops_per_adventure", 3))))
        names = [v["name"] for v in venue_profiles]
        n     = len(names)

        start = idx * stops
        end   = start + stops
        if end > n:
            start = max(0, n - stops)
            end   = n
        preferred_slice = names[start:end]
        already_used    = [v for s in used_sets for v in s]

        prompt = self._build_single_adventure_prompt(
            venue_profiles=venue_profiles,
            preferences=preferences,
            target_location=target_location,
            generation_options=generation_options,
            adventure_number=idx + 1,
            preferred_venues=preferred_slice,
            exclude_venues=already_used,
        )

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=1500,
            )
            content   = self._clean_json_response(response.choices[0].message.content)
            adventure = json.loads(content)
            used_sets.append(adventure.get("venues_used", []))
            self._integrate_research_data(adventure, researched_venues)
            return adventure

        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error for adventure {idx+1}: {e}")
            return None
        except Exception as e:
            logger.error(f"OpenAI call failed for adventure {idx+1}: {e}")
            return None

    # ─── Venue profiles ───────────────────────────────────────────────────────

    def _build_venue_profiles(
        self,
        researched_venues: List[Dict],
        enhanced_locations: List[Dict],
        target_location: str,
        stops: int = 3,
    ) -> List[Dict]:
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

    # ─── Prompt ───────────────────────────────────────────────────────────────

    def _build_single_adventure_prompt(
        self,
        venue_profiles: List[Dict],
        preferences: Dict,
        target_location: str,
        generation_options: Dict,
        adventure_number: int,
        preferred_venues: List[str],
        exclude_venues: List[str],
    ) -> str:
        stops      = max(1, min(6, int(generation_options.get("stops_per_adventure", 3))))
        all_names  = [v["name"] for v in venue_profiles]
        names_list = "\n".join(f"  {i+1}. {n}" for i, n in enumerate(all_names))

        exclude_block = (
            f"\n🚫 ALREADY USED — do NOT include: {', '.join(exclude_venues)}"
            if exclude_venues else ""
        )

        diversity_mode = generation_options.get("diversity_mode", "standard")
        diversity_note = {
            "standard": "",
            "high":     "\n🎲 DIVERSITY MODE: HIGH — make this adventure feel different in theme and vibe.",
            "fresh":    "\n✨ DIVERSITY MODE: FRESH — maximise uniqueness; avoid common tourist spots.",
        }.get(diversity_mode, "")

        stops_rule = (
            "Use EXACTLY 1 venue (single-stop adventure)."
            if stops == 1
            else f"Use EXACTLY {stops} DIFFERENT venues from the list."
        )

        return f"""Create ONE exceptional adventure itinerary for {target_location}.
{diversity_note}{exclude_block}

TARGET LOCATION: {target_location}
USER REQUESTED: {preferences.get('preferences', [])}
ADVENTURE NUMBER: {adventure_number} of 3

🎯 ALL AVAILABLE VENUES — USE ONLY THESE EXACT NAMES:
{names_list}

💡 PREFERRED VENUES FOR THIS ADVENTURE (use these if possible):
{json.dumps(preferred_venues)}

VENUE DETAILS:
{json.dumps(venue_profiles, indent=2)}

⚠️ CRITICAL RULES:
1. ONLY use venue names from the numbered list above.
2. Use EXACT names in "venues_used" (copy verbatim from the numbered list).
3. In "activity" text, write the venue name naturally — NO brackets, NO quotes around it.
   ✅ CORRECT:  "Visit Starbucks Coffee Company for a morning coffee"
   ❌ WRONG:    "Visit [Starbucks Coffee Company] for a morning coffee"
4. NEVER invent venues: no "a Boston Pub", "local restaurant", "nearby cafe".
5. {stops_rule}
6. Do NOT use any venue in the ALREADY USED list above.
7. Prefer the PREFERRED VENUES listed above, but you may use others if needed.

Return ONLY a valid JSON object (not an array) for ONE adventure:
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
      "activity": "Visit Venue Name for activity",
      "details": "Specific activity details"
    }}
  ],
  "venues_used": ["Exact Name 1", "Exact Name 2"],
  "data_sources": ["Tavily Research", "Enhanced Google Maps"]
}}

FINAL CHECK:
✅ All "venues_used" exist verbatim in the numbered list?
✅ No invented venues?
✅ Exactly {stops} venue{'s' if stops != 1 else ''} used?
✅ No brackets around venue names in activity text?
✅ None of the ALREADY USED venues included?
"""

    # ─── Research integration ──────────────────────────────────────────────────

    def _integrate_research_data(self, adventure: Dict, researched_venues: List[Dict]):
        venues_used = adventure.get("venues_used", [])
        adventure["venues_research"] = []

        logger.info(f"🔍 Integrating research for '{adventure.get('title')}'")
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

                # Description fallback: LLM result → editorial_summary → synthesised
                description_clean = research.get("description_clean")
                if not description_clean:
                    description_clean = research.get("editorial_summary")
                if not description_clean:
                    v_type = (research.get("type") or "venue").replace("_", " ")
                    hood   = research.get("neighborhood") or research.get("address_hint") or ""
                    rating = research.get("google_rating")
                    parts  = [f"A {v_type} in {hood}" if hood and len(hood) < 40 else f"A {v_type} in Boston"]
                    if rating:
                        parts.append(f"rated {rating}/5 on Google")
                    description_clean = ", ".join(parts) + "."

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
                    # ✅ structured + LLM fields
                    "hours_clean":         research.get("hours_clean"),
                    "price_tier":          research.get("price_tier"),
                    "description_clean":   description_clean,
                    "verified_address":    research.get("verified_address"),
                    "insider_tip_clean":   research.get("insider_tip_clean"),
                    "best_time":           research.get("best_time"),
                    "crowd_level":         research.get("crowd_level"),
                })
                if venue_url:
                    research_by_name[venue_name.lower().strip()] = {"url": venue_url}
                logger.info(f"   ✅ Matched '{venue_name}' -> '{research.get('name')}'")
            else:
                logger.warning(f"   ⚠️ No research match for '{venue_name}'")

        logger.info(f"   📊 Total venues with research: {len(adventure['venues_research'])}")
        self._attach_venue_urls_to_steps(adventure, research_by_name)

    def _attach_venue_urls_to_steps(self, adventure: Dict, research_by_name: Dict[str, Dict]):
        for step in adventure.get("steps", []):
            activity_lower = step.get("activity", "").lower()
            for name_key, data in research_by_name.items():
                if name_key and name_key in activity_lower:
                    step["venue_url"] = data["url"]
                    break

    def _find_matching_research(self, venue_name: str, researched_venues: List[Dict]) -> Optional[Dict]:
        vl = venue_name.lower().strip()
        for r in researched_venues:
            rl = r.get("name", "").lower().strip()
            if vl == rl or vl in rl or rl in vl:
                if not r.get("research_summary"):
                    parts = []
                    if r.get("current_info"):
                        parts.append(r["current_info"][:200])
                    if r.get("hours_info"):
                        parts.append(f"Hours: {r['hours_info'][:100]}")
                    tips = r.get("visitor_tips", [])
                    if tips:
                        parts.append(f"Tips: {'; '.join(str(t) for t in tips[:2])}")
                    if parts:
                        r["research_summary"] = " | ".join(parts)
                    elif r.get("venue_summary"):
                        r["research_summary"] = r["venue_summary"]
                    else:
                        r["research_summary"] = f"{r.get('name', venue_name)} — live research data available."
                return r
        return None

    def _clean_json_response(self, content: str) -> str:
        content = content.strip()
        for prefix in ("```json", "```"):
            if content.startswith(prefix):
                content = content[len(prefix):]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

        for open_ch, close_ch in [('{', '}'), ('[', ']')]:
            if open_ch in content:
                start = content.find(open_ch)
                depth = 0
                for i, ch in enumerate(content[start:], start):
                    if ch == open_ch:
                        depth += 1
                    elif ch == close_ch:
                        depth -= 1
                        if depth == 0:
                            extracted = content[start:i+1]
                            if open_ch == '[':
                                try:
                                    parsed = json.loads(extracted)
                                    if isinstance(parsed, list) and len(parsed) >= 1:
                                        return json.dumps(parsed[0])
                                except Exception:
                                    pass
                            return extracted
        return content