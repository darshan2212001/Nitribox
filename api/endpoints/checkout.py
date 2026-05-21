from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
from api.database import get_db
from api import models
from pydantic import BaseModel, field_validator
from api.simple_auth import get_current_user_required, get_current_user_optional
from api.connection_manager import manager
from api.events import EventType, EventChannel, EventBuilder
from api.event_store import EventStore
from api.audit_logger import AuditLogger
from fastapi import Request
import json

router = APIRouter(prefix="/checkout", tags=["Checkout"])

# Pydantic schemas
class CheckoutStartRequest(BaseModel):
    meal_plan_id: str

class CheckoutSaveRequest(BaseModel):
    checkout_id: Optional[str] = None
    meal_plan_id: str
    plan_category: str
    health_inputs: Optional[Dict[str, Any]] = None
    meal_timing: Optional[Dict[str, Any]] = None
    consultation_preference: bool = False
    consultation_date: Optional[datetime] = None
    consultation_time_slot: Optional[str] = None
    consultation_mode: Optional[str] = None
    delivery_addresses: Optional[Dict[str, Any]] = None  # Structure: {"breakfast": "address_id", "lunch": "address_id", "dinner": "address_id"}

class CheckoutCompleteRequest(BaseModel):
    checkout_id: str
    discount_code: Optional[str] = None

class CheckoutDataResponse(BaseModel):
    id: str
    user_id: str
    subscription_id: Optional[str]
    meal_plan_id: str
    plan_category: str
    health_inputs: Optional[Dict[str, Any]] = None
    meal_timing: Optional[Dict[str, Any]] = None
    consultation_preference: bool
    consultation_date: Optional[datetime] = None
    consultation_time_slot: Optional[str] = None
    consultation_mode: Optional[str] = None
    delivery_addresses: Optional[Dict[str, Any]] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    @classmethod
    def from_orm(cls, checkout_data: models.CheckoutData):
        return cls(
            id=checkout_data.id,
            user_id=checkout_data.user_id,
            subscription_id=checkout_data.subscription_id,
            meal_plan_id=checkout_data.meal_plan_id,
            plan_category=checkout_data.plan_category,
            health_inputs=json.loads(checkout_data.health_inputs) if checkout_data.health_inputs else None,
            meal_timing=json.loads(checkout_data.meal_timing) if checkout_data.meal_timing else None,
            consultation_preference=checkout_data.consultation_preference,
            consultation_date=checkout_data.consultation_date,
            consultation_time_slot=checkout_data.consultation_time_slot,
            consultation_mode=checkout_data.consultation_mode,
            delivery_addresses=json.loads(checkout_data.delivery_addresses) if checkout_data.delivery_addresses else None,
            status=checkout_data.status,
            created_at=checkout_data.created_at,
            updated_at=checkout_data.updated_at,
        )

@router.post("/start", response_model=CheckoutDataResponse)
async def start_checkout(
    request_data: CheckoutStartRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required),
    http_request: Request = None
):
    """Initialize a new checkout session"""
    try:
        # Verify meal plan exists
        meal_plan = db.query(models.MealPlan).filter(
            models.MealPlan.id == request_data.meal_plan_id
        ).first()
        
        if not meal_plan:
            raise HTTPException(status_code=404, detail="Meal plan not found")
        
        if not meal_plan.is_active:
            raise HTTPException(status_code=400, detail="Meal plan is not active")
        
        # Check if user has an existing draft checkout for this plan
        existing_checkout = db.query(models.CheckoutData).filter(
            models.CheckoutData.user_id == current_user.id,
            models.CheckoutData.meal_plan_id == request_data.meal_plan_id,
            models.CheckoutData.status == "draft"
        ).first()
        
        if existing_checkout:
            return CheckoutDataResponse.from_orm(existing_checkout)
        
        # Create new checkout data
        checkout_data = models.CheckoutData(
            user_id=current_user.id,
            meal_plan_id=request_data.meal_plan_id,
            plan_category=meal_plan.category,
            status="draft"
        )
        
        db.add(checkout_data)
        db.commit()
        db.refresh(checkout_data)
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=checkout_data.id,
            aggregate_type='checkout',
            event_type=EventType.SUBSCRIPTION_UPDATED,
            payload={
                'checkout_id': checkout_data.id,
                'user_id': current_user.id,
                'meal_plan_id': request_data.meal_plan_id,
                'status': 'started'
            },
            metadata={
                'user_id': current_user.id,
                'user_role': current_user.role,
                'ip_address': http_request.client.host if http_request and http_request.client else None
            }
        )
        
        return CheckoutDataResponse.from_orm(checkout_data)
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to start checkout: {str(e)}")

@router.post("/save", response_model=CheckoutDataResponse)
async def save_checkout(
    request_data: CheckoutSaveRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required),
    http_request: Request = None
):
    """Save draft checkout data - allows updates even after payment completion"""
    try:
        # Verify meal plan exists
        meal_plan = db.query(models.MealPlan).filter(
            models.MealPlan.id == request_data.meal_plan_id
        ).first()
        
        if not meal_plan:
            raise HTTPException(status_code=404, detail="Meal plan not found")
        
        checkout_data = None
        
        if request_data.checkout_id:
            # Update existing checkout - allow updates even if status is "completed" (for post-payment completion)
            # First check if checkout exists (without user filter to see if it exists at all)
            checkout_data = db.query(models.CheckoutData).filter(
                models.CheckoutData.id == request_data.checkout_id
            ).first()
            
            if not checkout_data:
                raise HTTPException(status_code=404, detail="Checkout data not found")
            
            # Verify user owns this checkout data
            if checkout_data.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to update this checkout data"
                )
            
            # If checkout is completed and linked to a subscription, also update the subscription
            if checkout_data.status == "completed" and checkout_data.subscription_id:
                subscription = db.query(models.Subscription).filter(
                    models.Subscription.id == checkout_data.subscription_id,
                    models.Subscription.client_id == current_user.id
                ).first()
                
                if subscription:
                    # Update subscription with new data (denormalized for quick access)
                    if request_data.health_inputs:
                        subscription.health_inputs = json.dumps(request_data.health_inputs)
                    if request_data.meal_timing:
                        subscription.meal_timing = json.dumps(request_data.meal_timing)
        else:
            # Create new checkout
            checkout_data = models.CheckoutData(
                user_id=current_user.id,
                meal_plan_id=request_data.meal_plan_id,
                plan_category=request_data.plan_category,
                status="draft"
            )
            db.add(checkout_data)
        
        # Update fields - allow updates regardless of status
        if request_data.health_inputs is not None:
            checkout_data.health_inputs = json.dumps(request_data.health_inputs)
        if request_data.meal_timing is not None:
            checkout_data.meal_timing = json.dumps(request_data.meal_timing)
        if request_data.consultation_preference is not None:
            checkout_data.consultation_preference = request_data.consultation_preference
        if request_data.consultation_date is not None:
            checkout_data.consultation_date = request_data.consultation_date
        if request_data.consultation_time_slot is not None:
            checkout_data.consultation_time_slot = request_data.consultation_time_slot
        if request_data.consultation_mode is not None:
            checkout_data.consultation_mode = request_data.consultation_mode
        
        # Handle delivery_addresses - can come from meal_timing or directly
        if request_data.delivery_addresses is not None:
            checkout_data.delivery_addresses = json.dumps(request_data.delivery_addresses)
        elif request_data.meal_timing and isinstance(request_data.meal_timing, dict) and "delivery_addresses" in request_data.meal_timing:
            checkout_data.delivery_addresses = json.dumps(request_data.meal_timing["delivery_addresses"])
        
        if request_data.plan_category:
            checkout_data.plan_category = request_data.plan_category
        
        db.commit()
        db.refresh(checkout_data)
        
        return CheckoutDataResponse.from_orm(checkout_data)
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        import traceback
        error_trace = traceback.format_exc()
        print(f"[Checkout] Save error: {type(e).__name__}: {str(e)}")
        print(f"[Checkout] Traceback:\n{error_trace}")
        raise HTTPException(status_code=500, detail=f"Failed to save checkout: {str(e)}")

@router.post("/complete", response_model=Dict[str, Any])
async def complete_checkout(
    request_data: CheckoutCompleteRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required),
    http_request: Request = None
):
    """Complete checkout and create subscription with pending allocation status (idempotent)"""
    try:
        # Get checkout data
        checkout_data = db.query(models.CheckoutData).filter(
            models.CheckoutData.id == request_data.checkout_id,
            models.CheckoutData.user_id == current_user.id
        ).first()
        
        if not checkout_data:
            raise HTTPException(status_code=404, detail="Checkout data not found")
        
        # Idempotency: If checkout is already completed, return existing subscription
        if checkout_data.status == "completed" and checkout_data.subscription_id:
            # Get existing subscription
            subscription = db.query(models.Subscription).filter(
                models.Subscription.id == checkout_data.subscription_id
            ).first()
            
            if subscription:
                return {
                    "checkout_id": checkout_data.id,
                    "subscription_id": subscription.id,
                    "status": "completed",
                    "allocation_status": subscription.allocation_status or "pending_allocation",
                    "message": "Checkout already completed. Using existing subscription.",
                    "already_completed": True
                }
            else:
                # Subscription was deleted but checkout marked as completed - reset status
                checkout_data.status = "draft"
                checkout_data.subscription_id = None
                db.commit()
        
        # Get meal plan
        meal_plan = db.query(models.MealPlan).filter(
            models.MealPlan.id == checkout_data.meal_plan_id
        ).first()
        
        if not meal_plan:
            raise HTTPException(status_code=404, detail="Meal plan not found")
        
        # Validate required data before completing
        if not checkout_data.health_inputs or checkout_data.health_inputs.strip() == "":
            raise HTTPException(
                status_code=400, 
                detail="Health information is required. Please complete the health inputs step."
            )
        
        if not checkout_data.meal_timing or checkout_data.meal_timing.strip() == "":
            raise HTTPException(
                status_code=400,
                detail="Meal timing is required. Please complete the meal timing step."
            )
        
        # Check if subscription already exists for this checkout (prevent duplicates)
        existing_subscription = db.query(models.Subscription).filter(
            models.Subscription.checkout_data_id == checkout_data.id
        ).first()
        
        if existing_subscription:
            # Update checkout status if not already set
            checkout_data.status = "completed"
            checkout_data.subscription_id = existing_subscription.id
            db.commit()
            
            return {
                "checkout_id": checkout_data.id,
                "subscription_id": existing_subscription.id,
                "status": "completed",
                "allocation_status": existing_subscription.allocation_status or "pending_allocation",
                "message": "Checkout completed. Using existing subscription.",
                "already_completed": True
            }
        
        # Calculate duration and amount (can be enhanced with discount code logic)
        duration_days = 30  # Default, can be extracted from checkout data
        total_amount = meal_plan.current_price
        
        # Apply discount if provided (placeholder for discount logic)
        if request_data.discount_code:
            # TODO: Implement discount code validation and application
            pass
        
        # Create subscription with pending allocation
        subscription = models.Subscription(
            client_id=current_user.id,
            meal_plan_id=checkout_data.meal_plan_id,
            duration_days=duration_days,
            meals_per_day=3,  # Default, can be extracted from meal_timing
            total_amount=total_amount,
            payment_status="pending",
            allocation_status="pending_allocation",
            checkout_data_id=checkout_data.id,
            health_inputs=checkout_data.health_inputs,
            meal_timing=checkout_data.meal_timing
        )
        
        db.add(subscription)
        
        # Update checkout status
        checkout_data.status = "completed"
        checkout_data.subscription_id = subscription.id
        
        db.commit()
        db.refresh(subscription)
        db.refresh(checkout_data)
        
        # Log event (wrap in try-except to prevent event logging from failing the request)
        try:
            EventStore.append_event(
                db=db,
                aggregate_id=subscription.id,
                aggregate_type='subscription',
                event_type=EventType.SUBSCRIPTION_UPDATED,
                payload={
                    'subscription_id': subscription.id,
                    'client_id': current_user.id,
                    'meal_plan_id': checkout_data.meal_plan_id,
                    'allocation_status': 'pending_allocation'
                },
                metadata={
                    'user_id': current_user.id,
                    'user_role': current_user.role,
                    'ip_address': http_request.client.host if http_request and http_request.client else None
                }
            )
        except Exception as event_error:
            # Log but don't fail the request if event logging fails
            print(f"[Checkout] Warning: Failed to log event: {str(event_error)}")
        
        # Broadcast to admin channel for allocation (wrap in try-except)
        try:
            event_data = EventBuilder.build_event(
                EventType.SUBSCRIPTION_UPDATED,
                {
                    "subscription_id": subscription.id,
                    "client_id": current_user.id,
                    "allocation_status": "pending_allocation",
                    "meal_plan_id": checkout_data.meal_plan_id
                }
            )
            await manager.broadcast_to_channel(
                EventChannel.admin(),
                event_data
            )
        except Exception as broadcast_error:
            # Log but don't fail the request if broadcast fails
            print(f"[Checkout] Warning: Failed to broadcast event: {str(broadcast_error)}")
        
        return {
            "checkout_id": checkout_data.id,
            "subscription_id": subscription.id,
            "status": "completed",
            "allocation_status": "pending_allocation",
            "message": "Checkout completed. Subscription created and awaiting nutritionist allocation.",
            "already_completed": False
        }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        import traceback
        error_trace = traceback.format_exc()
        print(f"[Checkout] Complete error: {type(e).__name__}: {str(e)}")
        print(f"[Checkout] Traceback:\n{error_trace}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to complete checkout: {str(e)}"
        )

@router.get("/subscription/{subscription_id}", response_model=CheckoutDataResponse)
async def get_checkout_by_subscription(
    subscription_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get checkout data linked to a subscription (for post-payment editing)"""
    # Verify subscription belongs to user
    subscription = db.query(models.Subscription).filter(
        models.Subscription.id == subscription_id,
        models.Subscription.client_id == current_user.id
    ).first()
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    # Get checkout data
    checkout_data = None
    if subscription.checkout_data_id:
        checkout_data = db.query(models.CheckoutData).filter(
            models.CheckoutData.id == subscription.checkout_data_id,
            models.CheckoutData.user_id == current_user.id
        ).first()
    
    if not checkout_data:
        # If no checkout_data linked, create one from subscription data
        # Get meal plan to get plan_category
        meal_plan = db.query(models.MealPlan).filter(
            models.MealPlan.id == subscription.meal_plan_id
        ).first()
        
        plan_category = meal_plan.category if meal_plan else "weight_loss"
        
        checkout_data = models.CheckoutData(
            user_id=current_user.id,
            meal_plan_id=subscription.meal_plan_id,
            subscription_id=subscription.id,
            plan_category=plan_category,
            status="completed",
            health_inputs=subscription.health_inputs,
            meal_timing=subscription.meal_timing
        )
        db.add(checkout_data)
        db.commit()
        db.refresh(checkout_data)
    
    return CheckoutDataResponse.from_orm(checkout_data)

@router.get("/{checkout_id}", response_model=CheckoutDataResponse)
async def get_checkout(
    checkout_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Retrieve checkout data"""
    checkout_data = db.query(models.CheckoutData).filter(
        models.CheckoutData.id == checkout_id,
        models.CheckoutData.user_id == current_user.id
    ).first()
    
    if not checkout_data:
        raise HTTPException(status_code=404, detail="Checkout data not found")
    
    return CheckoutDataResponse.from_orm(checkout_data)

