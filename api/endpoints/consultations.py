from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from api.database import get_db
from api import models
from api.connection_manager import manager
from api.events import EventType, EventChannel, EventBuilder
from api.simple_auth import get_current_user_required, get_current_user_optional
from pydantic import BaseModel, field_validator
from datetime import datetime, date
from typing import List, Optional
import json
import re

router = APIRouter()

class ConsultationCreate(BaseModel):
    nutritionist_id: str
    client_id: str
    date: str  # Format: "YYYY-MM-DD"
    time_slot: str  # Format: "HH:MM"
    notes: Optional[str] = None
    
    @field_validator('date')
    @classmethod
    def validate_date(cls, v: str) -> str:
        try:
            parsed_date = datetime.strptime(v, "%Y-%m-%d")
            # Ensure date is in the future
            if parsed_date.date() < date.today():
                raise ValueError('Consultation date must be in the future')
            return v
        except ValueError as e:
            if 'does not match format' in str(e) or 'time data' in str(e):
                raise ValueError('Date must be in YYYY-MM-DD format')
            raise
    
    @field_validator('time_slot')
    @classmethod
    def validate_time_slot(cls, v: str) -> str:
        # Validate HH:MM format
        if not re.match(r'^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$', v):
            raise ValueError('Time slot must be in HH:MM format (24-hour)')
        return v
    
    @field_validator('notes')
    @classmethod
    def validate_notes(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if len(v) > 2000:
            raise ValueError('Notes must be less than 2000 characters')
        return v.strip() if v else None

class ConsultationResponse(BaseModel):
    id: str
    nutritionist_id: str
    client_id: str
    date: datetime
    time_slot: str
    duration_minutes: int
    status: str
    notes: Optional[str]
    created_at: datetime

class AvailableSlot(BaseModel):
    date: str
    time_slot: str
    available: bool

@router.post("/consultations", response_model=ConsultationResponse)
async def create_consultation(
    consultation: ConsultationCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Create a new consultation booking"""
    
    # Authorization check: Users can only create consultations for themselves unless admin
    if current_user.role != 'admin' and consultation.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create consultations for other users"
        )
    
    # Validate nutritionist exists
    nutritionist = db.query(models.Nutritionist).filter(
        models.Nutritionist.id == consultation.nutritionist_id
    ).first()
    
    if not nutritionist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nutritionist not found"
        )
    
    # Validate client exists
    client = db.query(models.User).filter(
        models.User.id == consultation.client_id
    ).first()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Parse date
    try:
        consultation_date = datetime.strptime(consultation.date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Use YYYY-MM-DD"
        )
    
    # Check if slot is available
    existing_consultation = db.query(models.Consultation).filter(
        models.Consultation.nutritionist_id == consultation.nutritionist_id,
        models.Consultation.date == consultation_date,
        models.Consultation.time_slot == consultation.time_slot,
        models.Consultation.status.in_(["scheduled", "confirmed"])
    ).first()
    
    if existing_consultation:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Time slot is already booked"
        )
    
    try:
        # Create consultation
        db_consultation = models.Consultation(
            nutritionist_id=consultation.nutritionist_id,
            client_id=consultation.client_id,
            date=consultation_date,
            time_slot=consultation.time_slot,
            notes=consultation.notes,
            status="scheduled"
        )
        
        db.add(db_consultation)
        db.flush()  # Flush to get ID before commit
        
        # Log event
        from api.event_store import EventStore
        from api.audit_logger import AuditLogger
        try:
            EventStore.append_event(
                db=db,
                aggregate_id=db_consultation.id,
                aggregate_type='consultation',
                event_type=EventType.CONSULTATION_SCHEDULED,
                payload={
                    'consultation_id': db_consultation.id,
                    'nutritionist_id': consultation.nutritionist_id,
                    'client_id': consultation.client_id,
                    'date': consultation.date,
                    'time_slot': consultation.time_slot,
                    'status': 'scheduled'
                },
                metadata={
                    'user_id': current_user.id,
                    'user_role': current_user.role,
                    'ip_address': request.client.host if request.client else None
                }
            )
            
            # Log to audit log
            AuditLogger.log_create(
                db=db,
                target_type='consultation',
                target_id=db_consultation.id,
                new_state=db_consultation,
                user_id=current_user.id,
                user_role=current_user.role,
                request=request
            )
        except Exception as event_error:
            # Log but don't fail the request if event logging fails
            print(f"[Consultation] Warning: Failed to log event: {str(event_error)}")
        
        db.commit()
        db.refresh(db_consultation)
        
        # Broadcast consultation scheduled event to nutritionist and client
        event_data = EventBuilder.build_event(
            EventType.CONSULTATION_SCHEDULED,
            {
                "consultation_id": db_consultation.id,
                "nutritionist_id": consultation.nutritionist_id,
                "client_id": consultation.client_id,
                "date": consultation.date,
                "time_slot": consultation.time_slot,
                "status": db_consultation.status,
                "notes": consultation.notes
            }
        )
        
        # Broadcast to nutritionist channel
        await manager.broadcast_to_channel(
            EventChannel.nutritionist(consultation.nutritionist_id),
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
        raise HTTPException(status_code=500, detail=f"Failed to create consultation: {str(e)}")

@router.get("/consultations/client/{client_id}", response_model=List[ConsultationResponse])
async def get_client_consultations(
    client_id: str,
    db: Session = Depends(get_db)
):
    """Get all consultations for a specific client"""
    
    consultations = db.query(models.Consultation).filter(
        models.Consultation.client_id == client_id
    ).order_by(models.Consultation.date.desc()).all()
    
    return consultations

@router.get("/consultations/nutritionist/{nutritionist_id}", response_model=List[ConsultationResponse])
async def get_nutritionist_consultations(
    nutritionist_id: str,
    db: Session = Depends(get_db)
):
    """Get all consultations for a specific nutritionist"""
    
    consultations = db.query(models.Consultation).filter(
        models.Consultation.nutritionist_id == nutritionist_id
    ).order_by(models.Consultation.date.desc()).all()
    
    return consultations

@router.get("/consultations/{consultation_id}", response_model=ConsultationResponse)
async def get_consultation(
    consultation_id: str,
    db: Session = Depends(get_db)
):
    """Get a specific consultation by ID"""
    consultation = db.query(models.Consultation).filter(
        models.Consultation.id == consultation_id
    ).first()
    
    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )
    
    return consultation

class ConsultationUpdate(BaseModel):
    date: Optional[str] = None  # Format: "YYYY-MM-DD"
    time_slot: Optional[str] = None  # Format: "HH:MM"
    notes: Optional[str] = None
    
    @field_validator('date')
    @classmethod
    def validate_date(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        try:
            parsed_date = datetime.strptime(v, "%Y-%m-%d")
            return v
        except ValueError:
            raise ValueError('Date must be in YYYY-MM-DD format')
    
    @field_validator('time_slot')
    @classmethod
    def validate_time_slot(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not re.match(r'^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$', v):
            raise ValueError('Time slot must be in HH:MM format (24-hour)')
        return v

@router.put("/consultations/{consultation_id}", response_model=ConsultationResponse)
async def update_consultation(
    consultation_id: str,
    consultation_update: ConsultationUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Update consultation details (date, time, notes)"""
    from api.event_store import EventStore
    from api.audit_logger import AuditLogger
    from api.events import EventType, EventChannel, EventBuilder
    from api.connection_manager import manager
    
    consultation = db.query(models.Consultation).filter(
        models.Consultation.id == consultation_id
    ).first()
    
    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )
    
    # Only allow editing scheduled/confirmed consultations
    if consultation.status not in ["scheduled", "confirmed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only edit scheduled or confirmed consultations"
        )
    
    try:
        # Store before state
        before_state = {
            'date': consultation.date.isoformat() if consultation.date else None,
            'time_slot': consultation.time_slot,
            'notes': consultation.notes
        }
        
        # Update fields
        update_data = consultation_update.model_dump(exclude_unset=True)
        
        if 'date' in update_data and update_data['date']:
            consultation.date = datetime.strptime(update_data['date'], "%Y-%m-%d")
        
        if 'time_slot' in update_data:
            consultation.time_slot = update_data['time_slot']
        
        if 'notes' in update_data:
            consultation.notes = update_data['notes']
        
        db.flush()
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=consultation_id,
            aggregate_type='consultation',
            event_type=EventType.CONSULTATION_SCHEDULED,
            payload={
                'consultation_id': consultation_id,
                'client_id': consultation.client_id,
                'nutritionist_id': consultation.nutritionist_id,
                'before_state': before_state,
                'after_state': {
                    'date': consultation.date.isoformat() if consultation.date else None,
                    'time_slot': consultation.time_slot,
                    'notes': consultation.notes
                }
            },
            metadata={
                'user_id': current_user.id if current_user else None,
                'user_role': current_user.role if current_user else None,
                'ip_address': request.client.host if request.client else None
            }
        )
        
        # Log to audit log
        AuditLogger.log_update(
            db=db,
            target_type='consultation',
            target_id=consultation_id,
            before_state=before_state,
            after_state={
                'date': consultation.date.isoformat() if consultation.date else None,
                'time_slot': consultation.time_slot,
                'notes': consultation.notes
            },
            user_id=current_user.id if current_user else None,
            user_role=current_user.role if current_user else None,
            request=request
        )
        
        db.commit()
        db.refresh(consultation)
        
        # Build event data for WebSocket broadcast
        event_data = EventBuilder.build_event(
            EventType.CONSULTATION_SCHEDULED,
            {
                "id": consultation.id,
                "client_id": consultation.client_id,
                "nutritionist_id": consultation.nutritionist_id,
                "date": consultation.date.isoformat() if consultation.date else None,
                "time_slot": consultation.time_slot,
                "status": consultation.status
            }
        )
        
        # Broadcast to client channel
        await manager.broadcast_to_channel(
            EventChannel.client(consultation.client_id),
            event_data
        )
        
        # Broadcast to nutritionist channel
        if consultation.nutritionist_id:
            await manager.broadcast_to_channel(
                EventChannel.nutritionist(consultation.nutritionist_id),
                event_data
            )
        
        # Broadcast to admin channel for notification
        await manager.broadcast_to_channel(
            EventChannel.ADMIN,
            event_data
        )
        
        return consultation
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update consultation: {str(e)}")

@router.get("/nutritionists/{nutritionist_id}/available-slots", response_model=List[AvailableSlot])
async def get_available_slots(
    nutritionist_id: str,
    date: Optional[str] = None,  # Format: "YYYY-MM-DD"
    db: Session = Depends(get_db)
):
    """Get available time slots for a nutritionist"""
    
    # Validate nutritionist exists
    nutritionist = db.query(models.Nutritionist).filter(
        models.Nutritionist.id == nutritionist_id
    ).first()
    
    if not nutritionist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nutritionist not found"
        )
    
    # Parse available slots from nutritionist data
    try:
        available_slots_data = json.loads(nutritionist.available_slots or "{}")
    except json.JSONDecodeError:
        available_slots_data = {}
    
    # Default time slots (9 AM to 9 PM, 30-minute intervals)
    default_slots = [
        "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
        "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
        "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
        "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
        "21:00"
    ]
    
    # If specific date requested, check bookings for that date
    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD"
            )
        
        # Get booked slots for the date
        booked_consultations = db.query(models.Consultation).filter(
            models.Consultation.nutritionist_id == nutritionist_id,
            models.Consultation.date == target_date,
            models.Consultation.status.in_(["scheduled", "confirmed"])
        ).all()
        
        booked_slots = {consultation.time_slot for consultation in booked_consultations}
        
        # Return available slots for the specific date
        available_slots = []
        for slot in default_slots:
            available_slots.append(AvailableSlot(
                date=date,
                time_slot=slot,
                available=slot not in booked_slots
            ))
        
        return available_slots
    
    # Return all available slots (general availability)
    available_slots = []
    for slot in default_slots:
        available_slots.append(AvailableSlot(
            date="any",
            time_slot=slot,
            available=True
        ))
    
    return available_slots

@router.put("/consultations/{consultation_id}/status")
async def update_consultation_status(
    consultation_id: str,
    status: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Update consultation status with event logging and WebSocket broadcasts"""
    from api.event_store import EventStore
    from api.audit_logger import AuditLogger
    from api.events import EventType, EventChannel, EventBuilder
    from api.connection_manager import manager
    
    consultation = db.query(models.Consultation).filter(
        models.Consultation.id == consultation_id
    ).first()
    
    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultation not found"
        )
    
    try:
        # Store before state
        old_status = consultation.status
        
        # Update status
        consultation.status = status
        db.flush()
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=consultation_id,
            aggregate_type='consultation',
            event_type=EventType.CONSULTATION_COMPLETED if status == "completed" else EventType.CONSULTATION_SCHEDULED,
            payload={
                'consultation_id': consultation_id,
                'client_id': consultation.client_id,
                'nutritionist_id': consultation.nutritionist_id,
                'old_status': old_status,
                'new_status': status
            },
            metadata={
                'user_id': current_user.id if current_user else None,
                'user_role': current_user.role if current_user else None,
                'ip_address': request.client.host if request.client else None
            }
        )
        
        # Log to audit log
        AuditLogger.log_update(
            db=db,
            target_type='consultation',
            target_id=consultation_id,
            before_state={'status': old_status},
            after_state={'status': status},
            user_id=current_user.id if current_user else None,
            user_role=current_user.role if current_user else None,
            request=request
        )
        
        db.commit()
        db.refresh(consultation)
        
        # Build event data for WebSocket broadcast
        event_data = EventBuilder.build_event(
            EventType.CONSULTATION_COMPLETED if status == "completed" else EventType.CONSULTATION_SCHEDULED,
            {
                "id": consultation_id,
                "client_id": consultation.client_id,
                "nutritionist_id": consultation.nutritionist_id,
                "old_status": old_status,
                "new_status": status,
                "date": consultation.date.isoformat() if consultation.date else None,
                "time_slot": consultation.time_slot
            }
        )
        
        # Broadcast to client channel
        await manager.broadcast_to_channel(
            EventChannel.client(consultation.client_id),
            event_data
        )
        
        # Broadcast to nutritionist channel
        if consultation.nutritionist_id:
            await manager.broadcast_to_channel(
                EventChannel.nutritionist(consultation.nutritionist_id),
                event_data
            )
        
        # Broadcast to admin channel for notification
        await manager.broadcast_to_channel(
            EventChannel.ADMIN,
            event_data
        )
        
        return {"message": "Consultation status updated successfully"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update consultation status: {str(e)}")
