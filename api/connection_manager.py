"""
Connection Manager for WebSocket connections.

IMPORTANT: This implementation uses in-memory storage for connection tracking.
For production deployments with multiple API instances (load balancing), this will NOT work correctly
because each instance maintains its own connection state.

For distributed deployments, consider:
1. Using Redis-backed connection manager (recommended)
2. Using sticky sessions in load balancer (WebSocket connections route to same instance)
3. Using a message queue (RabbitMQ, Redis Pub/Sub) for cross-instance communication

Current limitations:
- Connections and channels are stored in memory per instance
- Broadcasts only reach connections on the same instance
- Connection state is not shared across instances
"""
import asyncio
from typing import List, Dict, Set, Any
from fastapi import WebSocket
import json
import time

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.connection_channels: Dict[WebSocket, Set[str]] = {}  # WebSocket -> Set of channels
        self.channel_connections: Dict[str, Set[WebSocket]] = {}  # Channel -> Set of WebSockets
        self._lock = asyncio.Lock()
        # Rate limiting: track message counts per connection
        self.message_counts: Dict[WebSocket, Dict[str, Any]] = {}  # WebSocket -> {count, last_reset}
        self.max_messages_per_minute = 60  # Rate limit: 60 messages per minute per connection
        self.connection_timeouts: Dict[WebSocket, asyncio.Task] = {}  # Track timeout tasks
        # Store user info for each connection (since websocket.state is read-only)
        self.connection_user_info: Dict[WebSocket, Dict[str, Any]] = {}  # WebSocket -> {user_id, user_role, username, authenticated}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.append(websocket)
            self.connection_channels[websocket] = set()
            # Initialize message count for rate limiting
            self.message_counts[websocket] = {"count": 0, "last_reset": time.time()}
            
            # Set connection timeout (30 minutes of inactivity)
            async def timeout_connection():
                await asyncio.sleep(30 * 60)  # 30 minutes
                if websocket in self.active_connections:
                    await self.disconnect(websocket)
            
            self.connection_timeouts[websocket] = asyncio.create_task(timeout_connection())
            
        print(f"[WebSocket] Client connected. Total connections: {len(self.active_connections)}")

    async def disconnect(self, websocket: WebSocket):
        """Disconnect a WebSocket connection safely"""
        async with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
            
            # Remove from all channels - avoid recursion by using _unsubscribe_from_channel directly
            if websocket in self.connection_channels:
                channels = self.connection_channels[websocket].copy()
                # Clear channels mapping first to prevent recursion
                self.connection_channels[websocket].clear()
                # Then unsubscribe from each channel
                for channel in channels:
                    await self._unsubscribe_from_channel(websocket, channel)
                # Finally delete the mapping
                if websocket in self.connection_channels:
                    del self.connection_channels[websocket]
            
            # Clean up user info
            if websocket in self.connection_user_info:
                del self.connection_user_info[websocket]
            
            # Clean up rate limiting and timeout
            await self._cleanup_connection_timeout(websocket)
                
        print(f"[WebSocket] Client disconnected. Total connections: {len(self.active_connections)}")

    def _check_channel_authorization(self, websocket: WebSocket, channel: str) -> bool:
        """Check if websocket is authorized to subscribe to a channel"""
        # Get user info from connection manager storage
        if websocket not in self.connection_user_info:
            # Unauthenticated connections can only access public channels
            return channel in ["public", "general"]
        
        state = self.connection_user_info[websocket]
        user_id = state.get("user_id")
        user_role = state.get("user_role")
        authenticated = state.get("authenticated", False)
        
        if not authenticated:
            # Unauthenticated connections can only access public channels
            return channel in ["public", "general"]
        
        # Check channel authorization based on role and user ID
        if channel.startswith("client_"):
            # Client channels: users can only access their own channel unless admin
            if user_role == "admin":
                return True
            channel_user_id = channel.replace("client_", "")
            return user_id == channel_user_id
        
        elif channel.startswith("nutritionist_"):
            # Nutritionist channels: users can only access their own channel unless admin
            if user_role == "admin":
                return True
            channel_user_id = channel.replace("nutritionist_", "")
            return user_id == channel_user_id
        
        elif channel.startswith("delivery_"):
            # Delivery agent channels: users can only access their own channel unless admin
            if user_role == "admin":
                return True
            channel_user_id = channel.replace("delivery_", "")
            return user_id == channel_user_id
        
        elif channel == "kitchen":
            # Kitchen channel: kitchen staff and admin only
            return user_role in ["kitchen", "admin"]
        
        elif channel == "admin":
            # Admin channel: admin only
            return user_role == "admin"
        
        elif channel in ["public", "general"]:
            # Public channels: everyone can access
            return True
        
        # Unknown channel type: deny by default
        return False
    
    async def subscribe_to_channel(self, websocket: WebSocket, channel: str):
        """Subscribe a WebSocket connection to a specific channel with authorization check"""
        # Check authorization before subscribing
        if not self._check_channel_authorization(websocket, channel):
            await websocket.send_json({
                "type": "error",
                "message": f"Not authorized to subscribe to channel '{channel}'"
            })
            return
        
        async with self._lock:
            if websocket not in self.connection_channels:
                self.connection_channels[websocket] = set()
            
            self.connection_channels[websocket].add(channel)
            
            if channel not in self.channel_connections:
                self.channel_connections[channel] = set()
            self.channel_connections[channel].add(websocket)
            
        print(f"[WebSocket] Client subscribed to channel '{channel}'. Total subscribers: {len(self.channel_connections.get(channel, set()))}")

    async def unsubscribe_from_channel(self, websocket: WebSocket, channel: str):
        """Unsubscribe a WebSocket connection from a specific channel"""
        await self._unsubscribe_from_channel(websocket, channel)

    async def _unsubscribe_from_channel(self, websocket: WebSocket, channel: str):
        """Internal method to unsubscribe from channel"""
        async with self._lock:
            if websocket in self.connection_channels:
                self.connection_channels[websocket].discard(channel)
            
            if channel in self.channel_connections:
                self.channel_connections[channel].discard(websocket)
                if not self.channel_connections[channel]:
                    del self.channel_connections[channel]

    async def broadcast_to_channel(self, channel: str, message: dict):
        """Broadcast message to all connections subscribed to a specific channel"""
        if channel not in self.channel_connections:
            print(f"[WebSocket] No subscribers for channel '{channel}'")
            return
        
        connections = self.channel_connections[channel].copy()
        dead_connections = []
        
        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"[WebSocket] Failed to send to client in channel '{channel}', marking for removal: {e}")
                dead_connections.append(connection)
        
        # Remove dead connections
        if dead_connections:
            async with self._lock:
                for connection in dead_connections:
                    if connection in self.active_connections:
                        await self.disconnect(connection)
        
        print(f"[WebSocket] Broadcasted to channel '{channel}': {len(connections)} clients")

    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients (legacy method)"""
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
                        await self.disconnect(connection)
            print(f"[WebSocket] Removed {len(dead_connections)} dead connections. Total connections: {len(self.active_connections)}")

    async def handle_message(self, websocket: WebSocket, message: dict):
        """Handle incoming WebSocket messages with rate limiting"""
        try:
            # Rate limiting check
            if not self._check_rate_limit(websocket):
                await websocket.send_json({
                    "type": "error",
                    "message": "Rate limit exceeded. Please slow down your message sending."
                })
                return
            
            message_type = message.get("type")
            
            if message_type == "subscribe":
                channel = message.get("channel")
                if channel:
                    await self.subscribe_to_channel(websocket, channel)
                    await websocket.send_json({
                        "type": "subscription_confirmed",
                        "channel": channel,
                        "message": f"Subscribed to channel '{channel}'"
                    })
            
            elif message_type == "unsubscribe":
                channel = message.get("channel")
                if channel:
                    await self.unsubscribe_from_channel(websocket, channel)
                    await websocket.send_json({
                        "type": "unsubscription_confirmed",
                        "channel": channel,
                        "message": f"Unsubscribed from channel '{channel}'"
                    })
            
            elif message_type == "ping":
                await websocket.send_json({"type": "pong"})
            
            else:
                # Echo back unknown message types
                await websocket.send_json({
                    "type": "echo",
                    "original_message": message
                })
                
        except Exception as e:
            print(f"[WebSocket] Error handling message: {e}")
            await websocket.send_json({
                "type": "error",
                "message": f"Error processing message: {str(e)}"
            })

    def _check_rate_limit(self, websocket: WebSocket) -> bool:
        """Check if connection is within rate limit"""
        current_time = time.time()
        
        if websocket not in self.message_counts:
            self.message_counts[websocket] = {"count": 0, "last_reset": current_time}
        
        stats = self.message_counts[websocket]
        
        # Reset counter every minute
        if current_time - stats["last_reset"] > 60:
            stats["count"] = 0
            stats["last_reset"] = current_time
        
        # Check if over limit
        if stats["count"] >= self.max_messages_per_minute:
            return False
        
        # Increment counter
        stats["count"] += 1
        return True
    
    async def _cleanup_connection_timeout(self, websocket: WebSocket):
        """Clean up timeout task for a connection"""
        if websocket in self.connection_timeouts:
            task = self.connection_timeouts[websocket]
            if not task.done():
                task.cancel()
            del self.connection_timeouts[websocket]
        if websocket in self.message_counts:
            del self.message_counts[websocket]
    
    def get_channel_stats(self):
        """Get statistics about channels and connections"""
        return {
            "total_connections": len(self.active_connections),
            "total_channels": len(self.channel_connections),
            "channels": {
                channel: len(connections) 
                for channel, connections in self.channel_connections.items()
            }
        }

# Global connection manager instance
manager = ConnectionManager()
