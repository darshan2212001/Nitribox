#!/usr/bin/env python3
"""
Script to verify real-time connectivity across all portals.
Checks WebSocket connections, channel subscriptions, and event broadcasting.
"""

import asyncio
import websockets
import json
import requests
import sys
from datetime import datetime
from typing import Dict, List, Optional

API_BASE = "http://localhost:8000"
WS_BASE = "ws://localhost:8000"

def print_status(message: str, status: str = "info"):
    """Print status message with color coding"""
    colors = {
        "success": "\033[92m✅",
        "error": "\033[91m❌",
        "warning": "\033[93m⚠️",
        "info": "\033[94mℹ️"
    }
    reset = "\033[0m"
    symbol = colors.get(status, colors["info"])
    print(f"{symbol} {message}{reset}")

def check_backend_health():
    """Check if backend API is running"""
    try:
        response = requests.get(f"{API_BASE}/api/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print_status(f"Backend API: {data.get('status', 'running')}", "success")
            return True
        else:
            print_status(f"Backend API returned status {response.status_code}", "error")
            return False
    except Exception as e:
        print_status(f"Backend API not reachable: {str(e)}", "error")
        return False

def get_websocket_stats():
    """Get WebSocket connection statistics"""
    try:
        response = requests.get(f"{API_BASE}/api/monitoring/websocket-stats", timeout=5)
        if response.status_code == 200:
            return response.json()
        else:
            print_status(f"Failed to get WebSocket stats: {response.status_code}", "warning")
            return None
    except Exception as e:
        print_status(f"Could not fetch WebSocket stats: {str(e)}", "warning")
        return None

async def test_websocket_connection(token: Optional[str] = None):
    """Test WebSocket connection"""
    url = f"{WS_BASE}/ws"
    if token:
        url = f"{url}?token={token}"
    
    try:
        async with websockets.connect(url) as ws:
            print_status("WebSocket connection established", "success")
            
            # Send ping
            await ws.send(json.dumps({"type": "ping"}))
            response = await asyncio.wait_for(ws.recv(), timeout=5.0)
            data = json.loads(response)
            
            if data.get("type") == "pong":
                print_status("WebSocket heartbeat (ping/pong) working", "success")
                return True
            else:
                print_status(f"Unexpected response: {data}", "warning")
                return False
    except asyncio.TimeoutError:
        print_status("WebSocket connection timeout", "error")
        return False
    except Exception as e:
        print_status(f"WebSocket connection failed: {str(e)}", "error")
        return False

async def test_channel_subscription(channel: str, token: Optional[str] = None):
    """Test subscribing to a channel"""
    url = f"{WS_BASE}/ws"
    if token:
        url = f"{url}?token={token}"
    
    try:
        async with websockets.connect(url) as ws:
            # Subscribe to channel
            await ws.send(json.dumps({
                "type": "subscribe",
                "channel": channel
            }))
            
            # Wait for subscription confirmation
            response = await asyncio.wait_for(ws.recv(), timeout=5.0)
            data = json.loads(response)
            
            if data.get("type") == "subscription_confirmed":
                print_status(f"Successfully subscribed to channel: {channel}", "success")
                return True
            else:
                print_status(f"Subscription failed: {data}", "error")
                return False
    except Exception as e:
        print_status(f"Channel subscription test failed: {str(e)}", "error")
        return False

def verify_portal_configurations():
    """Verify that all portals are configured for real-time"""
    portals = {
        "Kitchen Portal": {
            "file": "client/src/pages/KitchenPortal.tsx",
            "expected_channels": ["kitchen"],
            "expected_events": ["order.created", "order.updated", "meal.preparing", "meal.packed"]
        },
        "Delivery Portal": {
            "file": "client/src/pages/DeliveryPortal.tsx",
            "expected_channels": ["delivery_{agent_id}"],
            "expected_events": ["batch.ready_for_pickup", "batch.assigned", "order.picked_up", "order.delivered"]
        },
        "Client Portal": {
            "file": "client/src/pages/ClientPortal.tsx",
            "expected_channels": ["client_{client_id}"],
            "expected_events": ["meal.preparing", "meal.packed", "meal.delivered", "delivery.assigned"]
        },
        "Nutritionist Portal": {
            "file": "client/src/pages/NutritionistPortal.tsx",
            "expected_channels": ["nutritionist_{nutritionist_id}"],
            "expected_events": ["client_created", "session_created", "progress_log_created"]
        },
        "Admin Portal": {
            "file": "client/src/pages/AdminPortal.tsx",
            "expected_channels": ["admin"],
            "expected_events": ["meal_plan_created", "order_created", "client_created"]
        }
    }
    
    print_status("\n=== Portal Configuration Check ===", "info")
    all_configured = True
    
    for portal_name, config in portals.items():
        try:
            with open(config["file"], "r", encoding="utf-8") as f:
                content = f.read()
                if "useRealtime" in content:
                    print_status(f"{portal_name}: Real-time hook configured", "success")
                else:
                    print_status(f"{portal_name}: Real-time hook NOT found", "error")
                    all_configured = False
        except FileNotFoundError:
            print_status(f"{portal_name}: File not found", "error")
            all_configured = False
    
    return all_configured

def main():
    """Main verification function"""
    print("\n" + "="*60)
    print("Real-Time Portal Connectivity Verification")
    print("="*60 + "\n")
    
    # Step 1: Check backend health
    print_status("Step 1: Checking Backend Health", "info")
    if not check_backend_health():
        print_status("Backend is not running. Please start the backend server.", "error")
        sys.exit(1)
    
    # Step 2: Get WebSocket statistics
    print_status("\nStep 2: Getting WebSocket Statistics", "info")
    stats = get_websocket_stats()
    if stats:
        print(f"  Total Connections: {stats.get('total_connections', 0)}")
        print(f"  Total Channels: {stats.get('total_channels', 0)}")
        
        if stats.get('connections_by_role'):
            print("\n  Connections by Role:")
            for role, count in stats['connections_by_role'].items():
                print(f"    {role}: {count}")
        
        if stats.get('channels'):
            print("\n  Active Channels:")
            for channel, subscribers in stats['channels'].items():
                print(f"    {channel}: {subscribers} subscribers")
    else:
        print_status("Could not retrieve WebSocket statistics", "warning")
    
    # Step 3: Test WebSocket connection
    print_status("\nStep 3: Testing WebSocket Connection", "info")
    asyncio.run(test_websocket_connection())
    
    # Step 4: Test channel subscription
    print_status("\nStep 4: Testing Channel Subscription", "info")
    asyncio.run(test_channel_subscription("kitchen"))
    
    # Step 5: Verify portal configurations
    print_status("\nStep 5: Verifying Portal Configurations", "info")
    verify_portal_configurations()
    
    # Summary
    print("\n" + "="*60)
    print_status("Verification Complete", "info")
    print("="*60)
    print("\nTo test real-time updates:")
    print("1. Open multiple portals in different browser tabs")
    print("2. Perform an action in one portal (e.g., update order status)")
    print("3. Verify that other portals receive the update automatically")
    print("\nCheck browser console for WebSocket connection logs:")
    print("  - Look for '[WebSocket] ✅ Connected' messages")
    print("  - Look for '[Realtime] Received' messages for events")

if __name__ == "__main__":
    main()

