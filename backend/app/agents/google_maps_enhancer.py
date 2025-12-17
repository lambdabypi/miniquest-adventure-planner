# backend/app/agents/google_maps_enhancer.py - Integrated with Enhanced Routing System
from typing import List, Optional, Dict
import googlemaps
from ..models import TavilyLocation, GoogleMapsLocation
from ..core.config import settings
import logging
import urllib.parse

logger = logging.getLogger(__name__)

class GoogleMapsEnhancer:
    """Enhanced with intelligent routing system integration"""
    
    def __init__(self):
        if settings.GOOGLE_MAPS_KEY:
            self.gmaps = googlemaps.Client(key=settings.GOOGLE_MAPS_KEY)
            self.enabled = True
            logger.info("✅ Google Maps enhancer enabled with routing intelligence")
        else:
            self.enabled = False
            logger.warning("⚠️ Google Maps API key not found - routing/photos disabled")
        
        # Initialize enhanced routing agent
        from .routing import EnhancedRoutingAgent
        self.routing_agent = EnhancedRoutingAgent()
    
    async def _get_place_details(self, place: Dict) -> Dict:
        """
        ✅ FIXED: Get detailed place information and check business status
        
        Filters out permanently/temporarily closed venues to avoid including
        them in adventures.
        """
        
        details_data = {
            'place_id': place.get('place_id'),
            'verified_address': place.get('formatted_address'),
            'lat': None,
            'lon': None,
            'rating': None,
            'photos': [],
            'reviews': [],
            'business_status': None,  # ✅ Track closure status
            'is_closed': False  # ✅ Flag for filtering
        }
        
        # Get coordinates from initial result
        if 'geometry' in place:
            location = place['geometry'].get('location', {})
            details_data['lat'] = location.get('lat')
            details_data['lon'] = location.get('lng')
        
        # Get additional details including business_status
        if details_data['place_id']:
            try:
                detailed_result = self.gmaps.place(
                    place_id=details_data['place_id'],
                    fields=['rating', 'photo', 'review', 'formatted_address', 'geometry', 'business_status']
                )
                
                place_details = detailed_result.get('result', {})
                
                # ✅ CHECK BUSINESS STATUS FIRST
                business_status = place_details.get('business_status')
                details_data['business_status'] = business_status
                
                # Filter out closed venues
                if business_status in ['CLOSED_PERMANENTLY', 'CLOSED_TEMPORARILY']:
                    logger.warning(f"⚠️ Venue is {business_status}: {place.get('name')}")
                    details_data['is_closed'] = True
                    # Return early - don't bother fetching other details
                    return details_data
                
                # Only fetch other details if venue is open
                details_data['rating'] = place_details.get('rating')
                details_data['photos'] = self._get_photo_urls(place_details.get('photos', []))
                details_data['reviews'] = self._format_reviews(place_details.get('reviews', []))
                
                # Update address with more detailed version if available
                if place_details.get('formatted_address'):
                    details_data['verified_address'] = place_details['formatted_address']
                
                # Update coordinates if more precise
                if place_details.get('geometry', {}).get('location'):
                    loc = place_details['geometry']['location']
                    details_data['lat'] = loc.get('lat')
                    details_data['lon'] = loc.get('lng')
                
            except Exception as e:
                logger.warning(f"Could not get detailed place info: {e}")
        
        return details_data

    async def enhance_locations(self, tavily_locations: List[TavilyLocation]) -> List[GoogleMapsLocation]:
        """
        ✅ FIXED: Enhance venues with Google Maps data and filter closed venues
        """
        
        enhanced_locations = []
        
        for tavily_loc in tavily_locations:
            if not self.enabled:
                enhanced_locations.append(self._create_basic_enhanced_location(tavily_loc))
                continue
                
            try:
                # Use improved Google search with multiple strategies
                google_data = await self._smart_google_search(tavily_loc)
                
                # ✅ SKIP CLOSED VENUES
                if google_data.get('is_closed'):
                    logger.warning(f"❌ Skipping closed venue: {tavily_loc.name}")
                    continue
                
                enhanced_loc = GoogleMapsLocation(
                    # Tavily data (primary)
                    name=tavily_loc.name,
                    description=tavily_loc.description,
                    tavily_url=tavily_loc.tavily_url,
                    research_score=tavily_loc.research_score,
                    address=google_data.get('verified_address') or self._create_fallback_address(tavily_loc),
                    
                    # Google Maps data (secondary)
                    place_id=google_data.get('place_id'),
                    lat=google_data.get('lat'),
                    lon=google_data.get('lon'),
                    rating=google_data.get('rating'),
                    photos=google_data.get('photos', []),
                    reviews=google_data.get('reviews', [])
                )
                
                enhanced_locations.append(enhanced_loc)
                logger.info(f"✅ Enhanced {tavily_loc.name}")
                logger.info(f"   Address: {enhanced_loc.address}")
                logger.info(f"   Coordinates: {enhanced_loc.lat}, {enhanced_loc.lon}")
                
            except Exception as e:
                logger.error(f"Error enhancing location {tavily_loc.name}: {e}")
                enhanced_locations.append(self._create_basic_enhanced_location(tavily_loc))
        
        return enhanced_locations
    
    async def generate_intelligent_route_map(
        self, 
        locations: List[GoogleMapsLocation], 
        user_address: Optional[str] = None,
        target_location: str = "Boston, MA",
        user_preferences: Dict = None
    ) -> Dict:
        """Generate intelligent routing using the Enhanced Routing Agent"""
        
        if not locations:
            return {"error": "No locations provided for routing"}
        
        logger.info(f"🗺️ Generating intelligent route for {len(locations)} locations")
        logger.info(f"   User address: {user_address}")
        logger.info(f"   Target location: {target_location}")
        
        try:
            # Convert GoogleMapsLocation objects to dictionaries
            location_dicts = []
            for loc in locations:
                if hasattr(loc, 'dict'):
                    location_dicts.append(loc.dict())
                elif isinstance(loc, dict):
                    location_dicts.append(loc)
                else:
                    # Manual conversion for GoogleMapsLocation objects
                    location_dict = {
                        "name": getattr(loc, 'name', 'Unknown'),
                        "address": getattr(loc, 'address', ''),
                        "lat": getattr(loc, 'lat', None),
                        "lon": getattr(loc, 'lon', None),
                        "place_id": getattr(loc, 'place_id', None),
                        "rating": getattr(loc, 'rating', None)
                    }
                    location_dicts.append(location_dict)
            
            # Use enhanced routing agent for intelligent analysis
            routing_result = await self.routing_agent.generate_intelligent_route(
                locations=location_dicts,
                user_address=user_address,
                target_location=target_location,
                user_preferences=user_preferences or {}
            )
            
            # Research transit options if needed for cross-city travel
            if routing_result.get("requires_transit_research"):
                logger.info("🚌 Researching transit options via Tavily...")
                routing_context = routing_result.get("routing_context", {})
                
                try:
                    transit_info = await self.routing_agent.research_transit_options(
                        routing_context, 
                        user_preferences or {}
                    )
                    routing_result["transit_research"] = transit_info
                    
                    if transit_info.get("transit_research_available"):
                        logger.info(f"✅ Found {len(transit_info.get('transit_options', []))} transit options")
                    else:
                        logger.warning("⚠️ Transit research failed")
                        
                except Exception as e:
                    logger.error(f"Transit research error: {e}")
                    routing_result["transit_research"] = {
                        "transit_research_available": False,
                        "error": str(e)
                    }
            
            # Add legacy map_url for backward compatibility
            primary_url = routing_result.get("routing_options", {}).get("primary_url")
            if primary_url:
                routing_result["map_url"] = primary_url
            
            logger.info(f"✅ Intelligent routing complete")
            logger.info(f"   Primary mode: {routing_result.get('recommended_travel_mode', 'unknown')}")
            logger.info(f"   Cross-city: {routing_result.get('routing_context', {}).get('is_cross_city', False)}")
            logger.info(f"   Travel options: {len(routing_result.get('routing_options', {}).get('options', []))}")
            
            return routing_result
            
        except Exception as e:
            logger.error(f"Intelligent routing generation error: {e}")
            
            # Fallback to basic routing
            logger.info("🔄 Falling back to basic routing...")
            fallback_url = self._generate_basic_fallback_route(locations, user_address)
            
            return {
                "error": f"Intelligent routing failed: {str(e)}",
                "fallback_route": True,
                "map_url": fallback_url,
                "routing_options": {
                    "primary_url": fallback_url,
                    "recommended_mode": "walking",
                    "options": [
                        {
                            "mode": "walking",
                            "url": fallback_url,
                            "description": "Basic walking directions",
                            "recommended": True
                        }
                    ]
                }
            }
    
    def _generate_basic_fallback_route(
        self, 
        locations: List[GoogleMapsLocation], 
        user_address: Optional[str]
    ) -> Optional[str]:
        """Generate basic fallback route using original logic"""
        
        try:
            logger.info("🔄 Generating basic fallback route...")
            
            # Collect valid addresses
            location_addresses = []
            location_names = []
            
            for loc in locations:
                address = getattr(loc, 'address', None)
                name = getattr(loc, 'name', 'Unknown')
                
                if address and self._is_valid_address(address):
                    clean_address = self._clean_address_for_routing(address)
                    if clean_address:
                        location_addresses.append(clean_address)
                        location_names.append(name)
            
            if not location_addresses:
                logger.warning("No valid addresses for fallback routing")
                return None
            
            # Build basic route
            return self._build_basic_route_url(location_addresses, user_address)
            
        except Exception as e:
            logger.error(f"Fallback routing error: {e}")
            return None
    
    # DEPRECATED: Legacy method - kept for backward compatibility
    def generate_route_map(self, locations: List[GoogleMapsLocation], user_address: Optional[str] = None) -> Optional[str]:
        """DEPRECATED: Use generate_intelligent_route_map instead"""
        
        logger.warning("⚠️ Using deprecated generate_route_map - consider upgrading to generate_intelligent_route_map")
        
        try:
            # Use basic fallback routing for legacy support
            return self._generate_basic_fallback_route(locations, user_address)
        except Exception as e:
            logger.error(f"Legacy routing error: {e}")
            return None
    
    # Enhanced Google Places Search
    async def _smart_google_search(self, tavily_loc: TavilyLocation) -> Dict:
        """
        ✅ FIXED: Use multiple search strategies and filter closed venues
        """
        
        google_data = {
            'place_id': None,
            'lat': None,
            'lon': None,
            'rating': None,
            'photos': [],
            'reviews': [],
            'verified_address': None,
            'search_success': False,
            'business_status': None,
            'is_closed': False
        }
        
        venue_name = tavily_loc.name
        
        # Build search strategies with location context
        search_queries = self._build_location_aware_search_strategies(tavily_loc)
        
        for i, (query, strategy) in enumerate(search_queries):
            try:
                logger.info(f"🔍 Google search strategy {i+1}: '{query}' ({strategy})")
                
                # Search Google Places
                places_result = self.gmaps.places(
                    query=query,
                    type='establishment'
                )
                
                if places_result.get('results'):
                    # Evaluate search results (filters closed venues)
                    best_match = self._evaluate_search_results(
                        places_result['results'], 
                        venue_name,
                        strategy
                    )
                    
                    if best_match:
                        # Get detailed information (double-checks closure status)
                        enhanced_data = await self._get_place_details(best_match)
                        
                        # ✅ REJECT if closed
                        if enhanced_data.get('is_closed'):
                            logger.warning(f"❌ Rejecting closed venue via {strategy}")
                            continue
                        
                        if enhanced_data.get('verified_address'):
                            google_data.update(enhanced_data)
                            google_data['search_success'] = True
                            google_data['successful_strategy'] = strategy
                            logger.info(f"✅ Found via {strategy}: {enhanced_data['verified_address']}")
                            break
                        else:
                            logger.warning(f"No address from strategy {strategy}")
                    else:
                        logger.warning(f"No good matches from strategy {strategy}")
                else:
                    logger.warning(f"No results from strategy {strategy}")
                    
            except Exception as e:
                logger.warning(f"Search strategy {strategy} failed: {e}")
                continue
        
        if not google_data['search_success']:
            logger.warning(f"All Google search strategies failed for {venue_name}")
        
        return google_data
    
    def _build_location_aware_search_strategies(self, tavily_loc: TavilyLocation) -> List[tuple]:
        """Build location-aware search strategies"""
        
        venue_name = tavily_loc.name
        strategies = []
        
        # Strategy 1: Enhanced search query with location context
        if hasattr(tavily_loc, 'enhanced_search_query') and tavily_loc.enhanced_search_query:
            strategies.append((tavily_loc.enhanced_search_query, "enhanced_context"))
        
        # Strategy 2: Address hint with target location
        if hasattr(tavily_loc, 'address_hint') and tavily_loc.address_hint:
            target_location = getattr(tavily_loc, 'target_location', 'Boston')
            city_name = self._extract_city_from_location(target_location)
            query = f"{venue_name} {tavily_loc.address_hint} {city_name}"
            strategies.append((query, "address_hint"))
        
        # Strategy 3: Neighborhood context with target location
        if hasattr(tavily_loc, 'neighborhood') and tavily_loc.neighborhood:
            target_location = getattr(tavily_loc, 'target_location', 'Boston')
            city_name = self._extract_city_from_location(target_location)
            query = f"{venue_name} {tavily_loc.neighborhood} {city_name}"
            strategies.append((query, "neighborhood_context"))
        
        # Strategy 4: Venue name + target location
        target_location = getattr(tavily_loc, 'target_location', 'Boston, MA')
        city_name = self._extract_city_from_location(target_location)
        strategies.append((f"{venue_name} {city_name}", "basic_city"))
        
        # Strategy 5: Just venue name (last resort)
        strategies.append((venue_name, "name_only"))
        
        return strategies
    
    def _extract_city_from_location(self, location: str) -> str:
        """Extract city name from location string"""
        if ',' in location:
            return location.split(',')[0].strip()
        return location.strip()
    
    def _evaluate_search_results(self, results: List[Dict], target_name: str, strategy: str) -> Optional[Dict]:
        """
        ✅ FIXED: Evaluate search results and filter out closed venues
        
        Checks business_status early to avoid wasting time on closed venues.
        """
        
        if not results:
            return None
        
        # Score each result
        scored_results = []
        
        for result in results:
            # ✅ EARLY FILTER: Skip closed venues immediately
            business_status = result.get('business_status')
            if business_status in ['CLOSED_PERMANENTLY', 'CLOSED_TEMPORARILY']:
                logger.warning(f"⚠️ Skipping closed venue: {result.get('name')} ({business_status})")
                continue
            
            score = self._calculate_match_score(result, target_name)
            if score > 0.3:  # Minimum threshold
                scored_results.append((result, score))
        
        if not scored_results:
            logger.warning(f"No open venues above threshold for '{target_name}' via {strategy}")
            return None
        
        # Sort by score and return best match
        scored_results.sort(key=lambda x: x[1], reverse=True)
        best_result, best_score = scored_results[0]
        
        logger.info(f"Best match: '{best_result.get('name')}' (score: {best_score:.2f}, status: {best_result.get('business_status', 'OPERATIONAL')})")
        return best_result
    
    def _calculate_match_score(self, result: Dict, target_name: str) -> float:
        """Calculate how well a search result matches the target venue"""
        
        result_name = result.get('name', '').lower()
        target_lower = target_name.lower()
        
        score = 0.0
        
        # Exact match gets highest score
        if result_name == target_lower:
            score += 1.0
        # Substring matches
        elif target_lower in result_name:
            score += 0.8
        elif result_name in target_lower:
            score += 0.7
        else:
            # Check individual words
            target_words = set(target_lower.split())
            result_words = set(result_name.split())
            
            if target_words and result_words:
                word_overlap = len(target_words.intersection(result_words)) / len(target_words.union(result_words))
                score += word_overlap * 0.6
        
        # Bonus for having complete address
        if result.get('formatted_address'):
            score += 0.1
        
        # Bonus for having rating (indicates active business)
        if result.get('rating'):
            score += 0.1
        
        # Penalty for generic business types that might be false positives
        business_types = result.get('types', [])
        if 'establishment' in business_types and len(business_types) == 1:
            score -= 0.2  # Too generic
        
        return max(score, 0.0)
    
    # Helper methods for basic routing (fallback)
    def _build_basic_route_url(self, addresses: List[str], user_address: Optional[str]) -> Optional[str]:
        """Build basic Google Maps route URL"""
        
        if not addresses:
            return None
        
        # Determine origin
        if user_address and self._is_valid_address(user_address):
            origin = self._clean_address_for_routing(user_address)
            destinations = addresses
        else:
            origin = addresses[0]
            destinations = addresses[1:] if len(addresses) > 1 else []
        
        if not destinations:
            # Single location - just show directions to it
            return self._build_simple_route(origin, origin)
        
        # Multi-stop route
        final_destination = destinations[-1]
        waypoints = destinations[:-1] if len(destinations) > 1 else []
        
        return self._build_multi_stop_route(origin, final_destination, waypoints)
    
    def _build_simple_route(self, origin: str, destination: str) -> str:
        """Build simple route URL"""
        encoded_origin = urllib.parse.quote(origin)
        encoded_dest = urllib.parse.quote(destination)
        
        return (f"https://www.google.com/maps/dir/?api=1"
                f"&origin={encoded_origin}"
                f"&destination={encoded_dest}"
                f"&travelmode=walking")
    
    def _build_multi_stop_route(self, origin: str, destination: str, waypoints: List[str]) -> str:
        """Build multi-stop route URL"""
        encoded_origin = urllib.parse.quote(origin)
        encoded_dest = urllib.parse.quote(destination)
        
        if waypoints:
            # Limit to Google's maximum
            if len(waypoints) > 9:
                waypoints = waypoints[:9]
                logger.warning(f"Truncated waypoints to 9")
            
            encoded_waypoints = [urllib.parse.quote(wp) for wp in waypoints]
            waypoints_param = "&waypoints=" + "|".join(encoded_waypoints)
        else:
            waypoints_param = ""
        
        return (f"https://www.google.com/maps/dir/?api=1"
                f"&origin={encoded_origin}"
                f"&destination={encoded_dest}"
                f"{waypoints_param}"
                f"&travelmode=walking")
    
    def _is_valid_address(self, address: str) -> bool:
        """Check if address is valid for routing"""
        if not address or len(address.strip()) < 10:
            return False
        
        # Should contain geographic indicators
        geographic_terms = [
            'street', 'st', 'avenue', 'ave', 'road', 'rd', 'drive', 'dr',
            'boulevard', 'blvd', 'place', 'pl', 'way', 'lane', 'ln'
        ]
        
        address_lower = address.lower()
        return any(term in address_lower for term in geographic_terms)
    
    def _clean_address_for_routing(self, address: str) -> Optional[str]:
        """Clean address for optimal routing"""
        if not address:
            return None
        
        # Remove common problematic characters
        clean = address.strip().replace('"', '').replace("'", '')
        
        return clean
    
    def _create_basic_enhanced_location(self, tavily_loc: TavilyLocation) -> GoogleMapsLocation:
        """Create enhanced location without Google Maps data"""
        
        return GoogleMapsLocation(
            name=tavily_loc.name,
            description=tavily_loc.description,
            tavily_url=tavily_loc.tavily_url,
            research_score=tavily_loc.research_score,
            place_id=None,
            address=self._create_fallback_address(tavily_loc),
            lat=None,
            lon=None,
            rating=None,
            photos=[],
            reviews=[]
        )
    
    def _create_fallback_address(self, tavily_loc: TavilyLocation) -> str:
        """Create fallback address when Google search fails"""
        
        # Use venue scout address hint if available
        if hasattr(tavily_loc, 'address_hint') and tavily_loc.address_hint:
            address_hint = tavily_loc.address_hint
            if hasattr(tavily_loc, 'neighborhood') and tavily_loc.neighborhood:
                target_location = getattr(tavily_loc, 'target_location', 'Boston, MA')
                city_name = self._extract_city_from_location(target_location)
                return f"{address_hint}, {tavily_loc.neighborhood}, {city_name}"
            else:
                target_location = getattr(tavily_loc, 'target_location', 'Boston, MA')
                return f"{address_hint}, {target_location}"
        
        # Use neighborhood if available
        if hasattr(tavily_loc, 'neighborhood') and tavily_loc.neighborhood:
            target_location = getattr(tavily_loc, 'target_location', 'Boston, MA')
            city_name = self._extract_city_from_location(target_location)
            return f"{tavily_loc.name}, {tavily_loc.neighborhood}, {city_name}"
        
        # Final fallback with location awareness
        target_location = getattr(tavily_loc, 'target_location', 'Boston, MA')
        return f"{tavily_loc.name}, {target_location}"
    
    def _get_photo_urls(self, photos: List[Dict]) -> List[str]:
        """Get photo URLs from Google Places"""
        if not self.enabled or not photos:
            return []
        
        urls = []
        for photo in photos[:3]:
            try:
                photo_ref = photo.get('photo_reference')
                if photo_ref:
                    url = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference={photo_ref}&key={settings.GOOGLE_MAPS_KEY}"
                    urls.append(url)
            except:
                continue
        
        return urls
    
    def _format_reviews(self, reviews: List[Dict]) -> List[Dict]:
        """Format Google reviews for frontend"""
        if not reviews:
            return []
            
        formatted_reviews = []
        for review in reviews[:3]:
            formatted_reviews.append({
                'author': review.get('author_name', 'Anonymous'),
                'rating': review.get('rating', 0),
                'text': review.get('text', '')[:200],
                'time': review.get('relative_time_description', 'Recently')
            })
        
        return formatted_reviews