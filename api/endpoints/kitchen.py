from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, date, timedelta
from api.database import get_db
from api import models, schemas
from api.simple_auth import get_current_user_required
from api.connection_manager import manager
from api.events import EventType, EventChannel, EventBuilder
from api.event_store import EventStore
from api.audit_logger import AuditLogger
from api.state_machine import KitchenStatusStateMachine, OrderStateMachine

router = APIRouter(prefix="/kitchen", tags=["Kitchen"])

def enrich_order_with_special_instructions(order: models.Order, db: Session) -> dict:
    """Helper function to enrich order data with special instructions for response"""
    # Get special instructions from order notes or kitchen queue
    special_instructions = order.notes
    if not special_instructions:
        kitchen_queue = db.query(models.KitchenQueue).filter(
            models.KitchenQueue.order_id == order.id
        ).first()
        if kitchen_queue and kitchen_queue.special_instructions:
            special_instructions = kitchen_queue.special_instructions
    
    # Convert order to dict and add special_instructions
    order_dict = {
        **{c.name: getattr(order, c.name) for c in order.__table__.columns},
        'special_instructions': special_instructions,
        'priority': getattr(order, 'priority', 'medium')
    }
    return order_dict

@router.get("/orders", response_model=List[schemas.OrderResponse])
async def get_kitchen_orders(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get orders for kitchen management"""
    query = db.query(models.Order)
    
    if status:
        query = query.filter(models.Order.status == status)
    if priority:
        query = query.filter(models.Order.priority == priority)
    
    # Kitchen typically sees pending, preparing, and ready orders
    if not status:
        query = query.filter(models.Order.status.in_(["pending", "preparing", "ready"]))
    
    orders = query.order_by(models.Order.created_at.asc()).offset(skip).limit(limit).all()
    # Enrich orders with special instructions
    enriched_orders = [schemas.OrderResponse(**enrich_order_with_special_instructions(order, db)) for order in orders]
    return enriched_orders

@router.get("/orders/queue", response_model=List[schemas.OrderResponse])
async def get_kitchen_queue(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get pending orders in kitchen queue"""
    orders = db.query(models.Order).filter(
        models.Order.status == "pending"
    ).order_by(models.Order.created_at.asc()).all()
    # Enrich orders with special instructions
    enriched_orders = [schemas.OrderResponse(**enrich_order_with_special_instructions(order, db)) for order in orders]
    return enriched_orders

@router.get("/orders/preparing", response_model=List[schemas.OrderResponse])
async def get_preparing_orders(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get orders currently being prepared"""
    orders = db.query(models.Order).filter(
        models.Order.status == "preparing"
    ).order_by(models.Order.created_at.asc()).all()
    # Enrich orders with special instructions
    enriched_orders = [schemas.OrderResponse(**enrich_order_with_special_instructions(order, db)) for order in orders]
    return enriched_orders

@router.get("/orders/ready", response_model=List[schemas.OrderResponse])
async def get_ready_orders(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get orders ready for pickup"""
    orders = db.query(models.Order).filter(
        models.Order.status == "ready"
    ).order_by(models.Order.created_at.asc()).all()
    # Enrich orders with special instructions
    enriched_orders = [schemas.OrderResponse(**enrich_order_with_special_instructions(order, db)) for order in orders]
    return enriched_orders

@router.patch("/orders/{order_id}/start-preparing")
async def start_preparing_order(
    order_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Start preparing an order with optimistic locking, state machine validation, and event logging"""
    try:
        # Use with_for_update() to lock the row during update (prevents race conditions)
        order = db.query(models.Order).filter(models.Order.id == order_id).with_for_update().first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Validate state transition using state machine
        OrderStateMachine.validate_transition(order.status, "preparing")
        
        # Store before state
        old_status = order.status
        
        # Update order status atomically
        order.status = "preparing"
        order.kitchen_status = "preparing"
        order.version += 1
        order.prepared_at = datetime.now()
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=order_id,
            aggregate_type='order',
            event_type=EventType.MEAL_PREPARING,
            payload={
                'order_id': order_id,
                'client_id': order.client_id,
                'old_status': old_status,
                'new_status': 'preparing',
                'meal_type': order.meal_type
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
            before_state={'status': old_status, 'kitchen_status': order.kitchen_status},
            after_state={'status': 'preparing', 'kitchen_status': 'preparing'},
            user_id=current_user.id,
            user_role=current_user.role,
            request=request
        )
        
        db.commit()
        db.refresh(order)
        
        # Broadcast kitchen order status update
        event_data = EventBuilder.build_event(
            EventType.MEAL_PREPARING,
            {
                'order_id': order_id,
                'status': 'preparing',
                'order': schemas.OrderResponse.model_validate(order).model_dump(mode='json', by_alias=True)
            }
        )
        
        await manager.broadcast_to_channel(EventChannel.KITCHEN, event_data)
        await manager.broadcast_to_channel(
            EventChannel.client(order.client_id),
            event_data
        )
        
        return order
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to start preparing order: {str(e)}")

@router.patch("/orders/{order_id}/mark-ready")
async def mark_order_ready(
    order_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Mark an order as ready for pickup with state machine validation and event logging"""
    try:
        # Lock the row to prevent concurrent updates
        order = db.query(models.Order).filter(models.Order.id == order_id).with_for_update().first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Validate state transition
        KitchenStatusStateMachine.validate_transition(order.kitchen_status, "ready")
        OrderStateMachine.validate_transition(order.status, "ready")
        
        old_status = order.status
        old_kitchen_status = order.kitchen_status
        
        order.status = "ready"
        order.kitchen_status = "ready"
        order.version += 1
        order.packed_at = datetime.now()
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=order_id,
            aggregate_type='order',
            event_type=EventType.MEAL_PACKED,
            payload={
                'order_id': order_id,
                'client_id': order.client_id,
                'old_status': old_status,
                'new_status': 'ready',
                'old_kitchen_status': old_kitchen_status,
                'new_kitchen_status': 'ready',
                'meal_type': order.meal_type
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
            before_state={'status': old_status, 'kitchen_status': old_kitchen_status},
            after_state={'status': 'ready', 'kitchen_status': 'ready'},
            user_id=current_user.id,
            user_role=current_user.role,
            request=request
        )
        
        db.commit()
        db.refresh(order)
        
        # Broadcast kitchen order ready
        event_data = EventBuilder.build_event(
            EventType.MEAL_PACKED,
            {
                'order_id': order_id,
                'order': schemas.OrderResponse.model_validate(order).model_dump(mode='json', by_alias=True)
            }
        )
        
        await manager.broadcast_to_channel(EventChannel.KITCHEN, event_data)
        await manager.broadcast_to_channel(EventChannel.ALL_DELIVERY_AGENTS, event_data)
        await manager.broadcast_to_channel(
            EventChannel.client(order.client_id),
            event_data
        )
        
        return order
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to mark order ready: {str(e)}")

@router.patch("/orders/{order_id}/complete")
async def complete_order(
    order_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Mark an order as completed with state machine validation and event logging"""
    try:
        # Lock the row to prevent concurrent updates
        order = db.query(models.Order).filter(models.Order.id == order_id).with_for_update().first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Validate state transition
        OrderStateMachine.validate_transition(order.status, "completed")
        KitchenStatusStateMachine.validate_transition(order.kitchen_status, "completed")
        
        old_status = order.status
        old_kitchen_status = order.kitchen_status
        
        order.status = "completed"
        order.kitchen_status = "completed"
        order.version += 1
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=order_id,
            aggregate_type='order',
            event_type=EventType.MEAL_STATUS_CHANGED,
            payload={
                'order_id': order_id,
                'client_id': order.client_id,
                'old_status': old_status,
                'new_status': 'completed',
                'old_kitchen_status': old_kitchen_status,
                'new_kitchen_status': 'completed',
                'meal_type': order.meal_type
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
            before_state={'status': old_status, 'kitchen_status': old_kitchen_status},
            after_state={'status': 'completed', 'kitchen_status': 'completed'},
            user_id=current_user.id,
            user_role=current_user.role,
            request=request
        )
        
        db.commit()
        db.refresh(order)
        
        # Broadcast order completed
        event_data = EventBuilder.build_event(
            EventType.MEAL_STATUS_CHANGED,
            {
                'order_id': order_id,
                'status': 'completed',
                'order': schemas.OrderResponse.model_validate(order).model_dump(mode='json', by_alias=True)
            }
        )
        
        await manager.broadcast_to_channel(EventChannel.KITCHEN, event_data)
        await manager.broadcast_to_channel(
            EventChannel.client(order.client_id),
            event_data
        )
        await manager.broadcast_to_channel(EventChannel.ADMIN, event_data)
        
        return order
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to complete order: {str(e)}")

@router.get("/production-view")
async def get_production_view(
    meal_type: Optional[str] = None,
    target_date: Optional[date] = None,
    area_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """
    Get production view - aggregated dishes with total portions, customizations, and allergen notes.
    Groups orders by dish name for chefs to see how much to cook of each dish.
    """
    if target_date is None:
        target_date = date.today()
    
    # Get orders for the target date
    query = db.query(models.Order).filter(
        func.date(models.Order.created_at) == target_date
    )
    
    if meal_type:
        query = query.filter(models.Order.meal_type == meal_type)
    if area_id:
        query = query.filter(models.Order.area_id == area_id)
    
    orders = query.all()
    
    # Aggregate by dish name
    dish_groups: dict = {}
    
    for order in orders:
        # Get dish name from KitchenQueue or DailyMealSchedule
        dish_name = None
        kitchen_queue = db.query(models.KitchenQueue).filter(
            models.KitchenQueue.order_id == order.id
        ).first()
        
        if kitchen_queue and kitchen_queue.meal_name:
            dish_name = kitchen_queue.meal_name
        else:
            # Try to get from DailyMealSchedule
            if order.daily_meal_schedule_id:
                schedule = db.query(models.DailyMealSchedule).filter(
                    models.DailyMealSchedule.id == order.daily_meal_schedule_id
                ).first()
                if schedule:
                    if order.meal_type == "breakfast":
                        dish_name = schedule.breakfast_item
                    elif order.meal_type == "lunch":
                        dish_name = schedule.lunch_item
                    elif order.meal_type == "dinner":
                        dish_name = schedule.dinner_item
        
        # Fallback to a default if no dish name found
        if not dish_name:
            dish_name = f"{order.meal_type.title()} Meal"
        
        # Initialize dish group if not exists
        if dish_name not in dish_groups:
            dish_groups[dish_name] = {
                "dish_name": dish_name,
                "meal_type": order.meal_type,
                "total_portions": 0,
                "customizations": {},
                "allergen_notes": set(),
                "status": "pending",
                "orders": []
            }
        
        # Update counts
        dish_groups[dish_name]["total_portions"] += order.quantity
        
        # Collect customizations from notes
        if order.notes:
            # Simple parsing - in production, you'd want more structured data
            notes_lower = order.notes.lower()
            if "no-onion" in notes_lower or "no onion" in notes_lower:
                dish_groups[dish_name]["customizations"]["no-onion"] = dish_groups[dish_name]["customizations"].get("no-onion", 0) + 1
            if "extra-spicy" in notes_lower or "extra spicy" in notes_lower:
                dish_groups[dish_name]["customizations"]["extra-spicy"] = dish_groups[dish_name]["customizations"].get("extra-spicy", 0) + 1
            if "gluten-free" in notes_lower or "gluten free" in notes_lower:
                dish_groups[dish_name]["customizations"]["gluten-free"] = dish_groups[dish_name]["customizations"].get("gluten-free", 0) + 1
            if "no-peanut" in notes_lower or "no peanut" in notes_lower:
                dish_groups[dish_name]["customizations"]["no-peanut"] = dish_groups[dish_name]["customizations"].get("no-peanut", 0) + 1
            if "no-coriander" in notes_lower or "no coriander" in notes_lower:
                dish_groups[dish_name]["customizations"]["no-coriander"] = dish_groups[dish_name]["customizations"].get("no-coriander", 0) + 1
            if "nut allergy" in notes_lower or "nut-allergy" in notes_lower:
                dish_groups[dish_name]["allergen_notes"].add("nut allergy")
        
        # Determine status (use most advanced status)
        order_status = order.status or order.kitchen_status or "pending"
        if order_status in ["preparing", "in_prep"]:
            if dish_groups[dish_name]["status"] == "pending":
                dish_groups[dish_name]["status"] = "in_prep"
        elif order_status in ["packed", "ready"]:
            dish_groups[dish_name]["status"] = "ready"
        
        # Store order reference for expandable view
        dish_groups[dish_name]["orders"].append({
            "order_id": order.id,
            "client_name": order.client_name,
            "customizations": order.notes or "",
            "status": order_status
        })
    
    # Convert sets to lists for JSON serialization
    result = []
    for dish_name, data in dish_groups.items():
        result.append({
            "dish_name": data["dish_name"],
            "meal_type": data["meal_type"],
            "total_portions": data["total_portions"],
            "customizations_summary": data["customizations"],
            "allergen_notes": list(data["allergen_notes"]),
            "status": data["status"],
            "individual_orders": data["orders"]
        })
    
    return result


@router.get("/packing-view")
async def get_packing_view(
    meal_type: Optional[str] = None,
    area_id: Optional[str] = None,
    status: Optional[str] = None,
    target_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """
    Get packing view - unit-level orders ready to pack and send to delivery.
    Shows individual orders with user info, customizations, status, and label status.
    """
    if target_date is None:
        target_date = date.today()
    
    # Get orders for the target date
    query = db.query(models.Order).filter(
        func.date(models.Order.created_at) == target_date
    )
    
    if meal_type:
        query = query.filter(models.Order.meal_type == meal_type)
    if area_id:
        query = query.filter(models.Order.area_id == area_id)
    if status:
        query = query.filter(models.Order.status == status)
    
    orders = query.order_by(models.Order.created_at.asc()).all()
    
    result = []
    for order in orders:
        # Get dish name
        dish_name = None
        kitchen_queue = db.query(models.KitchenQueue).filter(
            models.KitchenQueue.order_id == order.id
        ).first()
        
        if kitchen_queue and kitchen_queue.meal_name:
            dish_name = kitchen_queue.meal_name
        else:
            if order.daily_meal_schedule_id:
                schedule = db.query(models.DailyMealSchedule).filter(
                    models.DailyMealSchedule.id == order.daily_meal_schedule_id
                ).first()
                if schedule:
                    if order.meal_type == "breakfast":
                        dish_name = schedule.breakfast_item
                    elif order.meal_type == "lunch":
                        dish_name = schedule.lunch_item
                    elif order.meal_type == "dinner":
                        dish_name = schedule.dinner_item
        
        # Get area name
        area_name = None
        if order.area_id:
            area = db.query(models.Area).filter(models.Area.id == order.area_id).first()
            if area:
                area_name = area.name
        
        result.append({
            "order_id": order.id,
            "order_number": order.id[:8].upper(),
            "user_name": order.client_name,
            "user_email": order.client_email,
            "user_phone": order.client_phone,
            "area": area_name or "Unknown",
            "area_id": order.area_id,
            "meal_type": order.meal_type,
            "dish_name": dish_name or f"{order.meal_type.title()} Meal",
            "diet_plan": order.diet_plan,
            "customizations": order.notes or "",
            "status": order.status or order.kitchen_status or "pending",
            "ready_by": order.timeslot_start.isoformat() if order.timeslot_start else None,
            "label_printed": order.label_printed or False,
            "label_scanned_at": order.label_scanned_at.isoformat() if order.label_scanned_at else None,
            "created_at": order.created_at.isoformat() if order.created_at else None
        })
    
    return result


@router.post("/orders/{order_id}/print-label")
async def print_label(
    order_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Mark order label as printed with event and audit logging"""
    try:
        order = db.query(models.Order).filter(models.Order.id == order_id).first()
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        before_state = {'label_printed': order.label_printed}
        order.label_printed = True
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=order_id,
            aggregate_type='order',
            event_type=EventType.ORDER_LABEL_PRINTED,
            payload={
                'order_id': order_id,
                'client_id': order.client_id,
                'meal_type': order.meal_type
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
            before_state=before_state,
            after_state={'label_printed': True},
            user_id=current_user.id,
            user_role=current_user.role,
            request=request
        )
        
        db.commit()
        
        # Broadcast label printed event
        event_data = EventBuilder.build_event(
            EventType.ORDER_LABEL_PRINTED,
            {
                'order_id': order_id,
                'client_id': order.client_id,
                'meal_type': order.meal_type
            }
        )
        
        await manager.broadcast_to_channel(EventChannel.KITCHEN, event_data)
        await manager.broadcast_to_channel(
            EventChannel.client(order.client_id),
            event_data
        )
        
        # TODO: Generate actual PDF label with QR code
        # For now, just return success
        
        return {
            "message": "Label marked as printed",
            "order_id": order_id,
            "label_data": {
                "user_name": order.client_name,
                "meal_type": order.meal_type,
                "diet_plan": order.diet_plan,
                "area": order.area_id,
                "qr_code": f"ORDER:{order_id}"
            }
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to print label: {str(e)}")


@router.post("/orders/{order_id}/scan-label")
async def scan_label(
    order_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Scan label (mark as ready for pickup) with state machine validation and event logging"""
    try:
        # Lock the row to prevent concurrent updates
        order = db.query(models.Order).filter(models.Order.id == order_id).with_for_update().first()
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        old_status = order.status
        old_kitchen_status = order.kitchen_status
        
        order.label_scanned_at = datetime.now()
        
        # Update status to ready_for_pickup if packed
        if order.status == "packed":
            # Validate state transition
            OrderStateMachine.validate_transition(order.status, "ready")
            KitchenStatusStateMachine.validate_transition(order.kitchen_status, "ready")
            
            order.status = "ready"
            order.kitchen_status = "ready"
            order.version += 1
        
        # Update batch meal status if in a batch
        batch_meal = db.query(models.BatchMeal).filter(
            models.BatchMeal.order_id == order_id
        ).first()
        if batch_meal:
            batch_meal.status = "ready"
            # Update batch counts
            from api.services.batch_service import update_batch_counts
            if batch_meal.batch_id:
                update_batch_counts(batch_meal.batch_id, db)
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=order_id,
            aggregate_type='order',
            event_type=EventType.ORDER_LABEL_SCANNED,
            payload={
                'order_id': order_id,
                'client_id': order.client_id,
                'old_status': old_status,
                'new_status': order.status,
                'old_kitchen_status': old_kitchen_status,
                'new_kitchen_status': order.kitchen_status,
                'meal_type': order.meal_type
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
            before_state={'status': old_status, 'kitchen_status': old_kitchen_status, 'label_scanned_at': None},
            after_state={'status': order.status, 'kitchen_status': order.kitchen_status, 'label_scanned_at': order.label_scanned_at},
            user_id=current_user.id,
            user_role=current_user.role,
            request=request
        )
        
        db.commit()
        db.refresh(order)
        
        # Broadcast label scanned event
        event_data = EventBuilder.build_event(
            EventType.ORDER_LABEL_SCANNED,
            {
                'order_id': order_id,
                'client_id': order.client_id,
                'status': order.status,
                'kitchen_status': order.kitchen_status
            }
        )
        
        await manager.broadcast_to_channel(EventChannel.KITCHEN, event_data)
        await manager.broadcast_to_channel(EventChannel.ALL_DELIVERY_AGENTS, event_data)
        await manager.broadcast_to_channel(
            EventChannel.client(order.client_id),
            event_data
        )
        
        return {
            "message": "Label scanned - order ready for pickup",
            "order_id": order_id,
            "status": order.status
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to scan label: {str(e)}")


@router.get("/dispatch-view")
async def get_dispatch_view(
    target_date: Optional[date] = None,
    meal_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """
    Get dispatch view - batches grouped by area + timeslot for coordinating with delivery agents.
    Shows batch statistics, assigned rider, and order lists.
    """
    if target_date is None:
        target_date = date.today()
    
    # Get batches for the target date
    query = db.query(models.Batch).filter(
        func.date(models.Batch.timeslot_start) == target_date
    )
    
    if meal_type:
        query = query.filter(models.Batch.meal_type == meal_type)
    
    batches = query.order_by(models.Batch.timeslot_start.asc()).all()
    
    result = []
    for batch in batches:
        # Get area name
        area = db.query(models.Area).filter(models.Area.id == batch.area_id).first()
        area_name = area.name if area else "Unknown"
        
        # Get delivery agent info
        assigned_rider = None
        if batch.delivery_agent_id:
            agent = db.query(models.DeliveryAgent).filter(
                models.DeliveryAgent.id == batch.delivery_agent_id
            ).first()
            if agent:
                assigned_rider = {
                    "id": agent.id,
                    "name": agent.name,
                    "phone": agent.phone,
                    "is_online": agent.is_online or False,
                    "status": "online" if agent.is_online else "offline"
                }
        
        # Get orders in batch
        batch_meals = db.query(models.BatchMeal).filter(
            models.BatchMeal.batch_id == batch.id
        ).all()
        
        order_ids = [bm.order_id for bm in batch_meals]
        orders = db.query(models.Order).filter(models.Order.id.in_(order_ids)).all()
        
        orders_list = []
        for order in orders:
            batch_meal = next((bm for bm in batch_meals if bm.order_id == order.id), None)
            orders_list.append({
                "order_id": order.id,
                "user_name": order.client_name,
                "status": batch_meal.status if batch_meal else order.status,
                "address_short": order.client_address[:50] + "..." if len(order.client_address) > 50 else order.client_address,
                "label_scanned": order.label_scanned_at is not None
            })
        
        # Calculate ETA to kitchen (15 minutes before timeslot start)
        eta_to_kitchen = None
        if batch.timeslot_start:
            eta_to_kitchen = (batch.timeslot_start - timedelta(minutes=15)).isoformat()
        
        result.append({
            "batch_id": batch.id,
            "area_name": area_name,
            "area_id": batch.area_id,
            "meal_type": batch.meal_type,
            "timeslot": {
                "start": batch.timeslot_start.isoformat() if batch.timeslot_start else None,
                "end": batch.timeslot_end.isoformat() if batch.timeslot_end else None
            },
            "total_orders": batch.total_orders,
            "packed_count": batch.packed_count,
            "ready_count": batch.ready_count,
            "picked_count": batch.picked_count,
            "assigned_rider": assigned_rider,
            "eta_to_kitchen": eta_to_kitchen,
            "status": batch.status,
            "orders_list": orders_list
        })
    
    return result


@router.get("/stats")
async def get_kitchen_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get kitchen statistics"""
    pending_count = db.query(models.Order).filter(models.Order.status == "pending").count()
    preparing_count = db.query(models.Order).filter(models.Order.status == "preparing").count()
    ready_count = db.query(models.Order).filter(models.Order.status == "ready").count()
    completed_today = db.query(models.Order).filter(
        models.Order.status == "completed",
        models.Order.created_at >= db.func.date('now')
    ).count()
    
    return {
        "pending_orders": pending_count,
        "preparing_orders": preparing_count,
        "ready_orders": ready_count,
        "completed_today": completed_today,
        "total_active": pending_count + preparing_count + ready_count
    }

@router.get("/orders/{order_id}/details", response_model=schemas.OrderResponse)
async def get_order_details(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get detailed information about a specific order"""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    # Enrich order with special instructions
    return schemas.OrderResponse(**enrich_order_with_special_instructions(order, db))

@router.get("/today-schedule")
async def get_todays_schedule(
    meal_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get today's meal schedule for kitchen preparation"""
    today = date.today()
    
    # Get today's daily meal schedules
    schedules = db.query(models.DailyMealSchedule).filter(
        models.DailyMealSchedule.date >= datetime.combine(today, datetime.min.time()),
        models.DailyMealSchedule.date < datetime.combine(today + timedelta(days=1), datetime.min.time())
    ).all()
    
    # Get corresponding orders
    orders = db.query(models.Order).filter(
        models.Order.daily_meal_schedule_id.in_([s.id for s in schedules])
    ).all()
    
    # Group by meal type and status
    result = {
        "date": today.isoformat(),
        "breakfast": [],
        "lunch": [],
        "dinner": []
    }
    
    for schedule in schedules:
        client = db.query(models.User).filter(models.User.id == schedule.client_id).first()
        client_name = client.name if client else "Unknown"
        
        # Get orders for this schedule
        schedule_orders = [o for o in orders if o.daily_meal_schedule_id == schedule.id]
        
        meal_data = {
            "schedule_id": schedule.id,
            "client_id": schedule.client_id,
            "client_name": client_name,
            "subscription_id": schedule.subscription_id,
            "orders": []
        }
        
        for order in schedule_orders:
            meal_data["orders"].append({
                "order_id": order.id,
                "meal_type": order.meal_type,
                "status": order.status,
                "kitchen_status": order.kitchen_status,
                "created_at": order.created_at.isoformat(),
                "prepared_at": order.prepared_at.isoformat() if order.prepared_at else None,
                "packed_at": order.packed_at.isoformat() if order.packed_at else None
            })
        
        # Add to appropriate meal type
        if meal_type is None or meal_type == "breakfast":
            if schedule.breakfast_item:
                result["breakfast"].append({
                    **meal_data,
                    "meal_item": schedule.breakfast_item,
                    "calories": schedule.breakfast_calories,
                    "status": schedule.breakfast_status
                })
        
        if meal_type is None or meal_type == "lunch":
            if schedule.lunch_item:
                result["lunch"].append({
                    **meal_data,
                    "meal_item": schedule.lunch_item,
                    "calories": schedule.lunch_calories,
                    "status": schedule.lunch_status
                })
        
        if meal_type is None or meal_type == "dinner":
            if schedule.dinner_item:
                result["dinner"].append({
                    **meal_data,
                    "meal_item": schedule.dinner_item,
                    "calories": schedule.dinner_calories,
                    "status": schedule.dinner_status
                })
    
    return result

@router.patch("/meal/{order_id}/start-preparation")
async def start_meal_preparation(
    order_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Start preparing a meal (kitchen workflow) with optimistic locking, state machine validation, and event logging"""
    try:
        # Lock the row to prevent concurrent updates
        order = db.query(models.Order).filter(models.Order.id == order_id).with_for_update().first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Validate state transition
        OrderStateMachine.validate_transition(order.status, "preparing")
        KitchenStatusStateMachine.validate_transition(order.kitchen_status, "preparing")
        
        # Store before state
        old_status = order.status
        old_kitchen_status = order.kitchen_status
        
        # Update order status
        order.status = "preparing"
        order.kitchen_status = "preparing"
        order.prepared_at = datetime.now()
        order.version += 1
        
        # Update daily meal schedule status
        if order.daily_meal_schedule_id:
            schedule = db.query(models.DailyMealSchedule).filter(
                models.DailyMealSchedule.id == order.daily_meal_schedule_id
            ).first()
            
            if schedule:
                if order.meal_type == "breakfast":
                    schedule.breakfast_status = "preparing"
                elif order.meal_type == "lunch":
                    schedule.lunch_status = "preparing"
                elif order.meal_type == "dinner":
                    schedule.dinner_status = "preparing"
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=order_id,
            aggregate_type='order',
            event_type=EventType.MEAL_PREPARING,
            payload={
                'order_id': order_id,
                'client_id': order.client_id,
                'old_status': old_status,
                'new_status': 'preparing',
                'old_kitchen_status': old_kitchen_status,
                'new_kitchen_status': 'preparing',
                'meal_type': order.meal_type
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
            before_state={'status': old_status, 'kitchen_status': old_kitchen_status},
            after_state={'status': 'preparing', 'kitchen_status': 'preparing'},
            user_id=current_user.id,
            user_role=current_user.role,
            request=request
        )
        
        db.commit()
        db.refresh(order)
        
        # Broadcast meal preparing event
        event_data = EventBuilder.build_event(
            EventType.MEAL_PREPARING,
            {
                "order_id": order_id,
                "client_id": order.client_id,
                "meal_type": order.meal_type,
                "timestamp": datetime.now().isoformat()
            }
        )
        
        # Broadcast to client
        await manager.broadcast_to_channel(
            EventChannel.client(order.client_id),
            event_data
        )
        
        # Broadcast to kitchen
        await manager.broadcast_to_channel(EventChannel.KITCHEN, event_data)
        
        # Broadcast to admin
        await manager.broadcast_to_channel(EventChannel.ADMIN, event_data)
        
        return {
            "message": f"{order.meal_type} preparation started",
            "order_id": order_id,
            "status": "preparing"
        }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to start preparation: {str(e)}")

@router.patch("/meal/{order_id}/mark-packed")
async def mark_meal_packed(
    order_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Mark meal as packed and ready for delivery assignment with optimistic locking, state machine validation, and event logging"""
    try:
        # Lock the row to prevent concurrent updates
        order = db.query(models.Order).filter(models.Order.id == order_id).with_for_update().first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Validate state transition
        OrderStateMachine.validate_transition(order.status, "packed")
        KitchenStatusStateMachine.validate_transition(order.kitchen_status, "packed")
        
        # Store before state
        old_status = order.status
        old_kitchen_status = order.kitchen_status
        
        # Update order status
        order.status = "packed"
        order.kitchen_status = "packed"
        order.packed_at = datetime.now()
        order.version += 1
        
        # Update daily meal schedule status
        if order.daily_meal_schedule_id:
            schedule = db.query(models.DailyMealSchedule).filter(
                models.DailyMealSchedule.id == order.daily_meal_schedule_id
            ).first()
            
            if schedule:
                if order.meal_type == "breakfast":
                    schedule.breakfast_status = "packed"
                elif order.meal_type == "lunch":
                    schedule.lunch_status = "packed"
                elif order.meal_type == "dinner":
                    schedule.dinner_status = "packed"
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=order_id,
            aggregate_type='order',
            event_type=EventType.MEAL_PACKED,
            payload={
                'order_id': order_id,
                'client_id': order.client_id,
                'old_status': old_status,
                'new_status': 'packed',
                'old_kitchen_status': old_kitchen_status,
                'new_kitchen_status': 'packed',
                'meal_type': order.meal_type
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
            before_state={'status': old_status, 'kitchen_status': old_kitchen_status},
            after_state={'status': 'packed', 'kitchen_status': 'packed'},
            user_id=current_user.id,
            user_role=current_user.role,
            request=request
        )
        
        db.commit()
        db.refresh(order)
        
        # Broadcast meal packed event
        event_data = EventBuilder.build_event(
            EventType.MEAL_PACKED,
            {
                "order_id": order_id,
                "client_id": order.client_id,
                "meal_type": order.meal_type,
                "timestamp": datetime.now().isoformat()
            }
        )
        
        # Broadcast to client
        await manager.broadcast_to_channel(
            EventChannel.client(order.client_id),
            event_data
        )
        
        # Broadcast to kitchen
        await manager.broadcast_to_channel(EventChannel.KITCHEN, event_data)
        
        # Broadcast to all delivery agents
        await manager.broadcast_to_channel(EventChannel.ALL_DELIVERY_AGENTS, event_data)
        
        # Broadcast to admin
        await manager.broadcast_to_channel(EventChannel.ADMIN, event_data)
        
        # Auto-assign delivery agent
        await _auto_assign_delivery_agent(order, db)
        
        return {
            "message": f"{order.meal_type} marked as packed",
            "order_id": order_id,
            "status": "packed"
        }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to mark as packed: {str(e)}")

async def _auto_assign_delivery_agent(order: models.Order, db: Session):
    """Auto-assign nearest available delivery agent with event and audit logging"""
    try:
        # Find nearest available delivery agent
        available_agents = db.query(models.DeliveryAgent).filter(
            models.DeliveryAgent.is_available == True
        ).all()
        
        if not available_agents:
            # No available agents, keep order in packed status
            return
        
        # For now, assign the first available agent
        # In production, you'd calculate distance and assign nearest
        agent = available_agents[0]
        
        # Store before state
        old_status = order.status
        old_agent_id = order.delivery_agent_id
        
        # Validate state transition
        OrderStateMachine.validate_transition(order.status, "assigned")
        
        # Update order with delivery assignment
        order.delivery_agent_id = agent.id
        order.delivery_agent_name = agent.name
        order.status = "assigned"
        order.assigned_at = datetime.now()
        order.version += 1
        
        # Mark agent as unavailable
        agent.is_available = False
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=order.id,
            aggregate_type='order',
            event_type=EventType.DELIVERY_ASSIGNED,
            payload={
                'order_id': order.id,
                'client_id': order.client_id,
                'old_status': old_status,
                'new_status': 'assigned',
                'delivery_agent_id': agent.id,
                'delivery_agent_name': agent.name,
                'old_agent_id': old_agent_id
            },
            metadata={
                'source': 'auto_assign',
                'system_action': True
            }
        )
        
        # Log to audit log
        AuditLogger.log_update(
            db=db,
            target_type='order',
            target_id=order.id,
            before_state={'status': old_status, 'delivery_agent_id': old_agent_id},
            after_state={'status': 'assigned', 'delivery_agent_id': agent.id},
            user_id=None,  # System action
            user_role=None,
            request=None
        )
        
        db.commit()
        
        # Broadcast delivery assigned event
        event_data = EventBuilder.delivery_assigned(
            order_id=order.id,
            client_id=order.client_id,
            delivery_agent_id=agent.id,
            delivery_agent_name=agent.name
        )
        
        # Broadcast to client
        await manager.broadcast_to_channel(
            EventChannel.client(order.client_id),
            event_data
        )
        
        # Broadcast to delivery agent
        await manager.broadcast_to_channel(
            EventChannel.delivery_agent(agent.id),
            event_data
        )
        
        # Broadcast to kitchen and admin
        await manager.broadcast_to_channel(EventChannel.KITCHEN, event_data)
        await manager.broadcast_to_channel(EventChannel.ADMIN, event_data)
        
    except Exception as e:
        print(f"Failed to auto-assign delivery agent: {e}")
        db.rollback()
        # Don't raise exception as this is a background process
