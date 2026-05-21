from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from api.database import get_db
from api import models, schemas
from api.simple_auth import get_current_user_optional
from pydantic import BaseModel, ConfigDict, field_validator
from api.connection_manager import manager
from api.events import EventType, EventChannel, EventBuilder
from api.event_store import EventStore
from api.audit_logger import AuditLogger
from api.state_machine import OrderStateMachine

router = APIRouter(prefix="/delivery-tracking", tags=["Delivery Tracking"])

# Pydantic schemas
class LocationUpdate(BaseModel):
    latitude: str
    longitude: str
    status: Optional[str] = "en_route"
    
    @field_validator('latitude')
    @classmethod
    def validate_latitude(cls, v: str) -> str:
        try:
            coord = float(v)
            if coord < -90 or coord > 90:
                raise ValueError('Latitude must be between -90 and 90')
            return str(coord)
        except ValueError as e:
            if 'could not convert' in str(e):
                raise ValueError(f'Invalid latitude format: {v}')
            raise
    
    @field_validator('longitude')
    @classmethod
    def validate_longitude(cls, v: str) -> str:
        try:
            coord = float(v)
            if coord < -180 or coord > 180:
                raise ValueError('Longitude must be between -180 and 180')
            return str(coord)
        except ValueError as e:
            if 'could not convert' in str(e):
                raise ValueError(f'Invalid longitude format: {v}')
            raise
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        valid_statuses = ['en_route', 'arrived', 'delivered', 'cancelled']
        if v.lower() not in valid_statuses:
            raise ValueError(f'Status must be one of: {", ".join(valid_statuses)}')
        return v.lower()

class DeliveryAssignment(BaseModel):
    order_id: str
    delivery_agent_id: str

class DeliveryTrackingResponse(BaseModel):
    id: str
    order_id: str
    delivery_agent_id: str
    latitude: str
    longitude: str
    destination_latitude: Optional[str]
    destination_longitude: Optional[str]
    status: str
    estimated_delivery_time: Optional[datetime]
    actual_delivery_time: Optional[datetime]
    distance_km: Optional[float]
    last_updated: datetime

    model_config = ConfigDict(from_attributes=True)

@router.post("/{order_id}/location")
async def update_delivery_location(
    order_id: str,
    location: LocationUpdate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Update delivery location (GPS stream) with event and audit logging"""
    try:
        # Find existing tracking record
        tracking = db.query(models.DeliveryTracking).filter(
            models.DeliveryTracking.order_id == order_id
        ).first()
        
        if not tracking:
            raise HTTPException(status_code=404, detail="Delivery tracking not found")
        
        # Store before state
        before_state = {
            'latitude': tracking.latitude,
            'longitude': tracking.longitude,
            'status': tracking.status
        }
        
        # Update location
        tracking.latitude = location.latitude
        tracking.longitude = location.longitude
        tracking.status = location.status
        tracking.last_updated = datetime.now()
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=order_id,
            aggregate_type='order',
            event_type=EventType.DELIVERY_LOCATION_UPDATE,
            payload={
                'order_id': order_id,
                'delivery_agent_id': tracking.delivery_agent_id,
                'latitude': location.latitude,
                'longitude': location.longitude,
                'status': location.status
            },
            metadata={
                'ip_address': request.client.host if request.client else None
            }
        )
        
        # Log to audit log
        AuditLogger.log_update(
            db=db,
            target_type='delivery_tracking',
            target_id=tracking.id,
            before_state=before_state,
            after_state={
                'latitude': location.latitude,
                'longitude': location.longitude,
                'status': location.status
            },
            user_id=None,  # System/GPS update
            user_role=None,
            request=request
        )
        
        db.commit()
        db.refresh(tracking)
        
        # Get order to access client_id
        order = db.query(models.Order).filter(models.Order.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Broadcast location update
        event_data = EventBuilder.location_update(
            order_id=order_id,
            client_id=order.client_id,
            delivery_agent_id=tracking.delivery_agent_id,
            latitude=location.latitude,
            longitude=location.longitude,
            eta_minutes=None  # Could calculate ETA here
        )
        
        # Broadcast to client
        await manager.broadcast_to_channel(
            EventChannel.client(order.client_id),
            event_data
        )
        
        # Broadcast to delivery agent channel
        if tracking.delivery_agent_id:
            await manager.broadcast_to_channel(
                EventChannel.delivery_agent(tracking.delivery_agent_id),
                event_data
            )
        
        # Broadcast to kitchen
        await manager.broadcast_to_channel(EventChannel.KITCHEN, event_data)
        
        # Broadcast to admin
        await manager.broadcast_to_channel(EventChannel.ADMIN, event_data)
        
        return {"message": "Location updated successfully", "tracking_id": tracking.id}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update location: {str(e)}")

@router.get("/{order_id}/live")
async def get_live_delivery_tracking(
    order_id: str,
    db: Session = Depends(get_db)
):
    """Get live delivery tracking for an order"""
    tracking = db.query(models.DeliveryTracking).filter(
        models.DeliveryTracking.order_id == order_id
    ).first()
    
    if not tracking:
        raise HTTPException(status_code=404, detail="Delivery tracking not found")
    
    # Get order details
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get delivery agent details
    agent = db.query(models.DeliveryAgent).filter(
        models.DeliveryAgent.id == tracking.delivery_agent_id
    ).first()
    
    return {
        "id": tracking.id,  # Include tracking ID
        "order_id": order_id,
        "client_id": order.client_id,
        "client_name": order.client_name,
        "client_address": order.client_address,
        "delivery_agent": {
            "id": tracking.delivery_agent_id,
            "name": agent.name if agent else "Unknown",
            "phone": agent.phone if agent else None
        },
        "current_location": {
            "latitude": tracking.latitude,
            "longitude": tracking.longitude
        },
        "destination": {
            "latitude": tracking.destination_latitude,
            "longitude": tracking.destination_longitude
        },
        "status": tracking.status,
        "estimated_delivery_time": tracking.estimated_delivery_time,
        "last_updated": tracking.last_updated,
        "distance_km": tracking.distance_km
    }

@router.post("/assign")
async def assign_delivery_agent(
    assignment: DeliveryAssignment,
    request: Request,
    db: Session = Depends(get_db)
):
    """Auto-assign or manual assign delivery agent to an order with locking, state machine validation, and event logging"""
    try:
        # Lock the order row to prevent concurrent updates
        order = db.query(models.Order).filter(
            models.Order.id == assignment.order_id
        ).with_for_update().first()
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Validate state transition - order must be in 'ready' or 'packed' state to be assigned
        if order.status not in ['ready', 'packed']:
            raise HTTPException(
                status_code=400,
                detail=f"Order must be 'ready' or 'packed' to assign delivery agent. Current status: {order.status}"
            )
        
        # Lock and verify delivery agent exists and is available
        agent = db.query(models.DeliveryAgent).filter(
            models.DeliveryAgent.id == assignment.delivery_agent_id,
            models.DeliveryAgent.is_available == True
        ).with_for_update().first()
        
        if not agent:
            raise HTTPException(status_code=404, detail="Delivery agent not found or not available")
        
        old_status = order.status
        old_agent_id = order.delivery_agent_id
        
        # Validate state transition
        OrderStateMachine.validate_transition(order.status, "assigned")
        
        # Update order
        order.delivery_agent_id = assignment.delivery_agent_id
        order.delivery_agent_name = agent.name
        order.status = "assigned"
        order.assigned_at = datetime.now()
        order.version += 1
        
        # Create or update delivery tracking
        tracking = db.query(models.DeliveryTracking).filter(
            models.DeliveryTracking.order_id == assignment.order_id
        ).first()
        
        if tracking:
            tracking.delivery_agent_id = assignment.delivery_agent_id
            tracking.status = "assigned"
        else:
            tracking = models.DeliveryTracking(
                order_id=assignment.order_id,
                delivery_agent_id=assignment.delivery_agent_id,
                latitude=agent.current_latitude or "0",
                longitude=agent.current_longitude or "0",
                status="assigned"
            )
            db.add(tracking)
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=assignment.order_id,
            aggregate_type='order',
            event_type=EventType.DELIVERY_ASSIGNED,
            payload={
                'order_id': assignment.order_id,
                'client_id': order.client_id,
                'old_status': old_status,
                'new_status': 'assigned',
                'delivery_agent_id': assignment.delivery_agent_id,
                'delivery_agent_name': agent.name,
                'old_agent_id': old_agent_id
            },
            metadata={
                'ip_address': request.client.host if request.client else None
            }
        )
        
        # Log to audit log
        AuditLogger.log_update(
            db=db,
            target_type='order',
            target_id=assignment.order_id,
            before_state={'status': old_status, 'delivery_agent_id': old_agent_id},
            after_state={'status': 'assigned', 'delivery_agent_id': assignment.delivery_agent_id},
            user_id=None,  # System action
            user_role=None,
            request=request
        )
        
        db.commit()
        db.refresh(tracking)  # Refresh to get the ID
        
        # Broadcast delivery assigned event
        event_data = EventBuilder.delivery_assigned(
            order_id=assignment.order_id,
            client_id=order.client_id,
            delivery_agent_id=assignment.delivery_agent_id,
            delivery_agent_name=agent.name
        )
        
        # Broadcast to client
        await manager.broadcast_to_channel(
            EventChannel.client(order.client_id),
            event_data
        )
        
        # Broadcast to delivery agent
        await manager.broadcast_to_channel(
            EventChannel.delivery_agent(assignment.delivery_agent_id),
            event_data
        )
        
        # Broadcast to kitchen and admin
        await manager.broadcast_to_channel(EventChannel.KITCHEN, event_data)
        await manager.broadcast_to_channel(EventChannel.ADMIN, event_data)
        
        return {
            "message": "Delivery agent assigned successfully",
            "order_id": assignment.order_id,
            "tracking_id": tracking.id,  # Include tracking ID for frontend
            "delivery_agent": {
                "id": agent.id,
                "name": agent.name,
                "phone": agent.phone
            }
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to assign delivery agent: {str(e)}")

@router.post("/{order_id}/reassign")
async def reassign_delivery_agent(
    order_id: str,
    new_agent_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Admin reassigns delivery agent with locking, state machine validation, and event logging"""
    try:
        # Lock the order row to prevent concurrent updates
        order = db.query(models.Order).filter(
            models.Order.id == order_id
        ).with_for_update().first()
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Lock and verify new delivery agent exists and is available
        new_agent = db.query(models.DeliveryAgent).filter(
            models.DeliveryAgent.id == new_agent_id,
            models.DeliveryAgent.is_available == True
        ).with_for_update().first()
        
        if not new_agent:
            raise HTTPException(status_code=404, detail="New delivery agent not found or not available")
        
        old_agent_id = order.delivery_agent_id
        old_status = order.status
        
        # Update order
        order.delivery_agent_id = new_agent_id
        order.delivery_agent_name = new_agent.name
        order.assigned_at = datetime.now()
        order.version += 1
        
        # Update delivery tracking
        tracking = db.query(models.DeliveryTracking).filter(
            models.DeliveryTracking.order_id == order_id
        ).first()
        
        if tracking:
            tracking.delivery_agent_id = new_agent_id
            tracking.latitude = new_agent.current_latitude or "0"
            tracking.longitude = new_agent.current_longitude or "0"
            tracking.status = "reassigned"
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=order_id,
            aggregate_type='order',
            event_type=EventType.DELIVERY_REASSIGNED,
            payload={
                'order_id': order_id,
                'client_id': order.client_id,
                'old_agent_id': old_agent_id,
                'new_agent_id': new_agent_id,
                'new_agent_name': new_agent.name
            },
            metadata={
                'user_id': current_user.id if current_user else None,
                'user_role': current_user.role if current_user else None,
                'ip_address': request.client.host if request.client else None
            }
        )
        
        # Log to audit log
        AuditLogger.log_update(
            db=db,
            target_type='order',
            target_id=order_id,
            before_state={'delivery_agent_id': old_agent_id, 'status': old_status},
            after_state={'delivery_agent_id': new_agent_id, 'status': order.status},
            user_id=current_user.id if current_user else None,
            user_role=current_user.role if current_user else None,
            request=request
        )
        
        db.commit()
        db.refresh(order)
        
        # Build event data for WebSocket broadcast
        event_data = EventBuilder.delivery_reassigned(
            order_id=order_id,
            client_id=order.client_id,
            old_agent_id=old_agent_id,
            new_agent_id=new_agent_id,
            new_agent_name=new_agent.name
        )
        
        # Broadcast to client channel
        await manager.broadcast_to_channel(
            EventChannel.client(order.client_id),
            event_data
        )
        
        # Broadcast to old delivery agent channel
        if old_agent_id:
            await manager.broadcast_to_channel(
                EventChannel.delivery_agent(old_agent_id),
                event_data
            )
        
        # Broadcast to new delivery agent channel
        await manager.broadcast_to_channel(
            EventChannel.delivery_agent(new_agent_id),
            event_data
        )
        
        # Broadcast to admin channel
        await manager.broadcast_to_channel(EventChannel.ADMIN, event_data)
        
        return {
            "message": "Delivery agent reassigned successfully",
            "order_id": order_id,
            "old_agent_id": old_agent_id,
            "new_agent": {
                "id": new_agent.id,
                "name": new_agent.name,
                "phone": new_agent.phone
            }
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to reassign delivery agent: {str(e)}")

@router.get("/agent/{agent_id}/active", response_model=List[schemas.DeliveryOrderResponse])
async def get_agent_active_deliveries(
    agent_id: str,
    db: Session = Depends(get_db)
):
    """Get all active deliveries for a delivery agent"""
    # Get orders assigned to this agent (including packed, assigned, and in_transit)
    # Standardize status format: use in_transit (underscore) consistently
    orders = db.query(models.Order).filter(
        models.Order.delivery_agent_id == agent_id,
        models.Order.status.in_(["packed", "assigned", "in_transit", "in-transit"])
    ).order_by(models.Order.assigned_at.asc()).all()
    
    result = []
    for order in orders:
        tracking = db.query(models.DeliveryTracking).filter(
            models.DeliveryTracking.order_id == order.id
        ).first()
        
        # Get special instructions from order notes or kitchen queue
        special_instructions = order.notes
        if not special_instructions:
            kitchen_queue = db.query(models.KitchenQueue).filter(
                models.KitchenQueue.order_id == order.id
            ).first()
            if kitchen_queue and kitchen_queue.special_instructions:
                special_instructions = kitchen_queue.special_instructions
        
        # Normalize status: convert in-transit to in_transit for consistency
        normalized_status = order.status.replace('-', '_') if order.status else 'assigned'
        
        # Build response data
        response_data = {
            "order_id": order.id,
            "order_number": order.id[:8].upper() if order.id else None,
            "client_id": order.client_id,
            "client_name": order.client_name,
            "client_phone": order.client_phone,
            "client_address": order.client_address,
            "client_email": order.client_email,
            "meal_type": order.meal_type,
            "diet_plan": order.diet_plan,
            "quantity": order.quantity,
            "status": normalized_status,
            "priority": getattr(order, 'priority', 'medium'),
            "special_instructions": special_instructions,
            "assigned_at": order.assigned_at,
            "current_location": {
                "latitude": tracking.latitude if tracking else None,
                "longitude": tracking.longitude if tracking else None
            } if tracking else None,
            "estimated_delivery_time": order.estimated_delivery_time,
            "created_at": order.created_at
        }
        
        # Use Pydantic schema for proper camelCase conversion
        result.append(schemas.DeliveryOrderResponse(**response_data))
    
    return result

@router.get("/client/{client_id}")
async def get_client_delivery_tracking(
    client_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Get all delivery tracking records for a client"""
    # client_id can be either user_id or actual client_id
    # First, try to find Client record by user_id
    client = db.query(models.Client).filter(models.Client.user_id == client_id).first()
    if client:
        actual_client_id = client.id
    else:
        # If not found, assume client_id is the actual Client record ID
        client = db.query(models.Client).filter(models.Client.id == client_id).first()
        if not client:
            # Return empty list if client not found
            return []
        actual_client_id = client.id
    
    # Authorization check: users can only see their own tracking unless admin
    if current_user:
        if current_user.role != "admin" and current_user.id != client.user_id:
            raise HTTPException(
                status_code=403,
                detail="Not authorized to view tracking for this client"
            )
    
    # Get all orders for this client
    orders = db.query(models.Order).filter(
        models.Order.client_id == actual_client_id
    ).order_by(models.Order.created_at.desc()).all()
    
    result = []
    for order in orders:
        tracking = db.query(models.DeliveryTracking).filter(
            models.DeliveryTracking.order_id == order.id
        ).first()
        
        if tracking:
            # Get delivery agent details
            delivery_agent = None
            if tracking.delivery_agent_id:
                agent = db.query(models.DeliveryAgent).filter(
                    models.DeliveryAgent.id == tracking.delivery_agent_id
                ).first()
                if agent:
                    delivery_agent = {
                        "id": agent.id,
                        "name": agent.name,
                        "phone": agent.phone
                    }
            
            result.append({
                "id": tracking.id,
                "order_id": order.id,
                "delivery_agent_id": tracking.delivery_agent_id,
                "delivery_agent": delivery_agent,
                "latitude": tracking.latitude,
                "longitude": tracking.longitude,
                "destination_latitude": tracking.destination_latitude,
                "destination_longitude": tracking.destination_longitude,
                "status": tracking.status,
                "estimated_delivery_time": tracking.estimated_delivery_time.isoformat() if tracking.estimated_delivery_time else None,
                "actual_delivery_time": tracking.actual_delivery_time.isoformat() if tracking.actual_delivery_time else None,
                "distance_km": tracking.distance_km,
                "last_updated": tracking.last_updated.isoformat() if tracking.last_updated else None,
                "created_at": tracking.created_at.isoformat() if tracking.created_at else None,
                "order_details": {
                    "meal_type": order.meal_type,
                    "diet_plan": order.diet_plan,
                    "status": order.status,
                    "client_address": order.client_address,
                    "client_name": order.client_name,
                    "client_phone": order.client_phone
                }
            })
    
    return result

