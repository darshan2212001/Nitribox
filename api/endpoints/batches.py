from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, timedelta
from api.database import get_db
from api import models, schemas
from api.simple_auth import get_current_user_required
from api.services.batch_service import (
    create_batches_from_orders,
    update_batch_counts,
    assign_delivery_agent_to_batch
)

router = APIRouter(prefix="/batches", tags=["Batches"])


@router.get("", response_model=List[schemas.BatchResponse])
async def get_batches(
    area_id: Optional[str] = Query(None, description="Filter by area ID"),
    meal_type: Optional[str] = Query(None, description="Filter by meal type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    date: Optional[date] = Query(None, description="Filter by date"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get all batches with optional filters"""
    query = db.query(models.Batch)
    
    if area_id:
        query = query.filter(models.Batch.area_id == area_id)
    if meal_type:
        query = query.filter(models.Batch.meal_type == meal_type)
    if status:
        query = query.filter(models.Batch.status == status)
    if date:
        query = query.filter(
            models.Batch.timeslot_start >= datetime.combine(date, datetime.min.time()),
            models.Batch.timeslot_start < datetime.combine(date, datetime.min.time()) + timedelta(days=1)
        )
    
    batches = query.order_by(models.Batch.timeslot_start.asc()).all()
    return batches


@router.get("/{batch_id}", response_model=schemas.BatchResponse)
async def get_batch(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get a specific batch by ID"""
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found"
        )
    
    return batch


@router.get("/{batch_id}/orders", response_model=List[schemas.OrderResponse])
async def get_batch_orders(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get all orders in a batch"""
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found"
        )
    
    batch_meals = db.query(models.BatchMeal).filter(
        models.BatchMeal.batch_id == batch_id
    ).all()
    
    order_ids = [bm.order_id for bm in batch_meals]
    orders = db.query(models.Order).filter(models.Order.id.in_(order_ids)).all()
    
    return orders


@router.post("", response_model=schemas.BatchResponse, status_code=status.HTTP_201_CREATED)
async def create_batch(
    batch_data: schemas.BatchCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Create a new batch manually"""
    # Verify area exists
    area = db.query(models.Area).filter(models.Area.id == batch_data.area_id).first()
    if not area:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Area not found"
        )
    
    batch = models.Batch(
        area_id=batch_data.area_id,
        meal_type=batch_data.meal_type,
        timeslot_start=batch_data.timeslot_start,
        timeslot_end=batch_data.timeslot_end,
        delivery_agent_id=batch_data.delivery_agent_id,
        status="pending",
        total_orders=0
    )
    
    db.add(batch)
    db.commit()
    db.refresh(batch)
    
    return batch


@router.post("/auto-create", response_model=dict)
async def auto_create_batches(
    target_date: Optional[date] = Query(None, description="Date to process (defaults to today)"),
    meal_type: Optional[str] = Query(None, description="Optional meal type filter"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Auto-create batches from orders grouped by area + meal + timeslot"""
    result = create_batches_from_orders(db, target_date, meal_type)
    return result


@router.patch("/{batch_id}", response_model=schemas.BatchResponse)
async def update_batch(
    batch_id: str,
    batch_data: schemas.BatchUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Update a batch"""
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found"
        )
    
    if batch_data.status is not None:
        batch.status = batch_data.status
    if batch_data.delivery_agent_id is not None:
        # Assign agent using service
        batch = assign_delivery_agent_to_batch(batch_id, batch_data.delivery_agent_id, db)
    if batch_data.timeslot_start is not None:
        batch.timeslot_start = batch_data.timeslot_start
    if batch_data.timeslot_end is not None:
        batch.timeslot_end = batch_data.timeslot_end
    
    db.commit()
    db.refresh(batch)
    
    return batch


@router.patch("/{batch_id}/assign-agent", response_model=schemas.BatchResponse)
async def assign_agent_to_batch(
    batch_id: str,
    delivery_agent_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Assign a delivery agent to a batch"""
    try:
        batch = assign_delivery_agent_to_batch(batch_id, delivery_agent_id, db)
        return batch
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post("/{batch_id}/notify-rider", response_model=dict)
async def notify_rider(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Notify the assigned rider that batch is ready for pickup"""
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found"
        )
    
    if not batch.delivery_agent_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No delivery agent assigned to this batch"
        )
    
    # Update batch status
    batch.status = "ready_for_pickup"
    db.commit()
    
    # TODO: Send push notification to delivery agent
    # This would integrate with the notification service
    
    return {
        "message": "Rider notified",
        "batch_id": batch_id,
        "delivery_agent_id": batch.delivery_agent_id
    }


@router.post("/{batch_id}/update-counts", response_model=schemas.BatchResponse)
async def update_batch_counts_endpoint(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Manually update batch counts based on BatchMeal statuses"""
    batch = update_batch_counts(batch_id, db)
    
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found"
        )
    
    return batch

