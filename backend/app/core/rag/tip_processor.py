# backend/app/core/rag/tip_processor.py
"""Tip extraction and processing logic"""

import re
import logging
from typing import Optional, Dict, List
from datetime import datetime

logger = logging.getLogger(__name__)

class TipProcessor:
    """Processes and validates insider tips from search results"""
    
    def __init__(self):
        logger.info("✅ TipProcessor initialized")
    
    def extract_tip_from_result(self, result: Dict, location: str, query: str) -> Optional[Dict]:
        """
        Extract insider tip from Tavily search result.
        
        Args:
            result: Tavily search result dictionary
            location: Target location
            query: Search query used
            
        Returns:
            Dict with tip data if valid, None otherwise
        """
        try:
            content = result.get("content", "")
            title = result.get("title", "")
            url = result.get("url", "")
            
            # Validate content length
            if not content or len(content) < 50:
                return None
            
            # Extract actionable tip text
            tip_text = self._extract_actionable_tip(content, location)
            if not tip_text:
                return None
            
            # Categorize the tip
            category = self._categorize_tip(tip_text, query)
            
            # Calculate quality score
            authenticity_score = self._calculate_authenticity_score(result, content)
            
            # Filter low-quality tips
            if authenticity_score < 0.3:
                return None
            
            return {
                "tip": tip_text,
                "location": location,
                "category": category,
                "source_url": url,
                "source_title": title,
                "authenticity_score": authenticity_score,
                "search_query": query,
                "discovered_at": datetime.now().isoformat(),
                "source_domain": self._extract_domain(url)
            }
            
        except Exception as e:
            logger.warning(f"Error extracting tip: {e}")
            return None
    
    def deduplicate_tips(self, tips: List[Dict]) -> List[Dict]:
        """
        Remove duplicate and similar tips.
        
        Args:
            tips: List of tip dictionaries
            
        Returns:
            List of unique tips
        """
        if not tips:
            return []
        
        # Sort by authenticity score (highest first)
        tips.sort(key=lambda x: x["authenticity_score"], reverse=True)
        
        unique_tips = []
        seen_content = set()
        
        for tip in tips:
            tip_lower = tip["tip"].lower()
            
            # Check for similarity with existing tips
            is_duplicate = False
            for seen in seen_content:
                if self._calculate_text_similarity(tip_lower, seen) > 0.7:
                    is_duplicate = True
                    break
            
            if not is_duplicate:
                unique_tips.append(tip)
                seen_content.add(tip_lower)
            
            # Limit total tips
            if len(unique_tips) >= 8:
                break
        
        return unique_tips
    
    # ========================================
    # PRIVATE EXTRACTION METHODS
    # ========================================
    
    def _extract_actionable_tip(self, content: str, location: str) -> Optional[str]:
        """Extract actionable insider tip from content"""
        
        # Insider knowledge patterns
        insider_patterns = [
            r"locals (know|go to|recommend|prefer|love|frequent)",
            r"hidden gem",
            r"secret spot",
            r"off the beaten path",
            r"insider tip",
            r"best kept secret",
            r"locals only",
            r"avoid the tourist",
            r"where locals",
            r"real \w+ experience"
        ]
        
        # Strong recommendation patterns
        strong_rec_patterns = [
            r"must (visit|try|go to)",
            r"definitely (visit|try|check out)",
            r"absolutely (love|recommend)",
            r"(amazing|incredible|fantastic|perfect) (spot|place|location)"
        ]
        
        # Split into sentences
        sentences = re.split(r'[.!?]+', content)
        
        for sentence in sentences:
            sentence = sentence.strip()
            
            # Validate sentence length
            if len(sentence) < 20 or len(sentence) > 200:
                continue
            
            sentence_lower = sentence.lower()
            location_lower = location.lower()
            
            # Must mention the location
            if not any(loc_part.lower() in sentence_lower for loc_part in location.split()):
                continue
            
            # Must match insider patterns
            if any(re.search(pattern, sentence_lower) for pattern in insider_patterns):
                return sentence
            
            # Or match strong recommendation patterns
            if any(re.search(pattern, sentence_lower) for pattern in strong_rec_patterns):
                return sentence
        
        return None
    
    def _categorize_tip(self, tip_text: str, query: str) -> str:
        """Categorize the insider tip by type"""
        
        tip_lower = tip_text.lower()
        query_lower = query.lower()
        
        # Category keywords mapping
        categories = {
            "coffee": ['coffee', 'cafe', 'espresso', 'brew'],
            "food": ['food', 'restaurant', 'eat', 'dining', 'cuisine'],
            "nature": ['park', 'nature', 'trail', 'garden', 'outdoor'],
            "nightlife": ['bar', 'drink', 'nightlife', 'cocktail', 'pub'],
            "culture": ['art', 'museum', 'gallery', 'culture', 'music'],
            "shopping": ['shop', 'shopping', 'boutique', 'market'],
            "scenic": ['view', 'scenic', 'photo', 'instagram']
        }
        
        # Check tip text first
        for category, keywords in categories.items():
            if any(word in tip_lower for word in keywords):
                return category
        
        # Fall back to query
        for category, keywords in categories.items():
            if any(word in query_lower for word in keywords):
                return category
        
        return "general"
    
    def _calculate_authenticity_score(self, result: Dict, content: str) -> float:
        """Calculate authenticity/quality score for the tip"""
        
        score = 0.5  # Base score
        
        # Source credibility
        url = result.get("url", "")
        
        trusted_domains = ["reddit.com", "yelp.com", "tripadvisor.com", "timeout.com"]
        local_domains = ["secretcity.com", "hiddengems.com", "atlasinsider.com"]
        
        if any(domain in url for domain in trusted_domains):
            score += 0.2
        if any(domain in url for domain in local_domains):
            score += 0.3
        
        # Content quality indicators
        content_lower = content.lower()
        
        # Positive indicators
        if "local" in content_lower:
            score += 0.1
        if any(word in content_lower for word in ["hidden", "secret", "gem", "insider"]):
            score += 0.1
        if re.search(r'\b(avoid|skip|tourist trap)\b', content_lower):
            score += 0.15
        
        # Specific details (addresses) indicate quality
        if re.search(r'\b\d+\s+\w+\s+(street|st|avenue|ave|road|rd)\b', content_lower):
            score += 0.1
        
        # Appropriate length
        if 50 <= len(content) <= 300:
            score += 0.1
        
        return min(score, 1.0)
    
    def _calculate_text_similarity(self, text1: str, text2: str) -> float:
        """Calculate similarity between two text strings"""
        
        words1 = set(text1.split())
        words2 = set(text2.split())
        
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        if not union:
            return 0.0
        
        return len(intersection) / len(union)
    
    def _extract_domain(self, url: str) -> str:
        """Extract domain from URL"""
        try:
            from urllib.parse import urlparse
            return urlparse(url).netloc.replace('www.', '')
        except:
            return "unknown"