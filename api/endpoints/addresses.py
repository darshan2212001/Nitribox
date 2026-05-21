"""
Addresses API Endpoints - Manage client addresses
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from api.database import get_db
from api import models
from api.simple_auth import get_current_user_required, get_current_user_optional
from api.event_store import EventStore
from api.audit_logger import AuditLogger
from api.events import EventType, EventChannel, EventBuilder
from api.connection_manager import manager
from pydantic import BaseModel, field_validator, ConfigDict

router = APIRouter(prefix="/addresses", tags=["Addresses"])


# Request/Response Schemas
class AddressCreate(BaseModel):
    label: str  # 'home', 'work', 'other', or custom
    address_type: Optional[str] = None  # 'breakfast', 'lunch', 'dinner', 'general'
    line1: str
    line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str = "India"
    latitude: Optional[str] = None
    longitude: Optional[str] = None
    is_default: bool = False
    special_instructions: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    
    @field_validator('label')
    @classmethod
    def validate_label(cls, v: str) -> str:
        if not v or len(v.strip()) < 1:
            raise ValueError('Label cannot be empty')
        return v.strip()
    
    @field_validator('address_type')
    @classmethod
    def validate_address_type(cls, v: Optional[str]) -> Optional[str]:
        if v and v.lower() not in ['breakfast', 'lunch', 'dinner', 'general']:
            raise ValueError('Address type must be one of: breakfast, lunch, dinner, general')
        return v.lower() if v else None
    
    @field_validator('line1')
    @classmethod
    def validate_line1(cls, v: str) -> str:
        if not v or len(v.strip()) < 5:
            raise ValueError('Address line 1 must be at least 5 characters')
        return v.strip()
    
    @field_validator('postal_code')
    @classmethod
    def validate_postal_code(cls, v: str) -> str:
        if not v or len(v.strip()) < 5:
            raise ValueError('Postal code must be at least 5 characters')
        return v.strip()


class AddressUpdate(BaseModel):
    label: Optional[str] = None
    address_type: Optional[str] = None
    line1: Optional[str] = None
    line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[str] = None
    longitude: Optional[str] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None
    special_instructions: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None


class AddressResponse(BaseModel):
    id: str
    client_id: str
    label: str
    address_type: Optional[str] = None
    line1: str
    line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str
    latitude: Optional[str] = None
    longitude: Optional[str] = None
    is_default: bool
    is_active: bool
    special_instructions: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


@router.post("/", response_model=AddressResponse)
async def create_address(
    address_data: AddressCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Create a new address for the current user"""
    try:
        # If setting as default, unset other default addresses
        if address_data.is_default:
            db.query(models.Address).filter(
                models.Address.client_id == current_user.id,
                models.Address.is_default == True
            ).update({"is_default": False})
        
        # Create address
        address = models.Address(
            client_id=current_user.id,
            **address_data.model_dump(exclude_unset=True)
        )
        db.add(address)
        db.flush()
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=address.id,
            aggregate_type='address',
            event_type=EventType.ADDRESS_CREATED,
            payload={
                'address_id': address.id,
                'client_id': current_user.id,
                'label': address.label,
                'is_default': address.is_default
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
            target_type='address',
            target_id=address.id,
            new_state=address,
            user_id=current_user.id,
            user_role=current_user.role,
            request=request
        )
        
        db.commit()
        db.refresh(address)
        
        # Build event data for WebSocket broadcast
        event_data = EventBuilder.build_event(
            EventType.ADDRESS_CREATED,
            {
                "id": address.id,
                "client_id": current_user.id,
                "label": address.label,
                "is_default": address.is_default,
                "address_type": address.address_type
            }
        )
        
        # Broadcast to client channel
        await manager.broadcast_to_channel(
            EventChannel.client(current_user.id),
            event_data
        )
        
        return AddressResponse.model_validate(address)
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create address: {str(e)}")


@router.get("/", response_model=List[AddressResponse])
async def get_addresses(
    client_id: Optional[str] = None,
    address_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Get addresses for a client"""
    query = db.query(models.Address)
    
    # Determine client_id - users can only see their own addresses (unless admin)
    if client_id:
        if current_user and (current_user.role == 'admin' or current_user.id == client_id):
            query = query.filter(models.Address.client_id == client_id)
        elif current_user:
            query = query.filter(models.Address.client_id == current_user.id)
        else:
            raise HTTPException(status_code=401, detail="Authentication required")
    elif current_user and current_user.role != 'admin':
        # Non-admin users can only see their own addresses
        query = query.filter(models.Address.client_id == current_user.id)
    elif not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Apply filters
    if address_type:
        query = query.filter(models.Address.address_type == address_type)
    if is_active is not None:
        query = query.filter(models.Address.is_active == is_active)
    
    addresses = query.order_by(
        models.Address.is_default.desc(),
        models.Address.created_at.desc()
    ).all()
    
    return [AddressResponse.model_validate(addr) for addr in addresses]


@router.get("/{address_id}", response_model=AddressResponse)
async def get_address(
    address_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Get a specific address by ID"""
    address = db.query(models.Address).filter(models.Address.id == address_id).first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    
    # Check authorization
    if current_user and current_user.role != 'admin' and address.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this address")
    elif not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    return AddressResponse.model_validate(address)


@router.patch("/{address_id}", response_model=AddressResponse)
async def update_address(
    address_id: str,
    address_update: AddressUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Update an address"""
    try:
        address = db.query(models.Address).filter(models.Address.id == address_id).first()
        if not address:
            raise HTTPException(status_code=404, detail="Address not found")
        
        # Check authorization
        if current_user.role != 'admin' and address.client_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to update this address")
        
        # Store before state
        before_state = {
            'label': address.label,
            'is_default': address.is_default,
            'is_active': address.is_active
        }
        
        # If setting as default, unset other default addresses
        if address_update.is_default and address_update.is_default != address.is_default:
            db.query(models.Address).filter(
                models.Address.client_id == address.client_id,
                models.Address.id != address_id,
                models.Address.is_default == True
            ).update({"is_default": False})
        
        # Update fields
        update_data = address_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(address, field, value)
        
        db.flush()
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=address_id,
            aggregate_type='address',
            event_type=EventType.ADDRESS_UPDATED,
            payload={
                'address_id': address_id,
                'client_id': address.client_id,
                'label': address.label,
                'is_default': address.is_default,
                'is_active': address.is_active
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
            target_type='address',
            target_id=address_id,
            before_state=before_state,
            after_state={
                'label': address.label,
                'is_default': address.is_default,
                'is_active': address.is_active
            },
            user_id=current_user.id,
            user_role=current_user.role,
            request=request
        )
        
        db.commit()
        db.refresh(address)
        
        # Build event data for WebSocket broadcast
        event_data = EventBuilder.build_event(
            EventType.ADDRESS_UPDATED,
            {
                "id": address_id,
                "client_id": address.client_id,
                "label": address.label,
                "is_default": address.is_default,
                "is_active": address.is_active
            }
        )
        
        # Broadcast to client channel
        await manager.broadcast_to_channel(
            EventChannel.client(address.client_id),
            event_data
        )
        
        return AddressResponse.model_validate(address)
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update address: {str(e)}")


@router.delete("/{address_id}")
async def delete_address(
    address_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Delete (soft delete) an address"""
    try:
        address = db.query(models.Address).filter(models.Address.id == address_id).first()
        if not address:
            raise HTTPException(status_code=404, detail="Address not found")
        
        # Check authorization
        if current_user.role != 'admin' and address.client_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this address")
        
        # Soft delete
        address.is_active = False
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=address_id,
            aggregate_type='address',
            event_type=EventType.ADDRESS_DELETED,
            payload={
                'address_id': address_id,
                'client_id': address.client_id,
                'label': address.label
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
            target_type='address',
            target_id=address_id,
            before_state={'is_active': True},
            after_state={'is_active': False},
            user_id=current_user.id,
            user_role=current_user.role,
            request=request
        )
        
        db.commit()
        
        # Build event data for WebSocket broadcast
        event_data = EventBuilder.build_event(
            EventType.ADDRESS_DELETED,
            {
                "id": address_id,
                "client_id": address.client_id,
                "label": address.label
            }
        )
        
        # Broadcast to client channel
        await manager.broadcast_to_channel(
            EventChannel.client(address.client_id),
            event_data
        )
        
        return {"message": "Address deleted successfully"}
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete address: {str(e)}")


@router.get("/client/{client_id}/default", response_model=AddressResponse)
async def get_default_address(
    client_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Get the default address for a client"""
    # Check authorization
    if current_user and current_user.role != 'admin' and current_user.id != client_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    address = db.query(models.Address).filter(
        models.Address.client_id == client_id,
        models.Address.is_default == True,
        models.Address.is_active == True
    ).first()
    
    if not address:
        raise HTTPException(status_code=404, detail="No default address found")
    
    return AddressResponse.model_validate(address)

