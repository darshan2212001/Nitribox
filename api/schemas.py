from pydantic import BaseModel, ConfigDict, field_validator, EmailStr, HttpUrl, conint, confloat
from typing import Optional
from datetime import datetime
import re

def to_camel(string: str) -> str:
    components = string.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])

class OrderCreate(BaseModel):
    client_id: str
    client_name: str
    client_email: EmailStr
    client_phone: str
    client_address: str
    diet_plan: str
    meal_type: str
    quantity: conint(ge=1, le=10) = 1
    price: confloat(ge=0.0)
    idempotency_key: Optional[str] = None  # For idempotent order creation
    
    @field_validator('client_name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v or len(v.strip()) < 2:
            raise ValueError('Client name must be at least 2 characters')
        if len(v) > 100:
            raise ValueError('Client name must be less than 100 characters')
        return v.strip()
    
    @field_validator('client_phone')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        # Basic phone validation (digits only, 10-15 digits)
        phone = re.sub(r'[^\d+]', '', v)
        if len(phone) < 10 or len(phone) > 15:
            raise ValueError('Phone number must be between 10 and 15 digits')
        return phone
    
    @field_validator('client_address')
    @classmethod
    def validate_address(cls, v: str) -> str:
        if not v or len(v.strip()) < 10:
            raise ValueError('Address must be at least 10 characters')
        return v.strip()
    
    @field_validator('meal_type')
    @classmethod
    def validate_meal_type(cls, v: str) -> str:
        valid_types = ['breakfast', 'lunch', 'dinner', 'snack']
        if v.lower() not in valid_types:
            raise ValueError(f'Meal type must be one of: {", ".join(valid_types)}')
        return v.lower()

class OrderUpdate(BaseModel):
    status: Optional[str] = None
    kitchen_status: Optional[str] = None
    delivery_agent_id: Optional[str] = None
    delivery_agent_name: Optional[str] = None
    prepared_at: Optional[datetime] = None
    picked_up_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    estimated_delivery_time: Optional[datetime] = None
    expected_version: Optional[int] = None  # For optimistic concurrency control
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        valid_statuses = ['pending', 'preparing', 'ready', 'assigned', 'picked-up', 'in-transit', 'delivered', 'completed', 'cancelled']
        if v.lower() not in valid_statuses:
            raise ValueError(f'Status must be one of: {", ".join(valid_statuses)}')
        return v.lower()
    
    @field_validator('kitchen_status')
    @classmethod
    def validate_kitchen_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        valid_statuses = ['pending', 'preparing', 'ready', 'packed', 'completed']
        if v.lower() not in valid_statuses:
            raise ValueError(f'Kitchen status must be one of: {", ".join(valid_statuses)}')
        return v.lower()

class OrderResponse(BaseModel):
    id: str
    client_id: str
    client_name: str
    client_email: str
    client_phone: str
    client_address: str
    diet_plan: str
    meal_type: str
    quantity: int
    price: float
    status: str
    kitchen_status: str
    delivery_agent_id: Optional[str] = None
    delivery_agent_name: Optional[str] = None
    priority: Optional[str] = None
    special_instructions: Optional[str] = None
    area_id: Optional[str] = None
    batch_id: Optional[str] = None
    timeslot_start: Optional[datetime] = None
    timeslot_end: Optional[datetime] = None
    label_printed: bool = False
    label_scanned_at: Optional[datetime] = None
    version: int  # Optimistic concurrency control version
    created_at: datetime
    prepared_at: Optional[datetime] = None
    packed_at: Optional[datetime] = None
    picked_up_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    estimated_delivery_time: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True, alias_generator=to_camel)

class KitchenQueueCreate(BaseModel):
    order_id: str
    meal_name: str
    meal_type: str
    diet_plan: str
    special_instructions: Optional[str] = None
    prep_time_minutes: Optional[int] = None

class KitchenQueueUpdate(BaseModel):
    status: Optional[str] = None
    chef_assigned: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class KitchenQueueResponse(BaseModel):
    id: str
    order_id: str
    meal_name: str
    meal_type: str
    diet_plan: str
    special_instructions: Optional[str] = None
    status: str
    chef_assigned: Optional[str] = None
    prep_time_minutes: Optional[int] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True, alias_generator=to_camel)

class DeliveryAgentCreate(BaseModel):
    name: str
    phone: str
    vehicle_type: str
    vehicle_number: Optional[str] = None
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v or len(v.strip()) < 2:
            raise ValueError('Name must be at least 2 characters')
        if len(v) > 100:
            raise ValueError('Name must be less than 100 characters')
        return v.strip()
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        phone = re.sub(r'[^\d+]', '', v)
        if len(phone) < 10 or len(phone) > 15:
            raise ValueError('Phone number must be between 10 and 15 digits')
        return phone
    
    @field_validator('vehicle_type')
    @classmethod
    def validate_vehicle_type(cls, v: str) -> str:
        valid_types = ['bicycle', 'motorcycle', 'car', 'scooter', 'van']
        if v.lower() not in valid_types:
            raise ValueError(f'Vehicle type must be one of: {", ".join(valid_types)}')
        return v.lower()

class DeliveryAgentUpdate(BaseModel):
    current_latitude: Optional[str] = None
    current_longitude: Optional[str] = None
    is_available: Optional[bool] = None
    total_deliveries: Optional[int] = None
    rating: Optional[float] = None

class DeliveryAgentResponse(BaseModel):
    id: str
    name: str
    phone: str
    vehicle_type: str
    vehicle_number: Optional[str] = None
    current_latitude: Optional[str] = None
    current_longitude: Optional[str] = None
    is_available: bool
    is_online: bool
    areas_served: Optional[str] = None  # JSON array of area IDs
    current_batch_id: Optional[str] = None
    total_deliveries: int
    rating: float
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True, alias_generator=to_camel)


# Area Schemas
class AreaCreate(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    delivery_radius_km: Optional[float] = None
    is_active: bool = True
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v or len(v.strip()) < 2:
            raise ValueError('Area name must be at least 2 characters')
        return v.strip()
    
    @field_validator('code')
    @classmethod
    def validate_code(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if len(v.strip()) < 2:
            raise ValueError('Area code must be at least 2 characters')
        return v.strip().upper()


class AreaUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    delivery_radius_km: Optional[float] = None
    is_active: Optional[bool] = None


class AreaResponse(BaseModel):
    id: str
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    delivery_radius_km: Optional[float] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True, alias_generator=to_camel)


# Batch Schemas
class BatchCreate(BaseModel):
    area_id: str
    meal_type: str
    timeslot_start: datetime
    timeslot_end: datetime
    delivery_agent_id: Optional[str] = None
    
    @field_validator('meal_type')
    @classmethod
    def validate_meal_type(cls, v: str) -> str:
        valid_types = ['breakfast', 'lunch', 'dinner']
        if v.lower() not in valid_types:
            raise ValueError(f'Meal type must be one of: {", ".join(valid_types)}')
        return v.lower()


class BatchUpdate(BaseModel):
    status: Optional[str] = None
    delivery_agent_id: Optional[str] = None
    timeslot_start: Optional[datetime] = None
    timeslot_end: Optional[datetime] = None
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        valid_statuses = ['pending', 'ready_for_pickup', 'picked', 'completed']
        if v.lower() not in valid_statuses:
            raise ValueError(f'Status must be one of: {", ".join(valid_statuses)}')
        return v.lower()


class BatchResponse(BaseModel):
    id: str
    area_id: str
    meal_type: str
    timeslot_start: datetime
    timeslot_end: datetime
    status: str
    delivery_agent_id: Optional[str] = None
    total_orders: int
    packed_count: int
    ready_count: int
    picked_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True, alias_generator=to_camel)


# BatchMeal Schemas
class BatchMealCreate(BaseModel):
    batch_id: str
    order_id: str
    status: Optional[str] = "pending"


class BatchMealUpdate(BaseModel):
    status: Optional[str] = None
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        valid_statuses = ['pending', 'packed', 'ready', 'picked', 'delivered']
        if v.lower() not in valid_statuses:
            raise ValueError(f'Status must be one of: {", ".join(valid_statuses)}')
        return v.lower()


class BatchMealResponse(BaseModel):
    id: str
    batch_id: str
    order_id: str
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True, alias_generator=to_camel)

class DeliveryTrackingCreate(BaseModel):
    order_id: str
    delivery_agent_id: str
    current_latitude: str
    current_longitude: str
    destination_latitude: str
    destination_longitude: str
    status: str = "en_route"
    estimated_time: Optional[str] = None
    distance_km: Optional[confloat(ge=0.0)] = None
    
    @field_validator('current_latitude', 'destination_latitude')
    @classmethod
    def validate_latitude(cls, v: str) -> str:
        try:
            coord = float(v)
            if coord < -90 or coord > 90:
                raise ValueError('Latitude must be between -90 and 90')
            return str(coord)
        except ValueError as e:
            if 'could not convert' in str(e):
                raise ValueError(f'Invalid coordinate format: {v}')
            raise
    
    @field_validator('current_longitude', 'destination_longitude')
    @classmethod
    def validate_longitude(cls, v: str) -> str:
        try:
            coord = float(v)
            if coord < -180 or coord > 180:
                raise ValueError('Longitude must be between -180 and 180')
            return str(coord)
        except ValueError as e:
            if 'could not convert' in str(e):
                raise ValueError(f'Invalid coordinate format: {v}')
            raise
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v: str) -> str:
        valid_statuses = ['en_route', 'arrived', 'delivered', 'cancelled']
        if v.lower() not in valid_statuses:
            raise ValueError(f'Status must be one of: {", ".join(valid_statuses)}')
        return v.lower()

class DeliveryTrackingUpdate(BaseModel):
    current_latitude: Optional[str] = None
    current_longitude: Optional[str] = None
    status: Optional[str] = None
    estimated_time: Optional[str] = None
    distance_km: Optional[float] = None

class DeliveryTrackingResponse(BaseModel):
    id: str
    order_id: str
    delivery_agent_id: str
    current_latitude: str
    current_longitude: str
    destination_latitude: str
    destination_longitude: str
    status: str
    estimated_time: Optional[str] = None
    distance_km: Optional[float] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True, alias_generator=to_camel)

class DeliveryOrderResponse(BaseModel):
    """Response schema for active delivery orders with all fields mobile app needs"""
    order_id: str
    order_number: Optional[str] = None
    client_id: str
    client_name: str
    client_phone: str
    client_address: str
    client_email: Optional[str] = None
    meal_type: str
    diet_plan: str
    quantity: int
    status: str
    priority: Optional[str] = None
    special_instructions: Optional[str] = None
    assigned_at: Optional[datetime] = None
    current_location: Optional[dict] = None
    estimated_delivery_time: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True, alias_generator=to_camel)

# Meal Plan Schemas
class MealPlanCreate(BaseModel):
    title: str
    description: str
    category: str
    original_price: confloat(ge=0.0)
    current_price: confloat(ge=0.0)
    rating: Optional[confloat(ge=0.0, le=5.0)] = 4.5
    review_count: Optional[conint(ge=0)] = 0
    badge: Optional[str] = None
    image_url: Optional[HttpUrl] = None
    features: Optional[str] = None
    is_active: Optional[bool] = True
    
    @field_validator('title')
    @classmethod
    def validate_title(cls, v: str) -> str:
        if not v or len(v.strip()) < 3:
            raise ValueError('Title must be at least 3 characters')
        if len(v) > 200:
            raise ValueError('Title must be less than 200 characters')
        return v.strip()
    
    @field_validator('description')
    @classmethod
    def validate_description(cls, v: str) -> str:
        if not v or len(v.strip()) < 10:
            raise ValueError('Description must be at least 10 characters')
        if len(v) > 2000:
            raise ValueError('Description must be less than 2000 characters')
        return v.strip()
    
    @field_validator('category')
    @classmethod
    def validate_category(cls, v: str) -> str:
        valid_categories = ['weight-loss', 'weight-gain', 'muscle-gain', 'diabetes', 'heart-health', 'general-wellness']
        if v.lower() not in valid_categories:
            raise ValueError(f'Category must be one of: {", ".join(valid_categories)}')
        return v.lower()
    
    @field_validator('current_price')
    @classmethod
    def validate_price_comparison(cls, v: float, info) -> float:
        # Ensure current_price <= original_price
        # Note: info.data contains the raw input data
        if hasattr(info, 'data') and 'original_price' in info.data:
            original = info.data.get('original_price')
            if original is not None and v > original:
                raise ValueError('Current price cannot be greater than original price')
        return v

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

class MealPlanUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    original_price: Optional[float] = None
    current_price: Optional[float] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None
    badge: Optional[str] = None
    image_url: Optional[str] = None
    features: Optional[str] = None
    is_active: Optional[bool] = None

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

class MealPlanRatingUpdate(BaseModel):
    rating: float

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

class MealPlanResponse(BaseModel):
    id: str
    title: str
    description: str
    category: str
    original_price: float
    current_price: float
    rating: float
    review_count: int
    badge: Optional[str] = None
    image_url: Optional[str] = None
    features: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True, alias_generator=to_camel)

# Subscription Schemas
class SubscriptionCreate(BaseModel):
    user_id: str
    meal_plan_id: str
    end_date: Optional[datetime] = None
    price_paid: confloat(ge=0.0)
    payment_method: Optional[str] = None
    
    @field_validator('payment_method')
    @classmethod
    def validate_payment_method(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        valid_methods = ['razorpay', 'stripe', 'cash', 'bank-transfer', 'upi', 'card']
        if v.lower() not in valid_methods:
            raise ValueError(f'Payment method must be one of: {", ".join(valid_methods)}')
        return v.lower()

class SubscriptionUpdate(BaseModel):
    status: Optional[str] = None
    end_date: Optional[datetime] = None

class SubscriptionResponse(BaseModel):
    id: str
    user_id: str
    meal_plan_id: str
    start_date: datetime
    end_date: Optional[datetime] = None
    status: str
    price_paid: float
    payment_method: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True, alias_generator=to_camel)

# Nutritionist Schemas
class NutritionistCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    specialization: Optional[str] = None
    bio: Optional[str] = None
    image_url: Optional[HttpUrl] = None
    experience_years: Optional[conint(ge=0, le=50)] = 0
    rating: Optional[confloat(ge=0.0, le=5.0)] = 0.0
    total_clients: Optional[conint(ge=0)] = 0
    is_available: Optional[bool] = True
    city: Optional[str] = None
    tagline: Optional[str] = None
    qualifications: Optional[str] = None
    available_slots: Optional[str] = None
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v or len(v.strip()) < 2:
            raise ValueError('Name must be at least 2 characters')
        if len(v) > 100:
            raise ValueError('Name must be less than 100 characters')
        return v.strip()
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None or not v:
            return v
        phone = re.sub(r'[^\d+]', '', v)
        if len(phone) < 10 or len(phone) > 15:
            raise ValueError('Phone number must be between 10 and 15 digits')
        return phone
    
    @field_validator('bio')
    @classmethod
    def validate_bio(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if len(v) > 1000:
            raise ValueError('Bio must be less than 1000 characters')
        return v.strip() if v else None

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

class NutritionistUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    specialization: Optional[str] = None
    bio: Optional[str] = None
    image_url: Optional[str] = None
    rating: Optional[float] = None
    total_clients: Optional[int] = None
    is_available: Optional[bool] = None
    city: Optional[str] = None
    tagline: Optional[str] = None
    qualifications: Optional[str] = None
    available_slots: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

class NutritionistResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    specialization: Optional[str] = None
    bio: Optional[str] = None
    image_url: Optional[str] = None
    rating: float
    experience_years: int
    total_clients: int
    is_available: bool
    city: Optional[str] = None
    tagline: Optional[str] = None
    qualifications: Optional[str] = None
    available_slots: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True, alias_generator=to_camel)

# Client Schemas
class ClientCreate(BaseModel):
    user_id: str
    nutritionist_id: Optional[str] = None
    weight_start: Optional[confloat(ge=0.0, le=500.0)] = None
    weight_current: Optional[confloat(ge=0.0, le=500.0)] = None
    weight_goal: Optional[confloat(ge=0.0, le=500.0)] = None
    height: Optional[confloat(ge=0.0, le=300.0)] = None
    age: Optional[conint(ge=0, le=150)] = None
    gender: Optional[str] = None
    health_conditions: Optional[str] = None
    dietary_preferences: Optional[str] = None
    
    @field_validator('gender')
    @classmethod
    def validate_gender(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        valid_genders = ['male', 'female', 'other', 'prefer-not-to-say']
        if v.lower() not in valid_genders:
            raise ValueError(f'Gender must be one of: {", ".join(valid_genders)}')
        return v.lower()
    
    @field_validator('health_conditions', 'dietary_preferences')
    @classmethod
    def validate_text_field(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if len(v) > 1000:
            raise ValueError('Field must be less than 1000 characters')
        return v.strip() if v else None

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

class ClientUpdate(BaseModel):
    nutritionist_id: Optional[str] = None
    weight_current: Optional[float] = None
    weight_goal: Optional[float] = None
    health_conditions: Optional[str] = None
    dietary_preferences: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

class ClientResponse(BaseModel):
    id: str
    user_id: str
    nutritionist_id: Optional[str] = None
    weight_start: Optional[float] = None
    weight_current: Optional[float] = None
    weight_goal: Optional[float] = None
    height: Optional[float] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    health_conditions: Optional[str] = None
    dietary_preferences: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True, alias_generator=to_camel)

# Session Schemas
class SessionCreate(BaseModel):
    client_id: str
    nutritionist_id: str
    session_date: datetime
    duration_minutes: Optional[int] = 30
    notes: Optional[str] = None
    meeting_link: Optional[str] = None

class SessionUpdate(BaseModel):
    session_date: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    completed_at: Optional[datetime] = None

class SessionResponse(BaseModel):
    id: str
    client_id: str
    nutritionist_id: str
    session_date: datetime
    duration_minutes: int
    notes: Optional[str] = None
    status: str
    meeting_link: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True, alias_generator=to_camel)

# Progress Log Schemas
class ProgressLogCreate(BaseModel):
    client_id: str
    weight: Optional[confloat(ge=0.0, le=500.0)] = None
    calories_consumed: Optional[conint(ge=0, le=10000)] = None
    protein_intake: Optional[confloat(ge=0.0, le=500.0)] = None
    water_intake_liters: Optional[confloat(ge=0.0, le=20.0)] = None
    meal_completion_percent: Optional[conint(ge=0, le=100)] = None
    notes: Optional[str] = None
    
    @field_validator('notes')
    @classmethod
    def validate_notes(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if len(v) > 1000:
            raise ValueError('Notes must be less than 1000 characters')
        return v.strip() if v else None

class ProgressLogUpdate(BaseModel):
    weight: Optional[float] = None
    calories_consumed: Optional[int] = None
    protein_intake: Optional[float] = None
    water_intake_liters: Optional[float] = None
    meal_completion_percent: Optional[int] = None
    notes: Optional[str] = None

class ProgressLogResponse(BaseModel):
    id: str
    client_id: str
    log_date: datetime
    weight: Optional[float] = None
    calories_consumed: Optional[int] = None
    protein_intake: Optional[float] = None
    water_intake_liters: Optional[float] = None
    meal_completion_percent: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True, alias_generator=to_camel)

# Additional missing schemas
class DeliveryAssignment(BaseModel):
    delivery_person: str
    estimated_delivery_time: Optional[datetime] = None

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

class DeliveryConfirmation(BaseModel):
    notes: Optional[str] = None
    delivered_at: Optional[datetime] = None

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

class UserResponse(BaseModel):
    id: str
    username: str
    email: str  # Required in User model
    name: str  # Required in User model
    phone: Optional[str] = None
    role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True, alias_generator=to_camel)


class RegisterResponse(BaseModel):
    """POST /auth/register: JWTs plus created user (same token field names as /login)."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse

    model_config = ConfigDict(populate_by_name=True)


class OrderStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

class ConsultationCreate(BaseModel):
    client_id: str
    session_type: str
    scheduled_date: datetime
    duration_minutes: conint(ge=15, le=180) = 60
    notes: Optional[str] = None
    
    @field_validator('session_type')
    @classmethod
    def validate_session_type(cls, v: str) -> str:
        valid_types = ['initial', 'follow-up', 'nutrition-counseling', 'meal-planning', 'progress-review']
        if v.lower() not in valid_types:
            raise ValueError(f'Session type must be one of: {", ".join(valid_types)}')
        return v.lower()
    
    @field_validator('notes')
    @classmethod
    def validate_notes(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if len(v) > 2000:
            raise ValueError('Notes must be less than 2000 characters')
        return v.strip() if v else None
    
    @field_validator('scheduled_date')
    @classmethod
    def validate_scheduled_date(cls, v: datetime) -> datetime:
        # Ensure scheduled date is in the future
        from datetime import datetime as dt
        if v < dt.now():
            raise ValueError('Scheduled date must be in the future')
        return v

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

class ConsultationResponse(BaseModel):
    id: str
    nutritionist_id: str
    client_id: str
    session_type: str
    scheduled_date: datetime
    duration_minutes: int
    status: str
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True, alias_generator=to_camel)

# Product Schemas
class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    short_benefit: Optional[str] = None
    price: confloat(ge=0.0)
    image_url: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[list] = None
    rating: Optional[confloat(ge=0.0, le=5.0)] = 0.0
    review_count: Optional[int] = 0
    nutritional_highlights: Optional[dict] = None
    key_benefits: Optional[list] = None
    suitable_for: Optional[list] = None
    nutritionist_endorsements: Optional[list] = None
    is_active: Optional[bool] = True
    is_featured: Optional[bool] = False

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    short_benefit: Optional[str] = None
    price: Optional[confloat(ge=0.0)] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[list] = None
    rating: Optional[confloat(ge=0.0, le=5.0)] = None
    review_count: Optional[int] = None
    nutritional_highlights: Optional[dict] = None
    key_benefits: Optional[list] = None
    suitable_for: Optional[list] = None
    nutritionist_endorsements: Optional[list] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None

class ProductResponse(ProductBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True, populate_by_name=True, alias_generator=to_camel)

class ProductListResponse(BaseModel):
    products: list[ProductResponse]
    total: int
    page: int
    page_size: int
    
    model_config = ConfigDict(from_attributes=True, populate_by_name=True, alias_generator=to_camel)

class ProductCategoryResponse(BaseModel):
    category: str
    count: int
    
    model_config = ConfigDict(from_attributes=True, populate_by_name=True, alias_generator=to_camel)
