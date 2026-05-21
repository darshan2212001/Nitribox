"""
User Activities API Endpoints - Handle user activity logging for nutritionist tracking
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
from api.database import get_db
from api import models
from api.simple_auth import get_current_user_required
from api.event_store import EventStore
from api.audit_logger import AuditLogger
from api.events import EventType, EventChannel, EventBuilder
from api.connection_manager import manager
from pydantic import BaseModel
import json

router = APIRouter(prefix="/user-activities", tags=["User Activities"])

# Pydantic schemas
class MealCheckinRequest(BaseModel):
    order_id: str
    meal_type: str  # breakfast, lunch, dinner, snack
    status: str  # completed, skipped
    notes: Optional[str] = None

class WeightLogRequest(BaseModel):
    weight_kg: float
    notes: Optional[str] = None
    date: Optional[datetime] = None

class SymptomLogRequest(BaseModel):
    symptoms: List[str]
    severity: Optional[str] = None  # mild, moderate, severe
    notes: Optional[str] = None

class ConsultationUpdateRequest(BaseModel):
    consultation_id: str
    status: str  # scheduled, completed, cancelled, rescheduled
    notes: Optional[str] = None

class UserActivityResponse(BaseModel):
    id: str
    user_id: str
    subscription_id: Optional[str]
    nutritionist_id: Optional[str]
    activity_type: str
    activity_data: Dict[str, Any]
    created_at: datetime

    @classmethod
    def from_orm(cls, activity: models.UserActivity):
        activity_data = {}
        if activity.activity_data:
            try:
                activity_data = json.loads(activity.activity_data) if isinstance(activity.activity_data, str) else activity.activity_data
            except:
                pass
        
        return cls(
            id=activity.id,
            user_id=activity.user_id,
            subscription_id=activity.subscription_id,
            nutritionist_id=activity.nutritionist_id,
            activity_type=activity.activity_type,
            activity_data=activity_data,
            created_at=activity.created_at
        )
    
    model_config = {"from_attributes": True}

@router.post("/meal-checkin", response_model=UserActivityResponse)
async def log_meal_checkin(
    request_data: MealCheckinRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Log a meal check-in (completed or skipped)"""
    try:
        # Verify order exists and belongs to user
        order = db.query(models.Order).filter(models.Order.id == request_data.order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        if order.client_id != current_user.id and current_user.role != 'admin':
            raise HTTPException(status_code=403, detail="Not authorized to log check-in for this order")
        
        # Get subscription if available
        subscription = None
        if order.subscription_id:
            subscription = db.query(models.Subscription).filter(
                models.Subscription.id == order.subscription_id
            ).first()
        
        # Create activity record
        activity = models.UserActivity(
            user_id=current_user.id,
            subscription_id=order.subscription_id,
            nutritionist_id=subscription.nutritionist_id if subscription else None,
            activity_type="meal_checkin",
            activity_data=json.dumps({
                "order_id": request_data.order_id,
                "meal_type": request_data.meal_type,
                "status": request_data.status,
                "notes": request_data.notes,
            })
        )
        
        db.add(activity)
        db.commit()
        db.refresh(activity)
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=activity.id,
            aggregate_type='user_activity',
            event_type=EventType.MEAL_CHECKIN,
            payload={
                'activity_id': activity.id,
                'user_id': current_user.id,
                'order_id': request_data.order_id,
                'meal_type': request_data.meal_type,
                'status': request_data.status,
            },
            metadata={
                'user_id': current_user.id,
                'user_role': current_user.role,
                'ip_address': request.client.host if request.client else None
            }
        )
        
        # Broadcast to nutritionist channel if assigned
        if subscription and subscription.nutritionist_id:
            event_data = EventBuilder.build_event(
                EventType.MEAL_CHECKIN,
                {
                    "activity_id": activity.id,
                    "user_id": current_user.id,
                    "order_id": request_data.order_id,
                    "meal_type": request_data.meal_type,
                    "status": request_data.status,
                }
            )
            await manager.broadcast_to_channel(
                EventChannel.nutritionist(subscription.nutritionist_id),
                event_data
            )
        
        return UserActivityResponse.from_orm(activity)
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to log meal check-in: {str(e)}")

@router.post("/weight-log", response_model=UserActivityResponse)
async def log_weight(
    request_data: WeightLogRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Log weight entry"""
    try:
        # Get user's active subscription
        subscription = db.query(models.Subscription).filter(
            models.Subscription.client_id == current_user.id,
            models.Subscription.status == "active"
        ).order_by(models.Subscription.created_at.desc()).first()
        
        # Create activity record
        activity = models.UserActivity(
            user_id=current_user.id,
            subscription_id=subscription.id if subscription else None,
            nutritionist_id=subscription.nutritionist_id if subscription else None,
            activity_type="weight_log",
            activity_data=json.dumps({
                "weight_kg": request_data.weight_kg,
                "notes": request_data.notes,
                "date": request_data.date.isoformat() if request_data.date else datetime.now().isoformat(),
            })
        )
        
        db.add(activity)
        db.commit()
        db.refresh(activity)
        
        # Update client weight if needed
        client = db.query(models.Client).filter(models.Client.user_id == current_user.id).first()
        if client:
            client.weight_current = request_data.weight_kg
            db.commit()
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=activity.id,
            aggregate_type='user_activity',
            event_type=EventType.WEIGHT_LOGGED,
            payload={
                'activity_id': activity.id,
                'user_id': current_user.id,
                'weight_kg': request_data.weight_kg,
            },
            metadata={
                'user_id': current_user.id,
                'user_role': current_user.role,
                'ip_address': request.client.host if request.client else None
            }
        )
        
        # Broadcast to nutritionist channel if assigned
        if subscription and subscription.nutritionist_id:
            event_data = EventBuilder.build_event(
                EventType.WEIGHT_LOGGED,
                {
                    "activity_id": activity.id,
                    "user_id": current_user.id,
                    "weight_kg": request_data.weight_kg,
                }
            )
            await manager.broadcast_to_channel(
                EventChannel.nutritionist(subscription.nutritionist_id),
                event_data
            )
        
        return UserActivityResponse.from_orm(activity)
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to log weight: {str(e)}")

@router.post("/symptom-log", response_model=UserActivityResponse)
async def log_symptom(
    request_data: SymptomLogRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Log symptom entry"""
    try:
        # Get user's active subscription
        subscription = db.query(models.Subscription).filter(
            models.Subscription.client_id == current_user.id,
            models.Subscription.status == "active"
        ).order_by(models.Subscription.created_at.desc()).first()
        
        # Create activity record
        activity = models.UserActivity(
            user_id=current_user.id,
            subscription_id=subscription.id if subscription else None,
            nutritionist_id=subscription.nutritionist_id if subscription else None,
            activity_type="symptom_log",
            activity_data=json.dumps({
                "symptoms": request_data.symptoms,
                "severity": request_data.severity,
                "notes": request_data.notes,
            })
        )
        
        db.add(activity)
        db.commit()
        db.refresh(activity)
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=activity.id,
            aggregate_type='user_activity',
            event_type=EventType.SYMPTOM_LOGGED,
            payload={
                'activity_id': activity.id,
                'user_id': current_user.id,
                'symptoms': request_data.symptoms,
                'severity': request_data.severity,
            },
            metadata={
                'user_id': current_user.id,
                'user_role': current_user.role,
                'ip_address': request.client.host if request.client else None
            }
        )
        
        # Broadcast to nutritionist channel if assigned
        if subscription and subscription.nutritionist_id:
            event_data = EventBuilder.build_event(
                EventType.SYMPTOM_LOGGED,
                {
                    "activity_id": activity.id,
                    "user_id": current_user.id,
                    "symptoms": request_data.symptoms,
                    "severity": request_data.severity,
                }
            )
            await manager.broadcast_to_channel(
                EventChannel.nutritionist(subscription.nutritionist_id),
                event_data
            )
        
        return UserActivityResponse.from_orm(activity)
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to log symptom: {str(e)}")

@router.post("/consultation-update", response_model=UserActivityResponse)
async def update_consultation(
    request_data: ConsultationUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Log consultation update"""
    try:
        # Verify consultation exists
        consultation = db.query(models.Consultation).filter(
            models.Consultation.id == request_data.consultation_id
        ).first()
        
        if not consultation:
            raise HTTPException(status_code=404, detail="Consultation not found")
        
        # Check authorization
        if consultation.client_id != current_user.id and current_user.role not in ['admin', 'nutritionist']:
            raise HTTPException(status_code=403, detail="Not authorized to update this consultation")
        
        # Get subscription
        subscription = db.query(models.Subscription).filter(
            models.Subscription.client_id == consultation.client_id
        ).order_by(models.Subscription.created_at.desc()).first()
        
        # Create activity record
        activity = models.UserActivity(
            user_id=consultation.client_id,
            subscription_id=subscription.id if subscription else None,
            nutritionist_id=consultation.nutritionist_id,
            activity_type="consultation_update",
            activity_data=json.dumps({
                "consultation_id": request_data.consultation_id,
                "status": request_data.status,
                "notes": request_data.notes,
            })
        )
        
        db.add(activity)
        db.commit()
        db.refresh(activity)
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=activity.id,
            aggregate_type='user_activity',
            event_type=EventType.CONSULTATION_UPDATE,
            payload={
                'activity_id': activity.id,
                'consultation_id': request_data.consultation_id,
                'status': request_data.status,
            },
            metadata={
                'user_id': current_user.id,
                'user_role': current_user.role,
                'ip_address': request.client.host if request.client else None
            }
        )
        
        # Broadcast to nutritionist and client channels
        if consultation.nutritionist_id:
            event_data = EventBuilder.build_event(
                EventType.CONSULTATION_UPDATE,
                {
                    "activity_id": activity.id,
                    "consultation_id": request_data.consultation_id,
                    "status": request_data.status,
                }
            )
            await manager.broadcast_to_channel(
                EventChannel.nutritionist(consultation.nutritionist_id),
                event_data
            )
            await manager.broadcast_to_channel(
                EventChannel.client(consultation.client_id),
                event_data
            )
        
        return UserActivityResponse.from_orm(activity)
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to log consultation update: {str(e)}")

@router.get("/", response_model=List[UserActivityResponse])
async def get_user_activities(
    user_id: Optional[str] = None,
    activity_type: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get user activities with optional filtering"""
    query = db.query(models.UserActivity)
    
    # Apply filters
    if user_id:
        # Check authorization
        if current_user.role == 'nutritionist':
            # Nutritionist can only see activities for their assigned users
            subscription = db.query(models.Subscription).filter(
                models.Subscription.client_id == user_id,
                models.Subscription.nutritionist_id == current_user.id
            ).first()
            if not subscription:
                raise HTTPException(status_code=403, detail="Not authorized to view activities for this user")
        elif current_user.role != 'admin' and user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to view activities for this user")
        
        query = query.filter(models.UserActivity.user_id == user_id)
    elif current_user.role not in ['admin', 'nutritionist']:
        # Regular users can only see their own activities
        query = query.filter(models.UserActivity.user_id == current_user.id)
    
    if activity_type:
        query = query.filter(models.UserActivity.activity_type == activity_type)
    
    activities = query.order_by(models.UserActivity.created_at.desc()).limit(limit).all()
    
    return [UserActivityResponse.from_orm(activity) for activity in activities]

