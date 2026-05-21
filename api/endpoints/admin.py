from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from api.database import get_db
from api import models, schemas
from api.simple_auth import get_current_user_required
from api.connection_manager import manager
from api.seed_data import seed_database

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/dashboard")
async def get_admin_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get admin dashboard statistics"""
    # Check if user is admin
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get statistics
    total_users = db.query(models.User).count()
    total_orders = db.query(models.Order).count()
    total_meal_plans = db.query(models.MealPlan).count()
    total_nutritionists = db.query(models.Nutritionist).count()
    
    # Active orders by status
    pending_orders = db.query(models.Order).filter(models.Order.status == "pending").count()
    preparing_orders = db.query(models.Order).filter(models.Order.status == "preparing").count()
    ready_orders = db.query(models.Order).filter(models.Order.status == "ready").count()
    in_transit_orders = db.query(models.Order).filter(
        models.Order.status.in_(["in_transit", "in-transit"])
    ).count()
    delivered_orders = db.query(models.Order).filter(models.Order.status == "delivered").count()
    
    # Recent activity
    recent_orders = db.query(models.Order).order_by(models.Order.created_at.desc()).limit(5).all()
    recent_users = db.query(models.User).order_by(models.User.created_at.desc()).limit(5).all()
    
    return {
        "statistics": {
            "total_users": total_users,
            "total_orders": total_orders,
            "total_meal_plans": total_meal_plans,
            "total_nutritionists": total_nutritionists,
            "active_orders": {
                "pending": pending_orders,
                "preparing": preparing_orders,
                "ready": ready_orders,
                "in_transit": in_transit_orders,
                "delivered": delivered_orders
            }
        },
        "recent_activity": {
            "recent_orders": [schemas.OrderResponse.model_validate(order).model_dump(mode='json', by_alias=True) for order in recent_orders],
            "recent_users": [schemas.UserResponse.model_validate(user).model_dump(mode='json', by_alias=True) for user in recent_users]
        }
    }

@router.get("/users", response_model=List[schemas.UserResponse])
async def get_all_users(
    skip: int = 0,
    limit: int = 100,
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get all users (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = db.query(models.User)
    if role:
        query = query.filter(models.User.role == role)
    
    users = query.offset(skip).limit(limit).all()
    return users

@router.get("/users/{user_id}", response_model=schemas.UserResponse)
async def get_user_details(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get user details (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

@router.patch("/users/{user_id}", response_model=schemas.UserResponse)
async def update_user(
    user_id: str,
    user_update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Update user (admin only)"""
    try:
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update fields
        for field, value in user_update.model_dump(exclude_unset=True).items():
            setattr(user, field, value)
        
        db.commit()
        db.refresh(user)
        
        return user
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update user: {str(e)}")

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Delete user (admin only)"""
    try:
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        db.delete(user)
        db.commit()
        
        return {"message": "User deleted successfully"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")

@router.get("/orders", response_model=List[schemas.OrderResponse])
async def get_all_orders(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get all orders (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = db.query(models.Order)
    if status:
        query = query.filter(models.Order.status == status)
    
    orders = query.offset(skip).limit(limit).all()
    return orders

@router.get("/orders/{order_id}", response_model=schemas.OrderResponse)
async def get_order_details(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get order details (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return order

@router.patch("/orders/{order_id}", response_model=schemas.OrderResponse)
async def update_order_admin(
    order_id: str,
    order_update: schemas.OrderUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Update order (admin only)"""
    try:
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        order = db.query(models.Order).filter(models.Order.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Update fields
        for field, value in order_update.model_dump(exclude_unset=True).items():
            setattr(order, field, value)
        
        db.commit()
        db.refresh(order)
        
        # Broadcast order updated event
        await manager.broadcast({
            "type": "order_updated",
            "data": schemas.OrderResponse.model_validate(order).model_dump(mode='json', by_alias=True)
        })
        
        return order
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update order: {str(e)}")

@router.delete("/orders/{order_id}")
async def delete_order_admin(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Delete order (admin only)"""
    try:
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        order = db.query(models.Order).filter(models.Order.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        db.delete(order)
        db.commit()
        
        # Broadcast order deleted event
        await manager.broadcast({
            "type": "order_deleted",
            "data": {"id": order_id}
        })
        
        return {"message": "Order deleted successfully"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete order: {str(e)}")

@router.post("/seed-database")
async def seed_database_endpoint(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Seed the database with initial data (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        seed_database(db)
        return {"message": "Database seeded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Seeding failed: {str(e)}")

@router.get("/system/health")
async def get_system_health(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get system health status (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Check database connection
        db.execute("SELECT 1")
        
        # Get basic counts
        user_count = db.query(models.User).count()
        order_count = db.query(models.Order).count()
        meal_plan_count = db.query(models.MealPlan).count()
        
        return {
            "status": "healthy",
            "database": "connected",
            "counts": {
                "users": user_count,
                "orders": order_count,
                "meal_plans": meal_plan_count
            }
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }

@router.get("/alerts")
async def get_system_alerts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get system alerts (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get pending orders that are taking too long
    from datetime import datetime, timedelta
    cutoff_time = datetime.utcnow() - timedelta(hours=2)
    
    overdue_orders = db.query(models.Order).filter(
        models.Order.status.in_(["pending", "preparing"]),
        models.Order.created_at < cutoff_time
    ).all()
    
    alerts = []
    for order in overdue_orders:
        alerts.append({
            "type": "overdue_order",
            "message": f"Order {order.id} is overdue",
            "order_id": order.id,
            "status": order.status,
            "created_at": order.created_at
        })
    
    return {"alerts": alerts, "count": len(alerts)}

# New admin endpoints for subscription ecosystem
@router.get("/dashboard/live")
async def get_live_operations_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Live operations dashboard with real-time metrics"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Live meal statistics
    meals_prepared = db.query(models.Order).filter(models.Order.status == "preparing").count()
    meals_packed = db.query(models.Order).filter(models.Order.status == "packed").count()
    meals_in_transit = db.query(models.Order).filter(models.Order.status == "in_transit").count()
    meals_delivered = db.query(models.Order).filter(models.Order.status == "delivered").count()
    meals_skipped = db.query(models.Order).filter(models.Order.consumed_status == "skipped").count()
    
    # Active subscriptions
    active_subscriptions = db.query(models.Subscription).filter(
        models.Subscription.status == "active"
    ).count()
    
    # Active delivery agents
    active_agents = db.query(models.DeliveryAgent).filter(
        models.DeliveryAgent.is_available == True
    ).count()
    
    # Today's orders
    today = datetime.now().date()
    todays_orders = db.query(models.Order).filter(
        models.Order.created_at >= datetime.combine(today, datetime.min.time()),
        models.Order.created_at < datetime.combine(today + timedelta(days=1), datetime.min.time())
    ).count()
    
    return {
        "live_metrics": {
            "meals_prepared": meals_prepared,
            "meals_packed": meals_packed,
            "meals_in_transit": meals_in_transit,
            "meals_delivered": meals_delivered,
            "meals_skipped": meals_skipped,
            "active_subscriptions": active_subscriptions,
            "active_delivery_agents": active_agents,
            "todays_orders": todays_orders
        },
        "timestamp": datetime.now().isoformat()
    }

@router.get("/kitchen/performance")
async def get_kitchen_performance(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Kitchen performance metrics"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Calculate average prep time
    prepared_orders = db.query(models.Order).filter(
        models.Order.prepared_at.isnot(None)
    ).all()
    
    avg_prep_time = 0
    if prepared_orders:
        total_prep_time = sum([
            (order.prepared_at - order.created_at).total_seconds() / 60
            for order in prepared_orders
        ])
        avg_prep_time = total_prep_time / len(prepared_orders)
    
    # Completion rate
    total_orders = db.query(models.Order).count()
    completed_orders = db.query(models.Order).filter(
        models.Order.status == "delivered"
    ).count()
    completion_rate = (completed_orders / total_orders * 100) if total_orders > 0 else 0
    
    return {
        "avg_prep_time_minutes": round(avg_prep_time, 2),
        "completion_rate_percent": round(completion_rate, 2),
        "total_orders": total_orders,
        "completed_orders": completed_orders
    }

@router.get("/delivery/performance")
async def get_delivery_performance(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Delivery agent performance metrics"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get all delivery agents with their stats
    agents = db.query(models.DeliveryAgent).all()
    
    agent_performance = []
    for agent in agents:
        # Get agent's delivered orders
        delivered_orders = db.query(models.Order).filter(
            models.Order.delivery_agent_id == agent.id,
            models.Order.status == "delivered"
        ).all()
        
        avg_delivery_time = 0
        if delivered_orders:
            total_delivery_time = sum([
                (order.delivered_at - order.assigned_at).total_seconds() / 60
                for order in delivered_orders
                if order.delivered_at and order.assigned_at
            ])
            avg_delivery_time = total_delivery_time / len(delivered_orders)
        
        agent_performance.append({
            "agent_id": agent.id,
            "name": agent.name,
            "total_deliveries": agent.total_deliveries,
            "rating": agent.rating,
            "is_available": agent.is_available,
            "avg_delivery_time_minutes": round(avg_delivery_time, 2),
            "delivered_count": len(delivered_orders)
        })
    
    return {"delivery_agents": agent_performance}

@router.post("/broadcast")
async def broadcast_announcement(
    message: str,
    target_audience: str = "all",  # all, clients, nutritionists, kitchen, delivery
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Broadcast announcements to specified audience"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Broadcast announcement event
    await manager.broadcast({
        "type": "admin.announcement",
        "data": {
            "message": message,
            "target_audience": target_audience,
            "sent_by": current_user.name,
            "timestamp": datetime.now().isoformat()
        }
    })
    
    return {"message": "Announcement broadcasted successfully", "target": target_audience}

@router.get("/subscriptions")
async def get_all_subscriptions(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get all subscriptions (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = db.query(models.Subscription)
    if status:
        query = query.filter(models.Subscription.status == status)
    
    subscriptions = query.order_by(models.Subscription.created_at.desc()).all()
    
    # Get client details for each subscription
    result = []
    for subscription in subscriptions:
        client = db.query(models.User).filter(models.User.id == subscription.client_id).first()
        nutritionist = db.query(models.Nutritionist).filter(
            models.Nutritionist.id == subscription.nutritionist_id
        ).first() if subscription.nutritionist_id else None
        
        result.append({
            "id": subscription.id,
            "client": {
                "id": client.id if client else None,
                "name": client.name if client else "Unknown"
            },
            "nutritionist": {
                "id": nutritionist.id if nutritionist else None,
                "name": nutritionist.name if nutritionist else None
            },
            "status": subscription.status,
            "start_date": subscription.start_date,
            "end_date": subscription.end_date,
            "total_amount": subscription.total_amount,
            "created_at": subscription.created_at
        })
    
    return result