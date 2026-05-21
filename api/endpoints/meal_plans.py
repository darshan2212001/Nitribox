from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from api.database import get_db
from api import models, schemas
from api.simple_auth import get_current_user_optional, get_current_user_required
from api.connection_manager import manager
from api.events import EventType, EventChannel, EventBuilder
from api.event_store import EventStore
from api.audit_logger import AuditLogger
from api.cache import cache

router = APIRouter(prefix="/meal-plans", tags=["Meal Plans"])

@router.post("", response_model=schemas.MealPlanResponse)
async def create_meal_plan(
    meal_plan: schemas.MealPlanCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Create a new meal plan (requires authentication)"""
    try:
        db_meal_plan = models.MealPlan(**meal_plan.model_dump())
        db.add(db_meal_plan)
        db.flush()
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=db_meal_plan.id,
            aggregate_type='meal_plan',
            event_type=EventType.MEAL_PLAN_GENERATED,
            payload={
                'meal_plan_id': db_meal_plan.id,
                'title': db_meal_plan.title,
                'category': db_meal_plan.category,
                'current_price': float(db_meal_plan.current_price) if db_meal_plan.current_price else None
            },
            metadata={
                'user_id': current_user.id,
                'user_role': current_user.role,
                'ip_address': None  # Request not available in this endpoint
            }
        )
        
        # Log to audit log
        AuditLogger.log_create(
            db=db,
            target_type='meal_plan',
            target_id=db_meal_plan.id,
            new_state=db_meal_plan,
            user_id=current_user.id,
            user_role=current_user.role,
            request=None
        )
        
        db.commit()
        db.refresh(db_meal_plan)
        
        # Invalidate meal plans cache
        cache.clear("meal_plans")
        
        # Build event data for WebSocket broadcast
        event_data = EventBuilder.build_event(
            EventType.MEAL_PLAN_GENERATED,
            schemas.MealPlanResponse.model_validate(db_meal_plan).model_dump(mode='json', by_alias=True)
        )
        
        # Broadcast to admin and all clients channels
        await manager.broadcast_to_channel(EventChannel.ADMIN, event_data)
        await manager.broadcast_to_channel(EventChannel.ALL_CLIENTS, event_data)
        
        return db_meal_plan
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create meal plan: {str(e)}")

@router.get("", response_model=List[schemas.MealPlanResponse])
async def get_meal_plans(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Get all meal plans with optional filtering"""
    query = db.query(models.MealPlan)
    
    if category:
        query = query.filter(models.MealPlan.category == category)
    if is_active is not None:
        query = query.filter(models.MealPlan.is_active == is_active)
    
    meal_plans = query.offset(skip).limit(limit).all()
    return meal_plans

@router.get("/{meal_plan_id}", response_model=schemas.MealPlanResponse)
async def get_meal_plan(
    meal_plan_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Get a specific meal plan by ID"""
    meal_plan = db.query(models.MealPlan).filter(models.MealPlan.id == meal_plan_id).first()
    if not meal_plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")
    return meal_plan

@router.patch("/{meal_plan_id}", response_model=schemas.MealPlanResponse)
async def update_meal_plan(
    meal_plan_id: str,
    meal_plan_update: schemas.MealPlanUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Update a meal plan (requires authentication)"""
    try:
        meal_plan = db.query(models.MealPlan).filter(models.MealPlan.id == meal_plan_id).first()
        if not meal_plan:
            raise HTTPException(status_code=404, detail="Meal plan not found")
        
        # Store before state for audit
        before_state = {
            'title': meal_plan.title,
            'current_price': float(meal_plan.current_price) if meal_plan.current_price else None,
            'is_active': meal_plan.is_active
        }
        
        # Update fields
        for field, value in meal_plan_update.model_dump(exclude_unset=True).items():
            setattr(meal_plan, field, value)
        
        db.flush()
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=meal_plan_id,
            aggregate_type='meal_plan',
            event_type=EventType.MEAL_PLAN_UPDATED,
            payload={
                'meal_plan_id': meal_plan_id,
                'title': meal_plan.title,
                'category': meal_plan.category
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
            target_type='meal_plan',
            target_id=meal_plan_id,
            before_state=before_state,
            after_state={
                'title': meal_plan.title,
                'current_price': float(meal_plan.current_price) if meal_plan.current_price else None,
                'is_active': meal_plan.is_active
            },
            user_id=current_user.id,
            user_role=current_user.role,
            request=request
        )
        
        db.commit()
        db.refresh(meal_plan)
        
        # Invalidate meal plans cache
        cache.clear("meal_plans")
        
        # Build event data for WebSocket broadcast
        event_data = EventBuilder.build_event(
            EventType.MEAL_PLAN_UPDATED,
            schemas.MealPlanResponse.model_validate(meal_plan).model_dump(mode='json', by_alias=True)
        )
        
        # Broadcast to admin and all clients channels
        await manager.broadcast_to_channel(EventChannel.ADMIN, event_data)
        await manager.broadcast_to_channel(EventChannel.ALL_CLIENTS, event_data)
        
        return meal_plan
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update meal plan: {str(e)}")

@router.delete("/{meal_plan_id}")
async def delete_meal_plan(
    meal_plan_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Delete a meal plan (requires authentication)"""
    try:
        meal_plan = db.query(models.MealPlan).filter(models.MealPlan.id == meal_plan_id).first()
        if not meal_plan:
            raise HTTPException(status_code=404, detail="Meal plan not found")
        
        # Store data before deletion
        meal_plan_data = {
            'id': meal_plan_id,
            'title': meal_plan.title,
            'category': meal_plan.category
        }
        
        db.delete(meal_plan)
        db.flush()
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=meal_plan_id,
            aggregate_type='meal_plan',
            event_type=EventType.SYSTEM_ERROR,  # Using system error as there's no delete event type
            payload={
                'meal_plan_id': meal_plan_id,
                'action': 'deleted',
                'title': meal_plan_data['title']
            },
            metadata={
                'user_id': current_user.id,
                'user_role': current_user.role,
                'ip_address': request.client.host if request.client else None
            }
        )
        
        db.commit()
        
        # Invalidate meal plans cache
        cache.clear("meal_plans")
        
        # Build event data for WebSocket broadcast
        event_data = EventBuilder.build_event(
            EventType.MEAL_PLAN_UPDATED,  # Using update event as delete event doesn't exist
            {"id": meal_plan_id, "action": "deleted"}
        )
        
        # Broadcast to admin and all clients channels
        await manager.broadcast_to_channel(EventChannel.ADMIN, event_data)
        await manager.broadcast_to_channel(EventChannel.ALL_CLIENTS, event_data)
        
        return {"message": "Meal plan deleted successfully"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete meal plan: {str(e)}")

@router.get("/category/{category}", response_model=List[schemas.MealPlanResponse])
async def get_meal_plans_by_category(
    category: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Get meal plans by category"""
    meal_plans = db.query(models.MealPlan).filter(
        models.MealPlan.category == category,
        models.MealPlan.is_active == True
    ).offset(skip).limit(limit).all()
    return meal_plans

@router.get("/featured/list", response_model=List[schemas.MealPlanResponse])
async def get_featured_meal_plans(
    limit: int = 6,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Get featured meal plans"""
    meal_plans = db.query(models.MealPlan).filter(
        models.MealPlan.is_active == True
    ).order_by(models.MealPlan.rating.desc()).limit(limit).all()
    return meal_plans

@router.patch("/{meal_plan_id}/rating")
async def update_meal_plan_rating(
    meal_plan_id: str,
    rating_update: schemas.MealPlanRatingUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Update meal plan rating"""
    meal_plan = db.query(models.MealPlan).filter(models.MealPlan.id == meal_plan_id).first()
    if not meal_plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")
    
    # Update rating and review count
    meal_plan.rating = rating_update.rating
    meal_plan.review_count += 1
    
    db.commit()
    db.refresh(meal_plan)
    
    return meal_plan
