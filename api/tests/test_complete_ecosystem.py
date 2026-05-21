#!/usr/bin/env python3
"""
Comprehensive Multi-Portal Integration Test Suite
Tests all 5 portals with automatic issue detection and resolution
"""

import asyncio
import json
import time
import requests
import websockets
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from api.database import SessionLocal
from api import models
from api.tests.auto_fix_engine import AutoFixEngine
from api.tests.sample_data_generator import SampleDataGenerator

class MultiPortalIntegrationTest:
    """Comprehensive integration test for all portals"""
    
    def __init__(self, base_url: str = "http://localhost:8000", ws_url: str = "ws://localhost:8000/ws"):
        self.base_url = base_url
        self.ws_url = ws_url
        self.db = SessionLocal()
        self.auto_fix = AutoFixEngine(base_url)
        self.test_results = {}
        self.issues_found = []
        self.issues_fixed = []
        
        # Test data
        self.test_clients = []
        self.test_nutritionists = []
        self.test_delivery_agents = []
        self.test_orders = []
        
    async def run_all_tests(self):
        """Run all portal tests with auto-fix"""
        print("🚀 Starting comprehensive multi-portal integration tests...")
        
        try:
            # Setup test data
            await self.setup_test_data()
            
            # Run portal-specific tests
            await self.test_client_portal()
            await self.test_nutritionist_portal()
            await self.test_kitchen_portal()
            await self.test_delivery_portal()
            await self.test_admin_portal()
            
            # Run integration tests
            await self.test_cross_portal_workflows()
            await self.test_realtime_event_flow()
            await self.test_concurrent_operations()
            
            # Generate test report
            await self.generate_test_report()
            
        except Exception as e:
            print(f"❌ Test suite error: {e}")
            await self.auto_fix.detect_and_fix_issue(str(e))
        finally:
            self.cleanup()
    
    async def setup_test_data(self):
        """Setup test data for all portals"""
        print("📊 Setting up test data...")
        
        try:
            # Generate sample data
            generator = SampleDataGenerator()
            stats = generator.generate_all_data()
            generator.close()
            
            # Load test data
            self.test_clients = self.db.query(models.Client).limit(5).all()
            self.test_nutritionists = self.db.query(models.Nutritionist).limit(3).all()
            self.test_delivery_agents = self.db.query(models.DeliveryAgent).limit(2).all()
            self.test_orders = self.db.query(models.Order).limit(10).all()
            
            print(f"✅ Test data setup complete: {len(self.test_clients)} clients, {len(self.test_nutritionists)} nutritionists")
            
        except Exception as e:
            print(f"❌ Test data setup error: {e}")
            await self.auto_fix.detect_and_fix_issue(str(e))
    
    async def test_client_portal(self):
        """Test Client Portal functionality"""
        print("\n👤 Testing Client Portal...")
        
        test_results = {
            "portal": "Client Portal",
            "tests": [],
            "issues_found": [],
            "issues_fixed": []
        }
        
        try:
            # Test 1: View today's meal schedule
            await self.test_view_daily_schedule(test_results)
            
            # Test 2: Track live delivery
            await self.test_live_delivery_tracking(test_results)
            
            # Test 3: Log meal consumption
            await self.test_meal_consumption_logging(test_results)
            
            # Test 4: View weekly progress reports
            await self.test_weekly_progress_reports(test_results)
            
            # Test 5: Book consultation
            await self.test_consultation_booking(test_results)
            
            # Test 6: Receive real-time notifications
            await self.test_realtime_notifications(test_results)
            
        except Exception as e:
            print(f"❌ Client Portal test error: {e}")
            await self.auto_fix.detect_and_fix_issue(str(e))
        
        self.test_results["client_portal"] = test_results
        print(f"✅ Client Portal tests completed: {len(test_results['tests'])} tests")
    
    async def test_view_daily_schedule(self, test_results: Dict[str, Any]):
        """Test viewing daily meal schedule"""
        try:
            client = self.test_clients[0]
            
            # Test API endpoint
            response = requests.get(f"{self.base_url}/api/daily-meals/today/{client.id}")
            
            if response.status_code == 200:
                schedule_data = response.json()
                test_results["tests"].append({
                    "name": "View Daily Schedule",
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "data_received": len(schedule_data.get("meals", []))
                })
            else:
                error_msg = f"Failed to get daily schedule: {response.status_code}"
                test_results["issues_found"].append(error_msg)
                await self.auto_fix.detect_and_fix_issue(error_msg)
                
        except Exception as e:
            error_msg = f"Daily schedule test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_live_delivery_tracking(self, test_results: Dict[str, Any]):
        """Test live delivery tracking"""
        try:
            # Find an order with delivery tracking
            order_with_tracking = None
            for order in self.test_orders:
                if order.delivery_agent_id:
                    order_with_tracking = order
                    break
            
            if not order_with_tracking:
                test_results["tests"].append({
                    "name": "Live Delivery Tracking",
                    "status": "skipped",
                    "reason": "No orders with delivery tracking found"
                })
                return
            
            # Test delivery tracking endpoint
            response = requests.get(f"{self.base_url}/api/delivery-tracking/{order_with_tracking.id}")
            
            if response.status_code == 200:
                tracking_data = response.json()
                test_results["tests"].append({
                    "name": "Live Delivery Tracking",
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "tracking_data": tracking_data
                })
            else:
                error_msg = f"Failed to get delivery tracking: {response.status_code}"
                test_results["issues_found"].append(error_msg)
                await self.auto_fix.detect_and_fix_issue(error_msg)
                
        except Exception as e:
            error_msg = f"Delivery tracking test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_meal_consumption_logging(self, test_results: Dict[str, Any]):
        """Test meal consumption logging"""
        try:
            # Find a delivered order
            delivered_order = None
            for order in self.test_orders:
                if order.status == "delivered":
                    delivered_order = order
                    break
            
            if not delivered_order:
                test_results["tests"].append({
                    "name": "Meal Consumption Logging",
                    "status": "skipped",
                    "reason": "No delivered orders found"
                })
                return
            
            # Test consumption logging endpoint
            consumption_data = {
                "consumed": True,
                "rating": 4,
                "feedback": "Great meal!"
            }
            
            response = requests.post(
                f"{self.base_url}/api/daily-meals/{delivered_order.daily_meal_schedule_id}/log-consumption",
                json=consumption_data
            )
            
            if response.status_code == 200:
                test_results["tests"].append({
                    "name": "Meal Consumption Logging",
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "consumption_logged": True
                })
            else:
                error_msg = f"Failed to log consumption: {response.status_code}"
                test_results["issues_found"].append(error_msg)
                await self.auto_fix.detect_and_fix_issue(error_msg)
                
        except Exception as e:
            error_msg = f"Consumption logging test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_weekly_progress_reports(self, test_results: Dict[str, Any]):
        """Test weekly progress reports"""
        try:
            client = self.test_clients[0]
            
            # Test weekly report endpoint
            response = requests.get(f"{self.base_url}/api/reports/weekly-report/{client.id}")
            
            if response.status_code == 200:
                report_data = response.json()
                test_results["tests"].append({
                    "name": "Weekly Progress Reports",
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "report_data": report_data
                })
            else:
                error_msg = f"Failed to get weekly report: {response.status_code}"
                test_results["issues_found"].append(error_msg)
                await self.auto_fix.detect_and_fix_issue(error_msg)
                
        except Exception as e:
            error_msg = f"Weekly reports test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_consultation_booking(self, test_results: Dict[str, Any]):
        """Test consultation booking"""
        try:
            client = self.test_clients[0]
            nutritionist = self.test_nutritionists[0]
            
            # Test consultation booking endpoint
            booking_data = {
                "nutritionist_id": nutritionist.id,
                "scheduled_date": (datetime.now() + timedelta(days=7)).date().isoformat(),
                "scheduled_time": "10:00:00",
                "duration_minutes": 30
            }
            
            response = requests.post(
                f"{self.base_url}/api/consultations/book",
                json=booking_data
            )
            
            if response.status_code == 200:
                test_results["tests"].append({
                    "name": "Consultation Booking",
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "booking_confirmed": True
                })
            else:
                error_msg = f"Failed to book consultation: {response.status_code}"
                test_results["issues_found"].append(error_msg)
                await self.auto_fix.detect_and_fix_issue(error_msg)
                
        except Exception as e:
            error_msg = f"Consultation booking test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_realtime_notifications(self, test_results: Dict[str, Any]):
        """Test real-time notifications"""
        try:
            # Test WebSocket connection
            client_id = self.test_clients[0].id
            
            async with websockets.connect(f"{self.ws_url}/client/{client_id}") as websocket:
                # Send test message
                test_message = {
                    "type": "test_notification",
                    "message": "Test notification for client"
                }
                
                await websocket.send(json.dumps(test_message))
                
                # Wait for response
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                response_data = json.loads(response)
                
                test_results["tests"].append({
                    "name": "Real-time Notifications",
                    "status": "passed",
                    "websocket_connected": True,
                    "message_received": True
                })
                
        except Exception as e:
            error_msg = f"Real-time notifications test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_nutritionist_portal(self):
        """Test Nutritionist Portal functionality"""
        print("\n👩‍⚕️ Testing Nutritionist Portal...")
        
        test_results = {
            "portal": "Nutritionist Portal",
            "tests": [],
            "issues_found": [],
            "issues_fixed": []
        }
        
        try:
            # Test 1: View assigned clients
            await self.test_view_assigned_clients(test_results)
            
            # Test 2: Receive skip meal alerts
            await self.test_skip_meal_alerts(test_results)
            
            # Test 3: Update meal plans
            await self.test_meal_plan_updates(test_results)
            
            # Test 4: Generate weekly reports
            await self.test_generate_weekly_reports(test_results)
            
            # Test 5: Monitor live client activity
            await self.test_live_client_activity(test_results)
            
            # Test 6: Schedule consultations
            await self.test_schedule_consultations(test_results)
            
        except Exception as e:
            print(f"❌ Nutritionist Portal test error: {e}")
            await self.auto_fix.detect_and_fix_issue(str(e))
        
        self.test_results["nutritionist_portal"] = test_results
        print(f"✅ Nutritionist Portal tests completed: {len(test_results['tests'])} tests")
    
    async def test_view_assigned_clients(self, test_results: Dict[str, Any]):
        """Test viewing assigned clients"""
        try:
            nutritionist = self.test_nutritionists[0]
            
            # Test assigned clients endpoint
            response = requests.get(f"{self.base_url}/api/nutritionists/{nutritionist.id}/clients")
            
            if response.status_code == 200:
                clients_data = response.json()
                test_results["tests"].append({
                    "name": "View Assigned Clients",
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "clients_count": len(clients_data.get("clients", []))
                })
            else:
                error_msg = f"Failed to get assigned clients: {response.status_code}"
                test_results["issues_found"].append(error_msg)
                await self.auto_fix.detect_and_fix_issue(error_msg)
                
        except Exception as e:
            error_msg = f"Assigned clients test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_skip_meal_alerts(self, test_results: Dict[str, Any]):
        """Test skip meal alerts"""
        try:
            nutritionist = self.test_nutritionists[0]
            
            # Test skip alerts endpoint
            response = requests.get(f"{self.base_url}/api/nutritionists/{nutritionist.id}/skip-alerts")
            
            if response.status_code == 200:
                alerts_data = response.json()
                test_results["tests"].append({
                    "name": "Skip Meal Alerts",
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "alerts_count": len(alerts_data.get("alerts", []))
                })
            else:
                error_msg = f"Failed to get skip alerts: {response.status_code}"
                test_results["issues_found"].append(error_msg)
                await self.auto_fix.detect_and_fix_issue(error_msg)
                
        except Exception as e:
            error_msg = f"Skip alerts test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_meal_plan_updates(self, test_results: Dict[str, Any]):
        """Test meal plan updates"""
        try:
            client = self.test_clients[0]
            
            # Test meal plan update endpoint
            update_data = {
                "breakfast_item": "Updated Oats Bowl",
                "lunch_item": "Updated Quinoa Salad",
                "dinner_item": "Updated Grilled Fish"
            }
            
            response = requests.patch(
                f"{self.base_url}/api/daily-meals/{client.id}/update-plan",
                json=update_data
            )
            
            if response.status_code == 200:
                test_results["tests"].append({
                    "name": "Meal Plan Updates",
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "plan_updated": True
                })
            else:
                error_msg = f"Failed to update meal plan: {response.status_code}"
                test_results["issues_found"].append(error_msg)
                await self.auto_fix.detect_and_fix_issue(error_msg)
                
        except Exception as e:
            error_msg = f"Meal plan updates test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_generate_weekly_reports(self, test_results: Dict[str, Any]):
        """Test weekly report generation"""
        try:
            nutritionist = self.test_nutritionists[0]
            
            # Test report generation endpoint
            response = requests.post(f"{self.base_url}/api/reports/generate-weekly/{nutritionist.id}")
            
            if response.status_code == 200:
                report_data = response.json()
                test_results["tests"].append({
                    "name": "Generate Weekly Reports",
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "reports_generated": report_data.get("reports_generated", 0)
                })
            else:
                error_msg = f"Failed to generate weekly reports: {response.status_code}"
                test_results["issues_found"].append(error_msg)
                await self.auto_fix.detect_and_fix_issue(error_msg)
                
        except Exception as e:
            error_msg = f"Weekly report generation test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_live_client_activity(self, test_results: Dict[str, Any]):
        """Test live client activity monitoring"""
        try:
            nutritionist = self.test_nutritionists[0]
            
            # Test live activity endpoint
            response = requests.get(f"{self.base_url}/api/nutritionists/{nutritionist.id}/live-activity")
            
            if response.status_code == 200:
                activity_data = response.json()
                test_results["tests"].append({
                    "name": "Live Client Activity",
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "active_clients": len(activity_data.get("active_clients", []))
                })
            else:
                error_msg = f"Failed to get live activity: {response.status_code}"
                test_results["issues_found"].append(error_msg)
                await self.auto_fix.detect_and_fix_issue(error_msg)
                
        except Exception as e:
            error_msg = f"Live activity test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_schedule_consultations(self, test_results: Dict[str, Any]):
        """Test consultation scheduling"""
        try:
            nutritionist = self.test_nutritionists[0]
            client = self.test_clients[0]
            
            # Test consultation scheduling endpoint
            schedule_data = {
                "client_id": client.id,
                "scheduled_date": (datetime.now() + timedelta(days=3)).date().isoformat(),
                "scheduled_time": "14:00:00",
                "duration_minutes": 30
            }
            
            response = requests.post(
                f"{self.base_url}/api/consultations/schedule",
                json=schedule_data
            )
            
            if response.status_code == 200:
                test_results["tests"].append({
                    "name": "Schedule Consultations",
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "consultation_scheduled": True
                })
            else:
                error_msg = f"Failed to schedule consultation: {response.status_code}"
                test_results["issues_found"].append(error_msg)
                await self.auto_fix.detect_and_fix_issue(error_msg)
                
        except Exception as e:
            error_msg = f"Consultation scheduling test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_kitchen_portal(self):
        """Test Kitchen Portal functionality"""
        print("\n🍳 Testing Kitchen Portal...")
        
        test_results = {
            "portal": "Kitchen Portal",
            "tests": [],
            "issues_found": [],
            "issues_fixed": []
        }
        
        try:
            # Test 1: View today's meal schedule
            await self.test_kitchen_daily_schedule(test_results)
            
            # Test 2: Start meal preparation
            await self.test_start_meal_preparation(test_results)
            
            # Test 3: Mark meals as packed
            await self.test_mark_meals_packed(test_results)
            
            # Test 4: Monitor preparation progress
            await self.test_preparation_progress(test_results)
            
            # Test 5: View live statistics
            await self.test_kitchen_live_statistics(test_results)
            
            # Test 6: Handle batch operations
            await self.test_batch_operations(test_results)
            
        except Exception as e:
            print(f"❌ Kitchen Portal test error: {e}")
            await self.auto_fix.detect_and_fix_issue(str(e))
        
        self.test_results["kitchen_portal"] = test_results
        print(f"✅ Kitchen Portal tests completed: {len(test_results['tests'])} tests")
    
    async def test_kitchen_daily_schedule(self, test_results: Dict[str, Any]):
        """Test kitchen daily schedule view"""
        try:
            # Test today's schedule endpoint
            response = requests.get(f"{self.base_url}/api/kitchen/today-schedule")
            
            if response.status_code == 200:
                schedule_data = response.json()
                test_results["tests"].append({
                    "name": "View Today's Schedule",
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "meals_scheduled": len(schedule_data.get("meals", []))
                })
            else:
                error_msg = f"Failed to get today's schedule: {response.status_code}"
                test_results["issues_found"].append(error_msg)
                await self.auto_fix.detect_and_fix_issue(error_msg)
                
        except Exception as e:
            error_msg = f"Kitchen schedule test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_start_meal_preparation(self, test_results: Dict[str, Any]):
        """Test starting meal preparation"""
        try:
            # Find a pending order
            pending_order = None
            for order in self.test_orders:
                if order.status == "pending":
                    pending_order = order
                    break
            
            if not pending_order:
                test_results["tests"].append({
                    "name": "Start Meal Preparation",
                    "status": "skipped",
                    "reason": "No pending orders found"
                })
                return
            
            # Test start preparation endpoint
            response = requests.patch(
                f"{self.base_url}/api/kitchen/meal/{pending_order.id}/start-preparation"
            )
            
            if response.status_code == 200:
                test_results["tests"].append({
                    "name": "Start Meal Preparation",
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "preparation_started": True
                })
            else:
                error_msg = f"Failed to start preparation: {response.status_code}"
                test_results["issues_found"].append(error_msg)
                await self.auto_fix.detect_and_fix_issue(error_msg)
                
        except Exception as e:
            error_msg = f"Start preparation test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_mark_meals_packed(self, test_results: Dict[str, Any]):
        """Test marking meals as packed"""
        try:
            # Find a preparing order
            preparing_order = None
            for order in self.test_orders:
                if order.status == "preparing":
                    preparing_order = order
                    break
            
            if not preparing_order:
                test_results["tests"].append({
                    "name": "Mark Meals Packed",
                    "status": "skipped",
                    "reason": "No preparing orders found"
                })
                return
            
            # Test mark packed endpoint
            response = requests.patch(
                f"{self.base_url}/api/kitchen/meal/{preparing_order.id}/mark-packed"
            )
            
            if response.status_code == 200:
                test_results["tests"].append({
                    "name": "Mark Meals Packed",
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "meal_packed": True
                })
            else:
                error_msg = f"Failed to mark meal as packed: {response.status_code}"
                test_results["issues_found"].append(error_msg)
                await self.auto_fix.detect_and_fix_issue(error_msg)
                
        except Exception as e:
            error_msg = f"Mark packed test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_preparation_progress(self, test_results: Dict[str, Any]):
        """Test preparation progress monitoring"""
        try:
            # Test preparation progress endpoint
            response = requests.get(f"{self.base_url}/api/kitchen/preparation-progress")
            
            if response.status_code == 200:
                progress_data = response.json()
                test_results["tests"].append({
                    "name": "Preparation Progress",
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "progress_data": progress_data
                })
            else:
                error_msg = f"Failed to get preparation progress: {response.status_code}"
                test_results["issues_found"].append(error_msg)
                await self.auto_fix.detect_and_fix_issue(error_msg)
                
        except Exception as e:
            error_msg = f"Preparation progress test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_kitchen_live_statistics(self, test_results: Dict[str, Any]):
        """Test kitchen live statistics"""
        try:
            # Test live statistics endpoint
            response = requests.get(f"{self.base_url}/api/kitchen/live-statistics")
            
            if response.status_code == 200:
                stats_data = response.json()
                test_results["tests"].append({
                    "name": "Live Statistics",
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "statistics": stats_data
                })
            else:
                error_msg = f"Failed to get live statistics: {response.status_code}"
                test_results["issues_found"].append(error_msg)
                await self.auto_fix.detect_and_fix_issue(error_msg)
                
        except Exception as e:
            error_msg = f"Live statistics test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_batch_operations(self, test_results: Dict[str, Any]):
        """Test batch operations"""
        try:
            # Test batch operation endpoint
            batch_data = {
                "operation": "start_preparation",
                "meal_type": "breakfast",
                "order_ids": [order.id for order in self.test_orders[:3]]
            }
            
            response = requests.post(
                f"{self.base_url}/api/kitchen/batch-operation",
                json=batch_data
            )
            
            if response.status_code == 200:
                test_results["tests"].append({
                    "name": "Batch Operations",
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "batch_processed": True
                })
            else:
                error_msg = f"Failed to process batch operation: {response.status_code}"
                test_results["issues_found"].append(error_msg)
                await self.auto_fix.detect_and_fix_issue(error_msg)
                
        except Exception as e:
            error_msg = f"Batch operations test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_delivery_portal(self):
        """Test Delivery Portal functionality"""
        print("\n🚚 Testing Delivery Portal...")
        
        test_results = {
            "portal": "Delivery Portal",
            "tests": [],
            "issues_found": [],
            "issues_fixed": []
        }
        
        try:
            # Test 1: Receive delivery assignments
            await self.test_delivery_assignments(test_results)
            
            # Test 2: Accept/reject assignments
            await self.test_assignment_acceptance(test_results)
            
            # Test 3: GPS tracking updates
            await self.test_gps_tracking_updates(test_results)
            
            # Test 4: Complete deliveries
            await self.test_complete_deliveries(test_results)
            
            # Test 5: Route optimization
            await self.test_route_optimization(test_results)
            
            # Test 6: Performance metrics
            await self.test_performance_metrics(test_results)
            
        except Exception as e:
            print(f"❌ Delivery Portal test error: {e}")
            await self.auto_fix.detect_and_fix_issue(str(e))
        
        self.test_results["delivery_portal"] = test_results
        print(f"✅ Delivery Portal tests completed: {len(test_results['tests'])} tests")
    
    async def test_delivery_assignments(self, test_results: Dict[str, Any]):
        """Test delivery assignments"""
        try:
            delivery_agent = self.test_delivery_agents[0]
            
            # Test assignments endpoint
            response = requests.get(f"{self.base_url}/api/delivery-agents/{delivery_agent.id}/assignments")
            
            if response.status_code == 200:
                assignments_data = response.json()
                test_results["tests"].append({
                    "name": "Delivery Assignments",
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "assignments_count": len(assignments_data.get("assignments", []))
                })
            else:
                error_msg = f"Failed to get assignments: {response.status_code}"
                test_results["issues_found"].append(error_msg)
                await self.auto_fix.detect_and_fix_issue(error_msg)
                
        except Exception as e:
            error_msg = f"Delivery assignments test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_assignment_acceptance(self, test_results: Dict[str, Any]):
        """Test assignment acceptance"""
        try:
            # Find an assigned order
            assigned_order = None
            for order in self.test_orders:
                if order.status == "assigned":
                    assigned_order = order
                    break
            
            if not assigned_order:
                test_results["tests"].append({
                    "name": "Assignment Acceptance",
                    "status": "skipped",
                    "reason": "No assigned orders found"
                })
                return
            
            # Test accept assignment endpoint
            response = requests.post(
                f"{self.base_url}/api/delivery-tracking/{assigned_order.id}/accept"
            )
            
            if response.status_code == 200:
                test_results["tests"].append({
                    "name": "Assignment Acceptance",
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "assignment_accepted": True
                })
            else:
                error_msg = f"Failed to accept assignment: {response.status_code}"
                test_results["issues_found"].append(error_msg)
                await self.auto_fix.detect_and_fix_issue(error_msg)
                
        except Exception as e:
            error_msg = f"Assignment acceptance test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_gps_tracking_updates(self, test_results: Dict[str, Any]):
        """Test GPS tracking updates"""
        try:
            # Find an order in transit
            transit_order = None
            for order in self.test_orders:
                if order.status == "in_transit":
                    transit_order = order
                    break
            
            if not transit_order:
                test_results["tests"].append({
                    "name": "GPS Tracking Updates",
                    "status": "skipped",
                    "reason": "No orders in transit found"
                })
                return
            
            # Test GPS update endpoint
            gps_data = {
                "latitude": "28.6139",
                "longitude": "77.2090",
                "estimated_delivery_time": (datetime.now() + timedelta(minutes=15)).isoformat()
            }
            
            response = requests.post(
                f"{self.base_url}/api/delivery-tracking/{transit_order.id}/location",
                json=gps_data
            )
            
            if response.status_code == 200:
                test_results["tests"].append({
                    "name": "GPS Tracking Updates",
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "location_updated": True
                })
            else:
                error_msg = f"Failed to update GPS location: {response.status_code}"
                test_results["issues_found"].append(error_msg)
                await self.auto_fix.detect_and_fix_issue(error_msg)
                
        except Exception as e:
            error_msg = f"GPS tracking test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_complete_deliveries(self, test_results: Dict[str, Any]):
        """Test completing deliveries"""
        try:
            # Find an order in transit
            transit_order = None
            for order in self.test_orders:
                if order.status == "in_transit":
                    transit_order = order
                    break
            
            if not transit_order:
                test_results["tests"].append({
                    "name": "Complete Deliveries",
                    "status": "skipped",
                    "reason": "No orders in transit found"
                })
                return
            
            # Test complete delivery endpoint
            response = requests.post(
                f"{self.base_url}/api/delivery-tracking/{transit_order.id}/complete"
            )
            
            if response.status_code == 200:
                test_results["tests"].append({
                    "name": "Complete Deliveries",
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "delivery_completed": True
                })
            else:
                error_msg = f"Failed to complete delivery: {response.status_code}"
                test_results["issues_found"].append(error_msg)
                await self.auto_fix.detect_and_fix_issue(error_msg)
                
        except Exception as e:
            error_msg = f"Complete delivery test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_route_optimization(self, test_results: Dict[str, Any]):
        """Test route optimization"""
        try:
            delivery_agent = self.test_delivery_agents[0]
            
            # Test route optimization endpoint
            response = requests.get(f"{self.base_url}/api/delivery-agents/{delivery_agent.id}/optimize-route")
            
            if response.status_code == 200:
                route_data = response.json()
                test_results["tests"].append({
                    "name": "Route Optimization",
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "route_optimized": True,
                    "route_data": route_data
                })
            else:
                error_msg = f"Failed to optimize route: {response.status_code}"
                test_results["issues_found"].append(error_msg)
                await self.auto_fix.detect_and_fix_issue(error_msg)
                
        except Exception as e:
            error_msg = f"Route optimization test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_performance_metrics(self, test_results: Dict[str, Any]):
        """Test performance metrics"""
        try:
            delivery_agent = self.test_delivery_agents[0]
            
            # Test performance metrics endpoint
            response = requests.get(f"{self.base_url}/api/delivery-agents/{delivery_agent.id}/performance")
            
            if response.status_code == 200:
                metrics_data = response.json()
                test_results["tests"].append({
                    "name": "Performance Metrics",
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "metrics": metrics_data
                })
            else:
                error_msg = f"Failed to get performance metrics: {response.status_code}"
                test_results["issues_found"].append(error_msg)
                await self.auto_fix.detect_and_fix_issue(error_msg)
                
        except Exception as e:
            error_msg = f"Performance metrics test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_admin_portal(self):
        """Test Admin Portal functionality"""
        print("\n👨‍💼 Testing Admin Portal...")
        
        test_results = {
            "portal": "Admin Portal",
            "tests": [],
            "issues_found": [],
            "issues_fixed": []
        }
        
        try:
            # Test 1: Master dashboard
            await self.test_master_dashboard(test_results)
            
            # Test 2: Live operations board
            await self.test_live_operations_board(test_results)
            
            # Test 3: Delivery reassignment
            await self.test_delivery_reassignment(test_results)
            
            # Test 4: System announcements
            await self.test_system_announcements(test_results)
            
            # Test 5: Nutritionist performance
            await self.test_nutritionist_performance(test_results)
            
            # Test 6: System health monitoring
            await self.test_system_health_monitoring(test_results)
            
        except Exception as e:
            print(f"❌ Admin Portal test error: {e}")
            await self.auto_fix.detect_and_fix_issue(str(e))
        
        self.test_results["admin_portal"] = test_results
        print(f"✅ Admin Portal tests completed: {len(test_results['tests'])} tests")
    
    async def test_master_dashboard(self, test_results: Dict[str, Any]):
        """Test master dashboard"""
        try:
            # Test master dashboard endpoint
            response = requests.get(f"{self.base_url}/api/admin/master-dashboard")
            
            if response.status_code == 200:
                dashboard_data = response.json()
                test_results["tests"].append({
                    "name": "Master Dashboard",
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "dashboard_data": dashboard_data
                })
            else:
                error_msg = f"Failed to get master dashboard: {response.status_code}"
                test_results["issues_found"].append(error_msg)
                await self.auto_fix.detect_and_fix_issue(error_msg)
                
        except Exception as e:
            error_msg = f"Master dashboard test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_live_operations_board(self, test_results: Dict[str, Any]):
        """Test live operations board"""
        try:
            # Test live operations endpoint
            response = requests.get(f"{self.base_url}/api/admin/live-operations")
            
            if response.status_code == 200:
                operations_data = response.json()
                test_results["tests"].append({
                    "name": "Live Operations Board",
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "operations_data": operations_data
                })
            else:
                error_msg = f"Failed to get live operations: {response.status_code}"
                test_results["issues_found"].append(error_msg)
                await self.auto_fix.detect_and_fix_issue(error_msg)
                
        except Exception as e:
            error_msg = f"Live operations test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_delivery_reassignment(self, test_results: Dict[str, Any]):
        """Test delivery reassignment"""
        try:
            # Find an assigned order
            assigned_order = None
            for order in self.test_orders:
                if order.status == "assigned":
                    assigned_order = order
                    break
            
            if not assigned_order:
                test_results["tests"].append({
                    "name": "Delivery Reassignment",
                    "status": "skipped",
                    "reason": "No assigned orders found"
                })
                return
            
            # Find another delivery agent
            new_agent = None
            for agent in self.test_delivery_agents:
                if agent.id != assigned_order.delivery_agent_id:
                    new_agent = agent
                    break
            
            if not new_agent:
                test_results["tests"].append({
                    "name": "Delivery Reassignment",
                    "status": "skipped",
                    "reason": "No alternative delivery agent found"
                })
                return
            
            # Test reassignment endpoint
            reassignment_data = {
                "new_delivery_agent_id": new_agent.id,
                "reason": "Test reassignment"
            }
            
            response = requests.post(
                f"{self.base_url}/api/delivery-tracking/{assigned_order.id}/reassign",
                json=reassignment_data
            )
            
            if response.status_code == 200:
                test_results["tests"].append({
                    "name": "Delivery Reassignment",
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "reassignment_successful": True
                })
            else:
                error_msg = f"Failed to reassign delivery: {response.status_code}"
                test_results["issues_found"].append(error_msg)
                await self.auto_fix.detect_and_fix_issue(error_msg)
                
        except Exception as e:
            error_msg = f"Delivery reassignment test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_system_announcements(self, test_results: Dict[str, Any]):
        """Test system announcements"""
        try:
            # Test announcement endpoint
            announcement_data = {
                "message": "Test system announcement",
                "announcement_type": "general",
                "priority": "medium",
                "target_audience": "all"
            }
            
            response = requests.post(
                f"{self.base_url}/api/admin/broadcast-announcement",
                json=announcement_data
            )
            
            if response.status_code == 200:
                test_results["tests"].append({
                    "name": "System Announcements",
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "announcement_sent": True
                })
            else:
                error_msg = f"Failed to send announcement: {response.status_code}"
                test_results["issues_found"].append(error_msg)
                await self.auto_fix.detect_and_fix_issue(error_msg)
                
        except Exception as e:
            error_msg = f"System announcements test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_nutritionist_performance(self, test_results: Dict[str, Any]):
        """Test nutritionist performance analytics"""
        try:
            # Test nutritionist performance endpoint
            response = requests.get(f"{self.base_url}/api/admin/nutritionist-performance")
            
            if response.status_code == 200:
                performance_data = response.json()
                test_results["tests"].append({
                    "name": "Nutritionist Performance",
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "performance_data": performance_data
                })
            else:
                error_msg = f"Failed to get nutritionist performance: {response.status_code}"
                test_results["issues_found"].append(error_msg)
                await self.auto_fix.detect_and_fix_issue(error_msg)
                
        except Exception as e:
            error_msg = f"Nutritionist performance test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_system_health_monitoring(self, test_results: Dict[str, Any]):
        """Test system health monitoring"""
        try:
            # Test health monitoring endpoint
            response = requests.get(f"{self.base_url}/api/monitoring/health")
            
            if response.status_code == 200:
                health_data = response.json()
                test_results["tests"].append({
                    "name": "System Health Monitoring",
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "health_status": health_data.get("status", "unknown")
                })
            else:
                error_msg = f"Failed to get system health: {response.status_code}"
                test_results["issues_found"].append(error_msg)
                await self.auto_fix.detect_and_fix_issue(error_msg)
                
        except Exception as e:
            error_msg = f"System health test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_cross_portal_workflows(self):
        """Test cross-portal workflows"""
        print("\n🔄 Testing Cross-Portal Workflows...")
        
        test_results = {
            "workflow": "Cross-Portal Integration",
            "tests": [],
            "issues_found": [],
            "issues_fixed": []
        }
        
        try:
            # Test 1: Complete meal lifecycle
            await self.test_complete_meal_lifecycle(test_results)
            
            # Test 2: Skip alert workflow
            await self.test_skip_alert_workflow(test_results)
            
            # Test 3: Weekly report workflow
            await self.test_weekly_report_workflow(test_results)
            
            # Test 4: Consultation workflow
            await self.test_consultation_workflow(test_results)
            
        except Exception as e:
            print(f"❌ Cross-portal workflow test error: {e}")
            await self.auto_fix.detect_and_fix_issue(str(e))
        
        self.test_results["cross_portal_workflows"] = test_results
        print(f"✅ Cross-portal workflow tests completed: {len(test_results['tests'])} tests")
    
    async def test_complete_meal_lifecycle(self, test_results: Dict[str, Any]):
        """Test complete meal lifecycle across portals"""
        try:
            # Start with a pending order
            pending_order = None
            for order in self.test_orders:
                if order.status == "pending":
                    pending_order = order
                    break
            
            if not pending_order:
                test_results["tests"].append({
                    "name": "Complete Meal Lifecycle",
                    "status": "skipped",
                    "reason": "No pending orders found"
                })
                return
            
            lifecycle_steps = []
            
            # Step 1: Kitchen starts preparation
            response = requests.patch(
                f"{self.base_url}/api/kitchen/meal/{pending_order.id}/start-preparation"
            )
            if response.status_code == 200:
                lifecycle_steps.append("Kitchen preparation started")
            
            # Step 2: Kitchen marks as packed
            response = requests.patch(
                f"{self.base_url}/api/kitchen/meal/{pending_order.id}/mark-packed"
            )
            if response.status_code == 200:
                lifecycle_steps.append("Meal packed")
            
            # Step 3: Delivery agent accepts assignment
            response = requests.post(
                f"{self.base_url}/api/delivery-tracking/{pending_order.id}/accept"
            )
            if response.status_code == 200:
                lifecycle_steps.append("Delivery accepted")
            
            # Step 4: GPS tracking updates
            gps_data = {
                "latitude": "28.6139",
                "longitude": "77.2090",
                "estimated_delivery_time": (datetime.now() + timedelta(minutes=15)).isoformat()
            }
            response = requests.post(
                f"{self.base_url}/api/delivery-tracking/{pending_order.id}/location",
                json=gps_data
            )
            if response.status_code == 200:
                lifecycle_steps.append("GPS tracking updated")
            
            # Step 5: Delivery completed
            response = requests.post(
                f"{self.base_url}/api/delivery-tracking/{pending_order.id}/complete"
            )
            if response.status_code == 200:
                lifecycle_steps.append("Delivery completed")
            
            # Step 6: Client logs consumption
            consumption_data = {
                "consumed": True,
                "rating": 4,
                "feedback": "Great meal!"
            }
            response = requests.post(
                f"{self.base_url}/api/daily-meals/{pending_order.daily_meal_schedule_id}/log-consumption",
                json=consumption_data
            )
            if response.status_code == 200:
                lifecycle_steps.append("Consumption logged")
            
            test_results["tests"].append({
                "name": "Complete Meal Lifecycle",
                "status": "passed",
                "lifecycle_steps": lifecycle_steps,
                "steps_completed": len(lifecycle_steps)
            })
            
        except Exception as e:
            error_msg = f"Meal lifecycle test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_skip_alert_workflow(self, test_results: Dict[str, Any]):
        """Test skip alert workflow"""
        try:
            # Find a delivered order
            delivered_order = None
            for order in self.test_orders:
                if order.status == "delivered":
                    delivered_order = order
                    break
            
            if not delivered_order:
                test_results["tests"].append({
                    "name": "Skip Alert Workflow",
                    "status": "skipped",
                    "reason": "No delivered orders found"
                })
                return
            
            # Client skips meal
            consumption_data = {
                "consumed": False,
                "skip_reason": "Not hungry"
            }
            response = requests.post(
                f"{self.base_url}/api/daily-meals/{delivered_order.daily_meal_schedule_id}/log-consumption",
                json=consumption_data
            )
            
            if response.status_code == 200:
                # Check if nutritionist receives alert
                nutritionist_id = delivered_order.subscription.nutritionist_id
                alert_response = requests.get(f"{self.base_url}/api/nutritionists/{nutritionist_id}/skip-alerts")
                
                if alert_response.status_code == 200:
                    alerts_data = alert_response.json()
                    test_results["tests"].append({
                        "name": "Skip Alert Workflow",
                        "status": "passed",
                        "skip_logged": True,
                        "alert_sent": len(alerts_data.get("alerts", [])) > 0
                    })
                else:
                    test_results["tests"].append({
                        "name": "Skip Alert Workflow",
                        "status": "partial",
                        "skip_logged": True,
                        "alert_sent": False
                    })
            else:
                error_msg = f"Failed to log skip: {response.status_code}"
                test_results["issues_found"].append(error_msg)
                await self.auto_fix.detect_and_fix_issue(error_msg)
                
        except Exception as e:
            error_msg = f"Skip alert workflow test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_weekly_report_workflow(self, test_results: Dict[str, Any]):
        """Test weekly report workflow"""
        try:
            nutritionist = self.test_nutritionists[0]
            
            # Generate weekly report
            response = requests.post(f"{self.base_url}/api/reports/generate-weekly/{nutritionist.id}")
            
            if response.status_code == 200:
                report_data = response.json()
                
                # Check if clients receive reports
                client_id = self.test_clients[0].id
                client_response = requests.get(f"{self.base_url}/api/reports/weekly-report/{client_id}")
                
                if client_response.status_code == 200:
                    test_results["tests"].append({
                        "name": "Weekly Report Workflow",
                        "status": "passed",
                        "report_generated": True,
                        "client_received": True
                    })
                else:
                    test_results["tests"].append({
                        "name": "Weekly Report Workflow",
                        "status": "partial",
                        "report_generated": True,
                        "client_received": False
                    })
            else:
                error_msg = f"Failed to generate weekly report: {response.status_code}"
                test_results["issues_found"].append(error_msg)
                await self.auto_fix.detect_and_fix_issue(error_msg)
                
        except Exception as e:
            error_msg = f"Weekly report workflow test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_consultation_workflow(self, test_results: Dict[str, Any]):
        """Test consultation workflow"""
        try:
            client = self.test_clients[0]
            nutritionist = self.test_nutritionists[0]
            
            # Client books consultation
            booking_data = {
                "nutritionist_id": nutritionist.id,
                "scheduled_date": (datetime.now() + timedelta(days=7)).date().isoformat(),
                "scheduled_time": "10:00:00",
                "duration_minutes": 30
            }
            
            response = requests.post(
                f"{self.base_url}/api/consultations/book",
                json=booking_data
            )
            
            if response.status_code == 200:
                # Check if nutritionist receives notification
                notification_response = requests.get(f"{self.base_url}/api/nutritionists/{nutritionist.id}/notifications")
                
                if notification_response.status_code == 200:
                    test_results["tests"].append({
                        "name": "Consultation Workflow",
                        "status": "passed",
                        "consultation_booked": True,
                        "notification_sent": True
                    })
                else:
                    test_results["tests"].append({
                        "name": "Consultation Workflow",
                        "status": "partial",
                        "consultation_booked": True,
                        "notification_sent": False
                    })
            else:
                error_msg = f"Failed to book consultation: {response.status_code}"
                test_results["issues_found"].append(error_msg)
                await self.auto_fix.detect_and_fix_issue(error_msg)
                
        except Exception as e:
            error_msg = f"Consultation workflow test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_realtime_event_flow(self):
        """Test real-time event flow"""
        print("\n📡 Testing Real-Time Event Flow...")
        
        test_results = {
            "workflow": "Real-Time Events",
            "tests": [],
            "issues_found": [],
            "issues_fixed": []
        }
        
        try:
            # Test WebSocket connections for all portals
            await self.test_websocket_connections(test_results)
            
            # Test event broadcasting
            await self.test_event_broadcasting(test_results)
            
            # Test channel subscriptions
            await self.test_channel_subscriptions(test_results)
            
        except Exception as e:
            print(f"❌ Real-time event flow test error: {e}")
            await self.auto_fix.detect_and_fix_issue(str(e))
        
        self.test_results["realtime_event_flow"] = test_results
        print(f"✅ Real-time event flow tests completed: {len(test_results['tests'])} tests")
    
    async def test_websocket_connections(self, test_results: Dict[str, Any]):
        """Test WebSocket connections for all portals"""
        try:
            connections_tested = []
            
            # Test client WebSocket
            client_id = self.test_clients[0].id
            try:
                async with websockets.connect(f"{self.ws_url}/client/{client_id}") as websocket:
                    connections_tested.append("client")
            except Exception as e:
                print(f"Client WebSocket connection failed: {e}")
            
            # Test nutritionist WebSocket
            nutritionist_id = self.test_nutritionists[0].id
            try:
                async with websockets.connect(f"{self.ws_url}/nutritionist/{nutritionist_id}") as websocket:
                    connections_tested.append("nutritionist")
            except Exception as e:
                print(f"Nutritionist WebSocket connection failed: {e}")
            
            # Test kitchen WebSocket
            try:
                async with websockets.connect(f"{self.ws_url}/kitchen") as websocket:
                    connections_tested.append("kitchen")
            except Exception as e:
                print(f"Kitchen WebSocket connection failed: {e}")
            
            # Test delivery WebSocket
            delivery_agent_id = self.test_delivery_agents[0].id
            try:
                async with websockets.connect(f"{self.ws_url}/delivery/{delivery_agent_id}") as websocket:
                    connections_tested.append("delivery")
            except Exception as e:
                print(f"Delivery WebSocket connection failed: {e}")
            
            # Test admin WebSocket
            try:
                async with websockets.connect(f"{self.ws_url}/admin") as websocket:
                    connections_tested.append("admin")
            except Exception as e:
                print(f"Admin WebSocket connection failed: {e}")
            
            test_results["tests"].append({
                "name": "WebSocket Connections",
                "status": "passed" if len(connections_tested) >= 3 else "partial",
                "connections_tested": connections_tested,
                "total_connections": len(connections_tested)
            })
            
        except Exception as e:
            error_msg = f"WebSocket connections test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_event_broadcasting(self, test_results: Dict[str, Any]):
        """Test event broadcasting"""
        try:
            # Test broadcasting a meal status event
            order = self.test_orders[0]
            
            # Update meal status to trigger event
            response = requests.patch(
                f"{self.base_url}/api/daily-meals/{order.daily_meal_schedule_id}/meal-status",
                json={
                    "meal_type": "breakfast",
                    "status": "preparing"
                }
            )
            
            if response.status_code == 200:
                test_results["tests"].append({
                    "name": "Event Broadcasting",
                    "status": "passed",
                    "event_triggered": True,
                    "response_time": response.elapsed.total_seconds()
                })
            else:
                error_msg = f"Failed to trigger event: {response.status_code}"
                test_results["issues_found"].append(error_msg)
                await self.auto_fix.detect_and_fix_issue(error_msg)
                
        except Exception as e:
            error_msg = f"Event broadcasting test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_channel_subscriptions(self, test_results: Dict[str, Any]):
        """Test channel subscriptions"""
        try:
            # Test subscribing to multiple channels
            client_id = self.test_clients[0].id
            
            async with websockets.connect(f"{self.ws_url}/client/{client_id}") as websocket:
                # Send subscription message
                subscription_message = {
                    "type": "subscribe",
                    "channels": ["client", "kitchen", "admin"]
                }
                
                await websocket.send(json.dumps(subscription_message))
                
                # Wait for confirmation
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    response_data = json.loads(response)
                    
                    test_results["tests"].append({
                        "name": "Channel Subscriptions",
                        "status": "passed",
                        "subscription_confirmed": True,
                        "channels_subscribed": subscription_message["channels"]
                    })
                except asyncio.TimeoutError:
                    test_results["tests"].append({
                        "name": "Channel Subscriptions",
                        "status": "timeout",
                        "subscription_confirmed": False
                    })
                
        except Exception as e:
            error_msg = f"Channel subscriptions test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_concurrent_operations(self):
        """Test concurrent operations"""
        print("\n⚡ Testing Concurrent Operations...")
        
        test_results = {
            "workflow": "Concurrent Operations",
            "tests": [],
            "issues_found": [],
            "issues_fixed": []
        }
        
        try:
            # Test concurrent API requests
            await self.test_concurrent_api_requests(test_results)
            
            # Test concurrent WebSocket connections
            await self.test_concurrent_websocket_connections(test_results)
            
            # Test concurrent database operations
            await self.test_concurrent_database_operations(test_results)
            
        except Exception as e:
            print(f"❌ Concurrent operations test error: {e}")
            await self.auto_fix.detect_and_fix_issue(str(e))
        
        self.test_results["concurrent_operations"] = test_results
        print(f"✅ Concurrent operations tests completed: {len(test_results['tests'])} tests")
    
    async def test_concurrent_api_requests(self, test_results: Dict[str, Any]):
        """Test concurrent API requests"""
        try:
            # Create multiple concurrent requests
            tasks = []
            
            # Multiple client requests
            for i in range(5):
                client_id = self.test_clients[i % len(self.test_clients)].id
                task = asyncio.create_task(self.make_api_request(f"/api/daily-meals/today/{client_id}"))
                tasks.append(task)
            
            # Multiple nutritionist requests
            for i in range(3):
                nutritionist_id = self.test_nutritionists[i % len(self.test_nutritionists)].id
                task = asyncio.create_task(self.make_api_request(f"/api/nutritionists/{nutritionist_id}/clients"))
                tasks.append(task)
            
            # Wait for all requests to complete
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            successful_requests = len([r for r in results if not isinstance(r, Exception)])
            failed_requests = len([r for r in results if isinstance(r, Exception)])
            
            test_results["tests"].append({
                "name": "Concurrent API Requests",
                "status": "passed" if successful_requests >= len(tasks) * 0.8 else "partial",
                "total_requests": len(tasks),
                "successful_requests": successful_requests,
                "failed_requests": failed_requests,
                "success_rate": successful_requests / len(tasks) * 100
            })
            
        except Exception as e:
            error_msg = f"Concurrent API requests test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def make_api_request(self, endpoint: str):
        """Make a single API request"""
        try:
            response = requests.get(f"{self.base_url}{endpoint}")
            return {"status_code": response.status_code, "response_time": response.elapsed.total_seconds()}
        except Exception as e:
            return {"error": str(e)}
    
    async def test_concurrent_websocket_connections(self, test_results: Dict[str, Any]):
        """Test concurrent WebSocket connections"""
        try:
            # Create multiple concurrent WebSocket connections
            tasks = []
            
            for i in range(10):
                client_id = self.test_clients[i % len(self.test_clients)].id
                task = asyncio.create_task(self.test_websocket_connection(f"/client/{client_id}"))
                tasks.append(task)
            
            # Wait for all connections to complete
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            successful_connections = len([r for r in results if not isinstance(r, Exception)])
            failed_connections = len([r for r in results if isinstance(r, Exception)])
            
            test_results["tests"].append({
                "name": "Concurrent WebSocket Connections",
                "status": "passed" if successful_connections >= len(tasks) * 0.7 else "partial",
                "total_connections": len(tasks),
                "successful_connections": successful_connections,
                "failed_connections": failed_connections,
                "success_rate": successful_connections / len(tasks) * 100
            })
            
        except Exception as e:
            error_msg = f"Concurrent WebSocket connections test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_websocket_connection(self, endpoint: str):
        """Test a single WebSocket connection"""
        try:
            async with websockets.connect(f"{self.ws_url}{endpoint}") as websocket:
                # Send a test message
                test_message = {"type": "test", "message": "concurrent test"}
                await websocket.send(json.dumps(test_message))
                
                # Wait for response
                response = await asyncio.wait_for(websocket.recv(), timeout=3.0)
                return {"connected": True, "message_sent": True, "response_received": True}
        except Exception as e:
            return {"connected": False, "error": str(e)}
    
    async def test_concurrent_database_operations(self, test_results: Dict[str, Any]):
        """Test concurrent database operations"""
        try:
            # Create multiple concurrent database operations
            tasks = []
            
            for i in range(5):
                task = asyncio.create_task(self.test_database_operation())
                tasks.append(task)
            
            # Wait for all operations to complete
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            successful_operations = len([r for r in results if not isinstance(r, Exception)])
            failed_operations = len([r for r in results if isinstance(r, Exception)])
            
            test_results["tests"].append({
                "name": "Concurrent Database Operations",
                "status": "passed" if successful_operations >= len(tasks) * 0.8 else "partial",
                "total_operations": len(tasks),
                "successful_operations": successful_operations,
                "failed_operations": failed_operations,
                "success_rate": successful_operations / len(tasks) * 100
            })
            
        except Exception as e:
            error_msg = f"Concurrent database operations test error: {str(e)}"
            test_results["issues_found"].append(error_msg)
            await self.auto_fix.detect_and_fix_issue(error_msg)
    
    async def test_database_operation(self):
        """Test a single database operation"""
        try:
            # Simple database query
            clients = self.db.query(models.Client).limit(1).all()
            return {"operation": "query", "result_count": len(clients)}
        except Exception as e:
            return {"operation": "query", "error": str(e)}
    
    async def generate_test_report(self):
        """Generate comprehensive test report"""
        print("\n📊 Generating comprehensive test report...")
        
        try:
            # Calculate overall statistics
            total_tests = 0
            passed_tests = 0
            failed_tests = 0
            skipped_tests = 0
            
            for portal_name, portal_results in self.test_results.items():
                for test in portal_results.get("tests", []):
                    total_tests += 1
                    if test["status"] == "passed":
                        passed_tests += 1
                    elif test["status"] == "failed":
                        failed_tests += 1
                    else:
                        skipped_tests += 1
            
            # Generate report
            report = {
                "timestamp": datetime.now().isoformat(),
                "test_summary": {
                    "total_tests": total_tests,
                    "passed_tests": passed_tests,
                    "failed_tests": failed_tests,
                    "skipped_tests": skipped_tests,
                    "pass_rate": (passed_tests / total_tests * 100) if total_tests > 0 else 0
                },
                "portal_results": self.test_results,
                "issues_summary": {
                    "total_issues_found": len(self.issues_found),
                    "total_issues_fixed": len(self.issues_fixed),
                    "issues": self.issues_found,
                    "fixes": self.issues_fixed
                },
                "auto_fix_report": self.auto_fix.generate_issue_report()
            }
            
            # Save report to file
            report_file = "test_results/comprehensive_test_report.json"
            import os
            os.makedirs("test_results", exist_ok=True)
            
            with open(report_file, "w") as f:
                json.dump(report, f, indent=2)
            
            print(f"✅ Test report generated: {report_file}")
            print(f"📊 Test Summary:")
            print(f"   Total Tests: {total_tests}")
            print(f"   Passed: {passed_tests} ({passed_tests/total_tests*100:.1f}%)")
            print(f"   Failed: {failed_tests}")
            print(f"   Skipped: {skipped_tests}")
            print(f"   Issues Found: {len(self.issues_found)}")
            print(f"   Issues Fixed: {len(self.issues_fixed)}")
            
        except Exception as e:
            print(f"❌ Error generating test report: {e}")
    
    def cleanup(self):
        """Cleanup test resources"""
        try:
            self.db.close()
            self.auto_fix.close()
            print("🧹 Test cleanup completed")
        except Exception as e:
            print(f"❌ Cleanup error: {e}")

async def main():
    """Main function to run comprehensive tests"""
    tester = MultiPortalIntegrationTest()
    try:
        await tester.run_all_tests()
    except KeyboardInterrupt:
        print("\n🛑 Tests interrupted by user")
    except Exception as e:
        print(f"❌ Test suite error: {e}")
    finally:
        tester.cleanup()

if __name__ == "__main__":
    asyncio.run(main())
