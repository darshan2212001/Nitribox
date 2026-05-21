from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError, ProgrammingError
from typing import List, Optional
from datetime import datetime, timedelta
from api.database import get_db
from api import models
from pydantic import BaseModel, ConfigDict, field_validator, conint, confloat
from api.connection_manager import manager
from api.events import EventType, EventChannel, EventBuilder
from api.event_store import EventStore
from api.audit_logger import AuditLogger
from api.simple_auth import get_current_user_required, get_current_user_optional
from fastapi import Request

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

# Pydantic schemas
class SubscriptionCreate(BaseModel):
    client_id: str
    nutritionist_id: Optional[str] = None
    meal_plan_id: str
    duration_days: conint(ge=1, le=365) = 30
    meals_per_day: conint(ge=1, le=6) = 3
    total_amount: confloat(ge=0.0)
    payment_method: Optional[str] = None
    
    @field_validator('payment_method')
    @classmethod
    def validate_payment_method(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        valid_methods = ['razorpay', 'stripe', 'cash', 'bank-transfer', 'upi', 'card']
        if v.lower() not in valid_methods:
            raise ValueError(f'Payment method must be one of: {", ".join(valid_methods)}')
        return v.lower()

class SubscriptionResponse(BaseModel):
    id: str
    client_id: str
    nutritionist_id: Optional[str]
    meal_plan_id: str
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    duration_days: int
    status: str
    meals_per_day: int
    total_amount: float
    payment_status: str
    payment_method: Optional[str]
    allocation_status: Optional[str] = None
    checkout_data_id: Optional[str] = None
    health_inputs: Optional[str] = None
    meal_timing: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# Helper function to convert subscription to response format
def subscription_to_response(sub: models.Subscription) -> SubscriptionResponse:
    """Convert a Subscription model to SubscriptionResponse, handling missing columns gracefully"""
    created_at = getattr(sub, 'created_at', None)
    if created_at is None:
        created_at = datetime.now()
    
    return SubscriptionResponse(
        id=getattr(sub, 'id', ''),
        client_id=getattr(sub, 'client_id', ''),
        nutritionist_id=getattr(sub, 'nutritionist_id', None),
        meal_plan_id=getattr(sub, 'meal_plan_id', ''),
        start_date=getattr(sub, 'start_date', None),
        end_date=getattr(sub, 'end_date', None),
        duration_days=getattr(sub, 'duration_days', 30),
        status=getattr(sub, 'status', 'inactive'),
        meals_per_day=getattr(sub, 'meals_per_day', 3),
        total_amount=getattr(sub, 'total_amount', 0.0),
        payment_status=getattr(sub, 'payment_status', 'pending'),
        payment_method=getattr(sub, 'payment_method', None),
        allocation_status=getattr(sub, 'allocation_status', None),
        checkout_data_id=getattr(sub, 'checkout_data_id', None),
        health_inputs=getattr(sub, 'health_inputs', None),
        meal_timing=getattr(sub, 'meal_timing', None),
        created_at=created_at,
        updated_at=getattr(sub, 'updated_at', None),
    )

class SubscriptionUpdate(BaseModel):
    status: Optional[str] = None
    nutritionist_id: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        valid_statuses = ['active', 'inactive', 'paused', 'cancelled', 'completed']
        if v.lower() not in valid_statuses:
            raise ValueError(f'Status must be one of: {", ".join(valid_statuses)}')
        return v.lower()

@router.post("/", response_model=SubscriptionResponse)
async def create_subscription(
    subscription: SubscriptionCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Create a new subscription after payment"""
    try:
        # Authorization check: Users can only create subscriptions for themselves unless admin
        if current_user.role != 'admin' and subscription.client_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to create subscriptions for other users"
            )
        
        # Create subscription with inactive status (until meal plan is generated)
        db_subscription = models.Subscription(
            **subscription.model_dump(),
            status="inactive",
            payment_status="completed"
        )
        db.add(db_subscription)
        db.flush()
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=db_subscription.id,
            aggregate_type='subscription',
            event_type=EventType.SUBSCRIPTION_CREATED,
            payload={
                'subscription_id': db_subscription.id,
                'client_id': db_subscription.client_id,
                'nutritionist_id': db_subscription.nutritionist_id,
                'meal_plan_id': db_subscription.meal_plan_id,
                'status': db_subscription.status,
                'duration_days': db_subscription.duration_days,
                'meals_per_day': db_subscription.meals_per_day,
                'total_amount': db_subscription.total_amount
            },
            metadata={
                'ip_address': request.client.host if request.client else None
            }
        )
        
        # Log to audit log
        AuditLogger.log_create(
            db=db,
            target_type='subscription',
            target_id=db_subscription.id,
            new_state=db_subscription,
            user_id=current_user.id,
            user_role=current_user.role,
            request=request
        )
        
        db.commit()
        db.refresh(db_subscription)
        
        # Build event data for WebSocket broadcast
        event_data = EventBuilder.build_event(
            EventType.SUBSCRIPTION_CREATED,
            {
                "id": db_subscription.id,
                "client_id": db_subscription.client_id,
                "nutritionist_id": db_subscription.nutritionist_id,
                "meal_plan_id": db_subscription.meal_plan_id,
                "status": db_subscription.status,
                "duration_days": db_subscription.duration_days,
                "meals_per_day": db_subscription.meals_per_day,
                "total_amount": db_subscription.total_amount
            }
        )
        
        # Broadcast to client channel
        await manager.broadcast_to_channel(
            EventChannel.client(db_subscription.client_id),
            event_data
        )
        
        # Broadcast to admin channel
        await manager.broadcast_to_channel(EventChannel.ADMIN, event_data)
        
        # Broadcast to nutritionist if assigned
        if db_subscription.nutritionist_id:
            await manager.broadcast_to_channel(
                EventChannel.nutritionist(db_subscription.nutritionist_id),
                event_data
            )
        
        # Convert to response format using helper function
        return subscription_to_response(db_subscription)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create subscription: {str(e)}")

@router.get("/", response_model=List[SubscriptionResponse])
async def get_subscriptions(
    client_id: Optional[str] = None,
    nutritionist_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Get all subscriptions with optional filtering"""
    query = db.query(models.Subscription)
    
    # Authorization: 
    # - Admins can see all subscriptions
    # - Nutritionists can see subscriptions for their assigned clients
    # - Regular users can only see their own subscriptions
    if current_user:
        if current_user.role == 'admin':
            # Admins can see all - no filter needed
            pass
        elif current_user.role == 'nutritionist':
            # Nutritionists can see subscriptions for their assigned clients
            # Filter by nutritionist_id if provided, or get nutritionist's ID
            nutritionist = db.query(models.Nutritionist).filter(
                models.Nutritionist.user_id == current_user.id
            ).first()
            if nutritionist:
                query = query.filter(models.Subscription.nutritionist_id == nutritionist.id)
            else:
                # If nutritionist record doesn't exist, return empty
                return []
        else:
            # Regular users can only see their own subscriptions
            query = query.filter(models.Subscription.client_id == current_user.id)
    else:
        # No user - return empty (or could allow public access with restrictions)
        return []
    
    # Apply filters
    if client_id:
        query = query.filter(models.Subscription.client_id == client_id)
    
    if nutritionist_id:
        query = query.filter(models.Subscription.nutritionist_id == nutritionist_id)
    
    if status:
        query = query.filter(models.Subscription.status == status)
    
    # Try to order by created_at, but handle if column doesn't exist
    try:
        subscriptions = query.order_by(models.Subscription.created_at.desc()).all()
    except Exception as order_error:
        # If created_at column doesn't exist, just get all without ordering
        print(f"[WARNING] Could not order by created_at: {str(order_error)}")
        subscriptions = query.all()
    
        # Convert to response format using helper function
        result = []
        for sub in subscriptions:
            try:
                result.append(subscription_to_response(sub))
            except Exception as sub_error:
                # Log the error for debugging but skip this subscription
                import traceback
                print(f"Error serializing subscription {getattr(sub, 'id', 'unknown')}: {str(sub_error)}")
                traceback.print_exc()
                continue
        
        return result

@router.get("/client/{client_id}", response_model=List[SubscriptionResponse])
async def get_client_subscriptions(
    client_id: str,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all subscriptions for a specific client"""
    try:
        import traceback
        # client_id can be either user_id or actual client_id
        # First, try to find Client record by user_id (legacy DBs may lack columns — skip on schema errors)
        client = None
        actual_client_id = None
        try:
            client = db.query(models.Client).filter(models.Client.user_id == client_id).first()
        except (OperationalError, ProgrammingError) as e:
            print(f"[WARN] get_client_subscriptions: Client.user_id lookup skipped: {e}")

        if client:
            actual_client_id = client.id
        else:
            try:
                client = db.query(models.Client).filter(models.Client.id == client_id).first()
                if client:
                    actual_client_id = client.id
            except (OperationalError, ProgrammingError) as e:
                print(f"[WARN] get_client_subscriptions: Client.id lookup skipped: {e}")
        
        # If we couldn't find a Client record, try querying subscriptions directly
        # (subscriptions might be stored with user_id as client_id)
        if actual_client_id is None:
            query = db.query(models.Subscription).filter(
                models.Subscription.client_id == client_id
            )
            if status:
                query = query.filter(models.Subscription.status == status)
            # Try to order by created_at, but handle if column doesn't exist
            try:
                subscriptions = query.order_by(models.Subscription.created_at.desc()).all()
            except Exception:
                # If created_at column doesn't exist, just get all without ordering
                subscriptions = query.all()
            
            # Convert to response format using helper function
            result = []
            for sub in subscriptions:
                try:
                    result.append(subscription_to_response(sub))
                except Exception as sub_error:
                    # Log the error for debugging but skip this subscription
                    import traceback
                    print(f"Error serializing subscription {getattr(sub, 'id', 'unknown')}: {str(sub_error)}")
                    traceback.print_exc()
                    continue
            
            return result
        
        # Query subscriptions with the resolved client_id
        query = db.query(models.Subscription).filter(
            models.Subscription.client_id == actual_client_id
        )
        
        if status:
            query = query.filter(models.Subscription.status == status)
        
        # Try to order by created_at, but handle if column doesn't exist
        try:
            subscriptions = query.order_by(models.Subscription.created_at.desc()).all()
        except Exception as order_error:
            # If created_at column doesn't exist, just get all without ordering
            print(f"[WARNING] Could not order by created_at: {str(order_error)}")
            subscriptions = query.all()
        
        # Convert to response format manually to handle missing columns gracefully
        result = []
        for sub in subscriptions:
            try:
                result.append(subscription_to_response(sub))
            except Exception as sub_error:
                # Log the error for debugging but skip this subscription
                import traceback
                print(f"Error serializing subscription {getattr(sub, 'id', 'unknown')}: {str(sub_error)}")
                traceback.print_exc()
                continue
        
        return result
    except HTTPException:
        raise
    except (OperationalError, ProgrammingError) as e:
        err = str(e.orig) if getattr(e, "orig", None) else str(e)
        if "1054" in err or "Unknown column" in err:
            raise HTTPException(
                status_code=503,
                detail="Database schema is out of date. Stop the API, run: npm run db:migrate, then restart the API.",
            ) from e
        import traceback
        print(f"[ERROR] get_client_subscriptions DB error: {e}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get client subscriptions: {str(e)}",
        ) from e
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[ERROR] get_client_subscriptions failed: {str(e)}")
        print(f"[ERROR] Traceback: {error_trace}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to get client subscriptions: {str(e)}. Check server logs for details."
        )

@router.get("/{subscription_id}", response_model=SubscriptionResponse)
async def get_subscription(
    subscription_id: str,
    db: Session = Depends(get_db)
):
    """Get a specific subscription by ID"""
    subscription = db.query(models.Subscription).filter(
        models.Subscription.id == subscription_id
    ).first()
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    # Convert to response format using helper function
    try:
        return subscription_to_response(subscription)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to serialize subscription: {str(e)}")

@router.patch("/{subscription_id}", response_model=SubscriptionResponse)
async def update_subscription(
    subscription_id: str,
    subscription_update: SubscriptionUpdate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Update a subscription (pause/resume/activate)"""
    subscription = db.query(models.Subscription).filter(
        models.Subscription.id == subscription_id
    ).first()
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    try:
        # Store before state
        before_state = {
            'status': subscription.status,
            'start_date': subscription.start_date.isoformat() if subscription.start_date else None,
            'end_date': subscription.end_date.isoformat() if subscription.end_date else None
        }
        
        # Update fields
        for field, value in subscription_update.model_dump(exclude_unset=True).items():
            setattr(subscription, field, value)
        
        # If activating subscription, set start and end dates
        if subscription_update.status == "active" and not subscription.start_date:
            subscription.start_date = datetime.now()
            subscription.end_date = datetime.now() + timedelta(days=subscription.duration_days)
        
        db.flush()
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=subscription_id,
            aggregate_type='subscription',
            event_type=EventType.SUBSCRIPTION_UPDATED,
            payload={
                'subscription_id': subscription_id,
                'client_id': subscription.client_id,
                'nutritionist_id': subscription.nutritionist_id,
                'old_status': before_state['status'],
                'new_status': subscription.status,
                'start_date': subscription.start_date.isoformat() if subscription.start_date else None,
                'end_date': subscription.end_date.isoformat() if subscription.end_date else None
            },
            metadata={
                'ip_address': request.client.host if request.client else None
            }
        )
        
        # Log to audit log
        AuditLogger.log_update(
            db=db,
            target_type='subscription',
            target_id=subscription_id,
            before_state=before_state,
            after_state={
                'status': subscription.status,
                'start_date': subscription.start_date.isoformat() if subscription.start_date else None,
                'end_date': subscription.end_date.isoformat() if subscription.end_date else None
            },
            user_id=subscription.client_id,
            user_role='client',
            request=request
        )
        
        db.commit()
        db.refresh(subscription)
        
        # Build event data for WebSocket broadcast
        event_data = EventBuilder.build_event(
            EventType.SUBSCRIPTION_UPDATED,
            {
                "id": subscription.id,
                "client_id": subscription.client_id,
                "nutritionist_id": subscription.nutritionist_id,
                "status": subscription.status,
                "start_date": subscription.start_date.isoformat() if subscription.start_date else None,
                "end_date": subscription.end_date.isoformat() if subscription.end_date else None
            }
        )
        
        # Broadcast to client channel
        await manager.broadcast_to_channel(
            EventChannel.client(subscription.client_id),
            event_data
        )
        
        # Broadcast to kitchen channel
        await manager.broadcast_to_channel(EventChannel.KITCHEN, event_data)
        
        # Broadcast to admin channel
        await manager.broadcast_to_channel(EventChannel.ADMIN, event_data)
        
        # Broadcast to nutritionist if assigned
        if subscription.nutritionist_id:
            await manager.broadcast_to_channel(
                EventChannel.nutritionist(subscription.nutritionist_id),
                event_data
            )
        
        # Convert to response format using helper function
        return subscription_to_response(subscription)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update subscription: {str(e)}")

@router.get("/{subscription_id}/incomplete-items")
async def get_incomplete_items(
    subscription_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get list of incomplete items for a subscription (for post-payment completion)"""
    subscription = db.query(models.Subscription).filter(
        models.Subscription.id == subscription_id,
        models.Subscription.client_id == current_user.id
    ).first()
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    incomplete_items = []
    
    # Check health_inputs
    if not subscription.health_inputs or subscription.health_inputs.strip() == "":
        incomplete_items.append({
            "type": "health_inputs",
            "label": "Health Information",
            "description": "Please provide your health goals and preferences"
        })
    else:
        try:
            import json
            health_data = json.loads(subscription.health_inputs)
            if not health_data or len(health_data) == 0:
                incomplete_items.append({
                    "type": "health_inputs",
                    "label": "Health Information",
                    "description": "Please provide your health goals and preferences"
                })
        except:
            incomplete_items.append({
                "type": "health_inputs",
                "label": "Health Information",
                "description": "Please provide your health goals and preferences"
            })
    
    # Check meal_timing
    if not subscription.meal_timing or subscription.meal_timing.strip() == "":
        incomplete_items.append({
            "type": "meal_timing",
            "label": "Meal Timing",
            "description": "Please set your meal schedule and delivery addresses"
        })
    else:
        try:
            import json
            meal_data = json.loads(subscription.meal_timing)
            if not meal_data or len(meal_data) == 0:
                incomplete_items.append({
                    "type": "meal_timing",
                    "label": "Meal Timing",
                    "description": "Please set your meal schedule and delivery addresses"
                })
        except:
            incomplete_items.append({
                "type": "meal_timing",
                "label": "Meal Timing",
                "description": "Please set your meal schedule and delivery addresses"
            })
    
    # Check consultation
    checkout_data = None
    if subscription.checkout_data_id:
        checkout_data = db.query(models.CheckoutData).filter(
            models.CheckoutData.id == subscription.checkout_data_id
        ).first()
    
    if checkout_data:
        # Only check consultation if user wants one (consultation_preference is True)
        if checkout_data.consultation_preference:
            if not checkout_data.consultation_date or not checkout_data.consultation_time_slot or not checkout_data.consultation_mode:
                incomplete_items.append({
                    "type": "consultation",
                    "label": "Nutritionist Consultation",
                    "description": "Please schedule your consultation with your nutritionist"
                })
    else:
        # If no checkout_data, we can't determine consultation preference, so don't mark as incomplete
        # (consultation is optional)
        pass
    
    # Check delivery_addresses
    if checkout_data:
        if not checkout_data.delivery_addresses or checkout_data.delivery_addresses.strip() == "":
            incomplete_items.append({
                "type": "delivery_addresses",
                "label": "Delivery Addresses",
                "description": "Please provide delivery addresses for your meals"
            })
        else:
            try:
                import json
                addresses = json.loads(checkout_data.delivery_addresses)
                if not addresses or len(addresses) == 0:
                    incomplete_items.append({
                        "type": "delivery_addresses",
                        "label": "Delivery Addresses",
                        "description": "Please provide delivery addresses for your meals"
                    })
            except:
                incomplete_items.append({
                    "type": "delivery_addresses",
                    "label": "Delivery Addresses",
                    "description": "Please provide delivery addresses for your meals"
                })
    
    return {
        "subscription_id": subscription_id,
        "incomplete_items": incomplete_items,
        "is_complete": len(incomplete_items) == 0,
        "completion_percentage": int((1 - len(incomplete_items) / 4) * 100) if incomplete_items else 100
    }

@router.get("/{subscription_id}/daily-schedule")
async def get_subscription_daily_schedule(
    subscription_id: str,
    db: Session = Depends(get_db)
):
    """Get the 30-day meal schedule for a subscription"""
    subscription = db.query(models.Subscription).filter(
        models.Subscription.id == subscription_id
    ).first()
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    # Get all daily meal schedules for this subscription
    schedules = db.query(models.DailyMealSchedule).filter(
        models.DailyMealSchedule.subscription_id == subscription_id
    ).order_by(models.DailyMealSchedule.date).all()
    
    return {
        "subscription_id": subscription_id,
        "total_days": subscription.duration_days,
        "schedules": schedules
    }

