#!/usr/bin/env python3
"""
Google Maps API Service
Provides geocoding, routing, and ETA calculations using Google Maps APIs
"""

import os
import asyncio
import aiohttp
import json
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from datetime import datetime, timedelta

# Google Maps API configuration
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "AIzaSyDbE_tFwdDaYPVTw1b_PemueJ3FB1TIuOY")
GOOGLE_MAPS_BASE_URL = "https://maps.googleapis.com/maps/api"

@dataclass
class Coordinates:
    """Represents latitude and longitude coordinates"""
    lat: float
    lng: float

@dataclass
class Address:
    """Represents a formatted address with coordinates"""
    formatted_address: str
    coordinates: Coordinates
    place_id: Optional[str] = None
    components: Optional[Dict[str, Any]] = None

@dataclass
class Route:
    """Represents a route between two points"""
    origin: Coordinates
    destination: Coordinates
    distance_km: float
    duration_minutes: int
    polyline: str
    steps: List[Dict[str, Any]]
    warnings: List[str]

@dataclass
class ETA:
    """Represents estimated time of arrival"""
    order_id: str
    current_location: Coordinates
    destination: Coordinates
    eta_minutes: int
    distance_km: float
    traffic_conditions: str
    last_updated: datetime

class GoogleMapsService:
    """Service for interacting with Google Maps APIs"""
    
    def __init__(self, api_key: str = GOOGLE_MAPS_API_KEY):
        self.api_key = api_key
        self.base_url = GOOGLE_MAPS_BASE_URL
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    async def _make_request(self, endpoint: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Make a request to Google Maps API"""
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        url = f"{self.base_url}/{endpoint}"
        params['key'] = self.api_key
        
        try:
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get('status') == 'OK':
                        return data
                    else:
                        raise Exception(f"Google Maps API error: {data.get('error_message', 'Unknown error')}")
                else:
                    raise Exception(f"HTTP error: {response.status}")
        except Exception as e:
            print(f"Google Maps API request failed: {e}")
            raise
    
    async def geocode_address(self, address: str) -> Optional[Address]:
        """Convert address to coordinates"""
        try:
            data = await self._make_request('geocode/json', {
                'address': address,
                'region': 'in'  # Restrict to India
            })
            
            if data.get('results'):
                result = data['results'][0]
                location = result['geometry']['location']
                
                return Address(
                    formatted_address=result['formatted_address'],
                    coordinates=Coordinates(
                        lat=location['lat'],
                        lng=location['lng']
                    ),
                    place_id=result.get('place_id'),
                    components=result.get('address_components')
                )
        except Exception as e:
            print(f"Geocoding failed for address '{address}': {e}")
            return None
    
    async def reverse_geocode(self, lat: float, lng: float) -> Optional[Address]:
        """Convert coordinates to address"""
        try:
            data = await self._make_request('geocode/json', {
                'latlng': f"{lat},{lng}",
                'region': 'in'
            })
            
            if data.get('results'):
                result = data['results'][0]
                location = result['geometry']['location']
                
                return Address(
                    formatted_address=result['formatted_address'],
                    coordinates=Coordinates(
                        lat=location['lat'],
                        lng=location['lng']
                    ),
                    place_id=result.get('place_id'),
                    components=result.get('address_components')
                )
        except Exception as e:
            print(f"Reverse geocoding failed for coordinates ({lat}, {lng}): {e}")
            return None
    
    async def calculate_route(
        self, 
        origin: Coordinates, 
        destination: Coordinates,
        waypoints: Optional[List[Coordinates]] = None,
        optimize_waypoints: bool = True
    ) -> Optional[Route]:
        """Calculate route between origin and destination"""
        try:
            params = {
                'origin': f"{origin.lat},{origin.lng}",
                'destination': f"{destination.lat},{destination.lng}",
                'mode': 'driving',
                'avoid': 'tolls',
                'units': 'metric'
            }
            
            if waypoints:
                waypoint_str = '|'.join([f"{wp.lat},{wp.lng}" for wp in waypoints])
                params['waypoints'] = f"optimize:{optimize_waypoints}|{waypoint_str}"
            
            data = await self._make_request('directions/json', params)
            
            if data.get('routes'):
                route = data['routes'][0]
                leg = route['legs'][0]
                
                return Route(
                    origin=origin,
                    destination=destination,
                    distance_km=leg['distance']['value'] / 1000,
                    duration_minutes=leg['duration']['value'] // 60,
                    polyline=route['overview_polyline']['points'],
                    steps=leg['steps'],
                    warnings=route.get('warnings', [])
                )
        except Exception as e:
            print(f"Route calculation failed: {e}")
            return None
    
    async def calculate_eta(
        self, 
        order_id: str,
        current_location: Coordinates, 
        destination: Coordinates
    ) -> Optional[ETA]:
        """Calculate ETA for delivery"""
        try:
            # Use Distance Matrix API for more accurate ETA
            data = await self._make_request('distancematrix/json', {
                'origins': f"{current_location.lat},{current_location.lng}",
                'destinations': f"{destination.lat},{destination.lng}",
                'mode': 'driving',
                'avoid': 'tolls',
                'units': 'metric',
                'traffic_model': 'best_guess',
                'departure_time': 'now'
            })
            
            if data.get('rows') and data['rows'][0].get('elements'):
                element = data['rows'][0]['elements'][0]
                
                if element['status'] == 'OK':
                    distance_km = element['distance']['value'] / 1000
                    duration_seconds = element['duration_in_traffic']['value'] if 'duration_in_traffic' in element else element['duration']['value']
                    eta_minutes = duration_seconds // 60
                    
                    return ETA(
                        order_id=order_id,
                        current_location=current_location,
                        destination=destination,
                        eta_minutes=eta_minutes,
                        distance_km=distance_km,
                        traffic_conditions='normal',  # Could be enhanced with traffic data
                        last_updated=datetime.now()
                    )
        except Exception as e:
            print(f"ETA calculation failed: {e}")
            return None
    
    async def optimize_delivery_route(
        self, 
        kitchen_location: Coordinates,
        delivery_locations: List[Tuple[str, Coordinates]],
        priority_order: Optional[List[str]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Optimize delivery route for multiple stops using Google Directions API
        
        Returns:
            Dict with:
            - optimized_order: List of (order_id, coordinates) in optimized sequence
            - route_data: Full route information with legs
            - total_distance_km: Total distance
            - total_duration_minutes: Total duration
            - polyline: Encoded polyline string
        """
        try:
            if len(delivery_locations) <= 1:
                # Single or no deliveries - return as is
                if not delivery_locations:
                    return None
                route = await self.calculate_route(
                    origin=kitchen_location,
                    destination=delivery_locations[0][1]
                )
                if route:
                    return {
                        "optimized_order": delivery_locations,
                        "route_data": route,
                        "total_distance_km": route.distance_km,
                        "total_duration_minutes": route.duration_minutes,
                        "polyline": route.polyline
                    }
                return None
            
            # Multiple deliveries - use waypoint optimization
            waypoints = [loc[1] for loc in delivery_locations]
            destination = waypoints[-1]  # Last delivery as destination
            waypoints_to_optimize = waypoints[:-1]  # All except last as waypoints
            
            # Build waypoint string with optimization
            if priority_order:
                # If priority order specified, respect it but still allow optimization
                waypoint_order = []
                for priority_id in priority_order:
                    for idx, (loc_id, _) in enumerate(delivery_locations):
                        if loc_id == priority_id:
                            waypoint_order.append(idx)
                            break
                # Use priority order for waypoints
                waypoint_str = '|'.join([f"{waypoints[i].lat},{waypoints[i].lng}" for i in waypoint_order])
                params = {
                    'origin': f"{kitchen_location.lat},{kitchen_location.lng}",
                    'destination': f"{destination.lat},{destination.lng}",
                    'waypoints': waypoint_str,  # No optimization if priority specified
                    'mode': 'driving',
                    'avoid': 'tolls',
                    'units': 'metric'
                }
            else:
                # Full optimization
                waypoint_str = '|'.join([f"{wp.lat},{wp.lng}" for wp in waypoints_to_optimize])
                params = {
                    'origin': f"{kitchen_location.lat},{kitchen_location.lng}",
                    'destination': f"{destination.lat},{destination.lng}",
                    'waypoints': f"optimize:true|{waypoint_str}",
                    'mode': 'driving',
                    'avoid': 'tolls',
                    'units': 'metric',
                    'traffic_model': 'best_guess',
                    'departure_time': 'now'
                }
            
            data = await self._make_request('directions/json', params)
            
            if not data.get('routes'):
                return None
            
            route = data['routes'][0]
            legs = route['legs']
            
            # Get optimized waypoint order
            waypoint_order = route.get('waypoint_order', list(range(len(waypoints_to_optimize))))
            
            # Build optimized sequence
            optimized_order = []
            total_distance = 0
            total_duration = 0
            
            # First leg: origin to first waypoint
            if legs:
                first_leg = legs[0]
                first_waypoint_idx = waypoint_order[0] if waypoint_order else 0
                optimized_order.append({
                    "order_id": delivery_locations[first_waypoint_idx][0],
                    "coordinates": delivery_locations[first_waypoint_idx][1],
                    "leg_index": 0,
                    "distance_km": first_leg['distance']['value'] / 1000,
                    "duration_minutes": first_leg['duration']['value'] // 60
                })
                total_distance += first_leg['distance']['value'] / 1000
                total_duration += first_leg['duration']['value'] // 60
            
            # Intermediate waypoints
            for i in range(1, len(legs)):
                waypoint_idx = waypoint_order[i - 1] if i - 1 < len(waypoint_order) else i - 1
                leg = legs[i]
                
                optimized_order.append({
                    "order_id": delivery_locations[waypoint_idx][0],
                    "coordinates": delivery_locations[waypoint_idx][1],
                    "leg_index": i,
                    "distance_km": leg['distance']['value'] / 1000,
                    "duration_minutes": leg['duration']['value'] // 60
                })
                total_distance += leg['distance']['value'] / 1000
                total_duration += leg['duration']['value'] // 60
            
            # Last delivery (destination)
            if len(delivery_locations) > 1:
                optimized_order.append({
                    "order_id": delivery_locations[-1][0],
                    "coordinates": delivery_locations[-1][1],
                    "leg_index": len(legs),
                    "distance_km": 0,  # Already counted in last leg
                    "duration_minutes": 0
                })
            
            return {
                "optimized_order": [(item["order_id"], item["coordinates"]) for item in optimized_order],
                "route_data": {
                    "legs": legs,
                    "waypoint_order": waypoint_order,
                    "polyline": route['overview_polyline']['points']
                },
                "stops_detail": optimized_order,
                "total_distance_km": total_distance,
                "total_duration_minutes": total_duration // 60,
                "polyline": route['overview_polyline']['points']
            }
            
        except Exception as e:
            print(f"Route optimization failed: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    async def get_place_details(self, place_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a place"""
        try:
            data = await self._make_request('place/details/json', {
                'place_id': place_id,
                'fields': 'formatted_address,geometry,name,place_id,types'
            })
            
            if data.get('result'):
                return data['result']
        except Exception as e:
            print(f"Place details failed: {e}")
            return None

# Global service instance
google_maps_service = GoogleMapsService()

# Convenience functions
async def geocode_address(address: str) -> Optional[Address]:
    """Convert address to coordinates"""
    async with GoogleMapsService() as service:
        return await service.geocode_address(address)

async def reverse_geocode(lat: float, lng: float) -> Optional[Address]:
    """Convert coordinates to address"""
    async with GoogleMapsService() as service:
        return await service.reverse_geocode(lat, lng)

async def calculate_route(origin: Coordinates, destination: Coordinates) -> Optional[Route]:
    """Calculate route between two points"""
    async with GoogleMapsService() as service:
        return await service.calculate_route(origin, destination)

async def calculate_eta(order_id: str, current_location: Coordinates, destination: Coordinates) -> Optional[ETA]:
    """Calculate ETA for delivery"""
    async with GoogleMapsService() as service:
        return await service.calculate_eta(order_id, current_location, destination)
