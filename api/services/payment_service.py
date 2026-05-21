"""
Payment Service - Sample payment integration for testing.
This is a mock payment processor that simulates payment gateway behavior.
In production, replace with actual payment provider integration (Razorpay, Stripe, etc.)
"""

from sqlalchemy.orm import Session
from api import models
from typing import Dict, Any, Optional
from datetime import datetime
import random
import uuid
import os
import hmac
import hashlib
import json


class PaymentService:
    """Mock payment service for testing"""
    
    # Simulate payment processing delays
    PROCESSING_TIME_SECONDS = 2  # Simulate 2 second processing
    
    @staticmethod
    def generate_provider_id() -> str:
        """Generate a mock payment provider transaction ID"""
        return f"mock_txn_{uuid.uuid4().hex[:16]}"
    
    @staticmethod
    def process_payment(
        db: Session,
        payment: models.Payment,
        simulate_failure: bool = False,
        failure_rate: float = 0.05  # 5% failure rate by default
    ) -> Dict[str, Any]:
        """
        Process a payment (mock implementation).
        
        In production, this would call actual payment gateway APIs.
        
        Args:
            db: Database session
            payment: Payment model instance
            simulate_failure: Force a failure (for testing)
            failure_rate: Random failure rate (0.0 to 1.0)
            
        Returns:
            Dict with payment status and details
        """
        # Simulate payment processing
        if simulate_failure or random.random() < failure_rate:
            # Payment failed
            payment.status = "failed"
            payment.failure_reason = random.choice([
                "Insufficient funds",
                "Card declined",
                "Invalid card details",
                "Network error",
                "Timeout"
            ])
            db.commit()
            return {
                "success": False,
                "status": "failed",
                "failure_reason": payment.failure_reason,
                "payment_id": payment.id
            }
        
        # Payment successful
        payment.status = "completed"
        payment.completed_at = datetime.now()
        payment.payment_provider_id = PaymentService.generate_provider_id()
        
        # If payment is for an order, update order payment status
        if payment.order_id:
            order = db.query(models.Order).filter(models.Order.id == payment.order_id).first()
            if order:
                # Note: Orders don't have direct payment_status, but we can track via subscription
                pass
        
        # If payment is for a subscription, update subscription payment status
        if payment.subscription_id:
            subscription = db.query(models.Subscription).filter(
                models.Subscription.id == payment.subscription_id
            ).first()
            if subscription:
                subscription.payment_status = "completed"
        
        db.commit()
        
        return {
            "success": True,
            "status": "completed",
            "payment_provider_id": payment.payment_provider_id,
            "payment_id": payment.id,
            "completed_at": payment.completed_at.isoformat()
        }
    
    @staticmethod
    def initiate_payment(
        db: Session,
        order_id: Optional[str],
        subscription_id: Optional[str],
        client_id: str,
        amount_cents: int,
        payment_method: str,
        currency: str = "INR",
        idempotency_key: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> models.Payment:
        """
        Create and initiate a payment.
        
        Args:
            db: Database session
            order_id: Optional order ID
            subscription_id: Optional subscription ID
            client_id: Client user ID
            amount_cents: Amount in cents
            payment_method: Payment method ('card', 'upi', 'wallet', etc.)
            currency: Currency code (default: INR)
            idempotency_key: Optional idempotency key
            metadata: Optional additional metadata
            
        Returns:
            Created Payment model instance
        """
        # Check for idempotency
        if idempotency_key:
            existing_payment = db.query(models.Payment).filter(
                models.Payment.idempotency_key == idempotency_key
            ).first()
            if existing_payment:
                return existing_payment
        
        # Generate idempotency key if not provided
        if not idempotency_key:
            idempotency_key = str(uuid.uuid4())
        
        # Create payment record
        payment = models.Payment(
            order_id=order_id,
            subscription_id=subscription_id,
            client_id=client_id,
            amount_cents=amount_cents,
            currency=currency,
            payment_method=payment_method,
            payment_provider="mock",  # Mock provider for testing
            status="pending",
            idempotency_key=idempotency_key,
            payment_metadata=str(metadata) if metadata else None
        )
        
        db.add(payment)
        db.flush()  # Get the ID
        
        # For mock, immediately process (in production, this would redirect to payment gateway)
        # In real implementation, status would remain "pending" until webhook callback
        
        return payment
    
    @staticmethod
    def process_refund(
        db: Session,
        payment_id: str,
        refund_amount_cents: Optional[int] = None,
        refund_reason: Optional[str] = None,
        idempotency_key: Optional[str] = None
    ) -> models.Refund:
        """
        Process a refund for a payment.
        
        Args:
            db: Database session
            payment_id: Original payment ID
            refund_amount_cents: Refund amount (defaults to full payment amount)
            refund_reason: Reason for refund
            idempotency_key: Optional idempotency key
            
        Returns:
            Created Refund model instance
        """
        # Get original payment
        payment = db.query(models.Payment).filter(models.Payment.id == payment_id).first()
        if not payment:
            raise ValueError(f"Payment {payment_id} not found")
        
        if payment.status != "completed":
            raise ValueError(f"Cannot refund payment with status: {payment.status}")
        
        # Check for idempotency
        if idempotency_key:
            existing_refund = db.query(models.Refund).filter(
                models.Refund.idempotency_key == idempotency_key
            ).first()
            if existing_refund:
                return existing_refund
        
        if not idempotency_key:
            idempotency_key = str(uuid.uuid4())
        
        # Determine refund amount (default to full amount)
        if refund_amount_cents is None:
            refund_amount_cents = payment.amount_cents
        
        if refund_amount_cents > payment.amount_cents:
            raise ValueError("Refund amount cannot exceed payment amount")
        
        # Create refund record
        refund = models.Refund(
            payment_id=payment_id,
            order_id=payment.order_id,
            subscription_id=payment.subscription_id,
            client_id=payment.client_id,
            amount_cents=refund_amount_cents,
            currency=payment.currency,
            refund_reason=refund_reason or "Customer request",
            refund_method="original",  # Refund to original payment method
            payment_provider_id=PaymentService.generate_provider_id(),
            status="completed",  # Mock: immediately complete (in production, would be pending)
            idempotency_key=idempotency_key,
            refund_metadata=None,
            completed_at=datetime.now()
        )
        
        db.add(refund)
        
        # Update payment status
        if refund_amount_cents == payment.amount_cents:
            payment.status = "refunded"
        else:
            payment.status = "partially_refunded"
        
        db.commit()
        db.refresh(refund)
        
        return refund
    
    @staticmethod
    def verify_webhook_signature(
        payload: Dict[str, Any],
        signature: Optional[str],
        secret: Optional[str] = None
    ) -> bool:
        """
        Verify webhook signature using HMAC-SHA256.
        
        Args:
            payload: Webhook payload dictionary
            signature: Signature from webhook header
            secret: Webhook secret (from environment or default)
            
        Returns:
            True if signature is valid, False otherwise
        """
        if not signature:
            # In production, signature is required
            is_production = os.getenv("ENVIRONMENT") == "production" or os.getenv("NODE_ENV") == "production"
            if is_production:
                return False
            # In development, allow webhooks without signature for testing
            return True
        
        # Get webhook secret from environment or use default for development
        if not secret:
            secret = os.getenv("PAYMENT_WEBHOOK_SECRET", "dev-webhook-secret-change-in-production")
        
        # Create signature from payload
        # Sort payload keys for consistent hashing
        payload_str = json.dumps(payload, sort_keys=True, separators=(',', ':'))
        expected_signature = hmac.new(
            secret.encode('utf-8'),
            payload_str.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        # Use constant-time comparison to prevent timing attacks
        return hmac.compare_digest(expected_signature, signature)
    
    @staticmethod
    def verify_payment_webhook(
        db: Session,
        provider_id: str,
        signature: Optional[str] = None,
        payload: Optional[Dict[str, Any]] = None
    ) -> Optional[models.Payment]:
        """
        Verify and process payment webhook from payment provider.
        
        Args:
            db: Database session
            provider_id: Payment provider transaction ID
            signature: Webhook signature (for verification)
            payload: Webhook payload
            
        Returns:
            Updated Payment model instance or None if verification fails
        """
        # Verify signature if provided
        if payload and not PaymentService.verify_webhook_signature(payload, signature):
            raise ValueError("Invalid webhook signature")
        
        # Find payment by provider ID
        payment = db.query(models.Payment).filter(
            models.Payment.payment_provider_id == provider_id
        ).first()
        
        if not payment:
            return None
        
        # Update payment status based on webhook payload
        if payload:
            webhook_status = payload.get("status", "").lower()
            if webhook_status == "success":
                payment.status = "completed"
                payment.completed_at = datetime.now()
            elif webhook_status == "failed":
                payment.status = "failed"
                payment.failure_reason = payload.get("failure_reason", "Payment failed")
            elif webhook_status == "processing":
                payment.status = "processing"
        
        db.commit()
        db.refresh(payment)
        
        return payment

