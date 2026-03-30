# backend/app/agents/discovery/discovery_agent.py
"""OPTIMIZED Tavily Research Agent - Parallel + Cached + Single Search + Address & LLM Enrichment"""

from typing import List, Dict, Optional
from tavily import TavilyClient
from openai import AsyncOpenAI
from datetime import datetime
import logging
import asyncio
import re
import json
from ..base import BaseAgent, ValidationError, ProcessingError
from .query_strategy import QueryStrategyAgent, VenueTypeDetector
from .research_cache import ResearchCache

logger = logging.getLogger(__name__)


# ─── Street address regex ─────────────────────────────────────────────────────
_ADDRESS_RE = re.compile(
    r"\b(\d{1,5})\s+"
    r"([A-Za-z0-9\s\.\-']{3,40}?)\s+"
    r"(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|"
    r"Boulevard|Blvd|Place|Pl|Lane|Ln|Way|"
    r"Court|Ct|Square|Sq|Parkway|Pkwy|Highway|Hwy)"
    r"[\s,]+"
    r"([A-Za-z\s]{2,30}),\s*"
    r"([A-Z]{2})"
    r"(?:\s+(\d{5}(?:-\d{4})?))?",
    re.IGNORECASE,
)

_US_STATES = {
    "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
    "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
    "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
    "VA","WA","WV","WI","WY","DC",
}

# ─── Hours patterns (ordered most → least specific) ───────────────────────────
_HOURS_PATTERNS = [
    re.compile(
        r"(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*"
        r"(?:\s*[-–]\s*(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*)?"
        r"(?:\s*[-–:]\s*)"
        r"\d{1,2}(?::\d{2})?\s*(?:am|pm)"
        r"(?:\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm))?",
        re.IGNORECASE,
    ),
    re.compile(
        r"[Oo]pen\s+(?:daily|every\s+day|Mon\w*[-–](?:Sun|Fri|Sat)\w*|\w+days?)"
        r"[\s:]*\d{1,2}(?::\d{2})?\s*(?:am|pm)"
        r"(?:\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm))?",
        re.IGNORECASE,
    ),
    re.compile(
        r"[Hh]ours?\s*:?\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)"
        r"(?:\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm))?",
        re.IGNORECASE,
    ),
    re.compile(
        r"\d{1,2}:\d{2}\s*(?:AM|PM)\s*[-–]\s*\d{1,2}:\d{2}\s*(?:AM|PM)",
        re.IGNORECASE,
    ),
    re.compile(
        r"(?:closes?|opens?)\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)",
        re.IGNORECASE,
    ),
]

# ─── Price patterns ───────────────────────────────────────────────────────────
_PRICE_PATTERNS = [
    re.compile(r"\$\d+(?:\.\d{2})?(?:\s*[-–]\s*\$\d+(?:\.\d{2})?)?(?!\d)", re.IGNORECASE),
    re.compile(r"(?:adults?|seniors?|children?|kids?|tickets?|admission|entry)\s+\$\d+", re.IGNORECASE),
    re.compile(r"\${2,4}(?!\d)"),
    re.compile(r"(?:free\s+(?:admission|entry|access)|no\s+admission\s+(?:fee|charge))", re.IGNORECASE),
    re.compile(r"\bfree\b", re.IGNORECASE),
]

# ─── Temporary closure patterns ───────────────────────────────────────────────
_CLOSURE_PATTERNS = [
    # Explicit temporary closure language
    re.compile(
        r"(?:temporarily|currently|will be)\s+closed",
        re.IGNORECASE,
    ),
    re.compile(
        r"closed\s+(?:for|until|through|from)\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\bclosed\s+(?:to\s+the\s+public|for\s+(?:renovation|construction|maintenance|repairs?|private|a\s+special|the\s+season))",
        re.IGNORECASE,
    ),
    re.compile(
        r"not\s+(?:open|available|accessible)\s+(?:to\s+the\s+public\s+)?until",
        re.IGNORECASE,
    ),
    re.compile(
        r"reopens?\s+(?:on|in|at|after|following)",
        re.IGNORECASE,
    ),
    re.compile(
        r"(?:under|undergoing)\s+(?:renovation|construction|restoration|maintenance)",
        re.IGNORECASE,
    ),
    re.compile(
        r"scheduled\s+(?:closure|closing|maintenance)",
        re.IGNORECASE,
    ),
]


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _clean_markdown(text: str) -> str:
    text = re.sub(r"!\[.*?\]\(.*?\)", "", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"#{1,6}\s*", "", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"\*([^*]+)\*", r"\1", text)
    text = re.sub(r"\n+", " ", text)
    return re.sub(r"\s{2,}", " ", text).strip()


def _normalise(text: str) -> str:
    return re.sub(r"\s*\n\s*", " ", text)


def _extract_hours_clean(raw: str) -> Optional[str]:
    if not raw:
        return None
    text = _normalise(raw)
    for pattern in _HOURS_PATTERNS:
        m = pattern.search(text)
        if m:
            result = re.sub(r"\s+", " ", m.group(0)).strip().rstrip(",;")
            if len(result) >= 5:
                return result
    return None


def _extract_price_tier(raw: str) -> Optional[str]:
    if not raw:
        return None
    text = _normalise(raw)
    for pattern in _PRICE_PATTERNS:
        m = pattern.search(text)
        if m:
            hit = m.group(0).strip()
            return "Free" if hit.lower() == "free" else hit
    return None


def _detect_temporary_closure(text: str) -> bool:
    """
    Return True if the research text contains strong signals that a venue is
    temporarily closed (renovation, scheduled closure, not open until X, etc.).
    Does NOT flag permanent closures - those are already filtered upstream by
    Google Places business_status and venue name patterns.
    """
    if not text:
        return False
    for pattern in _CLOSURE_PATTERNS:
        if pattern.search(text):
            return True
    return False


def _clean_verified_address(raw: str) -> Optional[str]:
    if not raw:
        return None
    cleaned = re.sub(r"\s*\n\s*", " ", raw).strip()
    street_kw = (
        r"(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Boulevard|Blvd|"
        r"Place|Pl|Lane|Ln|Way|Court|Ct|Square|Sq|Parkway|Pkwy|Highway|Hwy)"
    )
    candidates = list(re.finditer(
        r"\b(\d{1,5})\s+[A-Za-z][A-Za-z0-9\s\.\-']{2,40}\s+" + street_kw,
        cleaned, re.IGNORECASE,
    ))
    if candidates:
        return cleaned[candidates[-1].start():].strip()
    return cleaned


def _extract_address_from_text(text: str, venue_name: str) -> Optional[str]:
    if not text:
        return None
    for m in _ADDRESS_RE.finditer(text):
        state = m.group(4).upper()
        if state not in _US_STATES:
            continue
        number      = m.group(1)
        street_name = m.group(2).strip()
        street_type = m.group(0).split(street_name)[-1].split(",")[0].strip()
        city        = m.group(3).strip().title()
        zipcode     = m.group(5) or ""
        address     = f"{number} {street_name} {street_type}, {city}, {state}"
        if zipcode:
            address += f" {zipcode}"
        match_pos  = m.start()
        context    = text[max(0, match_pos - 300):min(len(text), match_pos + 300)].lower()
        name_words = [w for w in venue_name.lower().split() if len(w) > 3]
        if name_words and not any(w in context for w in name_words):
            continue
        logger.debug(f"  📍 Extracted address: {address}")
        return address
    return None


class TavilyResearchAgent(BaseAgent):
    """
    ULTRA-OPTIMIZED Tavily research agent.

    1. PARALLEL: Research all venues simultaneously (60-75% faster)
    2. CACHING:  Skip research for recently-searched venues (90%+ faster on hits)
    3. SINGLE SEARCH: One comprehensive search instead of two (30-40% faster)
    4. SMART EXTRACT: Top 3 URLs only (reduces latency)
    5. ADDRESS EXTRACTION: Pull real street address from research content
    6. LLM BATCH ENRICHMENT: Single GPT-4o-mini call for all descriptions,
       price, insider tips, best time, crowd level (~1-2s, ~$0.001/run)
    7. HOURS: Still regex-based (faster and more reliable for structured time data)
    8. CLOSURE DETECTION: Post-research regex scan + LLM flag strips temporarily
       closed venues before they reach AdventureCreator
    """

    def __init__(self, tavily_api_key: str, use_cache: bool = True):
        super().__init__("TavilyResearch")
        self.tavily_client  = TavilyClient(api_key=tavily_api_key)
        self.openai_client  = AsyncOpenAI()
        self.query_strategy = QueryStrategyAgent()
        self.venue_detector = VenueTypeDetector()
        self.cache = ResearchCache(ttl_minutes=60, max_size=200) if use_cache else None
        logger.info(
            f"✅ OPTIMIZED Tavily Agent "
            f"(Parallel + {'Cached' if use_cache else 'No Cache'} + "
            f"Address Extraction + LLM Batch Enrichment + Closure Detection)"
        )

    async def process(self, input_data: Dict) -> Dict:
        required_fields = ["venues", "location"]
        if not self.validate_input(input_data, required_fields):
            raise ValidationError(self.name, f"Missing required fields: {required_fields}")

        venues     = input_data["venues"]
        location   = input_data["location"]
        max_venues = input_data.get("max_venues", 4)

        self.log_processing("Starting OPTIMIZED venue research",
                            f"{len(venues)} venues in {location}")

        if not venues:
            return self.create_response(True, {
                "researched_venues": [],
                "research_stats": {
                    "total_venues": 0, "successful_research": 0,
                    "total_insights": 0, "avg_confidence": 0.0, "cache_hits": 0,
                },
            })

        try:
            selected_venues = self._select_balanced_venues(venues, max_venues)
            research_tasks  = [
                self._research_venue_safe(venue, location, i)
                for i, venue in enumerate(selected_venues)
            ]

            self.log_processing("Launching parallel research",
                                f"{len(research_tasks)} concurrent tasks")
            start_time        = datetime.now()
            researched_venues = list(await asyncio.gather(*research_tasks))
            elapsed           = (datetime.now() - start_time).total_seconds()
            self.log_processing("Parallel research complete", f"{elapsed:.2f}s")

            # ✅ Single batched LLM call for all enrichment fields (including closure flag)
            researched_venues = await self._enrich_batch(researched_venues, location)

            # ✅ Strip temporarily closed venues detected by regex OR LLM
            open_venues, closed_venues = self._partition_by_closure(researched_venues)
            if closed_venues:
                names = [v.get("name", "?") for v in closed_venues]
                logger.warning(
                    f"🚫 Removed {len(closed_venues)} temporarily closed venue(s): {names}"
                )
            researched_venues = open_venues

            successful_research = sum(
                1 for v in researched_venues
                if v.get("research_status") not in ["failed", "unknown"]
            )
            total_insights  = sum(v.get("total_insights", 0)      for v in researched_venues)
            avg_confidence  = (
                sum(v.get("research_confidence", 0) for v in researched_venues) /
                len(researched_venues)
            ) if researched_venues else 0.0
            addresses_found = sum(1 for v in researched_venues if v.get("verified_address"))
            cache_stats     = self.cache.get_stats() if self.cache else {}

            result = {
                "researched_venues": researched_venues,
                "research_stats": {
                    "total_venues":        len(researched_venues),
                    "successful_research": successful_research,
                    "total_insights":      total_insights,
                    "avg_confidence":      avg_confidence,
                    "elapsed_seconds":     elapsed,
                    "addresses_found":     addresses_found,
                    "cache_hits":          cache_stats.get("hits", 0),
                    "cache_hit_rate":      cache_stats.get("hit_rate", "0%"),
                    "closed_venues_removed": len(closed_venues),
                },
            }

            self.log_success(
                f"Research complete: {successful_research}/{len(selected_venues)} successful, "
                f"{total_insights} insights, {addresses_found} addresses found, "
                f"{len(closed_venues)} closed removed, "
                f"{elapsed:.2f}s, Cache: {cache_stats.get('hit_rate', '0%')}"
            )
            return self.create_response(True, result)

        except Exception as e:
            self.log_error(f"Venue research failed: {e}")
            raise ProcessingError(self.name, str(e))

    # ─── Closure partitioning ─────────────────────────────────────────────────

    def _partition_by_closure(
        self, venues: List[Dict]
    ) -> tuple[List[Dict], List[Dict]]:
        """
        Split venues into (open, closed) based on:
        1. regex scan of comprehensive_research_text + current_info
        2. LLM-set 'temporarily_closed' flag from _enrich_batch
        """
        open_venues, closed_venues = [], []
        for v in venues:
            if v.get("temporarily_closed"):
                closed_venues.append(v)
                continue

            research_text = " ".join(filter(None, [
                v.get("comprehensive_research_text", ""),
                v.get("current_info", ""),
                v.get("hours_info", ""),
            ]))
            if _detect_temporary_closure(research_text):
                v["temporarily_closed"] = True
                closed_venues.append(v)
            else:
                open_venues.append(v)

        return open_venues, closed_venues

    # ─── LLM batch enrichment ─────────────────────────────────────────────────

    async def _enrich_batch(self, venues: List[Dict], location: str) -> List[Dict]:
        """
        Single GPT-4o-mini call extracting structured info for all venues.
        Extracts: description, price_tier (fallback), insider_tip, best_time,
        crowd_level, and temporarily_closed flag.
        Hours stay as regex - more reliable for structured time patterns.
        Non-fatal: if the call fails, existing fields are unchanged.
        """
        if not venues:
            return venues

        venue_entries = []
        for i, v in enumerate(venues):
            raw = (
                v.get("current_info") or
                v.get("venue_summary") or
                v.get("comprehensive_research_text") or
                ""
            )[:500]
            venue_entries.append(
                f'{i}. {v.get("name", "Unknown")} [type: {v.get("type", "venue")}]'
                + (f'\n   Research: "{raw}"' if raw else "\n   Research: (none)")
            )

        prompt = f"""You are extracting structured venue info for a local adventure app in {location}.

For each venue, extract what you can from the research text. Return null for fields not clearly supported by the text.

Return ONLY valid JSON. Keys are venue index numbers as strings. Each value has:
  "description"        : One clear sentence (15-25 words) describing what it is and why to visit. Always provide this - use venue type/name if research is sparse. Never include city name, addresses, or "located at".
  "price_tier"         : "Free", "$", "$$", "$$$", "$$$$", or specific like "$15 admission". null if unknown.
  "insider_tip"        : One short practical tip from the research text. null if nothing useful found.
  "best_time"          : Best time to visit if inferable, e.g. "Weekday mornings", "Evenings". null if unknown.
  "crowd_level"        : One of: "Usually quiet", "Moderately busy", "Can get crowded", "Very popular". null if unknown.
  "temporarily_closed" : true ONLY if the research text explicitly states the venue is currently closed, temporarily shut, undergoing renovation, or not open to the public. false otherwise.

Rules:
- description must NOT mention city name, street address, or phrases like "located at" / "find us at".
- price_tier and insider_tip must come from research text - do NOT invent them.
- temporarily_closed must only be true when the closure is clearly stated and current - do NOT flag venues just because old reviews mention past closures.
- Return null rather than guessing for optional fields.

Venues:
{chr(10).join(venue_entries)}"""

        try:
            response = await self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=800,
            )
            content = response.choices[0].message.content.strip()
            if content.startswith("```"):
                parts = content.split("```")
                content = parts[1] if len(parts) > 1 else content
                if content.startswith("json"):
                    content = content[4:]
            content = content.strip()

            enriched: Dict[str, Dict] = json.loads(content)
            count = 0

            for idx_str, data in enriched.items():
                try:
                    idx = int(idx_str)
                    if not (0 <= idx < len(venues)):
                        continue
                    v = venues[idx]

                    desc = data.get("description")
                    if desc and len(desc.strip()) > 10:
                        v["description_clean"] = desc.strip()

                    price = data.get("price_tier")
                    if price and not v.get("price_tier"):
                        v["price_tier"] = price

                    tip = data.get("insider_tip")
                    if tip:
                        v["insider_tip_clean"] = tip.strip()

                    best_time = data.get("best_time")
                    if best_time:
                        v["best_time"] = best_time.strip()

                    crowd = data.get("crowd_level")
                    if crowd:
                        v["crowd_level"] = crowd.strip()

                    # ✅ LLM closure flag - only set to True, never override an
                    # existing True value with False (regex may have caught it first)
                    if data.get("temporarily_closed") is True:
                        v["temporarily_closed"] = True

                    count += 1

                except (ValueError, IndexError, AttributeError):
                    continue

            logger.info(f"  ✨ LLM enriched {count}/{len(venues)} venues")

        except json.JSONDecodeError as e:
            logger.warning(f"LLM enrichment JSON parse failed (non-fatal): {e}")
        except Exception as e:
            logger.warning(f"LLM enrichment failed (non-fatal): {e}")

        return venues

    # ─── Per-venue research ────────────────────────────────────────────────────

    async def _research_venue_safe(self, venue: Dict, location: str, index: int) -> Dict:
        venue_name = venue.get("name", "")

        if self.cache:
            cached = self.cache.get(venue_name, location)
            if cached:
                self.log_processing(f"[{index}] Cache HIT", venue_name)
                return cached

        try:
            self.log_processing(f"[{index}] Researching", venue_name)
            result = await self._research_venue(venue, location)

            if self.cache and result.get("research_status") not in ["failed", "unknown"]:
                self.cache.set(venue_name, location, result)

            addr_status = f"✅ {result['verified_address']}" if result.get("verified_address") else "❌ no address"
            self.log_processing(
                f"[{index}] Complete",
                f"Status: {result.get('research_status')}, "
                f"Confidence: {result.get('research_confidence', 0.0):.2f}, "
                f"Address: {addr_status}",
            )
            return result

        except Exception as e:
            self.log_warning(f"[{index}] Research failed for {venue_name}: {e}")
            return self._create_fallback_profile(venue, location)

    async def _research_venue(self, venue: Dict, location: str) -> Dict:
        venue_name   = venue.get("name", "")
        all_research = []
        urls_to_extract: List[str] = []

        try:
            comprehensive_query = (
                f'"{venue_name}" {location} '
                f'official hours address admission information menu'
            )
            search_results = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.tavily_client.search(
                    query=comprehensive_query,
                    max_results=6,
                    search_depth="basic",
                ),
            )

            official_urls: List[str] = []
            general_urls:  List[str] = []

            for result in search_results.get("results", []):
                url = result.get("url", "")
                if not url or not self._is_valid_url(url):
                    continue
                snippet = self._process_search_result(result, venue_name, venue)
                if snippet:
                    if self._is_official_site(url):
                        snippet["method"] = "official_snippet"
                        all_research.insert(0, snippet)
                        official_urls.append(url)
                    else:
                        snippet["method"] = "search_snippet"
                        all_research.append(snippet)
                        general_urls.append(url)

            urls_to_extract = official_urls + general_urls

        except Exception as e:
            self.log_warning(f"Comprehensive search failed: {e}")

        extracted_content_count = 0
        if urls_to_extract:
            try:
                extract_result = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: self.tavily_client.extract(urls=urls_to_extract[:3]),
                )
                for extracted in extract_result.get("results", []):
                    content_data = self._process_extracted_content(extracted, venue_name, venue)
                    if content_data:
                        all_research.append(content_data)
                        extracted_content_count += 1

                if extracted_content_count == 0:
                    self.log_warning("Extract API returned 0 results - using search snippets")

            except Exception as e:
                self.log_warning(f"Extract failed: {e} - using search snippets")

        return self._build_venue_profile(venue, all_research, extracted_content_count, location)

    # ─── Content processors ───────────────────────────────────────────────────

    def _process_search_result(self, result: Dict, venue_name: str, venue: Dict) -> Optional[Dict]:
        content = result.get("content", "")
        url     = result.get("url", "")
        if not content or len(content) < 30:
            return None
        content_lower    = content.lower()
        venue_name_lower = venue_name.lower()
        if venue_name_lower not in content_lower:
            venue_words = [w for w in venue_name_lower.split() if len(w) > 2]
            if not venue_words:
                return None
            if sum(1 for w in venue_words if w in content_lower) / len(venue_words) < 0.3:
                return None
        venue_type     = self.venue_detector.detect_venue_type(venue)
        info_extracted = self._extract_type_specific_info(content, content_lower, venue_type)
        return {"content": content[:400], "source_url": url, "method": "search_snippet", **info_extracted}

    def _process_extracted_content(self, extracted: Dict, venue_name: str, venue: Dict) -> Optional[Dict]:
        content = extracted.get("raw_content", "")
        url     = extracted.get("url", "")
        if not content or len(content) < 100:
            return None
        content_lower    = content.lower()
        venue_name_lower = venue_name.lower()
        if venue_name_lower not in content_lower:
            venue_words = [w for w in venue_name_lower.split() if len(w) > 2]
            if not venue_words:
                return None
            if sum(1 for w in venue_words if w in content_lower) / len(venue_words) < 0.3:
                return None
        venue_type     = self.venue_detector.detect_venue_type(venue)
        info_extracted = self._extract_type_specific_info(content, content_lower, venue_type)
        return {"content": content[:1000], "source_url": url, "method": "tavily_extract", **info_extracted}

    def _extract_type_specific_info(self, content: str, content_lower: str, venue_type: str) -> Dict:
        extracted = {
            "has_hours_info": False, "has_menu_info": False,
            "has_activity_info": False, "has_admission_info": False,
            "has_current_info": False, "info_type": "general",
        }
        current_indicators = ["current", "now", "today", "recently", "updated", "latest", "this year"]
        extracted["has_current_info"] = any(i in content_lower for i in current_indicators)

        if venue_type == "coffee_shop":
            extracted["has_hours_info"] = any(t in content_lower for t in ["hours", "open", "am", "pm", "closing"])
            extracted["has_menu_info"]  = any(t in content_lower for t in ["menu", "coffee", "drinks", "food", "pastries"])
            extracted["info_type"] = "menu_info" if extracted["has_menu_info"] else "hours" if extracted["has_hours_info"] else "general"
        elif venue_type == "park":
            extracted["has_activity_info"] = any(t in content_lower for t in ["trail", "walk", "activities", "playground"])
            extracted["has_hours_info"]    = any(t in content_lower for t in ["hours", "dawn", "dusk", "open", "sunrise"])
            extracted["has_admission_info"]= any(t in content_lower for t in ["free", "admission", "entry", "$"])
            extracted["info_type"] = "activities" if extracted["has_activity_info"] else "general"
        elif venue_type == "museum":
            extracted["has_admission_info"]= any(t in content_lower for t in ["admission", "ticket", "free", "$", "price"])
            extracted["has_activity_info"] = any(t in content_lower for t in ["exhibition", "collection", "art", "gallery"])
            extracted["info_type"] = "exhibition_info" if extracted["has_activity_info"] else "admission" if extracted["has_admission_info"] else "general"
        elif venue_type == "restaurant":
            extracted["has_menu_info"]  = any(t in content_lower for t in ["menu", "food", "dish", "cuisine"])
            extracted["has_hours_info"] = any(t in content_lower for t in ["hours", "open", "reservation"])
            extracted["info_type"] = "menu_info" if extracted["has_menu_info"] else "hours" if extracted["has_hours_info"] else "general"

        return extracted

    # ─── Profile builder ──────────────────────────────────────────────────────

    def _build_venue_profile(
        self, venue: Dict, research: List[Dict], extracted_count: int, location: str = ""
    ) -> Dict:
        if not research:
            return self._create_fallback_profile(venue, location)

        venue_name = venue.get("name", "")

        verified_address: Optional[str] = None
        ordered = sorted(research, key=lambda r: r.get("method") == "tavily_extract", reverse=True)
        for item in ordered:
            raw_addr = _extract_address_from_text(item.get("content", ""), venue_name)
            if raw_addr:
                verified_address = _clean_verified_address(raw_addr)
                if verified_address:
                    logger.info(f"  📍 Address resolved via research: {verified_address}")
                    break

        hours_texts     = [r["content"] for r in research if r.get("info_type") == "hours"     or r.get("has_hours_info")]
        menu_texts      = [r["content"] for r in research if r.get("info_type") in ("menu_info","exhibition_info") or r.get("has_menu_info") or r.get("has_activity_info")]
        admission_texts = [r["content"] for r in research if r.get("has_admission_info")]
        current_texts   = [r["content"] for r in research if r.get("has_current_info")]
        general_texts   = [r["content"] for r in research[:3]]

        all_unique_texts: List[str] = []
        seen_content: set = set()
        for text_list in [admission_texts, hours_texts, menu_texts, current_texts, general_texts]:
            for text in text_list:
                key = text[:100].lower()
                if key not in seen_content:
                    all_unique_texts.append(text)
                    seen_content.add(key)
                if len(all_unique_texts) >= 6:
                    break
            if len(all_unique_texts) >= 6:
                break

        comprehensive_text = "\n\n".join(all_unique_texts[:6])[:2400]
        hours_info   = "\n\n".join(hours_texts[:2])[:600]   if hours_texts   else ""
        menu_info    = "\n\n".join(menu_texts[:2])[:600]    if menu_texts    else ""
        current_info = "\n\n".join(current_texts[:2])[:400] if current_texts else ""

        search_corpus = "\n\n".join(filter(None, [hours_info, menu_info, current_info, comprehensive_text]))
        hours_clean   = _extract_hours_clean(search_corpus)
        price_tier    = _extract_price_tier(search_corpus)

        has_extract  = extracted_count > 0
        has_snippets = any(r.get("method") == "search_snippet" for r in research)
        confidence   = 1.0 if has_extract else 0.9 if has_snippets else 0.5
        status       = "excellent" if confidence > 0.85 else "good" if confidence > 0.6 else "partial"

        return {
            **venue,
            "research_status":             status,
            "research_confidence":         confidence,
            "comprehensive_research_text": comprehensive_text,
            "current_info":                current_info or comprehensive_text[:500],
            "hours_info":                  hours_info   or comprehensive_text[:600],
            "venue_summary":               menu_info    or comprehensive_text[:600],
            "hours_clean":                 hours_clean,
            "price_tier":                  price_tier,
            "description_clean":           None,
            "insider_tip_clean":           None,
            "best_time":                   None,
            "crowd_level":                 None,
            "temporarily_closed":          False,   # default; overridden by _enrich_batch / _partition_by_closure
            "visitor_tips":                self._extract_visitor_tips(research),
            "total_insights":              len(research),
            "unique_insights":             len(all_unique_texts),
            "extracted_pages":             extracted_count,
            "snippet_count":               len([r for r in research if r.get("method") == "search_snippet"]),
            "top_source":                  research[0]["source_url"] if research else None,
            "verified_address":            verified_address,
            "validation_timestamp":        datetime.now().isoformat(),
        }

    # ─── Helpers ──────────────────────────────────────────────────────────────

    def _extract_visitor_tips(self, research: List[Dict]) -> List[str]:
        tips = []
        if any(r.get("has_hours_info")                             for r in research):
            tips.append("Current hours information found - check before visiting")
        if any(r.get("has_menu_info") or r.get("has_activity_info") for r in research):
            tips.append("Menu/activity details available - check current offerings")
        if any(r.get("has_current_info")                           for r in research):
            tips.append("Recently updated information available")
        return tips[:3]

    def _is_official_site(self, url: str) -> bool:
        return any(ind in url.lower() for ind in (".org", ".edu", ".gov", ".museum", "official"))

    def _is_valid_url(self, url: str) -> bool:
        return not any(url.lower().endswith(ext) for ext in (".pdf", ".jpg", ".png", ".gif", ".mp4", ".zip"))

    def _select_balanced_venues(self, venues: List[Dict], max_venues: int) -> List[Dict]:
        return venues[:max_venues] if len(venues) > max_venues else venues

    def _create_fallback_profile(self, venue: Dict, location: str) -> Dict:
        return {
            **venue,
            "research_status":             "failed",
            "research_confidence":         0.2,
            "current_info":                f"Could not research {venue.get('name', 'this venue')} effectively",
            "comprehensive_research_text": "",
            "hours_clean":                 None,
            "price_tier":                  None,
            "description_clean":           None,
            "insider_tip_clean":           None,
            "best_time":                   None,
            "crowd_level":                 None,
            "temporarily_closed":          False,
            "visitor_tips":                [],
            "total_insights":              0,
            "verified_address":            None,
            "validation_timestamp":        datetime.now().isoformat(),
        }

    def get_cache_stats(self) -> Dict:
        return self.cache.get_stats() if self.cache else {}

    def clear_cache(self):
        if self.cache:
            self.cache.clear()