from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
from api.database import get_db
from api import models
from pydantic import BaseModel
from api.simple_auth import get_current_user_required
from api.connection_manager import manager
from api.events import EventType, EventChannel, EventBuilder
from api.event_store import EventStore
from api.audit_logger import AuditLogger
from fastapi import Request
import json

router = APIRouter(prefix="/admin/nutritionist-allocation", tags=["Admin - Nutritionist Allocation"])

# Pydantic schemas
class UserAllocationItem(BaseModel):
    user_id: str
    user_name: str
    subscription_id: str
    meal_plan_id: str
    meal_plan_title: str
    plan_category: str
    duration_days: int
    primary_goal: Optional[str] = None
    key_conditions: Optional[List[str]] = None
    payment_status: str
    consultation_preference: bool
    consultation_date: Optional[datetime] = None
    allocation_status: str
    created_at: datetime

class NutritionistOption(BaseModel):
    id: str
    name: str
    specialization: Optional[str] = None
    current_load: int  # Number of active users
    rating: float
    is_available: bool

class AllocateNutritionistRequest(BaseModel):
    subscription_id: str
    nutritionist_id: str

class UserDetailsResponse(BaseModel):
    user_id: str
    user_name: str
    user_email: str
    user_phone: Optional[str] = None
    subscription_id: str
    meal_plan_id: str
    meal_plan_title: str
    plan_category: str
    duration_days: int
    primary_goal: Optional[str] = None
    health_conditions: Optional[List[str]] = None
    dietary_preferences: Optional[str] = None
    health_inputs: Optional[Dict[str, Any]] = None
    meal_timing: Optional[Dict[str, Any]] = None
    delivery_addresses: Optional[Dict[str, Any]] = None
    consultation_preference: bool
    consultation_date: Optional[datetime] = None
    consultation_time_slot: Optional[str] = None
    consultation_mode: Optional[str] = None
    payment_status: str
    allocation_status: str
    # Client profile data
    client_age: Optional[int] = None
    client_gender: Optional[str] = None
    client_height: Optional[float] = None
    client_weight_start: Optional[float] = None
    client_weight_goal: Optional[float] = None
    created_at: datetime

@router.get("/pending", response_model=List[UserAllocationItem])
async def get_pending_allocations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get list of users pending nutritionist allocation"""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get subscriptions with pending allocation
    subscriptions = db.query(models.Subscription).filter(
        models.Subscription.allocation_status == "pending_allocation"
    ).all()
    
    result = []
    for sub in subscriptions:
        # Get user
        user = db.query(models.User).filter(models.User.id == sub.client_id).first()
        if not user:
            continue
        
        # Get meal plan
        meal_plan = db.query(models.MealPlan).filter(models.MealPlan.id == sub.meal_plan_id).first()
        if not meal_plan:
            continue
        
        # Get client data
        client = db.query(models.Client).filter(models.Client.user_id == sub.client_id).first()
        
        # Get checkout data for health inputs
        checkout_data = db.query(models.CheckoutData).filter(
            models.CheckoutData.subscription_id == sub.id
        ).first()
        
        key_conditions = []
        if client and client.health_conditions:
            try:
                conditions = json.loads(client.health_conditions) if isinstance(client.health_conditions, str) else client.health_conditions
                if isinstance(conditions, list):
                    key_conditions = conditions
                elif isinstance(conditions, str):
                    key_conditions = [conditions]
            except:
                if isinstance(client.health_conditions, str):
                    key_conditions = [client.health_conditions]
        
        # Get consultation preference from checkout data
        consultation_preference = False
        consultation_date = None
        if checkout_data:
            consultation_preference = checkout_data.consultation_preference
            consultation_date = checkout_data.consultation_date
        
        result.append(UserAllocationItem(
            user_id=user.id,
            user_name=user.name,
            subscription_id=sub.id,
            meal_plan_id=sub.meal_plan_id,
            meal_plan_title=meal_plan.title,
            plan_category=meal_plan.category,
            duration_days=sub.duration_days,
            primary_goal=client.weight_goal if client else None,
            key_conditions=key_conditions,
            payment_status=sub.payment_status,
            consultation_preference=consultation_preference,
            consultation_date=consultation_date,
            allocation_status=sub.allocation_status,
            created_at=sub.created_at
        ))
    
    return result

@router.get("/nutritionists", response_model=List[NutritionistOption])
async def get_nutritionists_for_allocation(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get list of nutritionists with their current load for allocation"""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    nutritionists = db.query(models.Nutritionist).filter(
        models.Nutritionist.is_available == True
    ).all()
    
    result = []
    for nut in nutritionists:
        # Count active users for this nutritionist
        active_count = db.query(models.Subscription).filter(
            models.Subscription.nutritionist_id == nut.id,
            models.Subscription.status == "active"
        ).count()
        
        result.append(NutritionistOption(
            id=nut.id,
            name=nut.name,
            specialization=nut.specialization,
            current_load=active_count,
            rating=nut.rating,
            is_available=nut.is_available
        ))
    
    return result

@router.get("/user/{user_id}/details", response_model=UserDetailsResponse)
async def get_user_details(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get comprehensive user details for allocation"""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get user
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get subscription
    subscription = db.query(models.Subscription).filter(
        models.Subscription.client_id == user_id,
        models.Subscription.allocation_status == "pending_allocation"
    ).first()
    
    if not subscription:
        raise HTTPException(status_code=404, detail="No pending subscription found for this user")
    
    # Get meal plan
    meal_plan = db.query(models.MealPlan).filter(models.MealPlan.id == subscription.meal_plan_id).first()
    if not meal_plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")
    
    # Get client data
    client = db.query(models.Client).filter(models.Client.user_id == user_id).first()
    
    # Get checkout data
    checkout_data = db.query(models.CheckoutData).filter(
        models.CheckoutData.subscription_id == subscription.id
    ).first()
    
    # Parse health conditions
    health_conditions = None
    if client and client.health_conditions:
        try:
            conditions = json.loads(client.health_conditions) if isinstance(client.health_conditions, str) else client.health_conditions
            if isinstance(conditions, list):
                health_conditions = conditions
            elif isinstance(conditions, str):
                health_conditions = [conditions]
        except:
            if isinstance(client.health_conditions, str):
                health_conditions = [client.health_conditions]
    
    # Parse health inputs and meal timing
    health_inputs = None
    meal_timing = None
    delivery_addresses = None
    
    if checkout_data:
        if checkout_data.health_inputs:
            try:
                health_inputs = json.loads(checkout_data.health_inputs)
            except:
                pass
        if checkout_data.meal_timing:
            try:
                meal_timing = json.loads(checkout_data.meal_timing)
            except:
                pass
        if checkout_data.delivery_addresses:
            try:
                delivery_addresses = json.loads(checkout_data.delivery_addresses)
            except:
                pass
    
    return UserDetailsResponse(
        user_id=user.id,
        user_name=user.name,
        user_email=user.email,
        user_phone=user.phone,
        subscription_id=subscription.id,
        meal_plan_id=subscription.meal_plan_id,
        meal_plan_title=meal_plan.title,
        plan_category=meal_plan.category,
        duration_days=subscription.duration_days,
        primary_goal=str(client.weight_goal) if client and client.weight_goal else None,
        health_conditions=health_conditions,
        dietary_preferences=client.dietary_preferences if client else None,
        health_inputs=health_inputs,
        meal_timing=meal_timing,
        delivery_addresses=delivery_addresses,
        consultation_preference=checkout_data.consultation_preference if checkout_data else False,
        consultation_date=checkout_data.consultation_date if checkout_data else None,
        consultation_time_slot=checkout_data.consultation_time_slot if checkout_data else None,
        consultation_mode=checkout_data.consultation_mode if checkout_data else None,
        payment_status=subscription.payment_status,
        allocation_status=subscription.allocation_status,
        client_age=client.age if client else None,
        client_gender=client.gender if client else None,
        client_height=client.height if client else None,
        client_weight_start=client.weight_start if client else None,
        client_weight_goal=client.weight_goal if client else None,
        created_at=subscription.created_at
    )

@router.post("/allocate", response_model=Dict[str, Any])
async def allocate_nutritionist(
    request_data: AllocateNutritionistRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required),
    http_request: Request = None
):
    """Allocate a nutritionist to a user's subscription"""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get subscription
    subscription = db.query(models.Subscription).filter(
        models.Subscription.id == request_data.subscription_id
    ).first()
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    if subscription.allocation_status != "pending_allocation":
        raise HTTPException(status_code=400, detail=f"Subscription is not pending allocation. Current status: {subscription.allocation_status}")
    
    # Get nutritionist
    nutritionist = db.query(models.Nutritionist).filter(
        models.Nutritionist.id == request_data.nutritionist_id
    ).first()
    
    if not nutritionist:
        raise HTTPException(status_code=404, detail="Nutritionist not found")
    
    if not nutritionist.is_available:
        raise HTTPException(status_code=400, detail="Nutritionist is not available")
    
    # Update subscription
    subscription.nutritionist_id = request_data.nutritionist_id
    subscription.allocation_status = "assigned"
    subscription.status = "active"  # Activate subscription
    
    # Update client record
    client = db.query(models.Client).filter(models.Client.user_id == subscription.client_id).first()
    if client:
        client.nutritionist_id = request_data.nutritionist_id
    
    db.commit()
    db.refresh(subscription)
    
    # Log event
    EventStore.append_event(
        db=db,
        aggregate_id=subscription.id,
        aggregate_type='subscription',
        event_type=EventType.SUBSCRIPTION_UPDATED,
        payload={
            'subscription_id': subscription.id,
            'client_id': subscription.client_id,
            'nutritionist_id': request_data.nutritionist_id,
            'allocation_status': 'assigned'
        },
        metadata={
            'user_id': current_user.id,
            'user_role': current_user.role,
            'ip_address': http_request.client.host if http_request and http_request.client else None
        }
    )
    
    # Broadcast to nutritionist channel
    event_data = EventBuilder.build_event(
        EventType.SUBSCRIPTION_UPDATED,
        {
            "subscription_id": subscription.id,
            "client_id": subscription.client_id,
            "nutritionist_id": request_data.nutritionist_id,
            "allocation_status": "assigned",
            "action": "new_assignment"
        }
    )
    await manager.broadcast_to_channel(
        EventChannel.nutritionist(request_data.nutritionist_id),
        event_data
    )
    
    # Broadcast to client channel
    await manager.broadcast_to_channel(
        EventChannel.client(subscription.client_id),
        event_data
    )
    
    return {
        "subscription_id": subscription.id,
        "nutritionist_id": request_data.nutritionist_id,
        "nutritionist_name": nutritionist.name,
        "allocation_status": "assigned",
        "message": f"User allocated to {nutritionist.name}"
    }

