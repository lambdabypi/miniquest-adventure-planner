# backend/app/agents/research/research_summary_agent.py
"""ASYNC Research Summary Agent - OPTIMIZED with anti-hallucination safeguards"""

from openai import AsyncOpenAI
import json
import logging
from typing import List, Dict, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class ResearchSummaryAgent:
    """
    Uses OpenAI to synthesize raw Tavily research into actionable visitor insights.
    
    OPTIMIZED:
    - Processes ALL venues in a single OpenAI call (batch)
    - ✅ ASYNC calls for better performance
    - Uses 2400 chars per venue (down from 4000)
    - Smart deduplication from research agent
    - Anti-hallucination safeguards for free venues
    
    Cost: ~$0.0025 per request (8 venues)
    """
    
    def __init__(self):
        self.name = "ResearchSummary"
        self.client = AsyncOpenAI()  # ✅ ASYNC client
        logger.info("✅ Research Summary Agent initialized (ASYNC + Anti-Hallucination)")
    
    async def process(self, input_data: Dict) -> Dict:
        """Summarize research data for all venues in a single batch"""
        researched_venues = input_data.get("researched_venues", [])
        
        if not researched_venues:
            return {"success": True, "data": {"summarized_venues": []}}
        
        logger.info(f"📊 BATCH summarizing {len(researched_venues)} venues in ONE ASYNC OpenAI call")
        
        try:
            # ✅ ASYNC batch summarization
            summaries = await self._batch_summarize_venues(researched_venues)
            
            # Attach summaries to venues
            summarized_venues = []
            for i, venue in enumerate(researched_venues):
                venue_copy = venue.copy()
                if i < len(summaries):
                    venue_copy["research_summary"] = summaries[i]
                else:
                    venue_copy["research_summary"] = self._create_fallback_summary(
                        venue.get("name", "Unknown"), 
                        venue.get("current_info", "")
                    )
                summarized_venues.append(venue_copy)
            
            logger.info(f"✅ Batch summarized {len(summarized_venues)} venues")
            
            return {
                "success": True,
                "data": {
                    "summarized_venues": summarized_venues,
                    "total_summarized": len(summarized_venues)
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Batch summarization failed: {e}")
            return {
                "success": True,
                "data": {
                    "summarized_venues": [
                        {
                            **v,
                            "research_summary": self._create_fallback_summary(
                                v.get("name", "Unknown"),
                                v.get("current_info", "")
                            )
                        }
                        for v in researched_venues
                    ],
                    "total_summarized": len(researched_venues)
                }
            }
    
    async def _batch_summarize_venues(self, venues: List[Dict]) -> List[Dict]:
        """✅ ASYNC: Summarize multiple venues in a single OpenAI call"""
        
        # Build batch data for OpenAI with optimized content
        venues_data = []
        for i, venue in enumerate(venues):
            # ✅ Use comprehensive field if available, otherwise combine
            if venue.get("comprehensive_research_text"):
                all_text = venue.get("comprehensive_research_text", "")
            else:
                # Fallback: combine individual fields
                current_info = venue.get("current_info", "")
                hours_info = venue.get("hours_info", "")
                venue_summary = venue.get("venue_summary", "")
                
                all_text = f"""
CURRENT INFO: {current_info[:1500]}

HOURS INFO: {hours_info[:800]}

VENUE SUMMARY: {venue_summary[:600]}
""".strip()
            
            venues_data.append({
                "id": i,
                "name": venue.get("name", "Unknown Venue"),
                "type": venue.get("type", "attraction"),
                "research_text": all_text[:2400],  # ✅ Optimized: 2400 chars max
                "visitor_tips": venue.get("visitor_tips", [])[:10],
                "research_confidence": venue.get("research_confidence", 0.0),
                "total_insights": venue.get("total_insights", 0),
                "extracted_pages": venue.get("extracted_pages", 0),
                "snippet_count": venue.get("snippet_count", 0)
            })
        
        prompt = self._build_batch_summary_prompt(venues_data)
        
        try:
            # ✅ ASYNC OpenAI call
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,   # ✅ Low for accurate extraction
                max_tokens=6000    # ✅ Optimized: 6000 for 8 venues
            )
            
            content = self._clean_json_response(response.choices[0].message.content)
            summaries_data = json.loads(content)
            
            # Extract summaries in order
            summaries = []
            for i in range(len(venues)):
                venue_key = f"venue_{i}"
                if venue_key in summaries_data:
                    summaries.append(summaries_data[venue_key])
                else:
                    summaries.append(self._create_fallback_summary(
                        venues[i].get("name", "Unknown"),
                        venues[i].get("current_info", "")
                    ))
            
            return summaries
            
        except Exception as e:
            logger.error(f"OpenAI summarization error: {e}")
            return [
                self._create_fallback_summary(
                    v.get("name", "Unknown"),
                    v.get("current_info", "")
                )
                for v in venues
            ]
    
    def _build_batch_summary_prompt(self, venues_data: List[Dict]) -> str:
        """Build prompt for batch summarization with anti-hallucination safeguards"""
        return f"""Analyze these {len(venues_data)} venues and create visitor-focused summaries.

CRITICAL RULES - ANTI-HALLUCINATION:
1. ONLY use information from the research_text provided
2. If research_text is empty or minimal, say "Limited information available"
3. NEVER invent hours, prices, or details not in research_text
4. Use confidence scores to indicate data quality
5. For free venues/parks: Check if hours/fees are mentioned before claiming "free"

VENUES TO SUMMARIZE:
{json.dumps(venues_data, indent=2)}

Return ONLY valid JSON:
{{
  "venue_0": {{
    "visitor_summary": "2-3 sentence summary for visitors",
    "key_highlights": ["highlight 1", "highlight 2", "highlight 3"],
    "practical_info": {{
      "best_time_to_visit": "morning/afternoon/evening or 'Check website'",
      "typical_duration": "30-60 minutes",
      "admission": "Free/Paid/Unknown",
      "insider_tips": ["tip 1", "tip 2"]
    }},
    "confidence_notes": "High: Full website data | Medium: Search snippets only | Low: Minimal data"
  }},
  "venue_1": {{ ... }}
}}

Use venue_0, venue_1, etc. matching the venue IDs. Be honest about data limitations."""
    
    def _create_fallback_summary(self, venue_name: str, current_info: str) -> Dict:
        """Create fallback summary when research fails"""
        return {
            "visitor_summary": f"{venue_name} - Limited information available. Check their website or call ahead for details.",
            "key_highlights": [
                f"Popular {venue_name}",
                "Check official website for current info",
                "Call ahead to verify hours"
            ],
            "practical_info": {
                "best_time_to_visit": "Check website",
                "typical_duration": "Varies",
                "admission": "Unknown",
                "insider_tips": [
                    "Verify hours before visiting",
                    "Check their website for special events"
                ]
            },
            "confidence_notes": "Low: Minimal research data available"
        }
    
    def _clean_json_response(self, content: str) -> str:
        """Clean OpenAI response to extract valid JSON"""
        content = content.strip()
        
        # Remove markdown code blocks
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        
        if content.endswith("```"):
            content = content[:-3]
        
        return content.strip()