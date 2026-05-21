# API Documentation

## Authentication

### Login
```typescript
POST /auth/login
Body: { username: string, password: string }
Response: { access_token: string, refresh_token: string, expires_in: number }
```

### Register
```typescript
POST /auth/register
Body: RegisterRequest
Response: { access_token: string, refresh_token: string, expires_in: number }
```

### Refresh Token
```typescript
POST /auth/refresh
Body: { refresh_token: string }
Response: { access_token: string, refresh_token: string, expires_in: number }
```

### Get Current User
```typescript
GET /auth/me
Headers: { Authorization: "Bearer <token>" }
Response: User
```

### Logout
```typescript
POST /auth/logout
Body: { refresh_token: string }
```

## Orders

### Get Orders
```typescript
GET /api/orders
Query params: ?status=pending,confirmed,preparing,ready,delivered
Response: Order[]
```

### Create Order
```typescript
POST /api/orders
Body: CreateOrderRequest
Response: Order
```

### Update Order Status
```typescript
PUT /api/orders/:id/status
Body: { status: string }
Response: Order
```

## Delivery

### Get Active Deliveries
```typescript
GET /api/delivery-tracking/agent/:agentId/active
Response: DeliveryOrder[]
```

### Assign Delivery
```typescript
POST /api/delivery-tracking/assign
Body: { orderId: string, deliveryAgentId: string }
Response: DeliveryTracking
```

## WebSocket Events

### Connection
```typescript
Connect to: WS_URL (from config)
```

### Subscribe
```typescript
Send: { type: 'subscribe', userId: string, role: string }
```

### Events Received
- `order_created` - New order created
- `order_updated` - Order updated
- `order_status_changed` - Order status changed
- `kitchen_order_assigned` - Order assigned to kitchen
- `kitchen_order_ready` - Order ready from kitchen
- `delivery_assigned` - Delivery assigned
- `delivery_started` - Delivery started
- `delivery_completed` - Delivery completed
- `notification` - General notification

### Events Sent
- `update_order_status` - Update order status
- `update_kitchen_status` - Update kitchen status
- `update_delivery_status` - Update delivery status

## Error Handling

All API errors follow this format:
```typescript
{
  detail: string,
  status: number
}
```

Common status codes:
- `400` - Bad Request
- `401` - Unauthorized (token expired/invalid)
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Authentication

All authenticated endpoints require:
```
Authorization: Bearer <access_token>
```

Tokens expire after the time specified in `expires_in`. Use the refresh token to get a new access token.

