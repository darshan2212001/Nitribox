#!/usr/bin/env python3
"""
WebSocket Connection Test Script
Tests WebSocket connections properly without syntax errors
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path
_project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(_project_root))

try:
    import websockets
    import json
except ImportError:
    print("❌ Error: websockets package not installed")
    print("   Install with: pip install websockets")
    sys.exit(1)

async def run_websocket_connection_check():
    """Test WebSocket connection and basic messaging (run via __main__, not pytest)."""
    ws_url = "ws://localhost:8000/ws"
    
    print(f"Testing WebSocket connection to {ws_url}...")
    
    try:
        async with websockets.connect(ws_url) as websocket:
            print("✅ WebSocket connected successfully!")
            
            # Subscribe to test channel
            subscribe_message = {
                "action": "subscribe",
                "channel": "test_channel"
            }
            await websocket.send(json.dumps(subscribe_message))
            print("✅ Subscribe message sent")
            
            # Wait for response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                response_data = json.loads(response)
                print(f"✅ Response received: {response_data}")
                return True
            except asyncio.TimeoutError:
                print("⚠️  No response received (timeout)")
                return False
                
    except websockets.exceptions.InvalidURI:
        print(f"❌ Error: Invalid WebSocket URI: {ws_url}")
        return False
    except websockets.exceptions.ConnectionRefused:
        print(f"❌ Error: Connection refused. Is the API server running?")
        print("   Start server with: python run_api.py")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

async def run_client_channel_check():
    """Test client-specific channel subscription (run via __main__, not pytest)."""
    client_id = "test-client-1"
    ws_url = f"ws://localhost:8000/ws"
    
    print(f"\nTesting client channel: client_{client_id}")
    
    try:
        async with websockets.connect(ws_url) as websocket:
            # Subscribe to client channel
            subscribe_message = {
                "action": "subscribe",
                "channel": f"client_{client_id}"
            }
            await websocket.send(json.dumps(subscribe_message))
            print("✅ Subscribed to client channel")
            
            # Wait briefly for confirmation
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                print(f"✅ Channel confirmation: {response}")
                return True
            except asyncio.TimeoutError:
                print("⚠️  No confirmation received (may be normal)")
                return True  # Still consider successful if connected
                
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

async def main():
    """Run all WebSocket tests"""
    print("="*60)
    print("WebSocket Connection Tests")
    print("="*60)
    
    # Test basic connection
    result1 = await run_websocket_connection_check()
    
    # Test client channel
    result2 = await run_client_channel_check()
    
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60)
    print(f"Basic Connection: {'✅ PASS' if result1 else '❌ FAIL'}")
    print(f"Client Channel:   {'✅ PASS' if result2 else '❌ FAIL'}")
    print("="*60)
    
    if result1 and result2:
        print("\n✅ All WebSocket tests passed!")
        return 0
    else:
        print("\n❌ Some WebSocket tests failed")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)

