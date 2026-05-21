# WebSocket Distributed Deployment Guide

## Current Implementation

The WebSocket connection manager (`api/connection_manager.py`) uses in-memory storage for tracking connections and channels. This works well for single-instance deployments but has limitations for distributed deployments.

## Limitations for Distributed Deployments

### Connection State
- Connections are stored in memory per API instance
- Each instance only knows about connections it has established
- No shared state between instances

### Channel Subscriptions
- Channel subscriptions are maintained per instance
- Broadcasting to a channel only reaches connections on that instance
- Cross-instance communication is not possible

### Message Delivery
- Messages broadcast to a channel only reach clients connected to the same instance
- Clients connected to different instances won't receive broadcasts from other instances

## Solutions for Distributed Deployments

### Option 1: Redis-Backed Connection Manager (Recommended)

Use Redis to store connection metadata and channels, enabling cross-instance communication.

**Implementation:**
- Store connection metadata in Redis
- Use Redis Pub/Sub for cross-instance message broadcasting
- Each instance subscribes to relevant Redis channels

**Benefits:**
- True distributed support
- Messages reach all connected clients regardless of instance
- Scalable to multiple instances

**Requirements:**
- Redis server
- Redis Python client (`redis` package)

### Option 2: Sticky Sessions (Load Balancer Level)

Configure your load balancer to use sticky sessions for WebSocket connections.

**Implementation:**
- Configure load balancer (e.g., nginx, AWS ALB) with session affinity
- WebSocket connections from the same client always route to the same instance
- Each instance handles its own set of connections independently

**Benefits:**
- Simple - no code changes needed
- Works with current implementation

**Limitations:**
- If an instance goes down, its WebSocket connections are lost
- Load balancing may be uneven if connections are long-lived

### Option 3: Message Queue (RabbitMQ, Redis Pub/Sub)

Use a message queue for cross-instance communication.

**Implementation:**
- Each instance publishes events to a message queue
- All instances subscribe to the queue
- Each instance broadcasts to its local connections when receiving a message

**Benefits:**
- Decoupled architecture
- Supports complex routing patterns
- Can handle high message volumes

**Requirements:**
- Message queue server (RabbitMQ, Redis, etc.)
- Message queue client library

## Recommended Approach

For production deployments:

1. **Small scale (1-2 instances)**: Use sticky sessions with current implementation
2. **Medium scale (3-10 instances)**: Implement Redis-backed connection manager
3. **Large scale (10+ instances)**: Use message queue with Redis-backed connection manager

## Authentication

WebSocket connections require authentication in production:
- Token must be provided as query parameter: `ws://host/ws?token=YOUR_TOKEN`
- Unauthenticated connections are rejected in production
- In development, unauthenticated connections are allowed but restricted to public channels

## Channel Authorization

Users can only subscribe to channels they're authorized for:
- Client channels: Users can only access their own channel (`client_{user_id}`)
- Nutritionist channels: Users can only access their own channel (`nutritionist_{user_id}`)
- Delivery agent channels: Users can only access their own channel (`delivery_{user_id}`)
- Kitchen channel: Only kitchen staff and admins
- Admin channel: Only admins
- Public channels: Accessible to all authenticated users

## Rate Limiting

WebSocket connections have rate limiting:
- 60 messages per minute per connection
- Exceeding the limit results in error messages
- Connections are automatically disconnected after 30 minutes of inactivity

