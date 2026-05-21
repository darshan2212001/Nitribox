#!/usr/bin/env python3
"""
Comprehensive Integration Test for ZyaeL NutriBox Real-Time Ecosystem
Tests all portals and real-time functionality end-to-end
"""

import asyncio
import aiohttp
import websockets
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NutriBoxIntegrationTester:
    """Comprehensive integration tester for the real-time nutrition ecosystem"""
    
    def __init__(self, base_url: str = "http://localhost:8000", ws_url: str = "ws://localhost:8000/ws"):
        self.base_url = base_url
        self.ws_url = ws_url
        self.session = None
        self.websocket = None
        self.test_results = []
        self.received_events = []
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
        if self.websocket:
            await self.websocket.close()
    
    async def run_all_tests(self):
        """Run all integration tests"""
        logger.info("🚀 Starting ZyaeL NutriBox Integration Tests")
        
        tests = [
            ("API Health Check", self.test_api_health),
            ("WebSocket Connection", self.test_websocket_connection),
            ("Client Portal Flow", self.test_client_portal_flow),
            ("Nutritionist Portal Flow", self.test_nutritionist_portal_flow),
            ("Kitchen Portal Flow", self.test_kitchen_portal_flow),
            ("Delivery Portal Flow", self.test_delivery_portal_flow),
            ("Admin Portal Flow", self.test_admin_portal_flow),
            ("Real-Time Event Broadcasting", self.test_realtime_event_broadcasting),
            ("Daily Automation", self.test_daily_automation),
            ("Weekly Reports", self.test_weekly_reports),
            ("Load Testing", self.test_load_scenarios),
            ("Monitoring Dashboard", self.test_monitoring_dashboard)
        ]
        
        for test_name, test_func in tests:
            try:
                logger.info(f"🧪 Running: {test_name}")
                result = await test_func()
                self.test_results.append({
                    "test": test_name,
                    "status": "PASSED" if result else "FAILED",
                    "timestamp": datetime.now().isoformat()
                })
                logger.info(f"✅ {test_name}: {'PASSED' if result else 'FAILED'}")
            except Exception as e:
                logger.error(f"❌ {test_name}: FAILED - {str(e)}")
                self.test_results.append({
                    "test": test_name,
                    "status": "FAILED",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                })
        
        await self.print_test_summary()
    
    async def test_api_health(self) -> bool:
        """Test API health and basic endpoints"""
        try:
            # Wait for server to be ready first
            import sys
            from pathlib import Path
            sys.path.insert(0, str(Path(__file__).parent.parent.parent))
            from api.tests.test_utils import wait_for_server
            
            if not wait_for_server(self.base_url, max_attempts=30):
                logger.error("Server not ready - skipping health tests")
                logger.error("Start the server with: python run_api.py")
                return False
            
            # Test health endpoint with proper timeout
            timeout = aiohttp.ClientTimeout(total=10)
            async with self.session.get(f"{self.base_url}/api/health", timeout=timeout) as response:
                if response.status != 200:
                    return False
                health_data = await response.json()
                logger.info(f"API Health: {health_data}")
            
            # Test monitoring endpoint with proper timeout
            async with self.session.get(f"{self.base_url}/api/monitoring/health", timeout=timeout) as response:
                if response.status != 200:
                    return False
                monitoring_data = await response.json()
                logger.info(f"Monitoring Health: {monitoring_data}")
            
            return True
        except Exception as e:
            logger.error(f"API Health Test Failed: {e}")
            return False
    
    async def test_websocket_connection(self) -> bool:
        """Test WebSocket connection and basic messaging"""
        try:
            # Connect to WebSocket
            self.websocket = await websockets.connect(self.ws_url)
            
            # Subscribe to test channel
            subscribe_message = {
                "action": "subscribe",
                "channel": "test_channel"
            }
            await self.websocket.send(json.dumps(subscribe_message))
            
            # Wait for confirmation
            response = await asyncio.wait_for(self.websocket.recv(), timeout=5.0)
            response_data = json.loads(response)
            
            logger.info(f"WebSocket Response: {response_data}")
            return True
            
        except Exception as e:
            logger.error(f"WebSocket Test Failed: {e}")
            return False
    
    async def test_client_portal_flow(self) -> bool:
        """Test complete client portal flow"""
        try:
            # 1. Get client's daily meals
            async with self.session.get(f"{self.base_url}/api/daily-meals/client/test-client-1") as response:
                if response.status != 200:
                    return False
                meals_data = await response.json()
                logger.info(f"Client Daily Meals: {len(meals_data)} meals")
            
            # 2. Test meal status update
            async with self.session.patch(
                f"{self.base_url}/api/daily-meals/test-schedule-1/meal-status",
                json={"meal_type": "breakfast", "status": "preparing"}
            ) as response:
                if response.status != 200:
                    return False
                logger.info("Meal status updated to preparing")
            
            # 3. Test consumption logging
            async with self.session.post(
                f"{self.base_url}/api/daily-meals/test-schedule-1/log-consumption",
                json={"meal_type": "breakfast", "status": "consumed", "rating": 5}
            ) as response:
                if response.status != 200:
                    return False
                logger.info("Consumption logged successfully")
            
            return True
            
        except Exception as e:
            logger.error(f"Client Portal Test Failed: {e}")
            return False
    
    async def test_nutritionist_portal_flow(self) -> bool:
        """Test nutritionist portal functionality"""
        try:
            # 1. Get nutritionist's clients
            async with self.session.get(f"{self.base_url}/api/nutritionists/test-nutritionist-1/clients") as response:
                if response.status != 200:
                    return False
                clients_data = await response.json()
                logger.info(f"Nutritionist Clients: {len(clients_data)} clients")
            
            # 2. Generate weekly report
            async with self.session.get(f"{self.base_url}/api/reports/weekly-report/test-client-1") as response:
                if response.status != 200:
                    return False
                report_data = await response.json()
                logger.info(f"Weekly Report Generated: {report_data}")
            
            # 3. Get client progress
            async with self.session.get(f"{self.base_url}/api/reports/nutritionist/test-nutritionist-1/client-progress") as response:
                if response.status != 200:
                    return False
                progress_data = await response.json()
                logger.info(f"Client Progress: {progress_data}")
            
            return True
            
        except Exception as e:
            logger.error(f"Nutritionist Portal Test Failed: {e}")
            return False
    
    async def test_kitchen_portal_flow(self) -> bool:
        """Test kitchen portal workflow"""
        try:
            # 1. Get today's schedule
            async with self.session.get(f"{self.base_url}/api/kitchen/today-schedule") as response:
                if response.status != 200:
                    return False
                schedule_data = await response.json()
                logger.info(f"Kitchen Schedule: {len(schedule_data)} meals")
            
            # 2. Start meal preparation
            async with self.session.patch(f"{self.base_url}/api/kitchen/meal/test-order-1/start-preparation") as response:
                if response.status != 200:
                    return False
                logger.info("Meal preparation started")
            
            # 3. Mark meal as packed
            async with self.session.patch(f"{self.base_url}/api/kitchen/meal/test-order-1/mark-packed") as response:
                if response.status != 200:
                    return False
                logger.info("Meal marked as packed")
            
            return True
            
        except Exception as e:
            logger.error(f"Kitchen Portal Test Failed: {e}")
            return False
    
    async def test_delivery_portal_flow(self) -> bool:
        """Test delivery portal functionality"""
        try:
            # 1. Assign delivery agent
            async with self.session.post(
                f"{self.base_url}/api/delivery-tracking/assign",
                json={
                    "order_id": "test-order-1",
                    "delivery_agent_id": "test-agent-1",
                    "delivery_agent_name": "Test Agent"
                }
            ) as response:
                if response.status != 200:
                    return False
                logger.info("Delivery agent assigned")
            
            # 2. Update delivery location
            async with self.session.post(
                f"{self.base_url}/api/delivery-tracking/test-order-1/location",
                json={
                    "latitude": "12.9716",
                    "longitude": "77.5946",
                    "eta_minutes": 15
                }
            ) as response:
                if response.status != 200:
                    return False
                logger.info("Delivery location updated")
            
            return True
            
        except Exception as e:
            logger.error(f"Delivery Portal Test Failed: {e}")
            return False
    
    async def test_admin_portal_flow(self) -> bool:
        """Test admin portal functionality"""
        try:
            # 1. Get system health
            async with self.session.get(f"{self.base_url}/api/monitoring/health") as response:
                if response.status != 200:
                    return False
                health_data = await response.json()
                logger.info(f"System Health: {health_data}")
            
            # 2. Get real-time metrics
            async with self.session.get(f"{self.base_url}/api/monitoring/realtime") as response:
                if response.status != 200:
                    return False
                metrics_data = await response.json()
                logger.info(f"Real-time Metrics: {metrics_data}")
            
            # 3. Get system alerts
            async with self.session.get(f"{self.base_url}/api/monitoring/alerts") as response:
                if response.status != 200:
                    return False
                alerts_data = await response.json()
                logger.info(f"System Alerts: {alerts_data}")
            
            return True
            
        except Exception as e:
            logger.error(f"Admin Portal Test Failed: {e}")
            return False
    
    async def test_realtime_event_broadcasting(self) -> bool:
        """Test real-time event broadcasting across channels"""
        try:
            if not self.websocket:
                await self.test_websocket_connection()
            
            # Subscribe to multiple channels
            channels = ["client_test-client-1", "kitchen", "nutritionist_test-nutritionist-1", "admin"]
            
            for channel in channels:
                subscribe_message = {
                    "action": "subscribe",
                    "channel": channel
                }
                await self.websocket.send(json.dumps(subscribe_message))
                await asyncio.sleep(0.1)  # Small delay between subscriptions
            
            # Trigger an event by updating meal status
            async with self.session.patch(
                f"{self.base_url}/api/daily-meals/test-schedule-1/meal-status",
                json={"meal_type": "lunch", "status": "preparing"}
            ) as response:
                if response.status != 200:
                    return False
            
            # Wait for events to be received
            await asyncio.sleep(2)
            
            # Check if we received events
            events_received = 0
            try:
                while True:
                    message = await asyncio.wait_for(self.websocket.recv(), timeout=1.0)
                    event_data = json.loads(message)
                    self.received_events.append(event_data)
                    events_received += 1
                    logger.info(f"Received Event: {event_data}")
            except asyncio.TimeoutError:
                pass  # No more events
            
            logger.info(f"Received {events_received} events")
            return events_received > 0
            
        except Exception as e:
            logger.error(f"Real-time Event Test Failed: {e}")
            return False
    
    async def test_daily_automation(self) -> bool:
        """Test daily automation features"""
        try:
            # Test daily meal assignment
            async with self.session.post(
                f"{self.base_url}/api/orders/from-daily-meal",
                json={"daily_meal_schedule_id": "test-schedule-1"}
            ) as response:
                if response.status != 200:
                    return False
                logger.info("Daily meal assignment completed")
            
            # Test scheduler status (if endpoint exists)
            try:
                async with self.session.get(f"{self.base_url}/api/scheduler/status") as response:
                    if response.status == 200:
                        scheduler_data = await response.json()
                        logger.info(f"Scheduler Status: {scheduler_data}")
            except:
                logger.info("Scheduler status endpoint not available")
            
            return True
            
        except Exception as e:
            logger.error(f"Daily Automation Test Failed: {e}")
            return False
    
    async def test_weekly_reports(self) -> bool:
        """Test weekly report generation"""
        try:
            # Generate weekly report
            async with self.session.get(f"{self.base_url}/api/reports/weekly-report/test-client-1") as response:
                if response.status != 200:
                    return False
                report_data = await response.json()
                logger.info(f"Weekly Report: {report_data}")
            
            # Test nutritionist client progress
            async with self.session.get(f"{self.base_url}/api/reports/nutritionist/test-nutritionist-1/client-progress") as response:
                if response.status != 200:
                    return False
                progress_data = await response.json()
                logger.info(f"Client Progress: {progress_data}")
            
            return True
            
        except Exception as e:
            logger.error(f"Weekly Reports Test Failed: {e}")
            return False
    
    async def test_load_scenarios(self) -> bool:
        """Test system under load"""
        try:
            # Simulate multiple concurrent requests
            tasks = []
            for i in range(10):
                task = self.session.get(f"{self.base_url}/api/monitoring/health")
                tasks.append(task)
            
            responses = await asyncio.gather(*tasks)
            
            # Check all responses were successful
            success_count = sum(1 for response in responses if response.status == 200)
            logger.info(f"Load Test: {success_count}/10 requests successful")
            
            return success_count >= 8  # Allow some failures
            
        except Exception as e:
            logger.error(f"Load Test Failed: {e}")
            return False
    
    async def test_monitoring_dashboard(self) -> bool:
        """Test monitoring dashboard functionality"""
        try:
            # Get comprehensive dashboard data
            async with self.session.get(f"{self.base_url}/api/monitoring/dashboard") as response:
                if response.status != 200:
                    return False
                dashboard_data = await response.json()
                logger.info(f"Dashboard Data Keys: {list(dashboard_data.keys())}")
            
            # Test event metrics
            async with self.session.get(f"{self.base_url}/api/monitoring/events") as response:
                if response.status != 200:
                    return False
                events_data = await response.json()
                logger.info(f"Event Metrics: {events_data}")
            
            # Test performance metrics
            async with self.session.get(f"{self.base_url}/api/monitoring/performance") as response:
                if response.status != 200:
                    return False
                performance_data = await response.json()
                logger.info(f"Performance Metrics: {performance_data}")
            
            return True
            
        except Exception as e:
            logger.error(f"Monitoring Dashboard Test Failed: {e}")
            return False
    
    async def print_test_summary(self):
        """Print comprehensive test summary"""
        logger.info("\n" + "="*60)
        logger.info("🧪 ZyaeL NutriBox Integration Test Summary")
        logger.info("="*60)
        
        passed_tests = [r for r in self.test_results if r["status"] == "PASSED"]
        failed_tests = [r for r in self.test_results if r["status"] == "FAILED"]
        
        logger.info(f"✅ Passed: {len(passed_tests)}")
        logger.info(f"❌ Failed: {len(failed_tests)}")
        logger.info(f"📊 Total: {len(self.test_results)}")
        
        if failed_tests:
            logger.info("\n❌ Failed Tests:")
            for test in failed_tests:
                logger.info(f"  - {test['test']}: {test.get('error', 'Unknown error')}")
        
        logger.info(f"\n📈 Success Rate: {len(passed_tests)/len(self.test_results)*100:.1f}%")
        
        if self.received_events:
            logger.info(f"\n📡 Real-time Events Received: {len(self.received_events)}")
            event_types = {}
            for event in self.received_events:
                event_type = event.get("type", "unknown")
                event_types[event_type] = event_types.get(event_type, 0) + 1
            
            logger.info("Event Types:")
            for event_type, count in event_types.items():
                logger.info(f"  - {event_type}: {count}")
        
        logger.info("\n🎯 Real-Time Subscription Nutrition Ecosystem Status:")
        if len(passed_tests) >= len(self.test_results) * 0.8:  # 80% pass rate
            logger.info("🟢 SYSTEM READY FOR PRODUCTION")
        elif len(passed_tests) >= len(self.test_results) * 0.6:  # 60% pass rate
            logger.info("🟡 SYSTEM NEEDS MINOR FIXES")
        else:
            logger.info("🔴 SYSTEM NEEDS MAJOR FIXES")
        
        logger.info("="*60)


async def main():
    """Main test runner"""
    async with NutriBoxIntegrationTester() as tester:
        await tester.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())
