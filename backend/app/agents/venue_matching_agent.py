# backend/app/agents/venue_matching_agent.py
import openai
import json
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

class VenueMatchingAgent:
    """Uses OpenAI to intelligently match venue names from adventures to enhanced locations"""
    
    def __init__(self):
        logger.info("✅ OpenAI Venue Matching Agent initialized")
    
    async def match_adventure_venues_to_locations(
        self, 
        adventure: Dict, 
        enhanced_locations: List[Dict]
    ) -> List[Dict]:
        """Use OpenAI to intelligently match adventure venues to enhanced locations"""
        
        adventure_title = adventure.get("title", "Unknown Adventure")
        adventure_venues = adventure.get("venues_used", [])
        
        if not adventure_venues or not enhanced_locations:
            logger.warning(f"No venues or locations to match for {adventure_title}")
            return []
        
        logger.info(f"🤖 AI matching {len(adventure_venues)} venues to {len(enhanced_locations)} locations for '{adventure_title}'")
        
        try:
            # Build enhanced location summaries for OpenAI
            location_summaries = []
            for i, loc in enumerate(enhanced_locations):
                summary = {
                    "id": i,
                    "name": loc.get("name", "Unknown"),
                    "address": loc.get("address", ""),
                    "type": loc.get("type", ""),
                    "neighborhood": self._extract_neighborhood(loc.get("address", "")),
                }
                location_summaries.append(summary)
            
            matching_prompt = f"""You are an expert at matching venue names to real locations. 

TASK: Match the venues used in this adventure to the available enhanced locations.

ADVENTURE: "{adventure_title}"
ADVENTURE VENUES TO MATCH: {adventure_venues}

AVAILABLE ENHANCED LOCATIONS:
{json.dumps(location_summaries, indent=2)}

MATCHING RULES:
1. Match based on venue names, considering variations and abbreviations
2. Consider location context (neighborhood, address) 
3. Be intelligent about synonyms and common variations:
   - "MFA" = "Museum of Fine Arts"
   - "Harvard Art Museums" = "Harvard Art Museum" 
   - "MIT Museum" ≠ "Museum of Fine Arts" (different institutions!)
4. Only match if you're confident (>70% confidence)
5. Each adventure venue should match to AT MOST ONE location
6. If no good match exists, don't force it

Return ONLY valid JSON array with your matches:
[
  {{
    "adventure_venue": "MIT Museum",
    "matched_location_id": 2,
    "matched_location_name": "MIT Museum", 
    "confidence": 0.95,
    "reasoning": "Exact name match for MIT Museum"
  }},
  {{
    "adventure_venue": "Harvard Art Museums", 
    "matched_location_id": 5,
    "matched_location_name": "Harvard Art Museum",
    "confidence": 0.90, 
    "reasoning": "Harvard Art Museums is plural form of Harvard Art Museum"
  }}
]

Return empty array [] if no confident matches found.
Focus on accuracy over quantity - wrong matches break the user experience!"""

            response = openai.chat.completions.create(
                model="gpt-4o-mini",  # Fast and good for this task
                messages=[{"role": "user", "content": matching_prompt}],
                temperature=0.1,  # Low temperature for consistent matching
                max_tokens=1500
            )
            
            content = self._clean_json_response(response.choices[0].message.content)
            matches = json.loads(content)
            
            # Convert matches back to enhanced location objects
            matched_locations = []
            for match in matches:
                location_id = match.get("matched_location_id")
                confidence = match.get("confidence", 0.0)
                
                if location_id is not None and location_id < len(enhanced_locations) and confidence >= 0.7:
                    matched_location = enhanced_locations[location_id].copy()
                    matched_location["ai_match_confidence"] = confidence
                    matched_location["ai_match_reasoning"] = match.get("reasoning", "")
                    matched_location["matched_adventure_venue"] = match.get("adventure_venue", "")
                    
                    matched_locations.append(matched_location)
                    
                    logger.info(f"  ✅ Matched: '{match.get('adventure_venue')}' → '{match.get('matched_location_name')}' (confidence: {confidence:.2f})")
                else:
                    logger.warning(f"  ❌ Rejected low-confidence match: {match.get('adventure_venue')} (confidence: {confidence:.2f})")
            
            logger.info(f"🎯 AI matched {len(matched_locations)}/{len(adventure_venues)} venues for '{adventure_title}'")
            return matched_locations
            
        except Exception as e:
            logger.error(f"AI venue matching error for {adventure_title}: {e}")
            return []
    
    async def batch_match_all_adventures(
        self, 
        adventures: List[Dict], 
        enhanced_locations: List[Dict]
    ) -> Dict[str, List[Dict]]:
        """Match venues for all adventures in one batch (more efficient)"""
        
        if not adventures or not enhanced_locations:
            return {}
        
        logger.info(f"🚀 Batch AI matching for {len(adventures)} adventures")
        
        try:
            # Build location summaries
            location_summaries = []
            for i, loc in enumerate(enhanced_locations):
                summary = {
                    "id": i,
                    "name": loc.get("name", "Unknown"),
                    "address": loc.get("address", ""),
                    "type": loc.get("type", ""),
                    "neighborhood": self._extract_neighborhood(loc.get("address", "")),
                }
                location_summaries.append(summary)
            
            # Build adventure summaries
            adventure_summaries = []
            for i, adventure in enumerate(adventures):
                adventure_summaries.append({
                    "id": i,
                    "title": adventure.get("title", f"Adventure {i+1}"),
                    "venues_used": adventure.get("venues_used", [])
                })
            
            batch_prompt = f"""You are an expert at matching venue names to real locations.

TASK: For each adventure, match its venues to the available enhanced locations.

ADVENTURES TO PROCESS:
{json.dumps(adventure_summaries, indent=2)}

AVAILABLE ENHANCED LOCATIONS:
{json.dumps(location_summaries, indent=2)}

MATCHING RULES:
1. Match based on venue names, considering variations and abbreviations
2. Be intelligent about synonyms:
   - "MFA" = "Museum of Fine Arts"
   - "Harvard Art Museums" = "Harvard Art Museum"
   - "MIT Museum" ≠ "Museum of Fine Arts" (completely different!)
3. Each location can be used by multiple adventures
4. Only match if confident (>70% confidence)
5. Consider context - museums should match to museums, cafes to cafes

Return ONLY valid JSON object:
{{
  "adventure_0": [
    {{
      "adventure_venue": "MIT Museum",
      "matched_location_id": 2,
      "matched_location_name": "MIT Museum",
      "confidence": 0.95,
      "reasoning": "Exact match"
    }}
  ],
  "adventure_1": [
    {{
      "adventure_venue": "Harvard Art Museums",
      "matched_location_id": 5, 
      "matched_location_name": "Harvard Art Museum",
      "confidence": 0.90,
      "reasoning": "Plural/singular variation of same venue"
    }}
  ]
}}

Use "adventure_0", "adventure_1", etc. as keys. Return empty arrays for adventures with no good matches."""

            response = openai.chat.completions.create(
                model="gpt-4o",  # Use more powerful model for batch processing
                messages=[{"role": "user", "content": batch_prompt}],
                temperature=0.1,
                max_tokens=3000
            )
            
            content = self._clean_json_response(response.choices[0].message.content)
            batch_matches = json.loads(content)
            
            # Convert batch results to final format
            adventure_matches = {}
            
            for adventure_key, matches in batch_matches.items():
                adventure_idx = int(adventure_key.split("_")[1])
                if adventure_idx < len(adventures):
                    adventure_title = adventures[adventure_idx].get("title", f"Adventure {adventure_idx + 1}")
                    
                    matched_locations = []
                    for match in matches:
                        location_id = match.get("matched_location_id")
                        confidence = match.get("confidence", 0.0)
                        
                        if location_id is not None and location_id < len(enhanced_locations) and confidence >= 0.7:
                            matched_location = enhanced_locations[location_id].copy()
                            matched_location["ai_match_confidence"] = confidence
                            matched_location["ai_match_reasoning"] = match.get("reasoning", "")
                            matched_location["matched_adventure_venue"] = match.get("adventure_venue", "")
                            
                            matched_locations.append(matched_location)
                    
                    adventure_matches[adventure_title] = matched_locations
                    logger.info(f"  Adventure '{adventure_title}': {len(matched_locations)} matches")
            
            return adventure_matches
            
        except Exception as e:
            logger.error(f"Batch AI matching error: {e}")
            return {}
    
    def _extract_neighborhood(self, address: str) -> str:
        """Extract neighborhood from address string"""
        if not address:
            return ""
        
        # Simple extraction - look for common neighborhood patterns
        address_parts = address.split(',')
        if len(address_parts) >= 2:
            # Usually neighborhood is after street address, before city
            potential_neighborhood = address_parts[1].strip()
            if len(potential_neighborhood) > 3 and not potential_neighborhood.isdigit():
                return potential_neighborhood
        
        return ""
    
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