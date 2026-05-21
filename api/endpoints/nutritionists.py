from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from api.database import get_db
from api import models, schemas
from api.simple_auth import get_current_user_optional, get_current_user_required
from api.connection_manager import manager
from api.events import EventType, EventChannel, EventBuilder
from api.event_store import EventStore
from api.audit_logger import AuditLogger
from api.cache import cache

router = APIRouter(prefix="/nutritionists", tags=["Nutritionists"])

@router.post("", response_model=schemas.NutritionistResponse)
async def create_nutritionist(
    nutritionist: schemas.NutritionistCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Create a new nutritionist (requires authentication)"""
    try:
        db_nutritionist = models.Nutritionist(**nutritionist.model_dump())
        db.add(db_nutritionist)
        db.flush()
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=db_nutritionist.id,
            aggregate_type='nutritionist',
            event_type=EventType.SYSTEM_ERROR,  # Using system error as there's no nutritionist created event
            payload={
                'nutritionist_id': db_nutritionist.id,
                'name': db_nutritionist.name,
                'specialization': db_nutritionist.specialization,
                'action': 'created'
            },
            metadata={
                'user_id': current_user.id,
                'user_role': current_user.role,
                'ip_address': None
            }
        )
        
        # Log to audit log
        AuditLogger.log_create(
            db=db,
            target_type='nutritionist',
            target_id=db_nutritionist.id,
            new_state=db_nutritionist,
            user_id=current_user.id,
            user_role=current_user.role,
            request=None
        )
        
        db.commit()
        db.refresh(db_nutritionist)
        
        # Invalidate nutritionists cache
        cache.clear("nutritionists")
        
        # Build event data for WebSocket broadcast (using legacy event name for compatibility)
        event_data = {
            "type": "nutritionist_created",
            "data": schemas.NutritionistResponse.model_validate(db_nutritionist).model_dump(mode='json', by_alias=True),
            "timestamp": datetime.now().isoformat(),
            "source": "api"
        }
        
        # Broadcast to admin and all nutritionists channels
        await manager.broadcast_to_channel(EventChannel.ADMIN, event_data)
        await manager.broadcast_to_channel(EventChannel.ALL_NUTRITIONISTS, event_data)
        
        return db_nutritionist
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create nutritionist: {str(e)}")

@router.get("", response_model=List[schemas.NutritionistResponse])
async def get_nutritionists(
    skip: int = 0,
    limit: int = 100,
    specialization: Optional[str] = None,
    is_available: Optional[bool] = True,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Get all nutritionists with optional filtering"""
    query = db.query(models.Nutritionist)
    
    if specialization:
        query = query.filter(models.Nutritionist.specialization == specialization)
    if is_available is not None:
        query = query.filter(models.Nutritionist.is_available == is_available)
    
    nutritionists = query.offset(skip).limit(limit).all()
    return nutritionists

@router.get("/{nutritionist_id}", response_model=schemas.NutritionistResponse)
async def get_nutritionist(
    nutritionist_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Get a specific nutritionist by ID"""
    nutritionist = db.query(models.Nutritionist).filter(models.Nutritionist.id == nutritionist_id).first()
    if not nutritionist:
        raise HTTPException(status_code=404, detail="Nutritionist not found")
    return nutritionist

@router.patch("/{nutritionist_id}", response_model=schemas.NutritionistResponse)
async def update_nutritionist(
    nutritionist_id: str,
    nutritionist_update: schemas.NutritionistUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Update a nutritionist (requires authentication)"""
    try:
        nutritionist = db.query(models.Nutritionist).filter(models.Nutritionist.id == nutritionist_id).first()
        if not nutritionist:
            raise HTTPException(status_code=404, detail="Nutritionist not found")
        
        # Store before state
        before_state = {
            'name': nutritionist.name,
            'specialization': nutritionist.specialization,
            'is_available': nutritionist.is_available
        }
        
        # Update fields
        for field, value in nutritionist_update.model_dump(exclude_unset=True).items():
            setattr(nutritionist, field, value)
        
        db.flush()
        
        # Log to audit log
        AuditLogger.log_update(
            db=db,
            target_type='nutritionist',
            target_id=nutritionist_id,
            before_state=before_state,
            after_state={
                'name': nutritionist.name,
                'specialization': nutritionist.specialization,
                'is_available': nutritionist.is_available
            },
            user_id=current_user.id,
            user_role=current_user.role,
            request=request
        )
        
        db.commit()
        db.refresh(nutritionist)
        
        # Invalidate nutritionists cache
        cache.clear("nutritionists")
        
        # Build event data for WebSocket broadcast (using legacy event name for compatibility)
        event_data = {
            "type": "nutritionist_updated",
            "data": schemas.NutritionistResponse.model_validate(nutritionist).model_dump(mode='json', by_alias=True),
            "timestamp": datetime.now().isoformat(),
            "source": "api"
        }
        
        # Broadcast to admin and all nutritionists channels
        await manager.broadcast_to_channel(EventChannel.ADMIN, event_data)
        await manager.broadcast_to_channel(EventChannel.ALL_NUTRITIONISTS, event_data)
        
        return nutritionist
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update nutritionist: {str(e)}")

@router.delete("/{nutritionist_id}")
async def delete_nutritionist(
    nutritionist_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Delete a nutritionist (requires authentication)"""
    try:
        nutritionist = db.query(models.Nutritionist).filter(models.Nutritionist.id == nutritionist_id).first()
        if not nutritionist:
            raise HTTPException(status_code=404, detail="Nutritionist not found")
        
        # Store data before deletion
        nutritionist_data = {
            'id': nutritionist_id,
            'name': nutritionist.name
        }
        
        db.delete(nutritionist)
        db.commit()
        
        # Invalidate nutritionists cache
        cache.clear("nutritionists")
        
        # Build event data for WebSocket broadcast (using legacy event name for compatibility)
        event_data = {
            "type": "nutritionist_deleted",
            "data": {"id": nutritionist_id},
            "timestamp": datetime.now().isoformat(),
            "source": "api"
        }
        
        # Broadcast to admin and all nutritionists channels
        await manager.broadcast_to_channel(EventChannel.ADMIN, event_data)
        await manager.broadcast_to_channel(EventChannel.ALL_NUTRITIONISTS, event_data)
        
        return {"message": "Nutritionist deleted successfully"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete nutritionist: {str(e)}")

@router.get("/specialization/{specialization}", response_model=List[schemas.NutritionistResponse])
async def get_nutritionists_by_specialization(
    specialization: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Get nutritionists by specialization"""
    nutritionists = db.query(models.Nutritionist).filter(
        models.Nutritionist.specialization == specialization,
        models.Nutritionist.is_available == True
    ).offset(skip).limit(limit).all()
    return nutritionists

@router.get("/featured/list", response_model=List[schemas.NutritionistResponse])
async def get_featured_nutritionists(
    limit: int = 4,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Get featured nutritionists"""
    nutritionists = db.query(models.Nutritionist).filter(
        models.Nutritionist.is_available == True
    ).order_by(models.Nutritionist.rating.desc()).limit(limit).all()
    return nutritionists

@router.post("/{nutritionist_id}/book", response_model=schemas.ConsultationResponse)
async def book_consultation(
    nutritionist_id: str,
    consultation: schemas.ConsultationCreate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Book a consultation with a nutritionist"""
    nutritionist = db.query(models.Nutritionist).filter(models.Nutritionist.id == nutritionist_id).first()
    if not nutritionist:
        raise HTTPException(status_code=404, detail="Nutritionist not found")
    
    if not nutritionist.is_available:
        raise HTTPException(status_code=400, detail="Nutritionist is not available")
    
    try:
        db_consultation = models.Consultation(
            nutritionist_id=nutritionist_id,
            **consultation.model_dump()
        )
        db.add(db_consultation)
        db.commit()
        db.refresh(db_consultation)
        
        # Build event data for WebSocket broadcast
        from api.events import EventType, EventChannel, EventBuilder
        event_data = EventBuilder.build_event(
            EventType.CONSULTATION_SCHEDULED,
            {
                "consultation_id": db_consultation.id,
                "nutritionist_id": nutritionist_id,
                "client_id": consultation.client_id,
                "date": consultation.date,
                "time_slot": consultation.time_slot,
                "status": db_consultation.status
            }
        )
        
        # Broadcast to nutritionist channel
        await manager.broadcast_to_channel(
            EventChannel.nutritionist(nutritionist_id),
            event_data
        )
        
        # Broadcast to client channel
        await manager.broadcast_to_channel(
            EventChannel.client(consultation.client_id),
            event_data
        )
        
        # Broadcast to admin channel for notification
        await manager.broadcast_to_channel(
            EventChannel.ADMIN,
            event_data
        )
        
        return db_consultation
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to book consultation: {str(e)}")

@router.get("/{nutritionist_id}/consultations", response_model=List[schemas.ConsultationResponse])
async def get_nutritionist_consultations(
    nutritionist_id: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Get consultations for a specific nutritionist"""
    consultations = db.query(models.Consultation).filter(
        models.Consultation.nutritionist_id == nutritionist_id
    ).offset(skip).limit(limit).all()
    return consultations
