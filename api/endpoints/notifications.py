"""
Notifications API Endpoints - Manage push notifications and email delivery
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from api.database import get_db
from api import models
from api.simple_auth import get_current_user_required, get_current_user_optional
from api.event_store import EventStore
from api.audit_logger import AuditLogger
from api.events import EventType, EventChannel, EventBuilder
from api.connection_manager import manager
from pydantic import BaseModel, field_validator, ConfigDict

router = APIRouter(prefix="/notifications", tags=["Notifications"])


# Request/Response Schemas
class NotificationCreate(BaseModel):
    user_id: str
    notification_type: str  # 'push', 'email', 'sms', 'in_app'
    title: str
    message: str
    data: Optional[dict] = None
    channel: Optional[str] = None
    priority: str = "normal"
    
    @field_validator('notification_type')
    @classmethod
    def validate_notification_type(cls, v: str) -> str:
        valid_types = ['push', 'email', 'sms', 'in_app']
        if v.lower() not in valid_types:
            raise ValueError(f'Notification type must be one of: {", ".join(valid_types)}')
        return v.lower()
    
    @field_validator('priority')
    @classmethod
    def validate_priority(cls, v: str) -> str:
        valid_priorities = ['low', 'normal', 'high', 'urgent']
        if v.lower() not in valid_priorities:
            raise ValueError(f'Priority must be one of: {", ".join(valid_priorities)}')
        return v.lower()
    
    @field_validator('title')
    @classmethod
    def validate_title(cls, v: str) -> str:
        if not v or len(v.strip()) < 1:
            raise ValueError('Title cannot be empty')
        if len(v) > 200:
            raise ValueError('Title must be less than 200 characters')
        return v.strip()


class NotificationUpdate(BaseModel):
    status: Optional[str] = None
    read_at: Optional[datetime] = None
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v and v.lower() not in ['pending', 'sent', 'delivered', 'failed', 'read']:
            raise ValueError('Status must be one of: pending, sent, delivered, failed, read')
        return v.lower() if v else None


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    notification_type: str
    title: str
    message: str
    data: Optional[str] = None
    channel: Optional[str] = None
    priority: str
    status: str
    delivery_provider: Optional[str] = None
    delivery_provider_id: Optional[str] = None
    retry_count: int
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    failure_reason: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class DeviceTokenCreate(BaseModel):
    device_id: str
    platform: str  # 'ios', 'android', 'web'
    token: str
    app_version: Optional[str] = None
    os_version: Optional[str] = None
    
    @field_validator('platform')
    @classmethod
    def validate_platform(cls, v: str) -> str:
        valid_platforms = ['ios', 'android', 'web']
        if v.lower() not in valid_platforms:
            raise ValueError(f'Platform must be one of: {", ".join(valid_platforms)}')
        return v.lower()
    
    @field_validator('token')
    @classmethod
    def validate_token(cls, v: str) -> str:
        if not v or len(v.strip()) < 10:
            raise ValueError('Token must be at least 10 characters')
        return v.strip()


class DeviceTokenResponse(BaseModel):
    id: str
    user_id: str
    device_id: str
    platform: str
    token: str
    app_version: Optional[str] = None
    os_version: Optional[str] = None
    is_active: bool
    last_seen: datetime
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


@router.post("/", response_model=NotificationResponse)
async def create_notification(
    notification_data: NotificationCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Create a notification (admin only or system)"""
    try:
        # Check authorization - only admin can create notifications for others
        if notification_data.user_id != current_user.id and current_user.role != 'admin':
            raise HTTPException(status_code=403, detail="Not authorized to create notifications for other users")
        
        # Verify user exists
        user = db.query(models.User).filter(models.User.id == notification_data.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Create notification
        import json
        notification = models.Notification(
            user_id=notification_data.user_id,
            notification_type=notification_data.notification_type,
            title=notification_data.title,
            message=notification_data.message,
            data=json.dumps(notification_data.data) if notification_data.data else None,
            channel=notification_data.channel or user.role,
            priority=notification_data.priority,
            status="pending"
        )
        db.add(notification)
        db.flush()
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=notification.id,
            aggregate_type='notification',
            event_type=EventType.NOTIFICATION_CREATED,
            payload={
                'notification_id': notification.id,
                'user_id': notification_data.user_id,
                'notification_type': notification_data.notification_type,
                'title': notification_data.title,
                'priority': notification_data.priority
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
            target_type='notification',
            target_id=notification.id,
            new_state=notification,
            user_id=current_user.id,
            user_role=current_user.role,
            request=request
        )
        
        # TODO: In production, send notification via FCM/APNs/Email service
        # For now, just mark as sent for testing
        notification.status = "sent"
        notification.delivered_at = datetime.now()
        notification.delivery_provider = "mock"  # Mock provider for testing
        
        db.commit()
        db.refresh(notification)
        
        # Build event data for WebSocket broadcast
        event_data = EventBuilder.build_event(
            EventType.NOTIFICATION_CREATED,
            {
                "id": notification.id,
                "user_id": notification_data.user_id,
                "notification_type": notification_data.notification_type,
                "title": notification_data.title,
                "message": notification_data.message,
                "priority": notification_data.priority,
                "status": notification.status
            }
        )
        
        # Broadcast to user's channel (client, nutritionist, delivery, etc.)
        user_channel = EventChannel.client(notification_data.user_id) if user.role == 'client' else (
            EventChannel.nutritionist(notification_data.user_id) if user.role == 'nutritionist' else (
                EventChannel.delivery_agent(notification_data.user_id) if user.role == 'delivery' else
                EventChannel.ADMIN
            )
        )
        await manager.broadcast_to_channel(user_channel, event_data)
        
        return NotificationResponse.model_validate(notification)
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create notification: {str(e)}")


@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    user_id: Optional[str] = None,
    notification_type: Optional[str] = None,
    status: Optional[str] = None,
    channel: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Get notifications with optional filtering"""
    query = db.query(models.Notification)
    
    # Determine user_id - users can only see their own notifications (unless admin)
    if user_id:
        if current_user and (current_user.role == 'admin' or current_user.id == user_id):
            query = query.filter(models.Notification.user_id == user_id)
        elif current_user:
            query = query.filter(models.Notification.user_id == current_user.id)
        else:
            raise HTTPException(status_code=401, detail="Authentication required")
    elif current_user and current_user.role != 'admin':
        query = query.filter(models.Notification.user_id == current_user.id)
    elif not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Apply filters
    if notification_type:
        query = query.filter(models.Notification.notification_type == notification_type)
    if status:
        query = query.filter(models.Notification.status == status)
    if channel:
        query = query.filter(models.Notification.channel == channel)
    
    notifications = query.order_by(models.Notification.created_at.desc()).offset(skip).limit(limit).all()
    
    return [NotificationResponse.model_validate(notif) for notif in notifications]


@router.patch("/{notification_id}", response_model=NotificationResponse)
async def update_notification(
    notification_id: str,
    notification_update: NotificationUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Update notification status (e.g., mark as read)"""
    try:
        notification = db.query(models.Notification).filter(
            models.Notification.id == notification_id
        ).first()
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        # Check authorization
        if current_user.role != 'admin' and notification.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to update this notification")
        
        # Store before state
        before_state = {'status': notification.status, 'read_at': notification.read_at}
        
        # Update fields
        if notification_update.status:
            notification.status = notification_update.status
        if notification_update.read_at:
            notification.read_at = notification_update.read_at
        elif notification_update.status == "read" and not notification.read_at:
            notification.read_at = datetime.now()
        
        db.flush()
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=notification_id,
            aggregate_type='notification',
            event_type=EventType.NOTIFICATION_UPDATED,
            payload={
                'notification_id': notification_id,
                'user_id': notification.user_id,
                'old_status': before_state['status'],
                'new_status': notification.status,
                'read_at': notification.read_at.isoformat() if notification.read_at else None
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
            target_type='notification',
            target_id=notification_id,
            before_state=before_state,
            after_state={'status': notification.status, 'read_at': notification.read_at},
            user_id=current_user.id,
            user_role=current_user.role,
            request=request
        )
        
        db.commit()
        db.refresh(notification)
        
        # Build event data for WebSocket broadcast
        event_data = EventBuilder.build_event(
            EventType.NOTIFICATION_UPDATED,
            {
                "id": notification_id,
                "user_id": notification.user_id,
                "status": notification.status,
                "read_at": notification.read_at.isoformat() if notification.read_at else None
            }
        )
        
        # Broadcast to user's channel
        user = db.query(models.User).filter(models.User.id == notification.user_id).first()
        if user:
            user_channel = EventChannel.client(notification.user_id) if user.role == 'client' else (
                EventChannel.nutritionist(notification.user_id) if user.role == 'nutritionist' else (
                    EventChannel.delivery_agent(notification.user_id) if user.role == 'delivery' else
                    EventChannel.ADMIN
                )
            )
            await manager.broadcast_to_channel(user_channel, event_data)
        
        return NotificationResponse.model_validate(notification)
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update notification: {str(e)}")


@router.post("/device-tokens", response_model=DeviceTokenResponse)
async def register_device_token(
    token_data: DeviceTokenCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Register or update a device token for push notifications"""
    try:
        # Check if token already exists for this device
        existing_token = db.query(models.DeviceToken).filter(
            models.DeviceToken.user_id == current_user.id,
            models.DeviceToken.device_id == token_data.device_id,
            models.DeviceToken.platform == token_data.platform
        ).first()
        
        if existing_token:
            # Update existing token
            existing_token.token = token_data.token
            existing_token.app_version = token_data.app_version
            existing_token.os_version = token_data.os_version
            existing_token.is_active = True
            existing_token.last_seen = datetime.now()
            
            db.commit()
            db.refresh(existing_token)
            return DeviceTokenResponse.model_validate(existing_token)
        
        # Create new device token
        device_token = models.DeviceToken(
            user_id=current_user.id,
            device_id=token_data.device_id,
            platform=token_data.platform,
            token=token_data.token,
            app_version=token_data.app_version,
            os_version=token_data.os_version,
            is_active=True
        )
        db.add(device_token)
        db.commit()
        db.refresh(device_token)
        
        return DeviceTokenResponse.model_validate(device_token)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to register device token: {str(e)}")


@router.get("/device-tokens", response_model=List[DeviceTokenResponse])
async def get_device_tokens(
    user_id: Optional[str] = None,
    platform: Optional[str] = None,
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Get device tokens for push notifications"""
    query = db.query(models.DeviceToken)
    
    # Determine user_id
    if user_id:
        if current_user and (current_user.role == 'admin' or current_user.id == user_id):
            query = query.filter(models.DeviceToken.user_id == user_id)
        elif current_user:
            query = query.filter(models.DeviceToken.user_id == current_user.id)
        else:
            raise HTTPException(status_code=401, detail="Authentication required")
    elif current_user and current_user.role != 'admin':
        query = query.filter(models.DeviceToken.user_id == current_user.id)
    elif not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Apply filters
    if platform:
        query = query.filter(models.DeviceToken.platform == platform)
    if is_active is not None:
        query = query.filter(models.DeviceToken.is_active == is_active)
    
    tokens = query.order_by(models.DeviceToken.last_seen.desc()).all()
    
    return [DeviceTokenResponse.model_validate(token) for token in tokens]


@router.delete("/device-tokens/{token_id}")
async def delete_device_token(
    token_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Deactivate a device token"""
    try:
        token = db.query(models.DeviceToken).filter(models.DeviceToken.id == token_id).first()
        if not token:
            raise HTTPException(status_code=404, detail="Device token not found")
        
        # Check authorization
        if current_user.role != 'admin' and token.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        token.is_active = False
        db.commit()
        
        return {"message": "Device token deactivated successfully"}
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to deactivate device token: {str(e)}")

