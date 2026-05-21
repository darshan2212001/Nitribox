from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, timedelta
from pydantic import BaseModel, field_validator, HttpUrl
from api.database import get_db
from api import models, schemas
from api.simple_auth import get_current_user_required
from api.connection_manager import manager
from api.events import EventType, EventChannel, EventBuilder
from api.event_store import EventStore
from api.audit_logger import AuditLogger
from api.state_machine import OrderStateMachine
from api.services.batch_service import update_batch_counts
from api.error_responses import raise_http_exception, ErrorCode
import re
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/delivery", tags=["Delivery"])

# Request/Response schemas for new endpoints
class CheckinRequest(BaseModel):
    online: bool
    
    @field_validator('online')
    @classmethod
    def validate_online(cls, v: bool) -> bool:
        return bool(v)

class DeliveryVerification(BaseModel):
    verification_type: str  # "qr", "otp", "photo", "none"
    verification_value: Optional[str] = None  # QR data, OTP code, or photo URL
    notes: Optional[str] = None
    
    @field_validator('verification_type')
    @classmethod
    def validate_verification_type(cls, v: str) -> str:
        valid_types = ["qr", "otp", "photo", "none"]
        if v.lower() not in valid_types:
            raise ValueError(f"Verification type must be one of: {', '.join(valid_types)}")
        return v.lower()
    
    @field_validator('verification_value')
    @classmethod
    def validate_verification_value(cls, v: Optional[str], info) -> Optional[str]:
        if v is None:
            return v
        verification_type = info.data.get('verification_type', '').lower()
        if verification_type == "otp":
            # OTP must be exactly 4 digits
            if not re.match(r'^\d{4}$', v):
                raise ValueError("OTP must be exactly 4 digits")
        elif verification_type == "qr":
            # QR data should not be empty
            if not v or len(v.strip()) < 1:
                raise ValueError("QR code data cannot be empty")
        elif verification_type == "photo":
            # Photo URL validation
            try:
                HttpUrl(v)
            except:
                raise ValueError("Photo URL must be a valid URL")
        return v.strip() if isinstance(v, str) else v
    
    @field_validator('notes')
    @classmethod
    def validate_notes(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if len(v) > 500:
            raise ValueError("Notes must be less than 500 characters")
        return v.strip()

class IssueReport(BaseModel):
    reason: str  # "CUSTOMER_UNREACHABLE", "WRONG_ADDRESS", "CUSTOMER_CANCELLED", "FOOD_DAMAGED", "SECURITY_ISSUE", "OTHER"
    note: Optional[str] = None
    photo_url: Optional[str] = None
    attempt_again: bool = False  # Whether to attempt again later
    
    @field_validator('reason')
    @classmethod
    def validate_reason(cls, v: str) -> str:
        valid_reasons = [
            "CUSTOMER_UNREACHABLE",
            "WRONG_ADDRESS",
            "CUSTOMER_CANCELLED",
            "FOOD_DAMAGED",
            "SECURITY_ISSUE",
            "OTHER"
        ]
        if v.upper() not in valid_reasons:
            raise ValueError(f"Reason must be one of: {', '.join(valid_reasons)}")
        return v.upper()
    
    @field_validator('note')
    @classmethod
    def validate_note(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if len(v) > 1000:
            raise ValueError("Note must be less than 1000 characters")
        return v.strip()
    
    @field_validator('photo_url')
    @classmethod
    def validate_photo_url(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        try:
            HttpUrl(v)
        except:
            raise ValueError("Photo URL must be a valid URL")
        return v
    
    @field_validator('attempt_again')
    @classmethod
    def validate_attempt_again(cls, v: bool) -> bool:
        return bool(v)

@router.get("/orders", response_model=List[schemas.OrderResponse])
async def get_delivery_orders(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get orders for delivery management"""
    # Validate pagination parameters
    if skip < 0:
        raise_http_exception(
            status_code=400,
            message="Invalid pagination parameter",
            detail="Skip must be >= 0",
            error_code=ErrorCode.VALIDATION_ERROR,
            field="skip"
        )
    if limit < 1 or limit > 1000:
        raise_http_exception(
            status_code=400,
            message="Invalid pagination parameter",
            detail="Limit must be between 1 and 1000",
            error_code=ErrorCode.VALIDATION_ERROR,
            field="limit"
        )
    
    # Validate status if provided
    if status:
        valid_statuses = ["pending", "preparing", "ready", "assigned", "picked_up", "picked-up", "in_transit", "in-transit", "delivered", "completed", "cancelled", "failed"]
        if status not in valid_statuses:
            raise_http_exception(
                status_code=400,
                message="Invalid order status",
                detail=f"Status must be one of: {', '.join(valid_statuses)}",
                error_code=ErrorCode.VALIDATION_ERROR,
                field="status"
            )
    
    # Validate priority if provided
    if priority:
        valid_priorities = ["high", "medium", "low"]
        if priority.lower() not in valid_priorities:
            raise_http_exception(
                status_code=400,
                message="Invalid priority",
                detail=f"Priority must be one of: {', '.join(valid_priorities)}",
                error_code=ErrorCode.VALIDATION_ERROR,
                field="priority"
            )
    
    try:
        query = db.query(models.Order)
        
        if status:
            query = query.filter(models.Order.status == status)
        if priority:
            query = query.filter(models.Order.priority == priority.lower())
        
        # Delivery typically sees ready, in_transit, and delivered orders
        if not status:
            query = query.filter(models.Order.status.in_(["ready", "in_transit", "in-transit", "delivered"]))
        
        orders = query.order_by(models.Order.created_at.asc()).offset(skip).limit(limit).all()
        return orders
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch delivery orders: {str(e)}", exc_info=True)
        raise_http_exception(
            status_code=500,
            message="Failed to fetch orders",
            detail=str(e),
            error_code=ErrorCode.DATABASE_ERROR
        )

@router.get("/orders/assigned", response_model=List[schemas.OrderResponse])
async def get_assigned_orders(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get orders assigned for delivery"""
    orders = db.query(models.Order).filter(
        models.Order.status == "ready"
    ).order_by(models.Order.created_at.asc()).all()
    return orders

@router.get("/orders/in-transit", response_model=List[schemas.OrderResponse])
async def get_in_transit_orders(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get orders currently in transit"""
    # Support both in-transit and in_transit for backward compatibility
    orders = db.query(models.Order).filter(
        models.Order.status.in_(["in_transit", "in-transit"])
    ).order_by(models.Order.created_at.asc()).all()
    return orders

@router.get("/orders/delivered", response_model=List[schemas.OrderResponse])
async def get_delivered_orders(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get delivered orders"""
    orders = db.query(models.Order).filter(
        models.Order.status == "delivered"
    ).order_by(models.Order.created_at.desc()).all()
    return orders

@router.patch("/orders/{order_id}/assign")
async def assign_order_for_delivery(
    order_id: str,
    delivery_assignment: schemas.DeliveryAssignment,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Assign an order for delivery with state machine validation and event logging"""
    try:
        order = db.query(models.Order).filter(models.Order.id == order_id).with_for_update().first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Validate state transition
        OrderStateMachine.validate_transition(order.status, "assigned")
        
        old_status = order.status
        order.status = "assigned"
        order.delivery_person = delivery_assignment.delivery_person
        order.estimated_delivery_time = delivery_assignment.estimated_delivery_time
        order.version += 1
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=order_id,
            aggregate_type='order',
            event_type=EventType.DELIVERY_ASSIGNED,
            payload={
                'order_id': order_id,
                'client_id': order.client_id,
                'old_status': old_status,
                'new_status': 'assigned',
                'delivery_person': delivery_assignment.delivery_person
            },
            metadata={
                'user_id': current_user.id,
                'user_role': current_user.role,
                'ip_address': request.client.host if request.client else None
            }
        )
        
        # Log to audit log
        AuditLogger.log_update(
            db=db,
            target_type='order',
            target_id=order_id,
            before_state={'status': old_status},
            after_state={'status': 'assigned'},
            user_id=current_user.id,
            user_role=current_user.role,
            request=request
        )
        
        db.commit()
        db.refresh(order)
        
        # Broadcast delivery assigned
        event_data = EventBuilder.build_event(
            EventType.DELIVERY_ASSIGNED,
            {
                "order_id": order_id,
                "delivery_person": delivery_assignment.delivery_person,
                "order": schemas.OrderResponse.model_validate(order).model_dump(mode='json', by_alias=True)
            }
        )
        
        await manager.broadcast_to_channel(EventChannel.client(order.client_id), event_data)
        await manager.broadcast_to_channel(EventChannel.KITCHEN, event_data)
        await manager.broadcast_to_channel(EventChannel.ADMIN, event_data)
        
        return order
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to assign delivery: {str(e)}")

@router.patch("/orders/{order_id}/pickup")
async def mark_order_picked_up(
    order_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Mark an order as picked up with state machine validation and event logging"""
    try:
        order = db.query(models.Order).filter(models.Order.id == order_id).with_for_update().first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Validate state transition
        OrderStateMachine.validate_transition(order.status, "picked_up")
        
        old_status = order.status
        order.status = "picked_up"
        order.picked_up_at = datetime.now()
        order.version += 1
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=order_id,
            aggregate_type='order',
            event_type=EventType.ORDER_PICKED_UP,
            payload={
                'order_id': order_id,
                'client_id': order.client_id,
                'old_status': old_status,
                'new_status': 'picked_up'
            },
            metadata={
                'user_id': current_user.id,
                'user_role': current_user.role,
                'ip_address': request.client.host if request.client else None
            }
        )
        
        # Log to audit log
        AuditLogger.log_update(
            db=db,
            target_type='order',
            target_id=order_id,
            before_state={'status': old_status},
            after_state={'status': 'picked_up', 'picked_up_at': order.picked_up_at},
            user_id=current_user.id,
            user_role=current_user.role,
            request=request
        )
        
        db.commit()
        db.refresh(order)
        
        # Broadcast order picked up
        event_data = EventBuilder.build_event(
            EventType.ORDER_PICKED_UP,
            {
                "order_id": order_id,
                "order": schemas.OrderResponse.model_validate(order).model_dump(mode='json', by_alias=True)
            }
        )
        
        await manager.broadcast_to_channel(EventChannel.client(order.client_id), event_data)
        await manager.broadcast_to_channel(EventChannel.KITCHEN, event_data)
        await manager.broadcast_to_channel(EventChannel.ADMIN, event_data)
        
        return order
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to mark order as picked up: {str(e)}")

@router.patch("/orders/{order_id}/start-delivery")
async def start_delivery(
    order_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Start delivery of an order with state machine validation and event logging"""
    try:
        order = db.query(models.Order).filter(models.Order.id == order_id).with_for_update().first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Validate state transition
        OrderStateMachine.validate_transition(order.status, "in_transit")
        
        old_status = order.status
        order.status = "in_transit"
        order.version += 1
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=order_id,
            aggregate_type='order',
            event_type=EventType.MEAL_IN_TRANSIT,
            payload={
                'order_id': order_id,
                'client_id': order.client_id,
                'old_status': old_status,
                'new_status': 'in_transit'
            },
            metadata={
                'user_id': current_user.id,
                'user_role': current_user.role,
                'ip_address': request.client.host if request.client else None
            }
        )
        
        # Log to audit log
        AuditLogger.log_update(
            db=db,
            target_type='order',
            target_id=order_id,
            before_state={'status': old_status},
            after_state={'status': 'in_transit'},
            user_id=current_user.id,
            user_role=current_user.role,
            request=request
        )
        
        db.commit()
        db.refresh(order)
        
        # Broadcast delivery started
        event_data = EventBuilder.build_event(
            EventType.MEAL_IN_TRANSIT,
            {
                "order_id": order_id,
                "order": schemas.OrderResponse.model_validate(order).model_dump(mode='json', by_alias=True)
            }
        )
        
        await manager.broadcast_to_channel(EventChannel.client(order.client_id), event_data)
        await manager.broadcast_to_channel(EventChannel.KITCHEN, event_data)
        await manager.broadcast_to_channel(EventChannel.ADMIN, event_data)
        
        return order
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to start delivery: {str(e)}")

@router.patch("/orders/{order_id}/deliver")
async def mark_order_delivered(
    order_id: str,
    delivery_confirmation: schemas.DeliveryConfirmation,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Mark an order as delivered with state machine validation and event logging"""
    try:
        order = db.query(models.Order).filter(models.Order.id == order_id).with_for_update().first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Validate state transition
        OrderStateMachine.validate_transition(order.status, "delivered")
        
        old_status = order.status
        order.status = "delivered"
        order.delivered_at = datetime.now()
        order.delivery_notes = delivery_confirmation.notes
        order.version += 1
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=order_id,
            aggregate_type='order',
            event_type=EventType.ORDER_DELIVERED,
            payload={
                'order_id': order_id,
                'client_id': order.client_id,
                'old_status': old_status,
                'new_status': 'delivered'
            },
            metadata={
                'user_id': current_user.id,
                'user_role': current_user.role,
                'ip_address': request.client.host if request.client else None
            }
        )
        
        # Log to audit log
        AuditLogger.log_update(
            db=db,
            target_type='order',
            target_id=order_id,
            before_state={'status': old_status},
            after_state={'status': 'delivered', 'delivered_at': order.delivered_at},
            user_id=current_user.id,
            user_role=current_user.role,
            request=request
        )
        
        db.commit()
        db.refresh(order)
        
        # Broadcast delivery completed
        event_data = EventBuilder.build_event(
            EventType.ORDER_DELIVERED,
            {
                "order_id": order_id,
                "order": schemas.OrderResponse.model_validate(order).model_dump(mode='json', by_alias=True)
            }
        )
        
        await manager.broadcast_to_channel(EventChannel.client(order.client_id), event_data)
        await manager.broadcast_to_channel(EventChannel.KITCHEN, event_data)
        await manager.broadcast_to_channel(EventChannel.ADMIN, event_data)
        
        return order
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to mark order as delivered: {str(e)}")

@router.get("/stats")
async def get_delivery_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get delivery statistics"""
    assigned_count = db.query(models.Order).filter(models.Order.status == "assigned").count()
    in_transit_count = db.query(models.Order).filter(
        models.Order.status.in_(["in_transit", "in-transit"])
    ).count()
    delivered_today = db.query(models.Order).filter(
        models.Order.status == "delivered",
        models.Order.created_at >= db.func.date('now')
    ).count()
    total_delivered = db.query(models.Order).filter(models.Order.status == "delivered").count()
    
    return {
        "assigned_orders": assigned_count,
        "in_transit_orders": in_transit_count,
        "delivered_today": delivered_today,
        "total_delivered": total_delivered,
        "total_active": assigned_count + in_transit_count
    }

@router.get("/orders/{order_id}/tracking", response_model=schemas.DeliveryTrackingResponse)
async def get_delivery_tracking(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get delivery tracking information for an order"""
    tracking = db.query(models.DeliveryTracking).filter(
        models.DeliveryTracking.order_id == order_id
    ).first()
    
    if not tracking:
        raise HTTPException(status_code=404, detail="Delivery tracking not found")
    
    return tracking

@router.post("/checkin")
async def checkin_agent(
    checkin: CheckinRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Toggle agent online/offline status"""
    try:
        agent = db.query(models.DeliveryAgent).filter(
            models.DeliveryAgent.id == current_user.id
        ).first()
        
        if not agent:
            raise_http_exception(
                status_code=status.HTTP_404_NOT_FOUND,
                message="Delivery agent not found",
                detail="Delivery agent not found for this user",
                error_code=ErrorCode.NOT_FOUND
            )
        
        # Update online status
        agent.is_online = checkin.online
        agent.is_available = checkin.online  # Also update availability
        
        db.commit()
        db.refresh(agent)
        
        # Count available batches if online
        available_batches = 0
        if checkin.online:
            today = date.today()
            batches = db.query(models.Batch).filter(
                models.Batch.delivery_agent_id == agent.id,
                models.Batch.timeslot_start >= datetime.combine(today, datetime.min.time()),
                models.Batch.timeslot_start < datetime.combine(today, datetime.min.time()) + timedelta(days=1)
            ).count()
            available_batches = batches
        
        logger.info(f"Agent {agent.id} checked in: {'online' if checkin.online else 'offline'}")
        
        return {
            "is_online": agent.is_online,
            "is_available": agent.is_available,
            "available_batches": available_batches,
            "message": "Online" if checkin.online else "Offline"
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update agent status: {str(e)}", exc_info=True)
        raise_http_exception(
            status_code=500,
            message="Failed to update agent status",
            detail=str(e),
            error_code=ErrorCode.DATABASE_ERROR
        )


@router.get("/batches")
async def get_delivery_batches(
    target_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get batches assigned to the current delivery agent, filtered by today's date by default"""
    try:
        # Get agent ID from user
        agent = db.query(models.DeliveryAgent).filter(
            models.DeliveryAgent.id == current_user.id
        ).first()
        
        if not agent:
            raise_http_exception(
                status_code=status.HTTP_404_NOT_FOUND,
                message="Delivery agent not found",
                detail="Delivery agent not found for this user",
                error_code=ErrorCode.NOT_FOUND
            )
        
        # Default to today if not specified
        if target_date is None:
            target_date = date.today()
        
        # Validate date is not in the future (more than 7 days)
        max_future_date = date.today() + timedelta(days=7)
        if target_date > max_future_date:
            raise_http_exception(
                status_code=400,
                message="Invalid date",
                detail="Target date cannot be more than 7 days in the future",
                error_code=ErrorCode.VALIDATION_ERROR,
                field="target_date"
            )
        
        # Get batches assigned to this agent for the target date
        start_of_day = datetime.combine(target_date, datetime.min.time())
        end_of_day = start_of_day + timedelta(days=1)
        
        batches = db.query(models.Batch).filter(
            models.Batch.delivery_agent_id == agent.id,
            models.Batch.timeslot_start >= start_of_day,
            models.Batch.timeslot_start < end_of_day
        ).order_by(models.Batch.timeslot_start.asc()).all()
        
        # Calculate summary stats
        total_batches = len(batches)
        total_orders = sum(batch.total_orders for batch in batches if batch.total_orders)
        completed_batches = sum(1 for batch in batches if batch.status == "completed")
        
        result = []
        for batch in batches:
            # Get area name
            area = db.query(models.Area).filter(models.Area.id == batch.area_id).first()
            area_name = area.name if area else "Unknown"
            
            # Determine status indicator
            status_indicator = batch.status
            if batch.status == "pending" and batch.ready_count < batch.total_orders:
                status_indicator = "preparing"
            elif batch.status == "pending" and batch.ready_count >= batch.total_orders:
                status_indicator = "ready_for_pickup"
            elif batch.status == "picked":
                status_indicator = "in_progress"
            
            result.append({
                "batch_id": batch.id,
                "area_name": area_name,
                "meal_type": batch.meal_type,
                "timeslot": {
                    "start": batch.timeslot_start.isoformat() if batch.timeslot_start else None,
                    "end": batch.timeslot_end.isoformat() if batch.timeslot_end else None
                },
                "total_orders": batch.total_orders or 0,
                "ready_count": batch.ready_count or 0,
                "picked_count": batch.picked_count or 0,
                "status": batch.status,
                "status_indicator": status_indicator
            })
        
        logger.info(f"Fetched {total_batches} batches for agent {agent.id} on {target_date}")
        
        return {
            "batches": result,
            "summary": {
                "total_batches": total_batches,
                "total_orders": total_orders,
                "completed": completed_batches,
                "date": target_date.isoformat()
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch batches: {str(e)}", exc_info=True)
        raise_http_exception(
            status_code=500,
            message="Failed to fetch batches",
            detail=str(e),
            error_code=ErrorCode.DATABASE_ERROR
        )


@router.get("/batches/{batch_id}")
async def get_batch_details(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get batch details with orders for pickup checklist"""
    # Validate batch_id format
    if not batch_id or len(batch_id.strip()) == 0:
        raise_http_exception(
            status_code=status.HTTP_400_BAD_REQUEST,
            message="Invalid batch ID",
            detail="Batch ID is required",
            error_code=ErrorCode.VALIDATION_ERROR,
            field="batch_id"
        )
    
    try:
        batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
        
        if not batch:
            raise_http_exception(
                status_code=status.HTTP_404_NOT_FOUND,
                message="Batch not found",
                detail=f"Batch with ID {batch_id} not found",
                error_code=ErrorCode.NOT_FOUND
            )
        
        # Verify agent is assigned to this batch
        agent = db.query(models.DeliveryAgent).filter(
            models.DeliveryAgent.id == current_user.id
        ).first()
        
        if not agent:
            raise_http_exception(
                status_code=status.HTTP_404_NOT_FOUND,
                message="Delivery agent not found",
                detail="Delivery agent not found for this user",
                error_code=ErrorCode.NOT_FOUND
            )
        
        if batch.delivery_agent_id != agent.id:
            raise_http_exception(
                status_code=status.HTTP_403_FORBIDDEN,
                message="Access denied",
                detail="This batch is not assigned to you",
                error_code=ErrorCode.FORBIDDEN
            )
        
        # Get area
        area = db.query(models.Area).filter(models.Area.id == batch.area_id).first()
        
        # Get orders in batch
        batch_meals = db.query(models.BatchMeal).filter(
            models.BatchMeal.batch_id == batch_id
        ).all()
        
        order_ids = [bm.order_id for bm in batch_meals]
        orders = db.query(models.Order).filter(models.Order.id.in_(order_ids)).all()
        
        # Get all kitchen queue entries for these orders in one query
        kitchen_queues = db.query(models.KitchenQueue).filter(
            models.KitchenQueue.order_id.in_(order_ids)
        ).all()
        kitchen_queue_map = {kq.order_id: kq for kq in kitchen_queues}
        
        # Get all payments for these orders in one query
        payments = db.query(models.Payment).filter(
            models.Payment.order_id.in_(order_ids),
            models.Payment.status == "completed"
        ).all()
        payment_map = {p.order_id: p for p in payments}
        
        orders_list = []
        for order in orders:
            batch_meal = next((bm for bm in batch_meals if bm.order_id == order.id), None)
            kitchen_queue = kitchen_queue_map.get(order.id)
            
            # Get special instructions from order notes or kitchen queue
            special_instructions = order.notes
            if not special_instructions and kitchen_queue and kitchen_queue.special_instructions:
                special_instructions = kitchen_queue.special_instructions
            
            # Get dish name from kitchen queue
            dish_name = kitchen_queue.meal_name if kitchen_queue else None
            
            # Get payment information
            payment_info = None
            payment = payment_map.get(order.id)
            if payment:
                # Determine payment type: COD if cash, Prepaid otherwise
                payment_type = "COD" if payment.payment_method == "cash" else "Prepaid"
                amount_rupees = payment.amount_cents / 100.0
                payment_info = {
                    "type": payment_type,
                    "amount": amount_rupees,
                    "method": payment.payment_method
                }
            else:
                # If no payment found, assume COD for delivery
                payment_info = {
                    "type": "COD",
                    "amount": order.price,
                    "method": "cash"
                }
            
            orders_list.append({
                "order_id": order.id,
                "order_number": order.id[:8].upper(),
                "user_name": order.client_name,
                "user_phone": order.client_phone,
                "user_address": order.client_address,
                "meal_type": order.meal_type,
                "status": batch_meal.status if batch_meal else order.status,
                "label_scanned": order.label_scanned_at is not None,
                "picked": batch_meal.status == "picked" if batch_meal else False,
                "notes": order.notes,
                "special_instructions": special_instructions,
                "dish_name": dish_name,
                "payment": payment_info
            })
        
        return {
            "batch_id": batch.id,
            "area_name": area.name if area else "Unknown",
            "meal_type": batch.meal_type,
            "timeslot": {
                "start": batch.timeslot_start.isoformat() if batch.timeslot_start else None,
                "end": batch.timeslot_end.isoformat() if batch.timeslot_end else None
            },
            "total_orders": batch.total_orders or 0,
            "ready_count": batch.ready_count or 0,
            "picked_count": batch.picked_count or 0,
            "status": batch.status,
            "orders": orders_list
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch batch details for {batch_id}: {str(e)}", exc_info=True)
        raise_http_exception(
            status_code=500,
            message="Failed to fetch batch details",
            detail=str(e),
            error_code=ErrorCode.DATABASE_ERROR
        )


@router.post("/batches/{batch_id}/arrived-kitchen")
async def mark_arrived_at_kitchen(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Mark that delivery agent has arrived at kitchen"""
    if not batch_id or len(batch_id.strip()) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Batch ID is required"
        )
    
    try:
        batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
        
        if not batch:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch not found"
            )
        
        # Verify agent is assigned
        agent = db.query(models.DeliveryAgent).filter(
            models.DeliveryAgent.id == current_user.id
        ).first()
        
        if not agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Delivery agent not found for this user"
            )
        
        if batch.delivery_agent_id != agent.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This batch is not assigned to you"
            )
        
        # Update agent location (could be enhanced with actual GPS)
        agent.current_latitude = "12.9716"  # Default kitchen location
        agent.current_longitude = "77.5946"
        agent.is_online = True
        
        db.commit()
        
        logger.info(f"Agent {agent.id} marked arrival at kitchen for batch {batch_id}")
        
        return {
            "message": "Arrived at kitchen",
            "batch_id": batch_id,
            "timestamp": datetime.now().isoformat()
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to mark arrival for batch {batch_id}: {str(e)}", exc_info=True)
        raise_http_exception(
            status_code=500,
            message="Failed to mark arrival",
            detail=str(e),
            error_code=ErrorCode.DATABASE_ERROR
        )


@router.post("/batches/{batch_id}/pickup-order/{order_id}")
async def pickup_order_from_batch(
    batch_id: str,
    order_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Scan QR/pickup an order from batch"""
    # Validate input
    if not batch_id or len(batch_id.strip()) == 0:
        raise_http_exception(
            status_code=status.HTTP_400_BAD_REQUEST,
            message="Invalid batch ID",
            detail="Batch ID is required",
            error_code=ErrorCode.VALIDATION_ERROR,
            field="batch_id"
        )
    if not order_id or len(order_id.strip()) == 0:
        raise_http_exception(
            status_code=status.HTTP_400_BAD_REQUEST,
            message="Invalid order ID",
            detail="Order ID is required",
            error_code=ErrorCode.VALIDATION_ERROR,
            field="order_id"
        )
    
    try:
        batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
        
        if not batch:
            raise_http_exception(
                status_code=status.HTTP_404_NOT_FOUND,
                message="Batch not found",
                detail=f"Batch with ID {batch_id} not found",
                error_code=ErrorCode.NOT_FOUND
            )
        
        order = db.query(models.Order).filter(models.Order.id == order_id).first()
        
        if not order:
            raise_http_exception(
                status_code=status.HTTP_404_NOT_FOUND,
                message="Order not found",
                detail=f"Order with ID {order_id} not found",
                error_code=ErrorCode.NOT_FOUND
            )
        
        # Verify agent is assigned to batch
        agent = db.query(models.DeliveryAgent).filter(
            models.DeliveryAgent.id == current_user.id
        ).first()
        
        if not agent:
            raise_http_exception(
                status_code=status.HTTP_404_NOT_FOUND,
                message="Delivery agent not found",
                detail="Delivery agent not found for this user",
                error_code=ErrorCode.NOT_FOUND
            )
        
        if batch.delivery_agent_id != agent.id:
            raise_http_exception(
                status_code=status.HTTP_403_FORBIDDEN,
                message="Access denied",
                detail="This batch is not assigned to you",
                error_code=ErrorCode.FORBIDDEN
            )
        
        # Verify order is in batch
        batch_meal = db.query(models.BatchMeal).filter(
            models.BatchMeal.batch_id == batch_id,
            models.BatchMeal.order_id == order_id
        ).first()
        
        if not batch_meal:
            raise_http_exception(
                status_code=status.HTTP_400_BAD_REQUEST,
                message="Order not in batch",
                detail="Order is not in this batch",
                error_code=ErrorCode.VALIDATION_ERROR
            )
        
        # Check if already picked
        if batch_meal.status == "picked":
            raise_http_exception(
                status_code=status.HTTP_400_BAD_REQUEST,
                message="Order already picked",
                detail="Order is already picked up",
                error_code=ErrorCode.ORDER_ALREADY_PROCESSED
            )
        
        # Store before state
        old_status = order.status
        
        # Validate state transition
        OrderStateMachine.validate_transition(order.status, "picked_up")
        
        # Update order and batch meal status
        order.status = "picked_up"
        order.picked_up_at = datetime.now()
        order.version += 1
        batch_meal.status = "picked"
        
        # Update batch counts
        update_batch_counts(batch_id, db)
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=order_id,
            aggregate_type='order',
            event_type=EventType.ORDER_PICKED_UP,
            payload={
                'order_id': order_id,
                'batch_id': batch_id,
                'client_id': order.client_id,
                'old_status': old_status,
                'new_status': 'picked_up',
                'delivery_agent_id': agent.id
            },
            metadata={
                'user_id': current_user.id,
                'user_role': current_user.role
            }
        )
        
        # Log to audit log
        AuditLogger.log_update(
            db=db,
            target_type='order',
            target_id=order_id,
            before_state={'status': old_status},
            after_state={'status': 'picked_up', 'picked_up_at': order.picked_up_at},
            user_id=current_user.id,
            user_role=current_user.role,
            request=None
        )
        
        db.commit()
        
        # Broadcast event
        event_data = EventBuilder.build_event(
            EventType.ORDER_PICKED_UP,
            {
                "order_id": order_id,
                "batch_id": batch_id,
                "client_id": order.client_id,
                "delivery_agent_id": current_user.id
            }
        )
        
        await manager.broadcast_to_channel(EventChannel.client(order.client_id), event_data)
        await manager.broadcast_to_channel(EventChannel.KITCHEN, event_data)
        
        logger.info(f"Order {order_id} picked up by agent {agent.id} from batch {batch_id}")
        
        return {
            "message": "Order picked up",
            "order_id": order_id,
            "batch_id": batch_id,
            "status": "picked"
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to mark order {order_id} as picked up: {str(e)}", exc_info=True)
        raise_http_exception(
            status_code=500,
            message="Failed to mark order as picked up",
            detail=str(e),
            error_code=ErrorCode.DATABASE_ERROR
        )


@router.post("/batches/{batch_id}/pickup-complete")
async def mark_pickup_complete(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Mark that all orders in batch have been picked up"""
    if not batch_id or len(batch_id.strip()) == 0:
        raise_http_exception(
            status_code=status.HTTP_400_BAD_REQUEST,
            message="Invalid batch ID",
            detail="Batch ID is required",
            error_code=ErrorCode.VALIDATION_ERROR,
            field="batch_id"
        )
    
    try:
        batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
        
        if not batch:
            raise_http_exception(
                status_code=status.HTTP_404_NOT_FOUND,
                message="Batch not found",
                detail=f"Batch with ID {batch_id} not found",
                error_code=ErrorCode.NOT_FOUND
            )
        
        # Verify agent is assigned
        agent = db.query(models.DeliveryAgent).filter(
            models.DeliveryAgent.id == current_user.id
        ).first()
        
        if not agent:
            raise_http_exception(
                status_code=status.HTTP_404_NOT_FOUND,
                message="Delivery agent not found",
                detail="Delivery agent not found for this user",
                error_code=ErrorCode.NOT_FOUND
            )
        
        if batch.delivery_agent_id != agent.id:
            raise_http_exception(
                status_code=status.HTTP_403_FORBIDDEN,
                message="Access denied",
                detail="This batch is not assigned to you",
                error_code=ErrorCode.FORBIDDEN
            )
        
        # Verify all orders are picked
        batch_meals = db.query(models.BatchMeal).filter(
            models.BatchMeal.batch_id == batch_id
        ).all()
        
        picked_count = sum(1 for bm in batch_meals if bm.status == "picked")
        if picked_count < len(batch_meals):
            raise_http_exception(
                status_code=status.HTTP_400_BAD_REQUEST,
                message="Cannot complete pickup",
                detail=f"Not all orders are picked. Picked: {picked_count}/{len(batch_meals)}",
                error_code=ErrorCode.BATCH_NOT_READY,
                metadata={"picked_count": picked_count, "total_count": len(batch_meals)}
            )
        
        # Update batch status
        batch.status = "picked"
        db.commit()
        
        # Broadcast event
        event_data = EventBuilder.build_event(
            EventType.BATCH_PICKUP_COMPLETE,
            {
                "batch_id": batch_id,
                "delivery_agent_id": current_user.id,
                "total_orders": batch.total_orders or len(batch_meals)
            }
        )
        
        await manager.broadcast_to_channel(EventChannel.KITCHEN, event_data)
        
        logger.info(f"Batch {batch_id} pickup completed by agent {agent.id}")
        
        return {
            "message": "Batch pickup complete",
            "batch_id": batch_id,
            "total_orders": batch.total_orders or len(batch_meals)
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to complete pickup for batch {batch_id}: {str(e)}", exc_info=True)
        raise_http_exception(
            status_code=500,
            message="Failed to complete pickup",
            detail=str(e),
            error_code=ErrorCode.DATABASE_ERROR
        )


@router.post("/orders/{order_id}/delivered")
async def mark_order_delivered_from_batch(
    order_id: str,
    verification: DeliveryVerification,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Mark an order as delivered (from batch workflow) with verification"""
    if not order_id or len(order_id.strip()) == 0:
        raise_http_exception(
            status_code=status.HTTP_400_BAD_REQUEST,
            message="Invalid order ID",
            detail="Order ID is required",
            error_code=ErrorCode.VALIDATION_ERROR,
            field="order_id"
        )
    
    try:
        order = db.query(models.Order).filter(models.Order.id == order_id).first()
        
        if not order:
            raise_http_exception(
                status_code=status.HTTP_404_NOT_FOUND,
                message="Order not found",
                detail=f"Order with ID {order_id} not found",
                error_code=ErrorCode.NOT_FOUND
            )
        
        # Verify agent has permission (order should be in agent's batch)
        agent = db.query(models.DeliveryAgent).filter(
            models.DeliveryAgent.id == current_user.id
        ).first()
        
        if not agent:
            raise_http_exception(
                status_code=status.HTTP_404_NOT_FOUND,
                message="Delivery agent not found",
                detail="Delivery agent not found for this user",
                error_code=ErrorCode.NOT_FOUND
            )
        
        # Check if order is in agent's batch
        if order.batch_id:
            batch = db.query(models.Batch).filter(models.Batch.id == order.batch_id).first()
            if batch and batch.delivery_agent_id != agent.id:
                raise_http_exception(
                    status_code=status.HTTP_403_FORBIDDEN,
                    message="Access denied",
                    detail="This order is not assigned to you",
                    error_code=ErrorCode.FORBIDDEN
                )
        
        # Validate verification if OTP provided
        if verification.verification_type == "otp":
            if not verification.verification_value:
                raise_http_exception(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    message="OTP required",
                    detail="OTP value is required for OTP verification",
                    error_code=ErrorCode.VALIDATION_ERROR,
                    field="verification_value"
                )
            # OTP validation is already done in Pydantic validator
            # TODO: Add actual OTP validation against order/client
    
        # Store before state
        old_status = order.status
        
        # Validate state transition
        OrderStateMachine.validate_transition(order.status, "delivered")
        
        # Update order status
        order.status = "delivered"
        order.delivered_at = datetime.now()
        order.version += 1
        if verification.notes:
            order.delivery_notes = verification.notes
        
        # Update batch meal status if in a batch
        batch_meal = db.query(models.BatchMeal).filter(
            models.BatchMeal.order_id == order_id
        ).first()
        
        if batch_meal:
            batch_meal.status = "delivered"
            # Update batch counts
            update_batch_counts(batch_meal.batch_id, db)
        
        # Store verification in delivery tracking if exists
        tracking = db.query(models.DeliveryTracking).filter(
            models.DeliveryTracking.order_id == order_id
        ).first()
        
        if tracking:
            # Store verification data in route_data JSON field (or create new field)
            import json
            route_data = json.loads(tracking.route_data) if tracking.route_data else {}
            route_data["verification"] = {
                "type": verification.verification_type,
                "value": verification.verification_value,
                "timestamp": datetime.now().isoformat()
            }
            tracking.route_data = json.dumps(route_data)
            tracking.status = "delivered"
            tracking.actual_delivery_time = datetime.now()
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=order_id,
            aggregate_type='order',
            event_type=EventType.ORDER_DELIVERED,
            payload={
                'order_id': order_id,
                'client_id': order.client_id,
                'old_status': old_status,
                'new_status': 'delivered',
                'delivery_agent_id': agent.id,
                'verification_type': verification.verification_type
            },
            metadata={
                'user_id': current_user.id,
                'user_role': current_user.role,
                'ip_address': None  # Could get from request if added
            }
        )
        
        # Log to audit log
        AuditLogger.log_update(
            db=db,
            target_type='order',
            target_id=order_id,
            before_state={'status': old_status},
            after_state={'status': 'delivered', 'delivered_at': order.delivered_at},
            user_id=current_user.id,
            user_role=current_user.role,
            request=None  # Could add request parameter if needed
        )
        
        db.commit()
        
        # Broadcast event
        event_data = EventBuilder.build_event(
            EventType.ORDER_DELIVERED,
            {
                "order_id": order_id,
                "client_id": order.client_id,
                "delivery_agent_id": current_user.id,
                "verification_type": verification.verification_type
            }
        )
        
        await manager.broadcast_to_channel(EventChannel.client(order.client_id), event_data)
        await manager.broadcast_to_channel(EventChannel.KITCHEN, event_data)
        
        logger.info(f"Order {order_id} delivered by agent {agent.id} with verification type {verification.verification_type}")
        
        return {
            "message": "Order delivered",
            "order_id": order_id,
            "status": "delivered",
            "verification_type": verification.verification_type
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to mark order {order_id} as delivered: {str(e)}", exc_info=True)
        raise_http_exception(
            status_code=500,
            message="Failed to mark order as delivered",
            detail=str(e),
            error_code=ErrorCode.DATABASE_ERROR
        )


@router.post("/orders/{order_id}/report-issue")
async def report_delivery_issue(
    order_id: str,
    issue: IssueReport,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Report an issue with delivery"""
    if not order_id or len(order_id.strip()) == 0:
        raise_http_exception(
            status_code=status.HTTP_400_BAD_REQUEST,
            message="Invalid order ID",
            detail="Order ID is required",
            error_code=ErrorCode.VALIDATION_ERROR,
            field="order_id"
        )
    
    try:
        order = db.query(models.Order).filter(models.Order.id == order_id).first()
        
        if not order:
            raise_http_exception(
                status_code=status.HTTP_404_NOT_FOUND,
                message="Order not found",
                detail=f"Order with ID {order_id} not found",
                error_code=ErrorCode.NOT_FOUND
            )
        
        # Verify agent has permission
        agent = db.query(models.DeliveryAgent).filter(
            models.DeliveryAgent.id == current_user.id
        ).first()
        
        if not agent:
            raise_http_exception(
                status_code=status.HTTP_404_NOT_FOUND,
                message="Delivery agent not found",
                detail="Delivery agent not found for this user",
                error_code=ErrorCode.NOT_FOUND
            )
        
        # Check if order is in agent's batch
        if order.batch_id:
            batch = db.query(models.Batch).filter(models.Batch.id == order.batch_id).first()
            if batch and batch.delivery_agent_id != agent.id:
                raise_http_exception(
                    status_code=status.HTTP_403_FORBIDDEN,
                    message="Access denied",
                    detail="This order is not assigned to you",
                    error_code=ErrorCode.FORBIDDEN
                )
        
        # Reason validation is already done in Pydantic validator
    
        # Update order status to failed
        # Store before state
        old_status = order.status
        
        # Validate state transition
        OrderStateMachine.validate_transition(order.status, "failed")
        
        order.status = "failed"
        order.version += 1
        if issue.note:
            order.delivery_notes = f"Issue: {issue.reason}. {issue.note}"
        
        # Update batch meal status if in a batch
        batch_meal = db.query(models.BatchMeal).filter(
            models.BatchMeal.order_id == order_id
        ).first()
        
        if batch_meal:
            batch_meal.status = "failed"
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=order_id,
            aggregate_type='order',
            event_type=EventType.ORDER_FAILED,
            payload={
                'order_id': order_id,
                'client_id': order.client_id,
                'old_status': old_status,
                'new_status': 'failed',
                'reason': issue.reason,
                'note': issue.note
            },
            metadata={
                'user_id': current_user.id,
                'user_role': current_user.role
            }
        )
        
        # Log to audit log
        AuditLogger.log_update(
            db=db,
            target_type='order',
            target_id=order_id,
            before_state={'status': old_status},
            after_state={'status': 'failed', 'delivery_notes': order.delivery_notes},
            user_id=current_user.id,
            user_role=current_user.role,
            request=None
        )
        
        # Update batch counts if in a batch
        if batch_meal:
            update_batch_counts(batch_meal.batch_id, db)
        
        db.commit()
        
        # Broadcast event to kitchen/admin
        event_data = EventBuilder.build_event(
            EventType.ORDER_FAILED,
            {
                "order_id": order_id,
                "batch_id": batch_meal.batch_id if batch_meal else None,
                "client_id": order.client_id,
                "delivery_agent_id": current_user.id,
                "reason": issue.reason,
                "note": issue.note,
                "photo_url": issue.photo_url,
                "attempt_again": issue.attempt_again
            }
        )
        
        await manager.broadcast_to_channel(EventChannel.KITCHEN, event_data)
        await manager.broadcast_to_channel(EventChannel.ADMIN, event_data)
        
        logger.warning(f"Issue reported for order {order_id} by agent {agent.id}: {issue.reason}")
        
        return {
            "message": "Issue reported",
            "order_id": order_id,
            "reason": issue.reason,
            "status": "failed"
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to report issue for order {order_id}: {str(e)}", exc_info=True)
        raise_http_exception(
            status_code=500,
            message="Failed to report issue",
            detail=str(e),
            error_code=ErrorCode.DATABASE_ERROR
        )


@router.post("/batches/{batch_id}/complete")
async def complete_batch(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Complete a batch after all stops are delivered or failed"""
    if not batch_id or len(batch_id.strip()) == 0:
        raise_http_exception(
            status_code=status.HTTP_400_BAD_REQUEST,
            message="Invalid batch ID",
            detail="Batch ID is required",
            error_code=ErrorCode.VALIDATION_ERROR,
            field="batch_id"
        )
    
    try:
        batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
        
        if not batch:
            raise_http_exception(
                status_code=status.HTTP_404_NOT_FOUND,
                message="Batch not found",
                detail=f"Batch with ID {batch_id} not found",
                error_code=ErrorCode.NOT_FOUND
            )
        
        # Verify agent is assigned
        agent = db.query(models.DeliveryAgent).filter(
            models.DeliveryAgent.id == current_user.id
        ).first()
        
        if not agent:
            raise_http_exception(
                status_code=status.HTTP_404_NOT_FOUND,
                message="Delivery agent not found",
                detail="Delivery agent not found for this user",
                error_code=ErrorCode.NOT_FOUND
            )
        
        if batch.delivery_agent_id != agent.id:
            raise_http_exception(
                status_code=status.HTTP_403_FORBIDDEN,
                message="Access denied",
                detail="This batch is not assigned to you",
                error_code=ErrorCode.FORBIDDEN
            )
        
        # Check if already completed
        if batch.status == "completed":
            raise_http_exception(
                status_code=status.HTTP_400_BAD_REQUEST,
                message="Batch already completed",
                detail="Batch is already completed",
                error_code=ErrorCode.ORDER_ALREADY_PROCESSED
            )
        
        # Get all batch meals
        batch_meals = db.query(models.BatchMeal).filter(
            models.BatchMeal.batch_id == batch_id
        ).all()
        
        if not batch_meals:
            raise_http_exception(
                status_code=status.HTTP_400_BAD_REQUEST,
                message="Batch has no orders",
                detail="Batch has no orders",
                error_code=ErrorCode.VALIDATION_ERROR
            )
        
        # Count delivered and failed
        delivered_count = sum(1 for bm in batch_meals if bm.status == "delivered")
        failed_count = sum(1 for bm in batch_meals if bm.status == "failed")
        total_orders = len(batch_meals)
        
        # Verify all are delivered or failed
        if delivered_count + failed_count < total_orders:
            raise_http_exception(
                status_code=status.HTTP_400_BAD_REQUEST,
                message="Cannot complete batch",
                detail=f"Not all orders are delivered or failed. Delivered: {delivered_count}, Failed: {failed_count}, Total: {total_orders}",
                error_code=ErrorCode.BATCH_NOT_READY,
                metadata={
                    "delivered_count": delivered_count,
                    "failed_count": failed_count,
                    "total_orders": total_orders
                }
            )
        
        # Calculate time taken
        time_taken = None
        if batch.timeslot_start:
            time_taken_seconds = (datetime.now() - batch.timeslot_start).total_seconds()
            time_taken_minutes = int(time_taken_seconds / 60)
            time_taken = f"{time_taken_minutes}m"
        
        # Update batch status
        batch.status = "completed"
        db.commit()
        
        # Broadcast event
        event_data = EventBuilder.build_event(
            EventType.BATCH_COMPLETED,
            {
                "batch_id": batch_id,
                "delivery_agent_id": current_user.id,
                "delivered_count": delivered_count,
                "failed_count": failed_count,
                "total_orders": total_orders
            }
        )
        
        await manager.broadcast_to_channel(EventChannel.KITCHEN, event_data)
        
        logger.info(f"Batch {batch_id} completed by agent {agent.id}: {delivered_count} delivered, {failed_count} failed")
        
        return {
            "message": "Batch completed",
            "batch_id": batch_id,
            "summary": {
                "total_orders": total_orders,
                "delivered": delivered_count,
                "failed": failed_count,
                "time_taken": time_taken
            }
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to complete batch {batch_id}: {str(e)}", exc_info=True)
        raise_http_exception(
            status_code=500,
            message="Failed to complete batch",
            detail=str(e),
            error_code=ErrorCode.DATABASE_ERROR
        )


@router.post("/orders/{order_id}/tracking")
async def create_delivery_tracking(
    order_id: str,
    tracking_data: schemas.DeliveryTrackingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Create or update delivery tracking for an order"""
    try:
        tracking = db.query(models.DeliveryTracking).filter(
            models.DeliveryTracking.order_id == order_id
        ).first()
        
        if tracking:
            # Update existing tracking
            for field, value in tracking_data.model_dump(exclude_unset=True).items():
                setattr(tracking, field, value)
        else:
            # Create new tracking
            tracking = models.DeliveryTracking(
                order_id=order_id,
                **tracking_data.model_dump()
            )
            db.add(tracking)
        
        db.commit()
        db.refresh(tracking)
        
        return tracking
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create delivery tracking: {str(e)}")
