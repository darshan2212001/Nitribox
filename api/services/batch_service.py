"""
Batch Service - Handles batch creation and management logic
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict
from api import models
import json


def create_batches_from_orders(
    db: Session,
    target_date: Optional[date] = None,
    meal_type: Optional[str] = None
) -> Dict[str, int]:
    """
    Auto-create batches from orders grouped by area + meal + timeslot
    
    Args:
        db: Database session
        target_date: Date to process orders for (defaults to today)
        meal_type: Optional meal type filter (breakfast, lunch, dinner)
    
    Returns:
        Dict with counts: {'batches_created': int, 'orders_grouped': int}
    """
    if target_date is None:
        target_date = date.today()
    
    # Get orders for the target date that don't have a batch yet
    query = db.query(models.Order).filter(
        models.Order.batch_id.is_(None),
        func.date(models.Order.created_at) == target_date
    )
    
    if meal_type:
        query = query.filter(models.Order.meal_type == meal_type)
    
    orders = query.all()
    
    if not orders:
        return {'batches_created': 0, 'orders_grouped': 0}
    
    # Group orders by area_id + meal_type + timeslot
    groups: Dict[str, List[models.Order]] = {}
    
    for order in orders:
        # Skip orders without area_id or timeslot
        if not order.area_id or not order.timeslot_start:
            continue
        
        # Create a key for grouping: area_id|meal_type|timeslot_start|timeslot_end
        timeslot_key = f"{order.area_id}|{order.meal_type}|{order.timeslot_start.isoformat() if order.timeslot_start else ''}|{order.timeslot_end.isoformat() if order.timeslot_end else ''}"
        
        if timeslot_key not in groups:
            groups[timeslot_key] = []
        groups[timeslot_key].append(order)
    
    batches_created = 0
    orders_grouped = 0
    
    # Create batches for each group
    for group_key, group_orders in groups.items():
        if not group_orders:
            continue
        
        # Parse group key
        parts = group_key.split('|')
        area_id = parts[0]
        meal_type = parts[1]
        timeslot_start_str = parts[2] if len(parts) > 2 else None
        timeslot_end_str = parts[3] if len(parts) > 3 else None
        
        # Check if batch already exists for this group
        existing_batch = db.query(models.Batch).filter(
            models.Batch.area_id == area_id,
            models.Batch.meal_type == meal_type,
            models.Batch.timeslot_start == (datetime.fromisoformat(timeslot_start_str) if timeslot_start_str else None),
            models.Batch.timeslot_end == (datetime.fromisoformat(timeslot_end_str) if timeslot_end_str else None)
        ).first()
        
        if existing_batch:
            # Add orders to existing batch
            batch = existing_batch
        else:
            # Create new batch
            batch = models.Batch(
                area_id=area_id,
                meal_type=meal_type,
                timeslot_start=datetime.fromisoformat(timeslot_start_str) if timeslot_start_str else None,
                timeslot_end=datetime.fromisoformat(timeslot_end_str) if timeslot_end_str else None,
                status="pending",
                total_orders=len(group_orders)
            )
            db.add(batch)
            db.flush()  # Get batch ID
            batches_created += 1
        
        # Create BatchMeal entries and update orders
        for order in group_orders:
            # Check if BatchMeal already exists
            existing_batch_meal = db.query(models.BatchMeal).filter(
                models.BatchMeal.batch_id == batch.id,
                models.BatchMeal.order_id == order.id
            ).first()
            
            if not existing_batch_meal:
                batch_meal = models.BatchMeal(
                    batch_id=batch.id,
                    order_id=order.id,
                    status="pending"
                )
                db.add(batch_meal)
            
            # Update order with batch_id
            order.batch_id = batch.id
        
        orders_grouped += len(group_orders)
    
    db.commit()
    
    return {
        'batches_created': batches_created,
        'orders_grouped': orders_grouped
    }


def update_batch_counts(batch_id: str, db: Session) -> models.Batch:
    """
    Update batch counts (total_orders, packed_count, ready_count, picked_count)
    based on current BatchMeal statuses
    """
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        return None
    
    batch_meals = db.query(models.BatchMeal).filter(
        models.BatchMeal.batch_id == batch_id
    ).all()
    
    batch.total_orders = len(batch_meals)
    batch.packed_count = sum(1 for bm in batch_meals if bm.status in ['packed', 'ready', 'picked', 'delivered'])
    batch.ready_count = sum(1 for bm in batch_meals if bm.status in ['ready', 'picked', 'delivered'])
    batch.picked_count = sum(1 for bm in batch_meals if bm.status in ['picked', 'delivered'])
    
    # Update batch status based on counts
    if batch.picked_count == batch.total_orders and batch.total_orders > 0:
        batch.status = "completed"
    elif batch.ready_count > 0:
        batch.status = "ready_for_pickup"
    
    db.commit()
    db.refresh(batch)
    
    return batch


def assign_delivery_agent_to_batch(
    batch_id: str,
    delivery_agent_id: str,
    db: Session
) -> models.Batch:
    """
    Assign a delivery agent to a batch
    """
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise ValueError(f"Batch {batch_id} not found")
    
    agent = db.query(models.DeliveryAgent).filter(
        models.DeliveryAgent.id == delivery_agent_id
    ).first()
    if not agent:
        raise ValueError(f"Delivery agent {delivery_agent_id} not found")
    
    # Update batch
    batch.delivery_agent_id = delivery_agent_id
    batch.status = "ready_for_pickup" if batch.ready_count > 0 else batch.status
    
    # Update agent
    agent.current_batch_id = batch_id
    agent.is_available = False
    
    db.commit()
    db.refresh(batch)
    
    return batch

