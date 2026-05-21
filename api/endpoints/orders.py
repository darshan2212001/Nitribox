from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, defer
from typing import List, Optional
from datetime import datetime, timedelta
from api.database import get_db
from api import models, schemas
from api.simple_auth import get_current_user_optional, get_current_user_required
from api.connection_manager import manager
from api.events import EventType, EventChannel, EventBuilder
from api.event_store import EventStore
from api.audit_logger import AuditLogger
from api.state_machine import OrderStateMachine
import uuid

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.post("/", response_model=schemas.OrderResponse)
async def create_order(
    order: schemas.OrderCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Create a new order with idempotency support and event logging"""
    try:
        # Authorization check: If authenticated, verify client_id matches user unless admin
        if current_user:
            if current_user.role != 'admin' and order.client_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to create orders for other users"
                )
        
        # Check for idempotency
        if order.idempotency_key:
            existing_order = db.query(models.Order).filter(
                models.Order.idempotency_key == order.idempotency_key
            ).first()
            if existing_order:
                # Return existing order for idempotent request
                return existing_order
        
        # Generate idempotency key if not provided
        idempotency_key = order.idempotency_key or str(uuid.uuid4())
        
        # Create order
        order_data = order.model_dump(exclude={'idempotency_key'})
        db_order = models.Order(**order_data, idempotency_key=idempotency_key)
        db.add(db_order)
        db.flush()  # Flush to get the ID
        
        # Log event to event store
        EventStore.append_event(
            db=db,
            aggregate_id=db_order.id,
            aggregate_type='order',
            event_type=EventType.MEAL_ASSIGNED,  # Using closest matching event type
            payload={
                'order_id': db_order.id,
                'client_id': db_order.client_id,
                'meal_type': db_order.meal_type,
                'status': db_order.status,
                'price': float(db_order.price)
            },
            metadata={
                'user_id': current_user.id if current_user else None,
                'user_role': current_user.role if current_user else None,
                'ip_address': request.client.host if request.client else None
            }
        )
        
        # Log to audit log
        AuditLogger.log_create(
            db=db,
            target_type='order',
            target_id=db_order.id,
            new_state=db_order,
            user_id=current_user.id if current_user else None,
            user_role=current_user.role if current_user else None,
            request=request
        )
        
        db.commit()
        db.refresh(db_order)
        
        # Build event data for WebSocket broadcast
        event_data = EventBuilder.build_event(
            EventType.MEAL_ASSIGNED,
            schemas.OrderResponse.model_validate(db_order).model_dump(mode='json', by_alias=True)
        )
        
        # Broadcast order created event
        await manager.broadcast_to_channel(EventChannel.KITCHEN, event_data)
        await manager.broadcast_to_channel(
            EventChannel.client(db_order.client_id),
            event_data
        )
        await manager.broadcast_to_channel(EventChannel.ADMIN, event_data)
        
        # Convert to response format to ensure proper serialization
        return schemas.OrderResponse.model_validate(db_order)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")

@router.get("/")
async def get_orders(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    client_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Get all orders with optional filtering"""
    try:
        # Use defer to exclude columns that may not exist in the database
        # Defer area_id, batch_id, timeslot fields, and label fields
        query = db.query(models.Order).options(
            defer(models.Order.area_id),
            defer(models.Order.batch_id),
            defer(models.Order.timeslot_start),
            defer(models.Order.timeslot_end),
            defer(models.Order.label_printed),
            defer(models.Order.label_scanned_at),
        )
        
        # Resolve client_id - it can be either a User ID or Client ID
        actual_client_id = None
        if client_id:
            # First, try to find Client record by user_id
            client = db.query(models.Client).filter(models.Client.user_id == client_id).first()
            if client:
                actual_client_id = client.id
            else:
                # If not found, try as Client ID directly
                client = db.query(models.Client).filter(models.Client.id == client_id).first()
                if client:
                    actual_client_id = client.id
                else:
                    # If still not found, use client_id as-is (backward compatibility)
                    actual_client_id = client_id
        
        # Authorization: Non-admin users can only see their own orders
        if current_user:
            if current_user.role != 'admin':
                # For non-admin users, find their Client record
                user_client = db.query(models.Client).filter(models.Client.user_id == current_user.id).first()
                if user_client:
                    query = query.filter(models.Order.client_id == user_client.id)
                else:
                    # Fallback: try matching by user ID directly
                    query = query.filter(models.Order.client_id == current_user.id)
            elif actual_client_id:
                # Admin can filter by client_id
                query = query.filter(models.Order.client_id == actual_client_id)
        elif actual_client_id:
            # Unauthenticated users can filter by client_id (for backward compatibility)
            query = query.filter(models.Order.client_id == actual_client_id)
        else:
            # Unauthenticated users without client_id filter see nothing
            return []
        
        if status:
            # Support comma-separated statuses for mobile app queries like "assigned,packed,in-transit"
            status_list = [s.strip() for s in status.split(',')]
            # Normalize status format: convert in-transit to in_transit
            normalized_statuses = [s.replace('-', '_') if '-' in s else s for s in status_list]
            query = query.filter(models.Order.status.in_(normalized_statuses))
        
        try:
            orders = query.offset(skip).limit(limit).all()
        except Exception as db_error:
            # If the error is about missing columns, use raw SQL query
            if "no such column" in str(db_error).lower():
                from sqlalchemy import text
                # Build WHERE clause
                where_clauses = []
                params = {}
                
                if current_user and current_user.role != 'admin':
                    user_client = db.query(models.Client).filter(models.Client.user_id == current_user.id).first()
                    if user_client:
                        where_clauses.append("client_id = :client_id")
                        params["client_id"] = user_client.id
                    else:
                        where_clauses.append("client_id = :client_id")
                        params["client_id"] = current_user.id
                elif actual_client_id:
                    where_clauses.append("client_id = :client_id")
                    params["client_id"] = actual_client_id
                
                if status:
                    status_list = [s.strip() for s in status.split(',')]
                    normalized_statuses = [s.replace('-', '_') if '-' in s else s for s in status_list]
                    placeholders = ','.join([f":status_{i}" for i in range(len(normalized_statuses))])
                    where_clauses.append(f"status IN ({placeholders})")
                    for i, s in enumerate(normalized_statuses):
                        params[f"status_{i}"] = s
                
                where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
                params["limit"] = limit
                params["offset"] = skip
                
                result = db.execute(
                    text(f"""
                        SELECT id, subscription_id, daily_meal_schedule_id, client_id, client_name, 
                               client_email, client_phone, client_address, diet_plan, meal_type, 
                               quantity, price, status, kitchen_status, delivery_agent_id, 
                               delivery_agent_name, priority, consumed_status, consumption_logged_at, 
                               rating, feedback, notes, version, idempotency_key, created_at, 
                               prepared_at, packed_at, assigned_at, picked_up_at, delivered_at, 
                               estimated_delivery_time
                        FROM orders
                        WHERE {where_sql}
                        LIMIT :limit OFFSET :offset
                    """),
                    params
                ).fetchall()
                
                # Convert to dict format
                return [
                    {
                        "id": row[0],
                        "subscription_id": row[1],
                        "daily_meal_schedule_id": row[2],
                        "client_id": row[3],
                        "client_name": row[4],
                        "client_email": row[5],
                        "client_phone": row[6],
                        "client_address": row[7],
                        "diet_plan": row[8],
                        "meal_type": row[9],
                        "quantity": row[10],
                        "price": row[11],
                        "status": row[12],
                        "kitchen_status": row[13],
                        "delivery_agent_id": row[14],
                        "delivery_agent_name": row[15],
                        "priority": row[16] or 'medium',
                        "consumed_status": row[17],
                        "consumption_logged_at": row[18].isoformat() if row[18] else None,
                        "rating": row[19],
                        "feedback": row[20],
                        "notes": row[21],
                        "version": row[22] or 1,
                        "idempotency_key": row[23],
                        "created_at": row[24].isoformat() if row[24] else None,
                        "prepared_at": row[25].isoformat() if row[25] else None,
                        "packed_at": row[26].isoformat() if row[26] else None,
                        "assigned_at": row[27].isoformat() if row[27] else None,
                        "picked_up_at": row[28].isoformat() if row[28] else None,
                        "delivered_at": row[29].isoformat() if row[29] else None,
                        "estimated_delivery_time": row[30].isoformat() if row[30] else None,
                    }
                    for row in result
                ]
            else:
                raise
        
        # Convert to dict format to avoid serialization issues
        if not orders:
            return []
        
        # Return orders as list of dicts to avoid Pydantic validation issues
        return [
            {
                "id": order.id,
                "subscription_id": order.subscription_id,
                "daily_meal_schedule_id": order.daily_meal_schedule_id,
                "client_id": order.client_id,
                "client_name": order.client_name,
                "client_email": order.client_email,
                "client_phone": order.client_phone,
                "client_address": order.client_address,
                "diet_plan": order.diet_plan,
                "meal_type": order.meal_type,
                "quantity": order.quantity,
                "price": order.price,
                "status": order.status,
                "kitchen_status": order.kitchen_status,
                "delivery_agent_id": order.delivery_agent_id,
                "delivery_agent_name": order.delivery_agent_name,
                "priority": getattr(order, 'priority', 'medium'),
                "consumed_status": order.consumed_status,
                "consumption_logged_at": order.consumption_logged_at.isoformat() if order.consumption_logged_at else None,
                "rating": order.rating,
                "feedback": order.feedback,
                "notes": getattr(order, 'notes', None),
                "version": getattr(order, 'version', 1),
                "idempotency_key": getattr(order, 'idempotency_key', None),
                "created_at": order.created_at.isoformat() if order.created_at else None,
                "prepared_at": order.prepared_at.isoformat() if order.prepared_at else None,
                "packed_at": order.packed_at.isoformat() if order.packed_at else None,
                "assigned_at": order.assigned_at.isoformat() if order.assigned_at else None,
                "picked_up_at": order.picked_up_at.isoformat() if order.picked_up_at else None,
                "delivered_at": order.delivered_at.isoformat() if order.delivered_at else None,
                "estimated_delivery_time": order.estimated_delivery_time.isoformat() if order.estimated_delivery_time else None,
            }
            for order in orders
        ]
    except Exception as e:
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to fetch orders: {str(e)}")

@router.get("/{order_id}", response_model=schemas.OrderResponse)
async def get_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Get a specific order by ID"""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Authorization: Users can only access their own orders unless admin
    if current_user:
        if current_user.role != 'admin' and order.client_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this order"
            )
    # Unauthenticated users can access orders (for backward compatibility)
    
    # Convert to response format to ensure proper serialization
    return schemas.OrderResponse.model_validate(order)

@router.patch("/{order_id}", response_model=schemas.OrderResponse)
async def update_order(
    order_id: str,
    order_update: schemas.OrderUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Update an order with optimistic concurrency control and state machine validation"""
    try:
        # Use row-level locking for concurrent updates
        order = db.query(models.Order).filter(
            models.Order.id == order_id
        ).with_for_update().first()
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Optimistic concurrency control
        if order_update.expected_version is not None:
            if order.version != order_update.expected_version:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        f"Order has been modified. Expected version {order_update.expected_version}, "
                        f"but current version is {order.version}. Please refresh and try again."
                    )
                )
        
        # Store before state for audit
        before_state = {
            'status': order.status,
            'kitchen_status': order.kitchen_status,
            'version': order.version
        }
        
        # Validate state transitions if status is being changed
        if order_update.status and order_update.status != order.status:
            OrderStateMachine.validate_transition(order.status, order_update.status)
        
        if order_update.kitchen_status and order_update.kitchen_status != order.kitchen_status:
            from api.state_machine import KitchenStatusStateMachine
            KitchenStatusStateMachine.validate_transition(order.kitchen_status, order_update.kitchen_status)
        
        # Update fields
        update_data = order_update.model_dump(exclude_unset=True, exclude={'expected_version'})
        for field, value in update_data.items():
            setattr(order, field, value)
        
        # Increment version for optimistic concurrency
        order.version += 1
        
        # Log event for status changes
        if order_update.status and order_update.status != before_state['status']:
            EventStore.append_event(
                db=db,
                aggregate_id=order_id,
                aggregate_type='order',
                event_type=EventType.MEAL_STATUS_CHANGED,
                payload={
                    'order_id': order_id,
                    'old_status': before_state['status'],
                    'new_status': order.status,
                    'changed_by': current_user.id,
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
            before_state={'status': before_state['status'], 'version': before_state['version']},
            after_state={'status': order.status, 'version': order.version},
            user_id=current_user.id,
            user_role=current_user.role,
            request=request
        )
        
        db.commit()
        db.refresh(order)
        
        # Broadcast order updated event
        event_data = EventBuilder.build_event(
            EventType.MEAL_STATUS_CHANGED if order_update.status else EventType.MEAL_PLAN_UPDATED,
            schemas.OrderResponse.model_validate(order).model_dump(mode='json', by_alias=True)
        )
        
        await manager.broadcast_to_channel(EventChannel.KITCHEN, event_data)
        await manager.broadcast_to_channel(
            EventChannel.client(order.client_id),
            event_data
        )
        await manager.broadcast_to_channel(EventChannel.ADMIN, event_data)
        
        # Convert to response format to ensure proper serialization
        return schemas.OrderResponse.model_validate(order)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update order: {str(e)}")

@router.delete("/{order_id}")
async def delete_order(
    order_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Delete an order (requires authentication) with event and audit logging"""
    try:
        order = db.query(models.Order).filter(models.Order.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Store before state for audit
        before_state = {
            'status': order.status,
            'client_id': order.client_id,
            'meal_type': order.meal_type
        }
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=order_id,
            aggregate_type='order',
            event_type=EventType.MEAL_STATUS_CHANGED,
            payload={
                'order_id': order_id,
                'client_id': order.client_id,
                'status': 'deleted',
                'action': 'deleted',
                'meal_type': order.meal_type
            },
            metadata={
                'user_id': current_user.id,
                'user_role': current_user.role,
                'ip_address': request.client.host if request.client else None
            }
        )
        
        # Log to audit log
        AuditLogger.log_delete(
            db=db,
            target_type='order',
            target_id=order_id,
            deleted_state=order,
            user_id=current_user.id,
            user_role=current_user.role,
            request=request
        )
        
        db.delete(order)
        db.commit()
        
        # Build event data for WebSocket broadcast
        event_data = EventBuilder.build_event(
            EventType.MEAL_STATUS_CHANGED,
            {
                "order_id": order_id,
                "client_id": before_state['client_id'],
                "status": "deleted",
                "action": "deleted"
            }
        )
        
        # Broadcast to client channel
        await manager.broadcast_to_channel(
            EventChannel.client(before_state['client_id']),
            event_data
        )
        
        # Broadcast to kitchen channel
        await manager.broadcast_to_channel(EventChannel.KITCHEN, event_data)
        
        # Broadcast to admin channel
        await manager.broadcast_to_channel(EventChannel.ADMIN, event_data)
        
        return {"message": "Order deleted successfully"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete order: {str(e)}")

@router.patch("/{order_id}/status")
async def update_order_status(
    order_id: str,
    status_update: schemas.OrderStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Update order status with state machine validation and event logging"""
    try:
        # Use row-level locking
        order = db.query(models.Order).filter(
            models.Order.id == order_id
        ).with_for_update().first()
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Validate state transition
        OrderStateMachine.validate_transition(order.status, status_update.status)
        
        old_status = order.status
        order.status = status_update.status
        if status_update.notes:
            order.notes = status_update.notes
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
                'new_status': status_update.status,
                'notes': status_update.notes
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
            after_state={'status': status_update.status},
            user_id=current_user.id,
            user_role=current_user.role,
            request=request
        )
        
        db.commit()
        db.refresh(order)
        
        # Broadcast order status changed event
        event_data = EventBuilder.meal_status_changed(
            order_id=order_id,
            client_id=order.client_id,
            meal_type=order.meal_type,
            old_status=old_status,
            new_status=status_update.status
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
        raise HTTPException(status_code=500, detail=f"Failed to update order status: {str(e)}")

@router.get("/client/{client_id}", response_model=List[schemas.OrderResponse])
async def get_client_orders(
    client_id: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Get orders for a specific client"""
    try:
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
        
        # Authorization check: users can only see their own orders unless admin
        if current_user:
            if current_user.role != "admin" and current_user.id != client.user_id:
                raise HTTPException(
                    status_code=403,
                    detail="Not authorized to view orders for this client"
                )
        
        # Use defer to exclude columns that may not exist in the database
        try:
            orders = db.query(models.Order).options(
                defer(models.Order.area_id),
                defer(models.Order.batch_id),
                defer(models.Order.timeslot_start),
                defer(models.Order.timeslot_end),
                defer(models.Order.label_printed),
                defer(models.Order.label_scanned_at),
            ).filter(
                models.Order.client_id == actual_client_id
            ).offset(skip).limit(limit).all()
            
            # Convert to response format to ensure proper serialization
            return [schemas.OrderResponse.model_validate(order) for order in orders]
        except Exception as db_error:
            # If the error is about missing columns, use raw SQL query
            if "no such column" in str(db_error).lower():
                from sqlalchemy import text
                result = db.execute(
                    text("""
                        SELECT id, subscription_id, daily_meal_schedule_id, client_id, client_name, 
                               client_email, client_phone, client_address, diet_plan, meal_type, 
                               quantity, price, status, kitchen_status, delivery_agent_id, 
                               delivery_agent_name, priority, consumed_status, consumption_logged_at, 
                               rating, feedback, notes, version, idempotency_key, created_at, 
                               prepared_at, packed_at, assigned_at, picked_up_at, delivered_at, 
                               estimated_delivery_time
                        FROM orders
                        WHERE client_id = :client_id
                        LIMIT :limit OFFSET :offset
                    """),
                    {"client_id": actual_client_id, "limit": limit, "offset": skip}
                ).fetchall()
                
                # Convert to dict format
                return [
                    {
                        "id": row[0],
                        "subscription_id": row[1],
                        "daily_meal_schedule_id": row[2],
                        "client_id": row[3],
                        "client_name": row[4],
                        "client_email": row[5],
                        "client_phone": row[6],
                        "client_address": row[7],
                        "diet_plan": row[8],
                        "meal_type": row[9],
                        "quantity": row[10],
                        "price": row[11],
                        "status": row[12],
                        "kitchen_status": row[13],
                        "delivery_agent_id": row[14],
                        "delivery_agent_name": row[15],
                        "priority": row[16] or 'medium',
                        "consumed_status": row[17],
                        "consumption_logged_at": row[18].isoformat() if row[18] else None,
                        "rating": row[19],
                        "feedback": row[20],
                        "notes": row[21],
                        "version": row[22] or 1,
                        "idempotency_key": row[23],
                        "created_at": row[24].isoformat() if row[24] else None,
                        "prepared_at": row[25].isoformat() if row[25] else None,
                        "packed_at": row[26].isoformat() if row[26] else None,
                        "assigned_at": row[27].isoformat() if row[27] else None,
                        "picked_up_at": row[28].isoformat() if row[28] else None,
                        "delivered_at": row[29].isoformat() if row[29] else None,
                        "estimated_delivery_time": row[30].isoformat() if row[30] else None,
                    }
                    for row in result
                ]
            else:
                raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to fetch client orders: {str(e)}")

@router.post("/from-daily-meal")
async def create_orders_from_daily_meal(
    schedule_id: str,
    db: Session = Depends(get_db)
):
    """Auto-create orders from daily meal schedule (used by scheduler)"""
    try:
        # Get the daily meal schedule
        schedule = db.query(models.DailyMealSchedule).filter(
            models.DailyMealSchedule.id == schedule_id
        ).first()
        
        if not schedule:
            raise HTTPException(status_code=404, detail="Daily meal schedule not found")
        
        # Get subscription details
        subscription = db.query(models.Subscription).filter(
            models.Subscription.id == schedule.subscription_id
        ).first()
        
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        # Get client details
        client = db.query(models.User).filter(
            models.User.id == schedule.client_id
        ).first()
        
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        
        created_orders = []
        
        # Create orders for each meal type
        meal_types = [
            ("breakfast", schedule.breakfast_item, schedule.breakfast_calories),
            ("lunch", schedule.lunch_item, schedule.lunch_calories),
            ("dinner", schedule.dinner_item, schedule.dinner_calories)
        ]
        
        for meal_type, meal_item, calories in meal_types:
            if meal_item:  # Only create order if meal is scheduled
                order = models.Order(
                    subscription_id=schedule.subscription_id,
                    daily_meal_schedule_id=schedule_id,
                    client_id=schedule.client_id,
                    client_name=client.name,
                    client_email=client.email,
                    client_phone=client.phone or "",
                    client_address="",  # Will be updated from client profile
                    diet_plan=subscription.meal_plan_id,
                    meal_type=meal_type,
                    quantity=1,
                    price=0.0,  # Price handled at subscription level
                    status="pending",
                    kitchen_status="pending"
                )
                db.add(order)
                created_orders.append(order)
        
        db.commit()
        
        # Refresh orders to get IDs
        for order in created_orders:
            db.refresh(order)
        
        # Broadcast daily meals assigned event
        event_data = EventBuilder.build_event(
            EventType.DAILY_MEALS_ASSIGNED,
            {
                "schedule_id": schedule_id,
                "client_id": schedule.client_id,
                "subscription_id": schedule.subscription_id,
                "orders_created": len(created_orders),
                "meal_types": [order.meal_type for order in created_orders]
            }
        )
        
        # Broadcast to kitchen
        await manager.broadcast_to_channel(EventChannel.KITCHEN, event_data)
        
        # Broadcast to client
        await manager.broadcast_to_channel(
            EventChannel.client(schedule.client_id),
            event_data
        )
        
        # Broadcast to admin
        await manager.broadcast_to_channel(EventChannel.ADMIN, event_data)
        
        return {
            "message": f"Created {len(created_orders)} orders from daily meal schedule",
            "schedule_id": schedule_id,
            "orders": [order.id for order in created_orders]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create orders from daily meal: {str(e)}")