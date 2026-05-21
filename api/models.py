from sqlalchemy import Column, String, Float, Integer, DateTime, Text, Boolean, Index
from sqlalchemy.sql import func
from sqlalchemy.dialects.sqlite import JSON as SQLiteJSON
from sqlalchemy.dialects.postgresql import JSONB
from api.database import Base
import uuid
import json

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    username = Column(String(255), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    phone = Column(String(255))
    role = Column(String(255), default="client")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    subscription_id = Column(String(255))  # Link to subscription
    daily_meal_schedule_id = Column(String(255))  # Link to daily meal schedule
    client_id = Column(String(255), nullable=False)
    client_name = Column(String(255), nullable=False)
    client_email = Column(String(255), nullable=False)
    client_phone = Column(String(255), nullable=False)
    client_address = Column(Text, nullable=False)
    diet_plan = Column(String(255), nullable=False)
    meal_type = Column(String(255), nullable=False)  # breakfast, lunch, dinner
    quantity = Column(Integer, default=1)
    price = Column(Float, nullable=False)
    status = Column(String(255), default="pending")  # pending, preparing, packed, assigned, in_transit, delivered, skipped
    kitchen_status = Column(String(255), default="pending")
    delivery_agent_id = Column(String(255))
    delivery_agent_name = Column(String(255))
    priority = Column(String(255), default="medium")  # 'low', 'medium', 'high'
    consumed_status = Column(String(255), default="not_logged")  # consumed, skipped, not_logged
    consumption_logged_at = Column(DateTime(timezone=True))
    rating = Column(Integer)
    feedback = Column(Text)
    notes = Column(Text)  # General notes for the order (can be used for special instructions)
    version = Column(Integer, default=1, nullable=False)  # Optimistic concurrency control
    idempotency_key = Column(String(255), unique=True, nullable=True)  # For idempotent order creation
    # Area and batch fields
    area_id = Column(String(255))  # Reference to Area
    batch_id = Column(String(255))  # Reference to Batch (nullable)
    timeslot_start = Column(DateTime(timezone=True))  # Delivery timeslot start
    timeslot_end = Column(DateTime(timezone=True))  # Delivery timeslot end
    # Label tracking
    label_printed = Column(Boolean, default=False)
    label_scanned_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    prepared_at = Column(DateTime(timezone=True))
    packed_at = Column(DateTime(timezone=True))
    assigned_at = Column(DateTime(timezone=True))
    picked_up_at = Column(DateTime(timezone=True))
    delivered_at = Column(DateTime(timezone=True))
    estimated_delivery_time = Column(DateTime(timezone=True))
    
    __table_args__ = (
        Index('idx_orders_status_created', 'status', 'created_at'),
        Index('idx_orders_idempotency', 'idempotency_key'),
        Index('idx_orders_client_status', 'client_id', 'status', 'created_at'),
        Index('idx_orders_agent', 'delivery_agent_id', 'status'),
        Index('idx_orders_area_batch', 'area_id', 'batch_id', 'meal_type'),
        Index('idx_orders_timeslot', 'timeslot_start', 'timeslot_end'),
    )

class KitchenQueue(Base):
    __tablename__ = "kitchen_queue"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    order_id = Column(String(255), nullable=False)
    meal_name = Column(String(255), nullable=False)
    meal_type = Column(String(255), nullable=False)
    diet_plan = Column(String(255), nullable=False)
    special_instructions = Column(Text)
    status = Column(String(255), default="pending")
    chef_assigned = Column(String(255))
    prep_time_minutes = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))

class DeliveryAgent(Base):
    __tablename__ = "delivery_agents"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    phone = Column(String(255), nullable=False)
    vehicle_type = Column(String(255), nullable=False)
    vehicle_number = Column(String(255))
    current_latitude = Column(String(255))
    current_longitude = Column(String(255))
    is_available = Column(Boolean, default=True)
    is_online = Column(Boolean, default=False)  # Online status for real-time tracking
    areas_served = Column(Text)  # JSON array of area IDs
    current_batch_id = Column(String(255))  # Currently assigned batch
    total_deliveries = Column(Integer, default=0)
    rating = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_delivery_agents_available', 'is_available', 'is_online'),
        Index('idx_delivery_agents_batch', 'current_batch_id'),
    )

class DeliveryTracking(Base):
    __tablename__ = "delivery_tracking"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    order_id = Column(String(255), nullable=False)
    delivery_agent_id = Column(String(255), nullable=False)
    latitude = Column(String(255), nullable=False)  # Current location
    longitude = Column(String(255), nullable=False)
    destination_latitude = Column(String(255))
    destination_longitude = Column(String(255))
    status = Column(String(255), default="en_route")
    estimated_delivery_time = Column(DateTime(timezone=True))
    actual_delivery_time = Column(DateTime(timezone=True))
    route_data = Column(Text)  # JSON string for route information
    distance_km = Column(Float)
    last_updated = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_delivery_order', 'order_id', 'status', 'created_at'),
        Index('idx_delivery_agent', 'delivery_agent_id', 'status', 'created_at'),
    )

class MealPlan(Base):
    __tablename__ = "meal_plans"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(255), nullable=False)
    original_price = Column(Float, nullable=False)
    current_price = Column(Float, nullable=False)
    rating = Column(Float, default=4.5)
    review_count = Column(Integer, default=0)
    badge = Column(String(255))
    image_url = Column(String(512))
    features = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        Index('idx_meal_plans_active', 'is_active'),
        Index('idx_meal_plans_category_active', 'category', 'is_active'),
    )

class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    client_id = Column(String(255), nullable=False)  # Changed from user_id for clarity
    nutritionist_id = Column(String(255))
    meal_plan_id = Column(String(255), nullable=False)
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
    duration_days = Column(Integer, default=30)
    status = Column(String(255), default="inactive")  # inactive, active, paused, completed, cancelled
    meals_per_day = Column(Integer, default=3)
    total_amount = Column(Float, nullable=False)
    payment_status = Column(String(255), default="pending")  # pending, completed, failed
    payment_method = Column(String(255))
    # New fields for checkout and allocation flow
    allocation_status = Column(String(255), default="pending_allocation")  # pending_allocation, assigned, active
    checkout_data_id = Column(String(255))  # Link to CheckoutData
    health_inputs = Column(Text)  # JSON string - denormalized for quick access
    meal_timing = Column(Text)  # JSON string - denormalized meal timing data
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_subscriptions_client_status', 'client_id', 'status', 'created_at'),
        Index('idx_subscriptions_nutritionist', 'nutritionist_id', 'status'),
        Index('idx_subscriptions_allocation', 'allocation_status', 'created_at'),
    )

# CheckoutData - Store checkout form responses
class CheckoutData(Base):
    __tablename__ = "checkout_data"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    user_id = Column(String(255), nullable=False, index=True)
    subscription_id = Column(String(255), index=True)  # Set after payment
    meal_plan_id = Column(String(255), nullable=False, index=True)
    plan_category = Column(String(255), nullable=False)  # For determining which questions to show
    health_inputs = Column(Text)  # JSON string - stores plan-specific health data
    meal_timing = Column(Text)  # JSON string - breakfast, lunch, dinner, snack times
    consultation_preference = Column(Boolean, default=False)
    consultation_date = Column(DateTime(timezone=True))
    consultation_time_slot = Column(String(255))  # Morning, Afternoon, Evening
    consultation_mode = Column(String(255))  # Call, Chat, Video Call
    delivery_addresses = Column(Text)  # JSON string - meal-specific addresses
    status = Column(String(255), default="draft")  # draft, completed, allocated
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_checkout_user_status', 'user_id', 'status', 'created_at'),
        Index('idx_checkout_subscription', 'subscription_id'),
        Index('idx_checkout_plan', 'meal_plan_id', 'status'),
    )

# UserActivity - Track user activities for nutritionist
class UserActivity(Base):
    __tablename__ = "user_activities"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    user_id = Column(String(255), nullable=False, index=True)
    subscription_id = Column(String(255), index=True)
    nutritionist_id = Column(String(255), index=True)
    activity_type = Column(String(255), nullable=False, index=True)  # meal_checkin, weight_log, symptom_log, consultation, plan_update
    activity_data = Column(Text)  # JSON string - flexible data storage
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    __table_args__ = (
        Index('idx_user_activities_user_date', 'user_id', 'created_at'),
        Index('idx_user_activities_subscription', 'subscription_id', 'created_at'),
        Index('idx_user_activities_nutritionist', 'nutritionist_id', 'created_at'),
        Index('idx_user_activities_type', 'activity_type', 'created_at'),
    )

class Nutritionist(Base):
    __tablename__ = "nutritionists"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    user_id = Column(String(255))
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(255))
    specialization = Column(String(255))
    bio = Column(Text)
    image_url = Column(String(512))
    rating = Column(Float, default=0.0)
    experience_years = Column(Integer, default=0)
    total_clients = Column(Integer, default=0)
    is_available = Column(Boolean, default=True)
    city = Column(String(255))
    tagline = Column(Text)
    qualifications = Column(Text)
    available_slots = Column(Text)  # JSON string for time availability
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        Index('idx_nutritionists_available', 'is_available'),
        Index('idx_nutritionists_rating', 'rating'),
    )

class Client(Base):
    __tablename__ = "clients"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    user_id = Column(String(255), nullable=False)
    nutritionist_id = Column(String(255))
    weight_start = Column(Float)
    weight_current = Column(Float)
    weight_goal = Column(Float)
    height = Column(Float)
    age = Column(Integer)
    gender = Column(String(255))
    health_conditions = Column(Text)
    dietary_preferences = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_clients_user', 'user_id'),
        Index('idx_clients_nutritionist', 'nutritionist_id'),
    )

class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    client_id = Column(String(255), nullable=False)
    nutritionist_id = Column(String(255), nullable=False)
    session_date = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, default=30)
    notes = Column(Text)
    status = Column(String(255), default="scheduled")
    meeting_link = Column(String(2048))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))

class ProgressLog(Base):
    __tablename__ = "progress_logs"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    client_id = Column(String(255), nullable=False)
    log_date = Column(DateTime(timezone=True), server_default=func.now())
    weight = Column(Float)
    calories_consumed = Column(Integer)
    protein_intake = Column(Float)
    water_intake_liters = Column(Float)
    meal_completion_percent = Column(Integer)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        Index('idx_progress_client_date', 'client_id', 'log_date', 'created_at'),
    )

class Consultation(Base):
    __tablename__ = "consultations"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    nutritionist_id = Column(String(255), nullable=False)
    client_id = Column(String(255), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)  # Changed from scheduled_date to date
    time_slot = Column(String(255), nullable=False)  # Added time_slot field
    duration_minutes = Column(Integer, default=60)
    status = Column(String(255), default="scheduled")
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        Index('idx_consultations_nutritionist_date', 'nutritionist_id', 'date', 'status'),
        Index('idx_consultations_client_date', 'client_id', 'date', 'status'),
    )

class DailyMealSchedule(Base):
    __tablename__ = "daily_meal_schedules"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    subscription_id = Column(String(255), nullable=False)
    client_id = Column(String(255), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    breakfast_item = Column(String(255))
    breakfast_calories = Column(Integer)
    breakfast_status = Column(String(255), default="pending")  # pending, preparing, packed, delivered, consumed, skipped
    lunch_item = Column(String(255))
    lunch_calories = Column(Integer)
    lunch_status = Column(String(255), default="pending")
    dinner_item = Column(String(255))
    dinner_calories = Column(Integer)
    dinner_status = Column(String(255), default="pending")
    notes = Column(Text)
    created_by_nutritionist_id = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_daily_meals_subscription_date', 'subscription_id', 'date', 'created_at'),
        Index('idx_daily_meals_client_date', 'client_id', 'date', 'created_at'),
    )

class WeeklyReport(Base):
    __tablename__ = "weekly_reports"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    client_id = Column(String(255), nullable=False)
    subscription_id = Column(String(255), nullable=False)
    week_number = Column(Integer, nullable=False)  # Week 1, 2, 3, 4 of subscription
    total_meals_delivered = Column(Integer, default=0)
    meals_consumed = Column(Integer, default=0)
    meals_skipped = Column(Integer, default=0)
    total_calories = Column(Integer, default=0)
    avg_calories_per_day = Column(Integer, default=0)
    weight_change = Column(Float)  # Can be positive or negative
    nutritionist_notes = Column(Text)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        Index('idx_reports_client_subscription', 'client_id', 'subscription_id', 'week_number'),
        Index('idx_reports_client_generated', 'client_id', 'generated_at'),
    )


# Event Store - Immutable event log for replay and debugging
class Event(Base):
    __tablename__ = "events"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    aggregate_id = Column(String(255), nullable=False, index=True)  # ID of the aggregate (order_id, client_id, etc.)
    aggregate_type = Column(String(255), nullable=False, index=True)  # 'order', 'subscription', 'client', etc.
    event_type = Column(String(255), nullable=False, index=True)  # Event type from EventType enum
    event_version = Column(Integer, default=1, nullable=False)  # Version of event schema
    payload = Column(Text, nullable=False)  # JSON string of event data
    event_metadata = Column(Text)  # Optional JSON string for additional metadata (user_id, IP, etc.) - renamed from 'metadata' to avoid SQLAlchemy reserved word conflict
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    __table_args__ = (
        Index('idx_events_aggregate', 'aggregate_type', 'aggregate_id', 'created_at'),
        Index('idx_events_type_created', 'event_type', 'created_at'),
    )


# Audit Logs - Track all mutations for compliance and debugging
class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    user_id = Column(String(255), index=True)  # User who performed the action (nullable for system actions)
    user_role = Column(String(255))  # Role of the user at time of action
    action = Column(String(255), nullable=False, index=True)  # 'create', 'update', 'delete', etc.
    target_type = Column(String(255), nullable=False, index=True)  # 'order', 'subscription', 'client', etc.
    target_id = Column(String(255), nullable=False, index=True)  # ID of the target entity
    before_state = Column(Text)  # JSON string of state before change (nullable for creates)
    after_state = Column(Text)  # JSON string of state after change (nullable for deletes)
    changed_fields = Column(Text)  # JSON array of field names that changed
    ip_address = Column(String(255))  # IP address of the requester
    user_agent = Column(Text)  # User agent string (unbounded; MySQL TEXT)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    __table_args__ = (
        Index('idx_audit_target', 'target_type', 'target_id', 'created_at'),
        Index('idx_audit_user', 'user_id', 'created_at'),
    )


# Payments - Transaction history for orders and subscriptions
class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    order_id = Column(String(255), index=True)  # Optional - can be for subscription payment
    subscription_id = Column(String(255), index=True)  # Optional - for subscription payments
    client_id = Column(String(255), nullable=False, index=True)
    amount_cents = Column(Integer, nullable=False)  # Store in cents to avoid float precision issues
    currency = Column(String(255), default="INR", nullable=False)
    payment_method = Column(String(255), nullable=False)  # 'card', 'upi', 'wallet', 'cash', 'netbanking'
    payment_provider = Column(String(255))  # 'razorpay', 'stripe', 'cashfree', 'manual', etc.
    payment_provider_id = Column(String(255), index=True)  # External payment provider transaction ID
    payment_provider_reference = Column(String(512))  # Additional reference from provider
    status = Column(String(255), nullable=False, index=True)  # 'pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded'
    failure_reason = Column(Text)  # Reason if payment failed
    idempotency_key = Column(String(255), unique=True, nullable=True, index=True)  # For idempotent payment processing
    payment_metadata = Column(Text)  # JSON string for additional payment data - renamed from 'metadata' to avoid SQLAlchemy reserved word conflict
    initiated_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_payments_client_status', 'client_id', 'status', 'created_at'),
        Index('idx_payments_order', 'order_id', 'status'),
        Index('idx_payments_subscription', 'subscription_id', 'status'),
    )


# Refunds - Track refund transactions
class Refund(Base):
    __tablename__ = "refunds"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    payment_id = Column(String(255), nullable=False, index=True)  # Reference to original payment
    order_id = Column(String(255), index=True)  # Optional
    subscription_id = Column(String(255), index=True)  # Optional
    client_id = Column(String(255), nullable=False, index=True)
    amount_cents = Column(Integer, nullable=False)  # Refund amount in cents
    currency = Column(String(255), default="INR", nullable=False)
    refund_reason = Column(Text)  # Reason for refund
    refund_method = Column(String(255))  # 'original', 'bank_transfer', 'wallet_credit', etc.
    payment_provider_id = Column(String(255))  # External refund ID from payment provider
    status = Column(String(255), nullable=False, index=True)  # 'pending', 'processing', 'completed', 'failed'
    failure_reason = Column(Text)
    idempotency_key = Column(String(255), unique=True, nullable=True, index=True)
    refund_metadata = Column(Text)  # JSON string for additional refund data - renamed from 'metadata' to avoid SQLAlchemy reserved word conflict
    initiated_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_refunds_payment', 'payment_id', 'status'),
        Index('idx_refunds_client', 'client_id', 'created_at'),
    )


# Addresses - Normalized address storage
class Address(Base):
    __tablename__ = "addresses"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    client_id = Column(String(255), nullable=False, index=True)
    label = Column(String(255), nullable=False)  # 'home', 'work', 'other', or custom label
    address_type = Column(String(255))  # 'breakfast', 'lunch', 'dinner', 'general'
    line1 = Column(String(255), nullable=False)
    line2 = Column(String(255))
    city = Column(String(255), nullable=False)
    state = Column(String(255), nullable=False)
    postal_code = Column(String(255), nullable=False)
    country = Column(String(255), default="India", nullable=False)
    latitude = Column(String(255))  # For geocoding
    longitude = Column(String(255))  # For geocoding
    is_default = Column(Boolean, default=False)  # Default address for this client
    is_active = Column(Boolean, default=True)
    special_instructions = Column(Text)  # Delivery instructions
    contact_name = Column(String(255))  # Name of person at address
    contact_phone = Column(String(255))  # Phone number at address
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_addresses_client', 'client_id', 'is_default', 'is_active'),
        Index('idx_addresses_type', 'client_id', 'address_type'),
    )


# Notifications - Push notification and email delivery tracking
class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    user_id = Column(String(255), nullable=False, index=True)
    notification_type = Column(String(255), nullable=False, index=True)  # 'push', 'email', 'sms', 'in_app'
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    data = Column(Text)  # JSON string for additional notification data
    channel = Column(String(255))  # Target channel/role: 'client', 'kitchen', 'delivery', 'nutritionist', 'admin'
    priority = Column(String(255), default="normal")  # 'low', 'normal', 'high', 'urgent'
    status = Column(String(255), nullable=False, index=True)  # 'pending', 'sent', 'delivered', 'failed', 'read'
    delivery_provider = Column(String(255))  # 'fcm', 'apns', 'sendgrid', 'twilio', etc.
    delivery_provider_id = Column(String(255))  # External notification ID
    retry_count = Column(Integer, default=0)
    last_attempt_at = Column(DateTime(timezone=True))
    delivered_at = Column(DateTime(timezone=True))
    read_at = Column(DateTime(timezone=True))
    failure_reason = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    __table_args__ = (
        Index('idx_notifications_user_status', 'user_id', 'status', 'created_at'),
        Index('idx_notifications_channel', 'channel', 'status', 'created_at'),
    )


# Device Tokens - For push notifications (FCM, APNs)
class DeviceToken(Base):
    __tablename__ = "device_tokens"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    user_id = Column(String(255), nullable=False, index=True)
    device_id = Column(String(255), nullable=False)  # Unique device identifier
    platform = Column(String(255), nullable=False, index=True)  # 'ios', 'android', 'web'
    token = Column(String(512), nullable=False, index=True)  # FCM token, APNs token, etc.
    app_version = Column(String(255))  # App version for debugging
    os_version = Column(String(255))  # OS version
    is_active = Column(Boolean, default=True, index=True)
    last_seen = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_device_tokens_user_platform', 'user_id', 'platform', 'is_active'),
        Index('idx_device_tokens_token', 'token', 'is_active'),
    )

class BlacklistedToken(Base):
    __tablename__ = "blacklisted_tokens"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    token = Column(Text, unique=True, nullable=False, index=True)  # JWT token string
    token_hash = Column(String(255), unique=True, nullable=False, index=True)  # Hash of token for faster lookup
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)  # Token expiration time
    blacklisted_at = Column(DateTime(timezone=True), server_default=func.now())
    reason = Column(String(255))  # Reason for blacklisting (e.g., "logout", "refresh_rotation")
    
    # Index for efficient cleanup queries
    __table_args__ = (
        Index('idx_blacklisted_token_expires', 'expires_at'),
    )


# Area Model - Delivery areas/zones
class Area(Base):
    __tablename__ = "areas"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    code = Column(String(255), unique=True)  # Short code like "HSR", "INDIRANAGAR"
    description = Column(Text)
    delivery_radius_km = Column(Float)  # Delivery radius in kilometers
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_areas_active', 'is_active'),
        Index('idx_areas_code', 'code'),
    )


# Batch Model - Groups orders by area + meal + timeslot
class Batch(Base):
    __tablename__ = "batches"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    area_id = Column(String(255), nullable=False)  # Reference to Area
    meal_type = Column(String(255), nullable=False)  # breakfast, lunch, dinner
    timeslot_start = Column(DateTime(timezone=True))  # Delivery timeslot start
    timeslot_end = Column(DateTime(timezone=True))  # Delivery timeslot end
    status = Column(String(255), default="pending")  # pending, ready_for_pickup, picked, completed
    delivery_agent_id = Column(String(255))  # Assigned delivery agent (nullable)
    total_orders = Column(Integer, default=0)
    packed_count = Column(Integer, default=0)
    ready_count = Column(Integer, default=0)
    picked_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_batches_area_meal', 'area_id', 'meal_type', 'timeslot_start'),
        Index('idx_batches_status', 'status', 'created_at'),
        Index('idx_batches_agent', 'delivery_agent_id', 'status'),
    )


# BatchMeal Model - Junction table linking batches to orders
class BatchMeal(Base):
    __tablename__ = "batch_meals"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    batch_id = Column(String(255), nullable=False)  # Reference to Batch
    order_id = Column(String(255), nullable=False)  # Reference to Order
    status = Column(String(255), default="pending")  # pending, packed, ready, picked, delivered
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_batch_meals_batch', 'batch_id', 'status'),
        Index('idx_batch_meals_order', 'order_id'),
        Index('idx_batch_meals_unique', 'batch_id', 'order_id', unique=True),
    )

# Product Model - Nutritional products marketplace
class Product(Base):
    __tablename__ = "products"
    
    id = Column(String(255), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    short_benefit = Column(String(255))  # 1-line benefit
    price = Column(Float, nullable=False)
    image_url = Column(String(512))
    category = Column(String(255))  # protein_fitness, vitamins_minerals, gut_health, healthy_snacks, diabetic_friendly, womens_health
    tags = Column(SQLiteJSON)  # JSON array: ["Vegan", "Sugar-Free", etc.]
    rating = Column(Float, default=0.0)  # 0-5
    review_count = Column(Integer, default=0)
    nutritional_highlights = Column(SQLiteJSON)  # JSON object
    key_benefits = Column(SQLiteJSON)  # JSON array
    suitable_for = Column(SQLiteJSON)  # JSON array
    nutritionist_endorsements = Column(SQLiteJSON)  # JSON array
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)  # For home page slider
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_products_category', 'category', 'is_active'),
        Index('idx_products_featured', 'is_featured', 'is_active'),
        Index('idx_products_active', 'is_active', 'created_at'),
    )
