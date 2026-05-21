from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from typing import List
import json
import asyncio
from api.connection_manager import manager

router = APIRouter(tags=["WebSocket"])

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time communication"""
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                # Handle different message types
                await handle_websocket_message(websocket, message)
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Invalid JSON format"
                }))
    except WebSocketDisconnect:
        await manager.disconnect(websocket)

async def handle_websocket_message(websocket: WebSocket, message: dict):
    """Handle incoming WebSocket messages"""
    message_type = message.get("type")
    
    if message_type == "ping":
        await websocket.send_text(json.dumps({"type": "pong"}))
    elif message_type == "subscribe":
        # Handle subscription to specific events
        subscription_type = message.get("subscription_type")
        await websocket.send_text(json.dumps({
            "type": "subscribed",
            "subscription_type": subscription_type
        }))
    elif message_type == "unsubscribe":
        # Handle unsubscription
        subscription_type = message.get("subscription_type")
        await websocket.send_text(json.dumps({
            "type": "unsubscribed",
            "subscription_type": subscription_type
        }))
    else:
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": f"Unknown message type: {message_type}"
        }))

# WebSocket connection manager methods
class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.append(websocket)
        print(f"[WebSocket] Client connected. Total connections: {len(self.active_connections)}")

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
        print(f"[WebSocket] Client disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients"""
        dead_connections = []
        
        # Create a copy of connections to avoid modification during iteration
        connections_copy = self.active_connections.copy()
        
        for connection in connections_copy:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"[WebSocket] Failed to send to client, marking for removal: {e}")
                dead_connections.append(connection)
        
        # Remove dead connections safely
        if dead_connections:
            async with self._lock:
                for connection in dead_connections:
                    if connection in self.active_connections:
                        self.active_connections.remove(connection)
            print(f"[WebSocket] Removed {len(dead_connections)} dead connections. Total connections: {len(self.active_connections)}")

    async def send_to_user(self, user_id: str, message: dict):
        """Send message to specific user (if user tracking is implemented)"""
        # This would require user-to-websocket mapping
        # For now, broadcast to all connections
        await self.broadcast(message)

    async def send_to_role(self, role: str, message: dict):
        """Send message to users with specific role"""
        # This would require role-based filtering
        # For now, broadcast to all connections
        await self.broadcast(message)

# WebSocket event types for the application
WEBSOCKET_EVENTS = {
    # Order events
    "order_created": "Order created",
    "order_updated": "Order updated", 
    "order_deleted": "Order deleted",
    "order_status_changed": "Order status changed",
    "order_completed": "Order completed",
    
    # Kitchen events
    "kitchen_order_status_update": "Kitchen order status update",
    "kitchen_order_ready": "Kitchen order ready",
    
    # Delivery events
    "delivery_assigned": "Delivery assigned",
    "delivery_started": "Delivery started",
    "delivery_completed": "Delivery completed",
    "order_picked_up": "Order picked up",
    
    # Nutritionist events
    "nutritionist_created": "Nutritionist created",
    "nutritionist_updated": "Nutritionist updated",
    "nutritionist_deleted": "Nutritionist deleted",
    "consultation_booked": "Consultation booked",
    
    # Meal plan events
    "meal_plan_created": "Meal plan created",
    "meal_plan_updated": "Meal plan updated",
    "meal_plan_deleted": "Meal plan deleted",
    
    # User events
    "user_created": "User created",
    "user_updated": "User updated",
    "user_deleted": "User deleted",
    
    # System events
    "system_alert": "System alert",
    "connection_status": "Connection status",
    "ping": "Ping",
    "pong": "Pong"
}
