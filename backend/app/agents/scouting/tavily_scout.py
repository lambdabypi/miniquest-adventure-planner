# backend/app/agents/scouting/tavily_scout.py
"""
Tavily-first venue discovery with diversity modes.
Uses live web search to find venues instead of GPT-4o's stale training memory.
GPT-4o is used only to parse and structure what Tavily found.
"""

import asyncio
import json
import logging
import random
from datetime import datetime
from typing import Dict, List, Optional

from openai import AsyncOpenAI
from tavily import TavilyClient

logger = logging.getLogger(__name__)

# Trusted sources that reliably list real, open venues
DISCOVERY_DOMAINS = [
    "yelp.com", "timeout.com", "eater.com", "thrillist.com",
    "tripadvisor.com", "opentable.com", "exploretock.com",
    "reddit.com", "google.com", "zagat.com", "infatuation.com",
]

# Per-preference search query templates
DISCOVERY_QUERIES: Dict[str, List[str]] = {
    "bars":           ["{city} best bars open now {year}", "{city} top cocktail bars {year}"],
    "cocktail bars":  ["{city} craft cocktail bars {year}", "{city} best speakeasies mixology {year}"],
    "nightlife":      ["{city} best nightlife bars clubs {year}", "{city} top bars nightlife scene {year}"],
    "nightclubs":     ["{city} best nightclubs dance venues {year}"],
    "rooftop bars":   ["{city} rooftop bars {year}"],
    "clubs":          ["{city} best nightclubs clubs {year}", "{city} top dance clubs nightlife {year}"],
    "club":           ["{city} best nightclubs clubs {year}"],
    "wine bars":      ["{city} best wine bars {year}"],
    "breweries":      ["{city} best breweries taprooms {year}"],
    "restaurants":    ["{city} best restaurants {year}", "{city} top local restaurants hidden gems {year}"],
    "brunch spots":   ["{city} best brunch restaurants {year}"],
    "coffee shops":   ["{city} best coffee shops cafes {year}", "{city} specialty coffee third wave {year}"],
    "coffee":         ["{city} best coffee shops {year}"],
    "cafes":          ["{city} best cafes coffee shops {year}"],
    "bakeries":       ["{city} best bakeries {year}"],
    "museums":        ["{city} best museums {year}"],
    "art galleries":  ["{city} best art galleries {year}"],
    "parks":          ["{city} best parks gardens outdoors {year}"],
    "bookstores":     ["{city} best independent bookstores {year}"],
    "vintage shops":  ["{city} best vintage thrift clothing stores {year}"],
    "escape rooms":   ["{city} best escape rooms {year}"],
    "bowling":        ["{city} bowling alleys bars {year}"],
    "spas":           ["{city} best day spas wellness {year}"],
    "shopping":       ["{city} best local boutiques shopping {year}"],
}

# Extra query modifiers injected for high/fresh diversity modes
_DIVERSITY_MODIFIERS = [
    "underrated", "hidden gem", "locals only", "off the beaten path",
    "under the radar", "lesser known", "neighborhood favorite",
    "not touristy", "new opening", "indie",
]

DEFAULT_QUERIES = ["{city} best local venues things to do {year}"]


class TavilyVenueScout:
    """
    Discovers real, current venues via Tavily web search.

    diversity_mode controls how queries are varied:
      standard - same deterministic queries every time
      high     - appends a random modifier to each query so Tavily
                 hits different source pages and surfaces different venues
      fresh    - like high, but also excludes the top-ranked sources from
                 the previous call (rotates domains per session)
    """

    def __init__(self, tavily_api_key: str, openai_client: AsyncOpenAI):
        self.tavily = TavilyClient(api_key=tavily_api_key)
        self.openai = openai_client
        self.year = datetime.now().year
        logger.info("✅ TavilyVenueScout initialized")

    # ─── Public entry point ───────────────────────────────────────────────────

    async def discover_venues(
        self,
        preferences: List[str],
        location: str,
        parsed_prefs: Dict,
        user_query: str = "",
        generation_options: Optional[Dict] = None,
    ) -> List[Dict]:
        opts           = generation_options or {}
        diversity_mode = opts.get("diversity_mode", "standard")
        exclude_venues = [v.lower().strip() for v in opts.get("exclude_venues", [])]
        stops          = max(1, min(6, int(opts.get("stops_per_adventure", 3))))

        city = self._extract_city(location)
        queries = self._build_queries(preferences, city, diversity_mode)
        logger.info(f"🔍 TavilyVenueScout: {len(queries)} queries for '{city}' (mode={diversity_mode}, stops={stops})")

        loop = asyncio.get_event_loop()
        sem  = asyncio.Semaphore(6)
        domains = self._get_domains_for_mode(diversity_mode)

        async def search_with_sem(q: str):
            async with sem:
                return await loop.run_in_executor(
                    None, lambda: self._tavily_search(q, domains)
                )

        raw_results = await asyncio.gather(
            *[search_with_sem(q) for q in queries], return_exceptions=True
        )

        all_snippets: List[Dict] = []
        for res in raw_results:
            if isinstance(res, Exception):
                logger.warning(f"Tavily search failed: {res}")
                continue
            all_snippets.extend(res)

        if not all_snippets:
            logger.warning("TavilyVenueScout: no search results")
            return []

        logger.info(f"  Got {len(all_snippets)} raw snippets from Tavily")

        venues = await self._parse_venues_from_snippets(
            all_snippets, location, preferences, parsed_prefs, exclude_venues, stops
        )

        if exclude_venues:
            before = len(venues)
            venues = [
                v for v in venues
                if v.get("name", "").lower().strip() not in exclude_venues
            ]
            logger.info(f"  Excluded {before - len(venues)} seen venues")

        logger.info(f"✅ TavilyVenueScout: {len(venues)} venues (mode={diversity_mode})")
        return venues

    async def _parse_venues_from_snippets(
        self,
        snippets: List[Dict],
        location: str,
        preferences: List[str],
        parsed_prefs: Dict,
        exclude_venues: List[str],
        stops: int = 3,            # ✅ NEW
    ) -> List[Dict]:
        snippet_text = "\n\n".join(
            f"[{s['url']}]\n{s['content']}" for s in snippets[:20]
        )

        # Right-size the extraction count: need stops*3 for 3 non-overlapping adventures,
        # capped at 12 since that's all Tavily typically returns anyway.
        extract_count = min(max(stops * 3, 8), 12)

        budget      = parsed_prefs.get("budget_label", "moderate")
        group_size  = parsed_prefs.get("group_size", 1)
        time_of_day = parsed_prefs.get("time_of_day", "any")
        meal_context= parsed_prefs.get("meal_context", "none")

        exclusion_block = ""
        if exclude_venues:
            names = ", ".join(f'"{n}"' for n in exclude_venues[:20])
            exclusion_block = f"\n⛔ DO NOT include these already-seen venues: {names}\n"

        prompt = f"""You are extracting REAL venue information from web search snippets.

LOCATION: {location}
USER WANTS: {preferences}
CONTEXT: budget={budget}, group_size={group_size}, time={time_of_day}, meal={meal_context}
CURRENT YEAR: {self.year}
{exclusion_block}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WEB SEARCH SNIPPETS (from Yelp, TimeOut, Eater, etc.):
{snippet_text}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TASK: Extract exactly {extract_count} real venues mentioned in the snippets above.
- ONLY use venues explicitly named in the snippets
- DO NOT invent venues not mentioned above
- Skip any venue described as closed, permanently closed, or shuttered
- Skip any venue in the exclusion list above
- Prefer venues with addresses or neighborhoods mentioned
- Prioritize venues that match the user's preferences

Return ONLY valid JSON array:
[
  {{
    "name": "Exact venue name from snippet",
    "address": "Full address if found, else empty string",
    "address_hint": "Street address only",
    "neighborhood": "Neighborhood if mentioned",
    "type": "bar|nightclub|restaurant|cafe|park|museum|gallery|shop|spa|bowling|attraction",
    "category": "nightlife|food|coffee|outdoors|culture|shopping|entertainment|wellness",
    "description": "One sentence from or based on the snippet",
    "estimated_cost": "$|$$|$$$|$$$$",
    "price_per_person": 25,
    "google_rating": null,
    "current_status_confidence": "High",
    "establishment_type": "Business|Institution|Landmark",
    "source_url": "URL this venue came from"
  }}
]

CRITICAL: Return ONLY the JSON array. No preamble. Only venues from the snippets."""

        try:
            response = await self.openai.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=3000,
            )
            content = self._clean_json(response.choices[0].message.content)
            venues  = json.loads(content)

            for v in venues:
                v["proximity_based"] = False
                v["source"] = "tavily_discovery"
                if not v.get("address"):
                    v["address"] = f"{v.get('neighborhood', '')}, {location}".strip(", ")
                if not v.get("current_status_confidence"):
                    v["current_status_confidence"] = "High"

            return venues

        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error from GPT-4o venue extraction: {e}")
            return []
        except Exception as e:
            logger.error(f"GPT-4o venue extraction failed: {e}")
            return []
    # ─── Tavily search ────────────────────────────────────────────────────────

    def _tavily_search(self, query: str, domains: List[str]) -> List[Dict]:
        try:
            results = self.tavily.search(
                query=query,
                search_depth="basic",
                max_results=7,
                include_domains=domains,
            )
            snippets = []
            for r in results.get("results", []):
                content = r.get("content", "").strip()
                if content and len(content) > 40:
                    snippets.append({
                        "title":   r.get("title", ""),
                        "url":     r.get("url", ""),
                        "content": content[:600],
                        "query":   query,
                    })
            return snippets
        except Exception as e:
            logger.warning(f"Tavily search error for '{query}': {e}")
            return []

    # ─── Query building ───────────────────────────────────────────────────────

    def _build_queries(
        self, preferences: List[str], city: str, diversity_mode: str
    ) -> List[str]:
        queries: List[str] = []
        seen: set = set()

        for pref in preferences[:5]:
            pref_lower = pref.lower().strip()
            templates = DISCOVERY_QUERIES.get(pref_lower, DEFAULT_QUERIES)

            if not DISCOVERY_QUERIES.get(pref_lower):
                for key, tmpl in DISCOVERY_QUERIES.items():
                    if key in pref_lower or pref_lower in key:
                        templates = tmpl
                        break

            for tmpl in templates[:2]:
                base_q = tmpl.format(city=city, year=self.year)

                if diversity_mode in ("high", "fresh"):
                    # Append a random modifier so Tavily hits different pages
                    modifier = random.choice(_DIVERSITY_MODIFIERS)
                    q = f"{base_q} {modifier}"
                else:
                    q = base_q

                if q not in seen:
                    seen.add(q)
                    queries.append(q)

        return queries or [f"{city} best local venues {self.year}"]

    def _get_domains_for_mode(self, diversity_mode: str) -> List[str]:
        """
        For fresh mode, randomly drop 2-3 of the top sources so Tavily
        is forced to pull from different pages on the next call.
        """
        if diversity_mode == "fresh":
            domains = DISCOVERY_DOMAINS.copy()
            drop_n  = random.randint(2, 3)
            for _ in range(drop_n):
                if len(domains) > 5:
                    domains.pop(random.randint(0, len(domains) - 1))
            return domains
        return DISCOVERY_DOMAINS

    # ─── Utilities ────────────────────────────────────────────────────────────

    def _extract_city(self, location: str) -> str:
        return location.split(",")[0].strip() if "," in location else location.strip()

    def _clean_json(self, content: str) -> str:
        content = content.strip()
        for prefix in ("```json", "```"):
            if content.startswith(prefix):
                content = content[len(prefix):]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        if "[" in content:
            start = content.find("[")
            depth = 0
            for i, ch in enumerate(content[start:], start):
                if ch == "[":
                    depth += 1
                elif ch == "]":
                    depth -= 1
                    if depth == 0:
                        return content[start: i + 1]
        return content