#!/usr/bin/env python3
"""
Routing API endpoints
Provides route calculation, ETA estimation, and delivery optimization
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session

from api.database import get_db
from api.services.google_maps_service import (
    calculate_route, 
    calculate_eta, 
    GoogleMapsService,
    Coordinates
)

router = APIRouter(prefix="/api/routing", tags=["Routing"])

class RouteRequest(BaseModel):
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float
    waypoints: Optional[List[Tuple[float, float]]] = None
    optimize_waypoints: bool = True

class RouteResponse(BaseModel):
    distance_km: float
    duration_minutes: int
    polyline: str
    steps: List[dict]
    warnings: List[str]

class ETARequest(BaseModel):
    order_id: str
    current_lat: float
    current_lng: float
    destination_lat: float
    destination_lng: float

class ETAResponse(BaseModel):
    order_id: str
    eta_minutes: int
    distance_km: float
    traffic_conditions: str
    last_updated: str

class DeliveryOptimizationRequest(BaseModel):
    kitchen_lat: float
    kitchen_lng: float
    deliveries: List[dict]  # List of {order_id, lat, lng, priority}

class DeliveryOptimizationResponse(BaseModel):
    optimized_route: List[dict]
    total_distance_km: float
    total_duration_minutes: int
    estimated_completion_time: str

@router.post("/calculate-route", response_model=RouteResponse)
async def calculate_route_endpoint(
    request: RouteRequest,
    db: Session = Depends(get_db)
):
    """Calculate route between origin and destination"""
    try:
        origin = Coordinates(request.origin_lat, request.origin_lng)
        destination = Coordinates(request.destination_lat, request.destination_lng)
        
        waypoints = None
        if request.waypoints:
            waypoints = [Coordinates(lat, lng) for lat, lng in request.waypoints]
        
        route = await calculate_route(origin, destination)
        
        if not route:
            raise HTTPException(
                status_code=404,
                detail="Could not calculate route"
            )
        
        return RouteResponse(
            distance_km=route.distance_km,
            duration_minutes=route.duration_minutes,
            polyline=route.polyline,
            steps=route.steps,
            warnings=route.warnings
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Route calculation failed: {str(e)}"
        )

@router.post("/calculate-eta", response_model=ETAResponse)
async def calculate_eta_endpoint(
    request: ETARequest,
    db: Session = Depends(get_db)
):
    """Calculate ETA for delivery"""
    try:
        current_location = Coordinates(request.current_lat, request.current_lng)
        destination = Coordinates(request.destination_lat, request.destination_lng)
        
        eta = await calculate_eta(request.order_id, current_location, destination)
        
        if not eta:
            raise HTTPException(
                status_code=404,
                detail="Could not calculate ETA"
            )
        
        return ETAResponse(
            order_id=eta.order_id,
            eta_minutes=eta.eta_minutes,
            distance_km=eta.distance_km,
            traffic_conditions=eta.traffic_conditions,
            last_updated=eta.last_updated.isoformat()
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"ETA calculation failed: {str(e)}"
        )

@router.post("/optimize-delivery-route", response_model=DeliveryOptimizationResponse)
async def optimize_delivery_route(
    request: DeliveryOptimizationRequest,
    db: Session = Depends(get_db)
):
    """Optimize delivery route for multiple stops"""
    try:
        kitchen_location = Coordinates(request.kitchen_lat, request.kitchen_lng)
        
        # Convert deliveries to coordinates
        delivery_locations = [
            (delivery['order_id'], Coordinates(delivery['lat'], delivery['lng']))
            for delivery in request.deliveries
        ]
        
        async with GoogleMapsService() as service:
            optimized_route = await service.optimize_delivery_route(
                kitchen_location, 
                delivery_locations
            )
            
            if not optimized_route:
                raise HTTPException(
                    status_code=404,
                    detail="Could not optimize delivery route"
                )
            
            # Calculate total distance and duration
            total_distance = 0
            total_duration = 0
            
            # This is a simplified calculation
            # In practice, you'd calculate the actual route
            for i in range(len(optimized_route) - 1):
                current = optimized_route[i][1]
                next_stop = optimized_route[i + 1][1]
                
                route = await service.calculate_route(current, next_stop)
                if route:
                    total_distance += route.distance_km
                    total_duration += route.duration_minutes
            
            return DeliveryOptimizationResponse(
                optimized_route=[
                    {
                        "order_id": order_id,
                        "latitude": coords.lat,
                        "longitude": coords.lng,
                        "sequence": i + 1
                    }
                    for i, (order_id, coords) in enumerate(optimized_route)
                ],
                total_distance_km=total_distance,
                total_duration_minutes=total_duration,
                estimated_completion_time="2024-01-01T12:00:00Z"  # Placeholder
            )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Route optimization failed: {str(e)}"
        )

@router.get("/eta/{order_id}")
async def get_eta(
    order_id: str,
    current_lat: float,
    current_lng: float,
    destination_lat: float,
    destination_lng: float,
    db: Session = Depends(get_db)
):
    """Get ETA for a specific order"""
    try:
        current_location = Coordinates(current_lat, current_lng)
        destination = Coordinates(destination_lat, destination_lng)
        
        eta = await calculate_eta(order_id, current_location, destination)
        
        if not eta:
            raise HTTPException(
                status_code=404,
                detail=f"Could not calculate ETA for order {order_id}"
            )
        
        return {
            "order_id": eta.order_id,
            "eta_minutes": eta.eta_minutes,
            "distance_km": eta.distance_km,
            "traffic_conditions": eta.traffic_conditions,
            "last_updated": eta.last_updated.isoformat()
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"ETA retrieval failed: {str(e)}"
        )
