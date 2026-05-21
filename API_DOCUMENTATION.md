# 🔌 ZyaeL NutriBox API Documentation

## 📋 API Overview

The ZyaeL NutriBox API is a comprehensive RESTful API built with FastAPI that powers the entire nutrition ecosystem. It provides real-time meal management, delivery tracking, and analytics capabilities.

**Base URL**: `http://localhost:8000`  
**API Version**: `1.0.0`  
**Documentation**: `http://localhost:8000/docs` (Swagger UI)  
**Alternative Docs**: `http://localhost:8000/redoc` (ReDoc)

---

## 🔐 Authentication

### Authentication Flow
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "user-123",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "client"
  }
}
```

### Using Authentication
Include the token in the Authorization header:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 👤 Client Management

### Get All Clients
```http
GET /api/clients
```

**Response:**
```json
[
  {
    "id": "client-123",
    "user_id": "user-123",
    "nutritionist_id": "nutritionist-456",
    "weight_start": 70.0,
    "weight_current": 68.5,
    "weight_goal": 65.0,
    "height": 170.0,
    "age": 30,
    "gender": "Female",
    "health_conditions": "Diabetes",
    "dietary_preferences": "Vegetarian",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-20T14:22:00Z"
  }
]
```

### Get Specific Client
```http
GET /api/clients/{client_id}
```

### Create Client
```http
POST /api/clients
Content-Type: application/json

{
  "user_id": "user-123",
  "nutritionist_id": "nutritionist-456",
  "weight_start": 70.0,
  "weight_goal": 65.0,
  "height": 170.0,
  "age": 30,
  "gender": "Female",
  "health_conditions": "Diabetes",
  "dietary_preferences": "Vegetarian"
}
```

---

## 🍽️ Daily Meal Management

### Get Daily Meals
```http
GET /api/daily-meals
```

**Query Parameters:**
- `client_id` (optional): Filter by client
- `date` (optional): Filter by date (YYYY-MM-DD)
- `meal_type` (optional): Filter by meal type (breakfast/lunch/dinner)

**Response:**
```json
[
  {
    "id": "daily-meal-123",
    "subscription_id": "sub-456",
    "date": "2024-01-20",
    "breakfast_item": "Oats Bowl with Berries",
    "breakfast_calories": 350,
    "breakfast_status": "delivered",
    "lunch_item": "Quinoa Salad",
    "lunch_calories": 450,
    "lunch_status": "preparing",
    "dinner_item": "Grilled Paneer",
    "dinner_calories": 400,
    "dinner_status": "pending",
    "notes": "Client prefers less spice",
    "created_at": "2024-01-20T06:00:00Z"
  }
]
```

### Update Meal Status
```http
PATCH /api/daily-meals/{schedule_id}/meal-status
Content-Type: application/json

{
  "meal_type": "breakfast",
  "status": "preparing",
  "notes": "Started preparation at 7:00 AM"
}
```

**Real-time Event Triggered:**
```json
{
  "type": "meal.preparing",
  "data": {
    "order_id": "order-123",
    "client_id": "client-456",
    "meal_type": "breakfast",
    "timestamp": "2024-01-20T07:00:00Z"
  }
}
```

### Log Meal Consumption
```http
POST /api/daily-meals/{schedule_id}/log-consumption
Content-Type: application/json

{
  "meal_type": "breakfast",
  "status": "consumed",
  "notes": "Enjoyed the meal",
  "rating": 5
}
```

---

## 🚚 Delivery Tracking

### Assign Delivery Agent
```http
POST /api/delivery-tracking/assign
Content-Type: application/json

{
  "order_id": "order-123",
  "delivery_agent_id": "agent-456"
}
```

**Response:**
```json
{
  "tracking_id": "tracking-789",
  "order_id": "order-123",
  "delivery_agent_id": "agent-456",
  "status": "assigned",
  "estimated_delivery_time": "2024-01-20T08:30:00Z",
  "created_at": "2024-01-20T07:45:00Z"
}
```

### Update Delivery Location
```http
POST /api/delivery-tracking/{order_id}/location
Content-Type: application/json

{
  "latitude": "28.6139",
  "longitude": "77.2090",
  "status": "in_transit"
}
```

**Real-time Event Triggered:**
```json
{
  "type": "delivery.location_update",
  "data": {
    "order_id": "order-123",
    "client_id": "client-456",
    "delivery_agent_id": "agent-456",
    "latitude": "28.6139",
    "longitude": "77.2090",
    "eta_minutes": 15,
    "timestamp": "2024-01-20T08:15:00Z"
  }
}
```

### Get Live Delivery Tracking
```http
GET /api/delivery-tracking/{order_id}/live
```

**Response:**
```json
{
  "tracking_id": "tracking-789",
  "order_id": "order-123",
  "delivery_agent": {
    "id": "agent-456",
    "name": "Rajesh Kumar",
    "phone": "+91-9876543210"
  },
  "current_location": {
    "latitude": "28.6139",
    "longitude": "77.2090",
    "timestamp": "2024-01-20T08:15:00Z"
  },
  "status": "in_transit",
  "estimated_delivery_time": "2024-01-20T08:30:00Z",
  "route_data": {
    "distance_km": 2.5,
    "estimated_duration_minutes": 15
  }
}
```

---

## 👨‍🍳 Kitchen Operations

### Get Today's Schedule
```http
GET /api/kitchen/today-schedule
```

**Response:**
```json
{
  "date": "2024-01-20",
  "total_meals": 45,
  "meals_by_type": {
    "breakfast": {
      "total": 15,
      "preparing": 5,
      "packed": 8,
      "delivered": 2
    },
    "lunch": {
      "total": 15,
      "pending": 10,
      "preparing": 5
    },
    "dinner": {
      "total": 15,
      "pending": 15
    }
  },
  "orders": [
    {
      "id": "order-123",
      "client_name": "John Doe",
      "meal_type": "breakfast",
      "meal_item": "Oats Bowl with Berries",
      "status": "preparing",
      "priority": "high",
      "estimated_prep_time": 15
    }
  ]
}
```

### Start Meal Preparation
```http
PATCH /api/kitchen/meal/{order_id}/start-preparation
Content-Type: application/json

{
  "estimated_completion_time": "2024-01-20T07:30:00Z",
  "notes": "Started preparation"
}
```

### Mark Meal as Packed
```http
PATCH /api/kitchen/meal/{order_id}/mark-packed
Content-Type: application/json

{
  "packed_at": "2024-01-20T07:45:00Z",
  "notes": "Ready for pickup"
}
```

---

## 👩‍⚕️ Nutritionist Management

### Get All Nutritionists
```http
GET /api/nutritionists
```

**Response:**
```json
[
  {
    "id": "nutritionist-123",
    "name": "Dr. Sarah Johnson",
    "email": "sarah@nutribox.com",
    "phone": "+1-555-0123",
    "specialization": "Weight Management",
    "experience_years": 8,
    "qualifications": "MSc Nutrition, RD",
    "is_available": true,
    "rating": 4.8,
    "total_clients": 25,
    "consultation_fee": 500.0,
    "city": "Mumbai",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### Book Consultation
```http
POST /api/nutritionists/{nutritionist_id}/book
Content-Type: application/json

{
  "client_id": "client-456",
  "session_date": "2024-01-25T10:00:00Z",
  "duration_minutes": 30,
  "notes": "Initial consultation"
}
```

---

## 📊 Reports & Analytics

### Weekly Client Report
```http
GET /api/reports/weekly-report/{client_id}
```

**Query Parameters:**
- `week_start` (optional): Start date of the week (YYYY-MM-DD)

**Response:**
```json
{
  "client_id": "client-456",
  "week_start": "2024-01-15",
  "week_end": "2024-01-21",
  "total_meals": 21,
  "consumed_meals": 18,
  "skipped_meals": 3,
  "consumption_rate": 85.7,
  "average_calories_per_day": 1200,
  "weight_change": -0.5,
  "progress_summary": {
    "breakfast_completion": 100,
    "lunch_completion": 85.7,
    "dinner_completion": 71.4
  },
  "recommendations": [
    "Consider adding more protein to dinner",
    "Client shows good breakfast consistency"
  ],
  "generated_at": "2024-01-22T00:00:00Z"
}
```

### Nutritionist Client Progress
```http
GET /api/reports/nutritionist/{nutritionist_id}/client-progress
```

**Response:**
```json
{
  "nutritionist_id": "nutritionist-123",
  "total_clients": 25,
  "active_clients": 20,
  "average_completion_rate": 82.5,
  "clients": [
    {
      "client_id": "client-456",
      "client_name": "John Doe",
      "completion_rate": 85.7,
      "weight_change": -0.5,
      "last_consultation": "2024-01-15T10:00:00Z",
      "next_consultation": "2024-01-22T10:00:00Z",
      "alerts": ["Skipped dinner 3 times this week"]
    }
  ],
  "generated_at": "2024-01-20T12:00:00Z"
}
```

---

## 📦 Order Management

### Get All Orders
```http
GET /api/orders
```

**Query Parameters:**
- `client_id` (optional): Filter by client
- `status` (optional): Filter by status
- `meal_type` (optional): Filter by meal type
- `date` (optional): Filter by date

**Response:**
```json
[
  {
    "id": "order-123",
    "client_id": "client-456",
    "client_name": "John Doe",
    "meal_type": "breakfast",
    "meal_item": "Oats Bowl with Berries",
    "calories": 350,
    "status": "delivered",
    "kitchen_status": "completed",
    "delivery_status": "delivered",
    "order_date": "2024-01-20",
    "delivery_time": "2024-01-20T08:22:00Z",
    "created_at": "2024-01-20T06:00:00Z"
  }
]
```

### Create Order from Daily Meal
```http
POST /api/orders/from-daily-meal
Content-Type: application/json

{
  "daily_meal_schedule_id": "schedule-123",
  "meal_type": "breakfast"
}
```

---

## 🚛 Delivery Agent Management

### Get All Delivery Agents
```http
GET /api/delivery-agents
```

**Response:**
```json
[
  {
    "id": "agent-123",
    "name": "Rajesh Kumar",
    "email": "rajesh@nutribox.com",
    "phone": "+91-9876543210",
    "vehicle_type": "bike",
    "license_number": "DL123456789",
    "is_available": true,
    "current_location": {
      "latitude": "28.6139",
      "longitude": "77.2090"
    },
    "rating": 4.5,
    "total_deliveries": 150,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### Get Agent Orders
```http
GET /api/delivery-agents/{agent_id}/orders
```

---

## 📈 System Monitoring

### Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T12:00:00Z",
  "version": "1.0.0",
  "environment": "development",
  "database": "connected",
  "websocket": "active",
  "uptime": "2 days, 5 hours, 30 minutes"
}
```

### Monitoring Dashboard
```http
GET /api/monitoring/dashboard
```

**Response:**
```json
{
  "system_metrics": {
    "active_connections": 45,
    "total_events_today": 1250,
    "average_response_time": 150,
    "error_rate": 0.02
  },
  "meal_metrics": {
    "meals_prepared_today": 45,
    "meals_delivered_today": 42,
    "average_delivery_time": 22,
    "on_time_delivery_rate": 95.5
  },
  "user_metrics": {
    "active_clients": 25,
    "active_nutritionists": 5,
    "active_delivery_agents": 8,
    "total_subscriptions": 30
  }
}
```

---

## 🔄 WebSocket Events

### Connection
```javascript
const ws = new WebSocket('ws://localhost:8000/ws');

ws.onopen = () => {
  // Subscribe to channels
  ws.send(JSON.stringify({
    action: 'subscribe',
    channel: 'client_user-123'
  }));
};
```

### Event Types

#### Meal Events
```json
{
  "type": "meal.preparing",
  "data": {
    "order_id": "order-123",
    "client_id": "client-456",
    "meal_type": "breakfast",
    "timestamp": "2024-01-20T07:00:00Z"
  }
}
```

#### Delivery Events
```json
{
  "type": "delivery.location_update",
  "data": {
    "order_id": "order-123",
    "client_id": "client-456",
    "delivery_agent_id": "agent-789",
    "latitude": "28.6139",
    "longitude": "77.2090",
    "eta_minutes": 15,
    "timestamp": "2024-01-20T08:15:00Z"
  }
}
```

#### System Events
```json
{
  "type": "daily_meals_assigned",
  "data": {
    "date": "2024-01-20",
    "total_meals": 45,
    "clients_affected": 15,
    "timestamp": "2024-01-20T06:00:00Z"
  }
}
```

---

## ❌ Error Handling

### Error Response Format
```json
{
  "detail": "Error message",
  "error_code": "VALIDATION_ERROR",
  "timestamp": "2024-01-20T12:00:00Z",
  "request_id": "req-123456"
}
```

### Common Error Codes
- `VALIDATION_ERROR`: Invalid request data
- `NOT_FOUND`: Resource not found
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `RATE_LIMITED`: Too many requests
- `INTERNAL_ERROR`: Server error

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `422`: Validation Error
- `500`: Internal Server Error

---

## 🔧 Rate Limiting

### Current Limits
- **API Calls**: 1000 requests per hour per user
- **WebSocket Messages**: 100 messages per minute per connection
- **File Uploads**: 10MB maximum file size

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642680000
```

---

## 📝 SDK Examples

### JavaScript/TypeScript
```typescript
import { NutriBoxAPI } from '@nutribox/sdk';

const api = new NutriBoxAPI({
  baseURL: 'http://localhost:8000',
  apiKey: 'your-api-key'
});

// Get client data
const client = await api.clients.get('client-123');

// Update meal status
await api.dailyMeals.updateStatus('schedule-123', {
  meal_type: 'breakfast',
  status: 'preparing'
});

// Subscribe to real-time events
api.websocket.subscribe('client_client-123', (event) => {
  console.log('Received event:', event);
});
```

### Python
```python
from nutribox_sdk import NutriBoxAPI

api = NutriBoxAPI(
    base_url="http://localhost:8000",
    api_key="your-api-key"
)

# Get client data
client = api.clients.get("client-123")

# Update meal status
api.daily_meals.update_status("schedule-123", {
    "meal_type": "breakfast",
    "status": "preparing"
})

# Subscribe to real-time events
api.websocket.subscribe("client_client-123", callback_function)
```

---

## 🚀 Getting Started

### 1. Authentication
```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

### 2. Make API Calls
```bash
curl -X GET "http://localhost:8000/api/clients" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. WebSocket Connection
```javascript
const ws = new WebSocket('ws://localhost:8000/ws');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

---

*For more detailed examples and advanced usage, visit the interactive API documentation at `http://localhost:8000/docs`*
