from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, timedelta
from api.database import get_db
from api import models
from pydantic import BaseModel, ConfigDict, field_validator, conint, confloat
from api.connection_manager import manager
from api.events import EventType, EventChannel, EventBuilder
import re

router = APIRouter(prefix="/daily-meals", tags=["Daily Meals"])

# Pydantic schemas
class MealScheduleDay(BaseModel):
    date: str  # Format: YYYY-MM-DD
    breakfast_item: str
    breakfast_calories: conint(ge=0, le=5000) = 0
    lunch_item: str
    lunch_calories: conint(ge=0, le=5000) = 0
    dinner_item: str
    dinner_calories: conint(ge=0, le=5000) = 0
    notes: Optional[str] = None
    
    @field_validator('date')
    @classmethod
    def validate_date(cls, v: str) -> str:
        try:
            datetime.strptime(v, "%Y-%m-%d")
            return v
        except ValueError:
            raise ValueError('Date must be in YYYY-MM-DD format')
    
    @field_validator('breakfast_item', 'lunch_item', 'dinner_item')
    @classmethod
    def validate_meal_item(cls, v: str) -> str:
        if not v or len(v.strip()) < 3:
            raise ValueError('Meal item must be at least 3 characters')
        if len(v) > 200:
            raise ValueError('Meal item must be less than 200 characters')
        return v.strip()
    
    @field_validator('notes')
    @classmethod
    def validate_notes(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if len(v) > 500:
            raise ValueError('Notes must be less than 500 characters')
        return v.strip() if v else None

class MealScheduleGenerate(BaseModel):
    subscription_id: str
    client_id: str
    nutritionist_id: str
    schedule: List[MealScheduleDay]  # 30 days of meals

class DailyMealScheduleResponse(BaseModel):
    id: str
    subscription_id: str
    client_id: str
    date: datetime
    breakfast_item: Optional[str]
    breakfast_calories: Optional[int]
    breakfast_status: str
    lunch_item: Optional[str]
    lunch_calories: Optional[int]
    lunch_status: str
    dinner_item: Optional[str]
    dinner_calories: Optional[int]
    dinner_status: str
    notes: Optional[str]
    created_by_nutritionist_id: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class MealScheduleUpdate(BaseModel):
    breakfast_item: Optional[str] = None
    breakfast_calories: Optional[int] = None
    lunch_item: Optional[str] = None
    lunch_calories: Optional[int] = None
    dinner_item: Optional[str] = None
    dinner_calories: Optional[int] = None
    notes: Optional[str] = None

class MealStatusUpdate(BaseModel):
    meal_type: str  # breakfast, lunch, dinner
    status: str  # pending, preparing, packed, assigned, in_transit, delivered, consumed, skipped
    notes: Optional[str] = None
    
    @field_validator('meal_type')
    @classmethod
    def validate_meal_type(cls, v: str) -> str:
        valid_types = ['breakfast', 'lunch', 'dinner']
        if v.lower() not in valid_types:
            raise ValueError(f'Meal type must be one of: {", ".join(valid_types)}')
        return v.lower()
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v: str) -> str:
        valid_statuses = ['pending', 'preparing', 'packed', 'assigned', 'in_transit', 'delivered', 'consumed', 'skipped']
        if v.lower() not in valid_statuses:
            raise ValueError(f'Status must be one of: {", ".join(valid_statuses)}')
        return v.lower()
    
    @field_validator('notes')
    @classmethod
    def validate_notes(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if len(v) > 500:
            raise ValueError('Notes must be less than 500 characters')
        return v.strip() if v else None

class ConsumptionLog(BaseModel):
    meal_type: str  # breakfast, lunch, dinner
    status: str  # consumed, skipped
    reason: Optional[str] = None
    
    @field_validator('meal_type')
    @classmethod
    def validate_meal_type(cls, v: str) -> str:
        valid_types = ['breakfast', 'lunch', 'dinner']
        if v.lower() not in valid_types:
            raise ValueError(f'Meal type must be one of: {", ".join(valid_types)}')
        return v.lower()
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v: str) -> str:
        valid_statuses = ['consumed', 'skipped']
        if v.lower() not in valid_statuses:
            raise ValueError(f'Status must be one of: {", ".join(valid_statuses)}')
        return v.lower()
    
    @field_validator('reason')
    @classmethod
    def validate_reason(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if len(v) > 500:
            raise ValueError('Reason must be less than 500 characters')
        return v.strip() if v else None

@router.post("/generate")
async def generate_meal_schedule(
    schedule_data: MealScheduleGenerate,
    db: Session = Depends(get_db)
):
    """Nutritionist generates 30-day meal schedule for a subscription"""
    try:
        # Verify subscription exists
        subscription = db.query(models.Subscription).filter(
            models.Subscription.id == schedule_data.subscription_id
        ).first()
        
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        # Create daily meal schedules
        created_schedules = []
        for day in schedule_data.schedule:
            daily_schedule = models.DailyMealSchedule(
                subscription_id=schedule_data.subscription_id,
                client_id=schedule_data.client_id,
                date=datetime.strptime(day.date, "%Y-%m-%d"),
                breakfast_item=day.breakfast_item,
                breakfast_calories=day.breakfast_calories,
                lunch_item=day.lunch_item,
                lunch_calories=day.lunch_calories,
                dinner_item=day.dinner_item,
                dinner_calories=day.dinner_calories,
                notes=day.notes,
                created_by_nutritionist_id=schedule_data.nutritionist_id
            )
            db.add(daily_schedule)
            created_schedules.append(daily_schedule)
        
        # Activate subscription
        subscription.status = "active"
        if not subscription.start_date:
            subscription.start_date = datetime.now()
            subscription.end_date = datetime.now() + timedelta(days=subscription.duration_days)
        
        try:
            db.commit()
            
            # Broadcast meal schedule generated event
            await manager.broadcast_to_channel(f"client_{schedule_data.client_id}", {
                "type": "daily_meals.generated",
                "data": {
                    "subscription_id": schedule_data.subscription_id,
                    "client_id": schedule_data.client_id,
                    "total_days": len(created_schedules),
                    "status": "active"
                }
            })
            
            # Broadcast to kitchen
            await manager.broadcast_to_channel("kitchen", {
                "type": "daily_meals.generated",
                "data": {
                    "subscription_id": schedule_data.subscription_id,
                    "client_id": schedule_data.client_id,
                    "total_days": len(created_schedules),
                    "status": "active"
                }
            })
            
            return {
                "message": "Meal schedule generated successfully",
                "subscription_id": schedule_data.subscription_id,
                "total_days": len(created_schedules)
            }
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to generate meal schedule: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to generate meal schedule: {str(e)}")

@router.get("/today")
async def get_todays_meals(
    db: Session = Depends(get_db)
):
    """Kitchen gets today's meals for all clients"""
    today = datetime.now().date()
    
    schedules = db.query(models.DailyMealSchedule).filter(
        models.DailyMealSchedule.date >= datetime.combine(today, datetime.min.time()),
        models.DailyMealSchedule.date < datetime.combine(today + timedelta(days=1), datetime.min.time())
    ).all()
    
    # Get client details for each schedule
    result = []
    for schedule in schedules:
        client = db.query(models.User).filter(models.User.id == schedule.client_id).first()
        result.append({
            "schedule_id": schedule.id,
            "client_id": schedule.client_id,
            "client_name": client.name if client else "Unknown",
            "subscription_id": schedule.subscription_id,
            "breakfast": {
                "item": schedule.breakfast_item,
                "calories": schedule.breakfast_calories,
                "status": schedule.breakfast_status
            },
            "lunch": {
                "item": schedule.lunch_item,
                "calories": schedule.lunch_calories,
                "status": schedule.lunch_status
            },
            "dinner": {
                "item": schedule.dinner_item,
                "calories": schedule.dinner_calories,
                "status": schedule.dinner_status
            },
            "notes": schedule.notes
        })
    
    return result

@router.get("/client/{client_id}/today")
async def get_client_todays_meals(
    client_id: str,
    db: Session = Depends(get_db)
):
    """Client gets their today's meals"""
    today = datetime.now().date()
    
    schedule = db.query(models.DailyMealSchedule).filter(
        models.DailyMealSchedule.client_id == client_id,
        models.DailyMealSchedule.date >= datetime.combine(today, datetime.min.time()),
        models.DailyMealSchedule.date < datetime.combine(today + timedelta(days=1), datetime.min.time())
    ).first()
    
    if not schedule:
        return {
            "message": "No meals scheduled for today",
            "date": today.isoformat()
        }
    
    return {
        "schedule_id": schedule.id,
        "subscription_id": schedule.subscription_id,
        "date": schedule.date.date().isoformat(),
        "breakfast": {
            "item": schedule.breakfast_item,
            "calories": schedule.breakfast_calories,
            "status": schedule.breakfast_status
        },
        "lunch": {
            "item": schedule.lunch_item,
            "calories": schedule.lunch_calories,
            "status": schedule.lunch_status
        },
        "dinner": {
            "item": schedule.dinner_item,
            "calories": schedule.dinner_calories,
            "status": schedule.dinner_status
        },
        "notes": schedule.notes
    }

@router.patch("/{schedule_id}", response_model=DailyMealScheduleResponse)
async def update_meal_schedule(
    schedule_id: str,
    schedule_update: MealScheduleUpdate,
    db: Session = Depends(get_db)
):
    """Nutritionist updates a meal plan for a specific day"""
    try:
        schedule = db.query(models.DailyMealSchedule).filter(
            models.DailyMealSchedule.id == schedule_id
        ).first()
        
        if not schedule:
            raise HTTPException(status_code=404, detail="Meal schedule not found")
        
        # Update fields
        for field, value in schedule_update.model_dump(exclude_unset=True).items():
            setattr(schedule, field, value)
        
        db.commit()
        db.refresh(schedule)
        
        # Broadcast meal plan updated event
        await manager.broadcast_to_channel(f"client_{schedule.client_id}", {
            "type": "meal_plan.updated",
            "data": {
                "schedule_id": schedule.id,
                "client_id": schedule.client_id,
                "date": schedule.date.isoformat()
            }
        })
        
        # Broadcast to kitchen
        await manager.broadcast_to_channel("kitchen", {
            "type": "meal_plan.updated",
            "data": {
                "schedule_id": schedule.id,
                "client_id": schedule.client_id,
                "date": schedule.date.isoformat()
            }
        })
        
        return schedule
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update meal schedule: {str(e)}")

@router.get("/kitchen/batch/{date}")
async def get_kitchen_batch_meals(
    date: str,  # Format: YYYY-MM-DD
    meal_type: Optional[str] = None,  # breakfast, lunch, dinner
    db: Session = Depends(get_db)
):
    """Kitchen gets meals by batch/date"""
    target_date = datetime.strptime(date, "%Y-%m-%d").date()
    
    schedules = db.query(models.DailyMealSchedule).filter(
        models.DailyMealSchedule.date >= datetime.combine(target_date, datetime.min.time()),
        models.DailyMealSchedule.date < datetime.combine(target_date + timedelta(days=1), datetime.min.time())
    ).all()
    
    result = {
        "date": date,
        "breakfast": [],
        "lunch": [],
        "dinner": []
    }
    
    for schedule in schedules:
        client = db.query(models.User).filter(models.User.id == schedule.client_id).first()
        client_name = client.name if client else "Unknown"
        
        if not meal_type or meal_type == "breakfast":
            result["breakfast"].append({
                "client_id": schedule.client_id,
                "client_name": client_name,
                "item": schedule.breakfast_item,
                "calories": schedule.breakfast_calories,
                "status": schedule.breakfast_status
            })
        
        if not meal_type or meal_type == "lunch":
            result["lunch"].append({
                "client_id": schedule.client_id,
                "client_name": client_name,
                "item": schedule.lunch_item,
                "calories": schedule.lunch_calories,
                "status": schedule.lunch_status
            })
        
        if not meal_type or meal_type == "dinner":
            result["dinner"].append({
                "client_id": schedule.client_id,
                "client_name": client_name,
                "item": schedule.dinner_item,
                "calories": schedule.dinner_calories,
                "status": schedule.dinner_status
            })
    
    return result

@router.patch("/{schedule_id}/meal-status")
async def update_meal_status(
    schedule_id: str,
    status_update: MealStatusUpdate,
    db: Session = Depends(get_db)
):
    """Update individual meal status (breakfast/lunch/dinner) with real-time broadcasting"""
    try:
        # Get the daily meal schedule
        schedule = db.query(models.DailyMealSchedule).filter(
            models.DailyMealSchedule.id == schedule_id
        ).first()
        
        if not schedule:
            raise HTTPException(status_code=404, detail="Meal schedule not found")
        
        # Get the corresponding order for this meal
        order = db.query(models.Order).filter(
            models.Order.daily_meal_schedule_id == schedule_id,
            models.Order.meal_type == status_update.meal_type
        ).first()
        
        if not order:
            raise HTTPException(status_code=404, detail=f"Order not found for {status_update.meal_type}")
        
        # Store old status for event broadcasting
        old_status = order.status
        
        # Update order status
        order.status = status_update.status
        order.kitchen_status = status_update.status
        
        # Update specific meal status in daily schedule
        if status_update.meal_type == "breakfast":
            schedule.breakfast_status = status_update.status
        elif status_update.meal_type == "lunch":
            schedule.lunch_status = status_update.status
        elif status_update.meal_type == "dinner":
            schedule.dinner_status = status_update.status
        
        # Set timestamps based on status
        now = datetime.now()
        if status_update.status == "preparing":
            order.prepared_at = now
        elif status_update.status == "packed":
            order.packed_at = now
        elif status_update.status == "delivered":
            order.delivered_at = now
        
        db.commit()
        db.refresh(order)
        db.refresh(schedule)
        
        # Broadcast status change event to relevant channels
        event_data = EventBuilder.meal_status_changed(
            order_id=order.id,
            client_id=order.client_id,
            meal_type=status_update.meal_type,
            old_status=old_status,
            new_status=status_update.status,
            nutritionist_id=schedule.created_by_nutritionist_id
        )
        
        # Broadcast to client
        await manager.broadcast_to_channel(
            EventChannel.client(order.client_id), 
            event_data
        )
        
        # Broadcast to kitchen
        await manager.broadcast_to_channel(EventChannel.KITCHEN, event_data)
        
        # Broadcast to nutritionist if assigned
        if schedule.created_by_nutritionist_id:
            await manager.broadcast_to_channel(
                EventChannel.nutritionist(schedule.created_by_nutritionist_id),
                event_data
            )
        
        # Broadcast to admin
        await manager.broadcast_to_channel(EventChannel.ADMIN, event_data)
        
        # If status is "packed", trigger delivery assignment
        if status_update.status == "packed":
            await _auto_assign_delivery(order, db)
        
        return {
            "message": f"{status_update.meal_type} status updated to {status_update.status}",
            "order_id": order.id,
            "status": status_update.status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update meal status: {str(e)}")

@router.post("/{schedule_id}/log-consumption")
async def log_meal_consumption(
    schedule_id: str,
    consumption: ConsumptionLog,
    db: Session = Depends(get_db)
):
    """Log meal consumption (consumed/skipped) with real-time broadcasting"""
    try:
        # Get the daily meal schedule
        schedule = db.query(models.DailyMealSchedule).filter(
            models.DailyMealSchedule.id == schedule_id
        ).first()
        
        if not schedule:
            raise HTTPException(status_code=404, detail="Meal schedule not found")
        
        # Get the corresponding order for this meal
        order = db.query(models.Order).filter(
            models.Order.daily_meal_schedule_id == schedule_id,
            models.Order.meal_type == consumption.meal_type
        ).first()
        
        if not order:
            raise HTTPException(status_code=404, detail=f"Order not found for {consumption.meal_type}")
        
        # Update consumption status
        order.consumed_status = consumption.status
        order.consumption_logged_at = datetime.now()
        
        db.commit()
        db.refresh(order)
        
        # Broadcast consumption logged event
        event_data = EventBuilder.consumption_logged(
            order_id=order.id,
            client_id=order.client_id,
            meal_type=consumption.meal_type,
            status=consumption.status,
            nutritionist_id=schedule.created_by_nutritionist_id,
            reason=consumption.reason
        )
        
        # Broadcast to client channel
        await manager.broadcast_to_channel(
            EventChannel.client(order.client_id),
            event_data
        )
        
        # Broadcast to nutritionist
        if schedule.created_by_nutritionist_id:
            await manager.broadcast_to_channel(
                EventChannel.nutritionist(schedule.created_by_nutritionist_id),
                event_data
            )
        
        # If meal was skipped, also broadcast to admin for monitoring
        if consumption.status == "skipped":
            await manager.broadcast_to_channel(EventChannel.ADMIN, event_data)
        
        return {
            "message": f"{consumption.meal_type} consumption logged as {consumption.status}",
            "order_id": order.id,
            "status": consumption.status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to log consumption: {str(e)}")

async def _auto_assign_delivery(order: models.Order, db: Session):
    """Auto-assign nearest available delivery agent"""
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
        
        # Update order with delivery assignment
        order.delivery_agent_id = agent.id
        order.delivery_agent_name = agent.name
        order.status = "assigned"
        order.assigned_at = datetime.now()
        
        # Mark agent as unavailable
        agent.is_available = False
        
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
        print(f"Failed to auto-assign delivery: {e}")
        # Don't raise exception as this is a background process

