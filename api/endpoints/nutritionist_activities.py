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
from fastapi import Request
import json

router = APIRouter(prefix="/nutritionist", tags=["Nutritionist"])

# Pydantic schemas
class AssignedUserSummary(BaseModel):
    user_id: str
    user_name: str
    subscription_id: str
    meal_plan_title: str
    goal: Optional[str] = None
    start_date: Optional[datetime] = None
    health_flags: List[str] = []
    adherence_percentage: Optional[float] = None
    last_activity: Optional[datetime] = None
    next_consultation: Optional[datetime] = None
    is_new_assignment: bool = False

class UserActivityItem(BaseModel):
    id: str
    activity_type: str
    activity_data: Dict[str, Any]
    created_at: datetime

class AddNoteRequest(BaseModel):
    user_id: str
    subscription_id: str
    note: str

@router.get("/assigned-users", response_model=List[AssignedUserSummary])
async def get_assigned_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get list of users assigned to the current nutritionist"""
    if current_user.role != 'nutritionist':
        raise HTTPException(status_code=403, detail="Nutritionist access required")
    
    # Get nutritionist record
    nutritionist = db.query(models.Nutritionist).filter(
        models.Nutritionist.user_id == current_user.id
    ).first()
    
    if not nutritionist:
        raise HTTPException(status_code=404, detail="Nutritionist profile not found")
    
    # Get subscriptions assigned to this nutritionist
    subscriptions = db.query(models.Subscription).filter(
        models.Subscription.nutritionist_id == nutritionist.id,
        models.Subscription.status.in_(["active", "assigned"])
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
        
        # Get health conditions
        health_flags = []
        if client and client.health_conditions:
            try:
                conditions = json.loads(client.health_conditions) if isinstance(client.health_conditions, str) else client.health_conditions
                if isinstance(conditions, list):
                    health_flags = conditions
                elif isinstance(conditions, str):
                    health_flags = [conditions]
            except:
                if isinstance(client.health_conditions, str):
                    health_flags = [client.health_conditions]
        
        # Get last activity
        last_activity = db.query(models.UserActivity).filter(
            models.UserActivity.user_id == sub.client_id
        ).order_by(models.UserActivity.created_at.desc()).first()
        
        # Get next consultation
        next_consultation = db.query(models.Consultation).filter(
            models.Consultation.client_id == sub.client_id,
            models.Consultation.nutritionist_id == nutritionist.id,
            models.Consultation.status == "scheduled",
            models.Consultation.date >= datetime.now()
        ).order_by(models.Consultation.date.asc()).first()
        
        # Calculate adherence (placeholder - can be enhanced with actual meal check-in data)
        adherence_percentage = None
        # TODO: Calculate from meal check-ins
        
        # Check if new assignment (created within last 24 hours)
        is_new_assignment = False
        if sub.allocation_status == "assigned":
            time_diff = datetime.now() - sub.updated_at.replace(tzinfo=None) if sub.updated_at else datetime.now() - sub.created_at.replace(tzinfo=None)
            is_new_assignment = time_diff.total_seconds() < 86400  # 24 hours
        
        result.append(AssignedUserSummary(
            user_id=user.id,
            user_name=user.name,
            subscription_id=sub.id,
            meal_plan_title=meal_plan.title,
            goal=str(client.weight_goal) if client and client.weight_goal else None,
            start_date=sub.start_date,
            health_flags=health_flags,
            adherence_percentage=adherence_percentage,
            last_activity=last_activity.created_at if last_activity else None,
            next_consultation=next_consultation.date if next_consultation else None,
            is_new_assignment=is_new_assignment
        ))
    
    return result

@router.get("/user/{user_id}/activities", response_model=List[UserActivityItem])
async def get_user_activities(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get activity timeline for a specific user"""
    if current_user.role != 'nutritionist':
        raise HTTPException(status_code=403, detail="Nutritionist access required")
    
    # Get nutritionist record
    nutritionist = db.query(models.Nutritionist).filter(
        models.Nutritionist.user_id == current_user.id
    ).first()
    
    if not nutritionist:
        raise HTTPException(status_code=404, detail="Nutritionist profile not found")
    
    # Verify this user is assigned to this nutritionist
    subscription = db.query(models.Subscription).filter(
        models.Subscription.client_id == user_id,
        models.Subscription.nutritionist_id == nutritionist.id
    ).first()
    
    if not subscription:
        raise HTTPException(status_code=403, detail="User is not assigned to you")
    
    # Get activities
    activities = db.query(models.UserActivity).filter(
        models.UserActivity.user_id == user_id
    ).order_by(models.UserActivity.created_at.desc()).limit(100).all()
    
    result = []
    for activity in activities:
        activity_data = {}
        if activity.activity_data:
            try:
                activity_data = json.loads(activity.activity_data) if isinstance(activity.activity_data, str) else activity.activity_data
            except:
                pass
        
        result.append(UserActivityItem(
            id=activity.id,
            activity_type=activity.activity_type,
            activity_data=activity_data,
            created_at=activity.created_at
        ))
    
    return result

@router.post("/user/{user_id}/notes")
async def add_note(
    user_id: str,
    request_data: AddNoteRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required),
    http_request: Request = None
):
    """Add a private note for a user (nutritionist-only)"""
    if current_user.role != 'nutritionist':
        raise HTTPException(status_code=403, detail="Nutritionist access required")
    
    # Get nutritionist record
    nutritionist = db.query(models.Nutritionist).filter(
        models.Nutritionist.user_id == current_user.id
    ).first()
    
    if not nutritionist:
        raise HTTPException(status_code=404, detail="Nutritionist profile not found")
    
    # Verify this user is assigned to this nutritionist
    subscription = db.query(models.Subscription).filter(
        models.Subscription.client_id == user_id,
        models.Subscription.nutritionist_id == nutritionist.id,
        models.Subscription.id == request_data.subscription_id
    ).first()
    
    if not subscription:
        raise HTTPException(status_code=403, detail="User is not assigned to you")
    
    # Create activity entry for the note
    activity = models.UserActivity(
        user_id=user_id,
        subscription_id=request_data.subscription_id,
        nutritionist_id=nutritionist.id,
        activity_type="nutritionist_note",
        activity_data=json.dumps({
            "note": request_data.note,
            "nutritionist_name": nutritionist.name
        })
    )
    
    db.add(activity)
    db.commit()
    db.refresh(activity)
    
    return {
        "id": activity.id,
        "message": "Note added successfully"
    }

@router.get("/user/{user_id}/details", response_model=Dict[str, Any])
async def get_user_details(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get comprehensive user details for nutritionist view"""
    if current_user.role != 'nutritionist':
        raise HTTPException(status_code=403, detail="Nutritionist access required")
    
    # Get nutritionist record
    nutritionist = db.query(models.Nutritionist).filter(
        models.Nutritionist.user_id == current_user.id
    ).first()
    
    if not nutritionist:
        raise HTTPException(status_code=404, detail="Nutritionist profile not found")
    
    # Verify this user is assigned to this nutritionist
    subscription = db.query(models.Subscription).filter(
        models.Subscription.client_id == user_id,
        models.Subscription.nutritionist_id == nutritionist.id
    ).first()
    
    if not subscription:
        raise HTTPException(status_code=403, detail="User is not assigned to you")
    
    # Get user
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
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
    
    # Parse data
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
    
    # Get consultations
    consultations = db.query(models.Consultation).filter(
        models.Consultation.client_id == user_id,
        models.Consultation.nutritionist_id == nutritionist.id
    ).order_by(models.Consultation.date.desc()).all()
    
    consultation_list = []
    for cons in consultations:
        consultation_list.append({
            "id": cons.id,
            "date": cons.date,
            "time_slot": cons.time_slot,
            "status": cons.status,
            "notes": cons.notes
        })
    
    return {
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "phone": user.phone
        },
        "subscription": {
            "id": subscription.id,
            "meal_plan_id": subscription.meal_plan_id,
            "meal_plan_title": meal_plan.title,
            "duration_days": subscription.duration_days,
            "start_date": subscription.start_date,
            "end_date": subscription.end_date,
            "status": subscription.status,
            "allocation_status": subscription.allocation_status
        },
        "client": {
            "age": client.age if client else None,
            "gender": client.gender if client else None,
            "height": client.height if client else None,
            "weight_start": client.weight_start if client else None,
            "weight_goal": client.weight_goal if client else None,
            "health_conditions": json.loads(client.health_conditions) if client and client.health_conditions and isinstance(client.health_conditions, str) else (client.health_conditions if client else None),
            "dietary_preferences": client.dietary_preferences if client else None
        },
        "checkout_data": {
            "health_inputs": health_inputs,
            "meal_timing": meal_timing,
            "delivery_addresses": delivery_addresses,
            "consultation_preference": checkout_data.consultation_preference if checkout_data else False,
            "consultation_date": checkout_data.consultation_date if checkout_data else None,
            "consultation_time_slot": checkout_data.consultation_time_slot if checkout_data else None,
            "consultation_mode": checkout_data.consultation_mode if checkout_data else None
        },
        "consultations": consultation_list
    }

