"""
Payments API Endpoints - Handle payment processing and refunds
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
from api.services.payment_service import PaymentService
from pydantic import BaseModel, field_validator, ConfigDict
from decimal import Decimal
import json

router = APIRouter(prefix="/payments", tags=["Payments"])


# Request/Response Schemas
class PaymentCreate(BaseModel):
    order_id: Optional[str] = None
    subscription_id: Optional[str] = None
    amount_cents: Optional[int] = None  # Amount in cents (preferred)
    amount: Optional[float] = None  # Amount in currency units (will be converted to cents if amount_cents not provided)
    currency: str = "INR"
    payment_method: str  # 'card', 'upi', 'wallet', 'cash', 'netbanking'
    idempotency_key: Optional[str] = None
    metadata: Optional[dict] = None
    
    @field_validator('payment_method')
    @classmethod
    def validate_payment_method(cls, v: str) -> str:
        valid_methods = ['card', 'upi', 'wallet', 'cash', 'netbanking']
        if v.lower() not in valid_methods:
            raise ValueError(f'Payment method must be one of: {", ".join(valid_methods)}')
        return v.lower()
    
    @field_validator('amount')
    @classmethod
    def validate_amount(cls, v: Optional[float]) -> Optional[float]:
        if v is not None:
            if v <= 0:
                raise ValueError('Amount must be greater than 0')
            if v > 1000000:  # 10 lakh rupees max
                raise ValueError('Amount exceeds maximum limit')
        return v
    
    @field_validator('amount_cents')
    @classmethod
    def validate_amount_cents(cls, v: Optional[int]) -> Optional[int]:
        if v is not None:
            if v <= 0:
                raise ValueError('Amount in cents must be greater than 0')
            if v > 100000000:  # 10 lakh rupees in cents
                raise ValueError('Amount exceeds maximum limit')
        return v


class PaymentResponse(BaseModel):
    id: str
    order_id: Optional[str] = None
    subscription_id: Optional[str] = None
    client_id: str
    amount_cents: int
    amount: float  # Calculated from cents for convenience
    currency: str
    payment_method: str
    payment_provider: Optional[str] = None
    payment_provider_id: Optional[str] = None
    status: str
    failure_reason: Optional[str] = None
    initiated_at: datetime
    completed_at: Optional[datetime] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class RefundCreate(BaseModel):
    payment_id: str
    amount: Optional[float] = None  # If None, full refund
    refund_reason: Optional[str] = None
    idempotency_key: Optional[str] = None
    
    @field_validator('amount')
    @classmethod
    def validate_amount(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError('Refund amount must be greater than 0')
        return v


class RefundResponse(BaseModel):
    id: str
    payment_id: str
    order_id: Optional[str] = None
    subscription_id: Optional[str] = None
    client_id: str
    amount_cents: int
    amount: float
    currency: str
    refund_reason: Optional[str] = None
    status: str
    payment_provider_id: Optional[str] = None
    initiated_at: datetime
    completed_at: Optional[datetime] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class PaymentWebhook(BaseModel):
    provider_id: str
    signature: Optional[str] = None
    status: str
    failure_reason: Optional[str] = None
    metadata: Optional[dict] = None


@router.post("/", response_model=PaymentResponse)
async def create_payment(
    payment_data: PaymentCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Create and process a payment"""
    try:
        # Convert amount to cents
        if payment_data.amount_cents:
            amount_cents = payment_data.amount_cents
        elif payment_data.amount:
            amount_cents = int(payment_data.amount * 100)
        else:
            raise HTTPException(status_code=400, detail="Either amount or amount_cents must be provided")
        
        # Verify order or subscription exists
        if payment_data.order_id:
            order = db.query(models.Order).filter(models.Order.id == payment_data.order_id).first()
            if not order:
                raise HTTPException(status_code=404, detail="Order not found")
            if order.client_id != current_user.id and current_user.role != 'admin':
                raise HTTPException(status_code=403, detail="Not authorized to pay for this order")
        
        if payment_data.subscription_id:
            subscription = db.query(models.Subscription).filter(
                models.Subscription.id == payment_data.subscription_id
            ).first()
            if not subscription:
                raise HTTPException(status_code=404, detail="Subscription not found")
            if subscription.client_id != current_user.id and current_user.role != 'admin':
                raise HTTPException(status_code=403, detail="Not authorized to pay for this subscription")
        
        # Create payment
        payment = PaymentService.initiate_payment(
            db=db,
            order_id=payment_data.order_id,
            subscription_id=payment_data.subscription_id,
            client_id=current_user.id,
            amount_cents=amount_cents,
            payment_method=payment_data.payment_method,
            currency=payment_data.currency,
            idempotency_key=payment_data.idempotency_key,
            metadata=payment_data.metadata
        )
        
        # Process payment (mock - in production, this would redirect to payment gateway)
        result = PaymentService.process_payment(db=db, payment=payment)
        
        db.refresh(payment)
        
        # Update subscription payment status if payment is successful and subscription exists
        if payment.status == "completed" and payment.subscription_id:
            subscription = db.query(models.Subscription).filter(
                models.Subscription.id == payment.subscription_id
            ).first()
            if subscription:
                old_status = subscription.payment_status
                subscription.payment_status = "completed"
                
                # Log subscription update
                AuditLogger.log_update(
                    db=db,
                    target_type='subscription',
                    target_id=subscription.id,
                    before_state={'payment_status': old_status},
                    after_state={'payment_status': 'completed'},
                    user_id=current_user.id,
                    user_role=current_user.role,
                    request=request
                )
                
                # If subscription is pending allocation, trigger admin notification
                if subscription.allocation_status == "pending_allocation":
                    allocation_event = EventBuilder.build_event(
                        EventType.SUBSCRIPTION_UPDATED,
                        {
                            "subscription_id": subscription.id,
                            "client_id": subscription.client_id,
                            "allocation_status": "pending_allocation",
                            "payment_status": "completed",
                            "action": "new_pending_allocation"
                        }
                    )
                    await manager.broadcast_to_channel(EventChannel.ADMIN, allocation_event)
                
                # Check if consultation is scheduled, if not create notification reminder
                consultation = db.query(models.Consultation).filter(
                    models.Consultation.client_id == subscription.client_id,
                    models.Consultation.status.in_(["scheduled", "confirmed"])
                ).first()
                
                if not consultation:
                    # Create notification to remind user to schedule consultation
                    notification = models.Notification(
                        user_id=subscription.client_id,
                        notification_type="in_app",
                        title="Schedule Your Consultation",
                        message="Your payment was successful! Please schedule your consultation with your nutritionist to get started with your personalized meal plan.",
                        data=json.dumps({
                            "type": "consultation_reminder",
                            "subscription_id": subscription.id,
                            "action": "schedule_consultation",
                            "redirect": "/client?scheduleConsultation=true"
                        }),
                        channel="client",
                        priority="high",
                        status="pending"
                    )
                    db.add(notification)
                    db.flush()  # Flush to get notification.id
                    
                    # Broadcast notification event to client
                    notification_event = EventBuilder.build_event(
                        EventType.NOTIFICATION_CREATED,
                        {
                            "notification_id": notification.id,
                            "user_id": subscription.client_id,
                            "title": notification.title,
                            "message": notification.message,
                            "type": "consultation_reminder"
                        }
                    )
                    await manager.broadcast_to_channel(
                        EventChannel.client(subscription.client_id),
                        notification_event
                    )
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=payment.id,
            aggregate_type='payment',
            event_type=EventType.SUBSCRIPTION_UPDATED if payment.subscription_id else EventType.MEAL_STATUS_CHANGED,
            payload={
                'payment_id': payment.id,
                'client_id': payment.client_id,
                'amount_cents': payment.amount_cents,
                'status': payment.status,
                'order_id': payment.order_id,
                'subscription_id': payment.subscription_id
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
            target_type='payment',
            target_id=payment.id,
            new_state=payment,
            user_id=current_user.id,
            user_role=current_user.role,
            request=request
        )
        
        # Broadcast payment created event
        event_data = EventBuilder.build_event(
            EventType.SUBSCRIPTION_UPDATED if payment.subscription_id else EventType.MEAL_STATUS_CHANGED,
            {
                "payment_id": payment.id,
                "client_id": payment.client_id,
                "amount": payment.amount_cents / 100.0,
                "status": payment.status,
                "order_id": payment.order_id,
                "subscription_id": payment.subscription_id,
                "payment_method": payment.payment_method
            }
        )
        
        # Broadcast to client channel
        await manager.broadcast_to_channel(
            EventChannel.client(payment.client_id),
            event_data
        )
        
        # Broadcast to admin channel
        await manager.broadcast_to_channel(EventChannel.ADMIN, event_data)
        
        # Build response with amount in currency units
        response = PaymentResponse.model_validate(payment)
        response.amount = payment.amount_cents / 100.0
        
        return response
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create payment: {str(e)}")


@router.get("/", response_model=List[PaymentResponse])
async def get_payments(
    order_id: Optional[str] = None,
    subscription_id: Optional[str] = None,
    client_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Get payments with optional filtering"""
    query = db.query(models.Payment)
    
    # Apply filters
    if order_id:
        query = query.filter(models.Payment.order_id == order_id)
    if subscription_id:
        query = query.filter(models.Payment.subscription_id == subscription_id)
    if client_id:
        # Only admin can view other users' payments
        if current_user and (current_user.role == 'admin' or current_user.id == client_id):
            query = query.filter(models.Payment.client_id == client_id)
        elif current_user:
            query = query.filter(models.Payment.client_id == current_user.id)
        else:
            raise HTTPException(status_code=401, detail="Authentication required")
    elif current_user and current_user.role != 'admin':
        # Non-admin users can only see their own payments
        query = query.filter(models.Payment.client_id == current_user.id)
    
    if status:
        query = query.filter(models.Payment.status == status)
    
    payments = query.order_by(models.Payment.created_at.desc()).offset(skip).limit(limit).all()
    
    # Convert to response with amount in currency units
    result = []
    for payment in payments:
        response = PaymentResponse.model_validate(payment)
        response.amount = payment.amount_cents / 100.0
        result.append(response)
    
    return result


@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Get a specific payment by ID"""
    payment = db.query(models.Payment).filter(models.Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Check authorization
    if current_user and current_user.role != 'admin' and payment.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this payment")
    
    response = PaymentResponse.model_validate(payment)
    response.amount = payment.amount_cents / 100.0
    
    return response


@router.post("/refund", response_model=RefundResponse)
async def create_refund(
    refund_data: RefundCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Create a refund for a payment"""
    try:
        # Get payment
        payment = db.query(models.Payment).filter(models.Payment.id == refund_data.payment_id).first()
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        # Check authorization
        if current_user.role != 'admin' and payment.client_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to refund this payment")
        
        # Convert amount to cents if provided
        refund_amount_cents = int(refund_data.amount * 100) if refund_data.amount else None
        
        # Process refund
        refund = PaymentService.process_refund(
            db=db,
            payment_id=refund_data.payment_id,
            refund_amount_cents=refund_amount_cents,
            refund_reason=refund_data.refund_reason,
            idempotency_key=refund_data.idempotency_key
        )
        
        # Log event
        EventStore.append_event(
            db=db,
            aggregate_id=refund.id,
            aggregate_type='refund',
            event_type=EventType.SUBSCRIPTION_UPDATED,
            payload={
                'refund_id': refund.id,
                'payment_id': refund.payment_id,
                'amount_cents': refund.amount_cents,
                'status': refund.status
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
            target_type='refund',
            target_id=refund.id,
            new_state=refund,
            user_id=current_user.id,
            user_role=current_user.role,
            request=request
        )
        
        response = RefundResponse.model_validate(refund)
        response.amount = refund.amount_cents / 100.0
        
        return response
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create refund: {str(e)}")


@router.post("/webhook")
async def payment_webhook(
    webhook_data: PaymentWebhook,
    request: Request,
    db: Session = Depends(get_db)
):
    """Handle payment webhook from payment provider with signature verification"""
    try:
        webhook_payload = {
            "status": webhook_data.status,
            "failure_reason": webhook_data.failure_reason,
            "provider_id": webhook_data.provider_id,
        }
        if webhook_data.metadata:
            webhook_payload.update(webhook_data.metadata)
        
        # Verify webhook signature
        try:
            payment = PaymentService.verify_payment_webhook(
                db=db,
                provider_id=webhook_data.provider_id,
                signature=webhook_data.signature,
                payload=webhook_payload
            )
        except ValueError as e:
            # Invalid signature
            raise HTTPException(
                status_code=401,
                detail=f"Webhook verification failed: {str(e)}"
            )
        
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        # Log webhook event
        EventStore.append_event(
            db=db,
            aggregate_id=payment.id,
            aggregate_type='payment',
            event_type=EventType.SYSTEM_ERROR if payment.status == "failed" else EventType.SUBSCRIPTION_UPDATED,
            payload={
                'payment_id': payment.id,
                'status': payment.status,
                'webhook_status': webhook_data.status
            },
            metadata={
                'source': 'payment_webhook',
                'provider_id': webhook_data.provider_id
            }
        )
        
        return {"status": "processed", "payment_id": payment.id}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to process webhook: {str(e)}")

