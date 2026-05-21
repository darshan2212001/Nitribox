#!/usr/bin/env python3
"""
Delivery Route Optimization API endpoints
Provides multi-stop route optimization for delivery agents
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from api.database import get_db
from api import models
from api.services.google_maps_service import GoogleMapsService, Coordinates
from api.connection_manager import manager
from api.events import EventChannel

router = APIRouter(prefix="/api/delivery-optimization", tags=["Delivery Optimization"])

class DeliveryStop(BaseModel):
    """Represents a single delivery stop in optimized route"""
    sequence: int
    order_id: str
    client_name: str
    client_phone: Optional[str]
    address: str
    coordinates: Dict[str, float]  # {lat, lng}
    eta_minutes: int
    distance_from_start_km: float
    distance_to_next_km: Optional[float]
    status: str  # "next", "upcoming", "completed"
    priority: str = "normal"  # "normal", "urgent"

class OptimizedRoute(BaseModel):
    """Represents an optimized delivery route"""
    total_distance_km: float
    total_duration_minutes: int
    stops: List[DeliveryStop]
    route_polyline: str
    optimized_at: str
    estimated_completion: str

class ActiveRouteResponse(BaseModel):
    """Response for active route endpoint"""
    agent_id: str
    agent_name: str
    optimized_route: OptimizedRoute

class CompleteStopRequest(BaseModel):
    """Request to complete a delivery stop"""
    order_id: str
    delivery_notes: Optional[str] = None

@router.get("/{agent_id}/active-route", response_model=ActiveRouteResponse)
async def get_active_route(
    agent_id: str,
    db: Session = Depends(get_db)
):
    """Get optimized route for agent's active deliveries"""
    try:
        # Get delivery agent
        agent = db.query(models.DeliveryAgent).filter(
            models.DeliveryAgent.id == agent_id
        ).first()
        
        if not agent:
            raise HTTPException(status_code=404, detail="Delivery agent not found")
        
        # Get all active deliveries for this agent
        active_orders = db.query(models.Order).filter(
            models.Order.delivery_agent_id == agent_id,
            models.Order.status.in_(["assigned", "in_transit", "in-transit", "packed"])
        ).all()
        
        if not active_orders:
            raise HTTPException(
                status_code=404, 
                detail="No active deliveries found for this agent"
            )
        
        # Get agent's current location (kitchen or current position)
        kitchen_location = Coordinates(
            lat=19.0760,  # Default kitchen location (Mumbai)
            lng=72.8777
        )
        
        if agent.current_latitude and agent.current_longitude:
            try:
                kitchen_location = Coordinates(
                    lat=float(agent.current_latitude),
                    lng=float(agent.current_longitude)
                )
            except (ValueError, TypeError):
                pass
        
        # Optimize route using Google Maps service
        async with GoogleMapsService() as maps_service:
            # Prepare delivery locations with order info
            delivery_data = []
            for order in active_orders:
                # Geocode address if coordinates not available
                if order.client_address:
                    geocoded = await maps_service.geocode_address(order.client_address)
                    if geocoded:
                        delivery_data.append({
                            "order_id": order.id,
                            "order": order,
                            "coordinates": geocoded.coordinates
                        })
            
            if not delivery_data:
                raise HTTPException(
                    status_code=400,
                    detail="Could not geocode delivery addresses"
                )
            
            # Optimize route
            optimized_result = await _optimize_route_with_google(
                maps_service,
                kitchen_location,
                delivery_data
            )
            
            if not optimized_result:
                raise HTTPException(
                    status_code=500,
                    detail="Route optimization failed"
                )
            
            # Build response
            stops = []
            total_distance = 0
            total_duration = 0
            cumulative_time = 0
            
            for idx, stop_data in enumerate(optimized_result["stops"]):
                order = stop_data["order"]
                
                # Calculate ETA (cumulative time from start)
                eta_minutes = cumulative_time + stop_data.get("duration_minutes", 0)
                
                stops.append(DeliveryStop(
                    sequence=idx + 1,
                    order_id=order.id,
                    client_name=order.client_name or "Unknown",
                    client_phone=order.client_phone,
                    address=order.client_address or "Unknown",
                    coordinates={
                        "lat": stop_data["coordinates"].lat,
                        "lng": stop_data["coordinates"].lng
                    },
                    eta_minutes=eta_minutes,
                    distance_from_start_km=stop_data.get("distance_km", 0),
                    distance_to_next_km=stop_data.get("distance_to_next_km"),
                    status="next" if idx == 0 else "upcoming",
                    priority="urgent" if "urgent" in (order.priority or "").lower() else "normal"
                ))
                
                total_distance += stop_data.get("distance_to_next_km", 0) or 0
                total_duration += stop_data.get("duration_minutes", 0) or 0
                cumulative_time += stop_data.get("duration_minutes", 0) or 0
            
            # Estimate completion time
            estimated_completion = datetime.now() + timedelta(minutes=total_duration)
            
            optimized_route = OptimizedRoute(
                total_distance_km=total_distance,
                total_duration_minutes=total_duration,
                stops=stops,
                route_polyline=optimized_result.get("polyline", ""),
                optimized_at=datetime.now().isoformat(),
                estimated_completion=estimated_completion.isoformat()
            )
            
            # Broadcast route optimized event
            await manager.broadcast_to_channel(
                EventChannel.delivery_agent(agent_id),
                {
                    "type": "route_optimized",
                    "data": {
                        "agent_id": agent_id,
                        "optimized_route": optimized_route.model_dump(),
                        "optimized_at": datetime.now().isoformat()
                    }
                }
            )
            
            return ActiveRouteResponse(
                agent_id=agent_id,
                agent_name=agent.name,
                optimized_route=optimized_route
            )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get active route: {str(e)}"
        )

async def _optimize_route_with_google(
    maps_service: GoogleMapsService,
    origin: Coordinates,
    delivery_data: List[Dict[str, Any]]
) -> Optional[Dict[str, Any]]:
    """Optimize route using Google Directions API with waypoint optimization"""
    try:
        if len(delivery_data) == 1:
            # Single delivery - no optimization needed
            stop_data = delivery_data[0]
            route = await maps_service.calculate_route(
                origin=origin,
                destination=stop_data["coordinates"]
            )
            
            if route:
                return {
                    "stops": [{
                        **stop_data,
                        "distance_km": route.distance_km,
                        "duration_minutes": route.duration_minutes,
                        "distance_to_next_km": None
                    }],
                    "polyline": route.polyline
                }
            return None
        
        # Multiple deliveries - use waypoint optimization
        waypoints = [d["coordinates"] for d in delivery_data]
        destination = waypoints[-1]  # Last delivery as destination
        
        # Build waypoints string with optimize flag
        waypoint_str = "|".join([f"{wp.lat},{wp.lng}" for wp in waypoints[:-1]])
        
        # Use Directions API with waypoint optimization
        params = {
            'origin': f"{origin.lat},{origin.lng}",
            'destination': f"{destination.lat},{destination.lng}",
            'waypoints': f"optimize:true|{waypoint_str}",
            'mode': 'driving',
            'avoid': 'tolls',
            'units': 'metric'
        }
        
        data = await maps_service._make_request('directions/json', params)
        
        if not data.get('routes'):
            return None
        
        route = data['routes'][0]
        legs = route['legs']
        optimized_order = []
        
        # Parse optimized waypoint order
        waypoint_order = route.get('waypoint_order', list(range(len(waypoints) - 1)))
        
        # Build optimized stops with distances and durations
        total_distance = 0
        for i, leg in enumerate(legs):
            waypoint_idx = waypoint_order[i] if i < len(waypoint_order) else i
            stop_data = delivery_data[waypoint_idx]
            
            distance_to_stop = leg['distance']['value'] / 1000  # km
            duration_to_stop = leg['duration']['value'] // 60  # minutes
            
            # Distance to next stop
            distance_to_next = None
            if i < len(legs) - 1:
                next_leg = legs[i + 1]
                distance_to_next = next_leg['distance']['value'] / 1000
            
            optimized_order.append({
                **stop_data,
                "distance_km": total_distance,
                "duration_minutes": duration_to_stop,
                "distance_to_next_km": distance_to_next
            })
            
            total_distance += distance_to_stop
        
        return {
            "stops": optimized_order,
            "polyline": route['overview_polyline']['points']
        }
    
    except Exception as e:
        print(f"Route optimization error: {e}")
        return None

@router.post("/{agent_id}/optimize")
async def optimize_route(
    agent_id: str,
    db: Session = Depends(get_db)
):
    """Manually trigger route optimization for agent's deliveries"""
    # This is essentially the same as get_active_route
    return await get_active_route(agent_id, db)

@router.patch("/{agent_id}/complete-stop")
async def complete_stop(
    agent_id: str,
    request: CompleteStopRequest,
    db: Session = Depends(get_db)
):
    """Mark a delivery stop as completed and recalculate route"""
    try:
        # Mark order as delivered
        order = db.query(models.Order).filter(
            models.Order.id == request.order_id,
            models.Order.delivery_agent_id == agent_id
        ).first()
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Update order status
        order.status = "delivered"
        order.delivered_at = datetime.now()
        if request.delivery_notes:
            order.delivery_notes = request.delivery_notes
        
        # Update tracking
        tracking = db.query(models.DeliveryTracking).filter(
            models.DeliveryTracking.order_id == request.order_id
        ).first()
        
        if tracking:
            tracking.status = "delivered"
            tracking.actual_delivery_time = datetime.now()
        
        db.commit()
        
        # Broadcast delivery completed
        await manager.broadcast_to_channel(
            f"delivery_agent_{agent_id}",
            {
                "type": "stop_completed",
                "data": {
                    "order_id": request.order_id,
                    "agent_id": agent_id,
                    "completed_at": datetime.now().isoformat()
                }
            }
        )
        
        # Get updated route (will exclude completed delivery)
        updated_route = await get_active_route(agent_id, db)
        
        # Broadcast route recalculated
        await manager.broadcast_to_channel(
            f"delivery_agent_{agent_id}",
            {
                "type": "route_recalculated",
                "data": {
                    "agent_id": agent_id,
                    "optimized_route": updated_route.optimized_route.model_dump()
                }
            }
        )
        
        return {
            "message": "Stop completed successfully",
            "updated_route": updated_route
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to complete stop: {str(e)}"
        )

@router.get("/{agent_id}/next-stop")
async def get_next_stop(
    agent_id: str,
    db: Session = Depends(get_db)
):
    """Get next delivery stop information"""
    try:
        route_response = await get_active_route(agent_id, db)
        
        # Find next stop (status = "next")
        next_stop = None
        for stop in route_response.optimized_route.stops:
            if stop.status == "next":
                next_stop = stop
                break
        
        if not next_stop:
            # If no "next" status, return first stop
            next_stop = route_response.optimized_route.stops[0] if route_response.optimized_route.stops else None
        
        if not next_stop:
            raise HTTPException(
                status_code=404,
                detail="No active deliveries found"
            )
        
        return {
            "agent_id": agent_id,
            "next_stop": next_stop.model_dump()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get next stop: {str(e)}"
        )
