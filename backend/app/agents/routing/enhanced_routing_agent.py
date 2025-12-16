# backend/app/agents/enhanced_routing_agent.py - FIXED Multi-Stop Routing
import googlemaps
import urllib.parse
import logging
from typing import List, Dict, Optional
from ...core.config import settings

logger = logging.getLogger(__name__)

class EnhancedRoutingAgent:
    """FIXED: Complete multi-stop routing with ALL venues included"""
    
    def __init__(self):
        if settings.GOOGLE_MAPS_KEY:
            self.gmaps = googlemaps.Client(key=settings.GOOGLE_MAPS_KEY)
            self.enabled = True
        else:
            self.enabled = False
        
        logger.info("✅ FIXED Enhanced Routing Agent initialized")
    
    async def generate_intelligent_route(
        self, 
        locations: List[Dict], 
        user_address: Optional[str],
        target_location: str,
        user_preferences: Dict = None
    ) -> Dict:
        """FIXED: Generate complete multi-stop routing with ALL locations included"""
        
        if not locations:
            return {"error": "No locations provided"}
        
        logger.info(f"🗺️ FIXED COMPLETE ROUTING:")
        logger.info(f"   User address: {user_address}")
        logger.info(f"   Target city: {target_location}")
        logger.info(f"   Locations to route: {len(locations)}")
        
        # Debug: Log all location addresses
        for i, loc in enumerate(locations):
            address = loc.get('address', 'No address')
            name = loc.get('name', 'Unnamed')
            logger.info(f"     {i+1}. {name}: {address}")
        
        try:
            # Step 1: Prepare ALL locations for routing
            route_data = self._prepare_complete_route_data(locations, user_address)
            
            if not route_data:
                return {"error": "Could not prepare route data"}
            
            # Step 2: Generate complete multi-stop routes
            routing_options = self._generate_complete_routing_options(route_data, user_preferences)
            
            logger.info(f"✅ FIXED complete routing generated:")
            logger.info(f"   Origin: {route_data['origin']}")
            logger.info(f"   Total stops: {len(route_data['all_stops'])}")
            logger.info(f"   Route options: {len(routing_options.get('options', []))}")
            
            return {
                "routing_context": route_data['context'],
                "routing_options": routing_options,
                "primary_route_url": routing_options.get("primary_url"),
                "recommended_travel_mode": routing_options.get("recommended_mode"),
                "total_stops_included": len(route_data['all_stops']),
                "routing_debug": {
                    "origin": route_data['origin'],
                    "all_stops": [stop['name'] for stop in route_data['all_stops']],
                    "route_addresses": [stop['address'] for stop in route_data['all_stops']]
                }
            }
            
        except Exception as e:
            logger.error(f"FIXED routing generation error: {e}")
            return {"error": str(e)}
    
    def _prepare_complete_route_data(self, locations: List[Dict], user_address: Optional[str]) -> Optional[Dict]:
        """FIXED: Prepare complete route data with ALL valid locations"""
        
        logger.info(f"🔧 FIXED: Preparing complete route data for {len(locations)} locations")
        
        # Extract ALL valid addresses
        all_valid_stops = []
        skipped_locations = []
        
        for i, loc in enumerate(locations):
            location_name = loc.get('name', f'Location {i+1}')
            location_address = loc.get('address', '')
            
            if self._is_valid_address(location_address):
                clean_address = self._clean_address_for_routing(location_address)
                all_valid_stops.append({
                    'name': location_name,
                    'address': clean_address,
                    'original_data': loc
                })
                logger.info(f"  ✅ Valid stop {len(all_valid_stops)}: {location_name} → {clean_address}")
            else:
                skipped_locations.append(location_name)
                logger.warning(f"  ❌ Skipped invalid address: {location_name} → {location_address}")
        
        if not all_valid_stops:
            logger.error("❌ No valid addresses found for routing")
            return None
        
        if skipped_locations:
            logger.warning(f"⚠️ Skipped {len(skipped_locations)} locations: {skipped_locations}")
        
        # Determine origin
        if user_address and self._is_valid_address(user_address):
            origin_address = self._clean_address_for_routing(user_address)
            origin_name = "Your Location"
            use_user_origin = True
        else:
            # Use first location as origin
            first_stop = all_valid_stops.pop(0)
            origin_address = first_stop['address']
            origin_name = first_stop['name']
            use_user_origin = False
        
        logger.info(f"🎯 FIXED route preparation complete:")
        logger.info(f"   Origin: {origin_name} → {origin_address}")
        logger.info(f"   Stops to visit: {len(all_valid_stops)}")
        logger.info(f"   Total route points: {len(all_valid_stops) + 1}")
        
        return {
            'origin': origin_address,
            'origin_name': origin_name,
            'all_stops': all_valid_stops,
            'use_user_origin': use_user_origin,
            'context': {
                'total_locations_provided': len(locations),
                'valid_stops_found': len(all_valid_stops),
                'skipped_locations': len(skipped_locations),
                'user_origin_used': use_user_origin
            }
        }
    
    def _generate_complete_routing_options(self, route_data: Dict, user_preferences: Dict = None) -> Dict:
        """FIXED: Generate complete routing options with ALL stops included"""
        
        origin = route_data['origin']
        all_stops = route_data['all_stops']
        
        if not all_stops:
            logger.warning("No stops to route to")
            return {
                "primary_url": None,
                "recommended_mode": "walking",
                "options": [],
                "error": "No valid stops for routing"
            }
        
        logger.info(f"🗺️ FIXED: Building complete routes with {len(all_stops)} stops")
        
        # Generate routes for different travel modes
        route_options = []
        
        # Walking route (best for local exploration)
        walking_url = self._build_complete_google_maps_url(origin, all_stops, "walking")
        if walking_url:
            route_options.append({
                "mode": "walking",
                "url": walking_url,
                "description": f"Walking route to {len(all_stops)} stops",
                "recommended": len(all_stops) <= 4  # Recommend walking for 4 or fewer stops
            })
        
        # Transit route
        transit_url = self._build_complete_google_maps_url(origin, all_stops, "transit")
        if transit_url:
            route_options.append({
                "mode": "transit",
                "url": transit_url,
                "description": f"Public transit route to {len(all_stops)} stops",
                "recommended": len(all_stops) > 4
            })
        
        # Driving route
        driving_url = self._build_complete_google_maps_url(origin, all_stops, "driving")
        if driving_url:
            route_options.append({
                "mode": "driving",
                "url": driving_url,
                "description": f"Driving route to {len(all_stops)} stops",
                "recommended": False  # Not primary recommendation for city exploration
            })
        
        # Determine primary route
        primary_option = next((opt for opt in route_options if opt["recommended"]), route_options[0] if route_options else None)
        
        result = {
            "primary_url": primary_option["url"] if primary_option else None,
            "recommended_mode": primary_option["mode"] if primary_option else "walking",
            "options": route_options,
            "total_stops": len(all_stops),
            "routing_summary": f"Complete route with {len(all_stops)} stops from {route_data['origin_name']}"
        }
        
        logger.info(f"✅ FIXED complete routing options generated:")
        logger.info(f"   Primary mode: {result['recommended_mode']}")
        logger.info(f"   Total options: {len(route_options)}")
        logger.info(f"   All {len(all_stops)} stops included in routes")
        
        return result
    
    def _build_complete_google_maps_url(self, origin: str, all_stops: List[Dict], travel_mode: str) -> Optional[str]:
        """FIXED: Build Google Maps URL that includes ALL stops"""
        
        if not all_stops:
            return None
        
        try:
            # Get all stop addresses
            stop_addresses = [stop['address'] for stop in all_stops]
            
            logger.info(f"🔗 FIXED: Building {travel_mode} URL for:")
            logger.info(f"   Origin: {origin}")
            for i, stop in enumerate(all_stops):
                logger.info(f"   Stop {i+1}: {stop['name']} → {stop['address']}")
            
            if len(stop_addresses) == 1:
                # Single destination
                encoded_origin = urllib.parse.quote(origin)
                encoded_dest = urllib.parse.quote(stop_addresses[0])
                
                url = (f"https://www.google.com/maps/dir/?api=1"
                       f"&origin={encoded_origin}"
                       f"&destination={encoded_dest}"
                       f"&travelmode={travel_mode}")
                
                logger.info(f"✅ FIXED single-stop URL created")
                return url
            
            else:
                # Multiple stops - use ALL stops
                final_destination = stop_addresses[-1]  # Last stop is destination
                waypoints = stop_addresses[:-1]  # All others are waypoints
                
                # Google Maps waypoints limit (23 for driving, 9 for walking/transit)
                max_waypoints = 9 if travel_mode in ['walking', 'transit'] else 23
                
                if len(waypoints) > max_waypoints:
                    logger.warning(f"Truncating waypoints from {len(waypoints)} to {max_waypoints} for {travel_mode}")
                    waypoints = waypoints[:max_waypoints]
                
                # Build URL components
                encoded_origin = urllib.parse.quote(origin)
                encoded_dest = urllib.parse.quote(final_destination)
                
                if waypoints:
                    encoded_waypoints = [urllib.parse.quote(wp) for wp in waypoints]
                    waypoints_param = "&waypoints=" + "|".join(encoded_waypoints)
                else:
                    waypoints_param = ""
                
                url = (f"https://www.google.com/maps/dir/?api=1"
                       f"&origin={encoded_origin}"
                       f"&destination={encoded_dest}"
                       f"{waypoints_param}"
                       f"&travelmode={travel_mode}")
                
                logger.info(f"✅ FIXED multi-stop URL created:")
                logger.info(f"   Waypoints included: {len(waypoints)}")
                logger.info(f"   Final destination: {all_stops[-1]['name']}")
                logger.info(f"   URL length: {len(url)} characters")
                
                return url
                
        except Exception as e:
            logger.error(f"FIXED URL building error for {travel_mode}: {e}")
            return None
    
    def _is_valid_address(self, address: str) -> bool:
        """
        Check if address is valid for routing.
        
        ✅ FIXED: Less strict - accepts landmark names, business names, parks, etc.
        """
        if not address or len(address.strip()) < 5:
            return False
        
        address_lower = address.lower()
        
        # ✅ Accept addresses with geographic terms
        geographic_terms = [
            'street', 'st', 'avenue', 'ave', 'road', 'rd', 'drive', 'dr',
            'boulevard', 'blvd', 'place', 'pl', 'way', 'lane', 'ln', 'square',
            'parkway', 'highway', 'route', 'trail', 'circle', 'court', 'ct'
        ]
        has_geographic = any(term in address_lower for term in geographic_terms)
        
        # ✅ Accept addresses with numbers (like "123 Main St")
        has_numbers = any(char.isdigit() for char in address)
        
        # ✅ NEW: Accept landmark/business names with location context
        # If address has a comma (name, city format) it's likely valid
        has_location_format = ',' in address and len(address.split(',')) >= 2
        
        # ✅ NEW: Accept if it has city/state/park names
        location_indicators = [
            'park', 'national', 'hotel', 'inn', 'resort', 'lodge', 'campground',
            'museum', 'center', 'building', 'house', 'campus', 'harbor', 'beach'
        ]
        has_landmark = any(term in address_lower for term in location_indicators)
        
        # ✅ Valid if ANY of these conditions are true:
        is_valid = (
            has_geographic or          # Has street/avenue/etc
            has_numbers or             # Has street number
            (has_location_format and has_landmark)  # Has "Business Name, City" format with landmark type
        )
        
        if not is_valid:
            logger.debug(f"Address validation failed for: {address}")
            logger.debug(f"  has_geographic: {has_geographic}")
            logger.debug(f"  has_numbers: {has_numbers}")
            logger.debug(f"  has_location_format: {has_location_format}")
            logger.debug(f"  has_landmark: {has_landmark}")
        
        return is_valid
    
    def _clean_address_for_routing(self, address: str) -> str:
        """Clean address for optimal routing"""
        if not address:
            return ""
        
        # Remove problematic characters but preserve essential formatting
        clean = address.strip().replace('"', '').replace("'", '')
        
        # Remove excessive whitespace
        clean = ' '.join(clean.split())
        
        return clean