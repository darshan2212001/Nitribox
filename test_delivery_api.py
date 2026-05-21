"""
Comprehensive End-to-End Test for Delivery API
Tests all delivery endpoints with automatic user registration/login
"""

import requests
import json
import sys
import os
from datetime import datetime, timedelta, date
import random
import time

BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api"

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_section(title, level=1):
    if level == 1:
        print(f"\n{Colors.BOLD}{Colors.HEADER}{'='*80}{Colors.RESET}")
        print(f"{Colors.BOLD}{Colors.HEADER}  {title}{Colors.RESET}")
        print(f"{Colors.BOLD}{Colors.HEADER}{'='*80}{Colors.RESET}")
    else:
        print(f"\n{Colors.BOLD}{Colors.BLUE}{'-'*60}{Colors.RESET}")
        print(f"{Colors.BOLD}{Colors.BLUE}  {title}{Colors.RESET}")
        print(f"{Colors.BOLD}{Colors.BLUE}{'-'*60}{Colors.RESET}")

def print_success(msg):
    print(f"{Colors.GREEN}✓ {msg}{Colors.RESET}")

def print_error(msg):
    print(f"{Colors.RED}✗ ERROR: {msg}{Colors.RESET}")

def print_warning(msg):
    print(f"{Colors.YELLOW}⚠ {msg}{Colors.RESET}")

def print_info(msg):
    print(f"{Colors.CYAN}ℹ {msg}{Colors.RESET}")

class DeliveryAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
        self.username = f"testdelivery_{random.randint(10000, 99999)}"
        self.email = f"{self.username}@test.com"
        self.password = "Test123"
        self.test_order_id = None
        self.test_batch_id = None
        self.results = {
            "passed": 0,
            "failed": 0,
            "warnings": 0,
            "tests": []
        }
    
    def test(self, name, func, *args, **kwargs):
        """Run a test and track results"""
        try:
            result = func(*args, **kwargs)
            if result:
                self.results["passed"] += 1
                self.results["tests"].append({"name": name, "status": "PASS"})
                return True
            else:
                self.results["failed"] += 1
                self.results["tests"].append({"name": name, "status": "FAIL"})
                return False
        except Exception as e:
            self.results["failed"] += 1
            self.results["tests"].append({"name": name, "status": "ERROR", "error": str(e)})
            print_error(f"{name}: {str(e)}")
            return False
    
    def check_server(self):
        """Test 1: Check server health"""
        print_section("1. Server Health Check", 2)
        try:
            response = self.session.get(f"{BASE_URL}/api/health", timeout=5)
            if response.status_code == 200:
                print_success("Server is running and healthy")
                return True
            else:
                print_error(f"Server returned status {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Cannot connect to server: {e}")
            return False
    
    def register_and_login(self):
        """Test 2: Register and Login as Delivery User"""
        print_section("2. Authentication (Auto Register/Login)", 2)
        
        # Try to register
        try:
            response = self.session.post(
                f"{API_BASE}/auth/register",
                json={
                    "username": self.username,
                    "email": self.email,
                    "password": self.password,
                    "name": "Test Delivery User",
                    "role": "delivery"
                },
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                print_success(f"Registered delivery user: {self.username}")
            elif response.status_code == 400:
                error_text = response.text
                if "already exists" in error_text.lower():
                    print_warning(f"User {self.username} already exists, will try to login")
                else:
                    print_error(f"Registration failed: {error_text}")
                    return False
            else:
                print_warning(f"Registration returned {response.status_code}, will try to login")
        except Exception as e:
            print_warning(f"Registration attempt failed: {e}, will try to login")
        
        # Try to login
        time.sleep(0.5)  # Small delay
        
        try:
            response = self.session.post(
                f"{API_BASE}/auth/login",
                json={
                    "username": self.username,
                    "password": self.password
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("access_token")
                if self.auth_token:
                    self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
                    
                    # Try to get user info from /auth/me endpoint
                    try:
                        me_response = self.session.get(f"{API_BASE}/auth/me", timeout=10)
                        if me_response.status_code == 200:
                            user_info = me_response.json()
                            self.user_id = user_info.get("id")
                            print_success(f"Logged in as: {user_info.get('name', self.username)}")
                            print_info(f"User ID: {self.user_id}")
                            print_info(f"Email: {user_info.get('email', self.email)}")
                        else:
                            print_warning("Could not get user info, but token is valid")
                            self.user_id = self.username  # Fallback
                    except:
                        print_warning("Could not get user info, but token is valid")
                        self.user_id = self.username  # Fallback
                    
                    return True
                else:
                    print_error("No access token in response")
                    return False
            elif response.status_code == 500:
                print_warning("Login returned 500, trying alternative authentication methods")
                print_info("Will skip authenticated tests but continue with public endpoint tests")
                return False
            else:
                print_error(f"Login failed: {response.status_code} - {response.text[:200]}")
                return False
        except Exception as e:
            print_error(f"Login failed: {e}")
            return False
    
    def test_get_delivery_orders(self):
        """Test 3: GET /api/delivery/orders - Get all delivery orders"""
        print_section("3. GET All Delivery Orders", 2)
        
        try:
            # Test without filters
            response = self.session.get(f"{API_BASE}/delivery/orders", timeout=10)
            if response.status_code == 200:
                orders = response.json()
                if isinstance(orders, list):
                    print_success(f"Retrieved {len(orders)} order(s)")
                    if len(orders) > 0:
                        order = orders[0]
                        self.test_order_id = order.get('id')
                        print_info(f"  Sample Order ID: {order.get('id', 'Unknown')[:8]}...")
                        print_info(f"  Status: {order.get('status', 'N/A')}")
                    return True
                else:
                    print_error("Response is not a list")
                    return False
            else:
                print_error(f"Failed with status {response.status_code}: {response.text[:200]}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_get_delivery_orders_with_filters(self):
        """Test 4: GET /api/delivery/orders - With filters"""
        print_section("4. GET Delivery Orders with Filters", 2)
        
        try:
            # Test with status filter
            response = self.session.get(
                f"{API_BASE}/delivery/orders",
                params={"status": "ready"},
                timeout=10
            )
            if response.status_code == 200:
                orders = response.json()
                print_success(f"Filtered by status='ready': {len(orders)} result(s)")
                
                # Test with priority filter
                response = self.session.get(
                    f"{API_BASE}/delivery/orders",
                    params={"priority": "high"},
                    timeout=10
                )
                if response.status_code == 200:
                    filtered = response.json()
                    print_success(f"Filtered by priority='high': {len(filtered)} result(s)")
                
                # Test pagination
                response = self.session.get(
                    f"{API_BASE}/delivery/orders",
                    params={"skip": 0, "limit": 5},
                    timeout=10
                )
                if response.status_code == 200:
                    paginated = response.json()
                    print_success(f"Pagination (limit=5): {len(paginated)} result(s)")
                
                return True
            else:
                print_error(f"Filter test failed: {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_get_assigned_orders(self):
        """Test 5: GET /api/delivery/orders/assigned - Get assigned orders"""
        print_section("5. GET Assigned Orders", 2)
        
        try:
            response = self.session.get(f"{API_BASE}/delivery/orders/assigned", timeout=10)
            if response.status_code == 200:
                orders = response.json()
                print_success(f"Retrieved {len(orders)} assigned order(s)")
                return True
            else:
                print_error(f"Failed with status {response.status_code}: {response.text[:200]}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_get_in_transit_orders(self):
        """Test 6: GET /api/delivery/orders/in-transit - Get in-transit orders"""
        print_section("6. GET In-Transit Orders", 2)
        
        try:
            response = self.session.get(f"{API_BASE}/delivery/orders/in-transit", timeout=10)
            if response.status_code == 200:
                orders = response.json()
                print_success(f"Retrieved {len(orders)} in-transit order(s)")
                return True
            else:
                print_error(f"Failed with status {response.status_code}: {response.text[:200]}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_get_delivered_orders(self):
        """Test 7: GET /api/delivery/orders/delivered - Get delivered orders"""
        print_section("7. GET Delivered Orders", 2)
        
        try:
            response = self.session.get(f"{API_BASE}/delivery/orders/delivered", timeout=10)
            if response.status_code == 200:
                orders = response.json()
                print_success(f"Retrieved {len(orders)} delivered order(s)")
                return True
            else:
                print_error(f"Failed with status {response.status_code}: {response.text[:200]}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_get_delivery_stats(self):
        """Test 8: GET /api/delivery/stats - Get delivery statistics"""
        print_section("8. GET Delivery Stats", 2)
        
        try:
            response = self.session.get(f"{API_BASE}/delivery/stats", timeout=10)
            if response.status_code == 200:
                stats = response.json()
                print_success("Retrieved delivery statistics")
                print_info(f"  Assigned: {stats.get('assigned_orders', 0)}")
                print_info(f"  In Transit: {stats.get('in_transit_orders', 0)}")
                print_info(f"  Delivered Today: {stats.get('delivered_today', 0)}")
                print_info(f"  Total Delivered: {stats.get('total_delivered', 0)}")
                return True
            else:
                print_error(f"Failed with status {response.status_code}: {response.text[:200]}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_get_order_tracking(self):
        """Test 9: GET /api/delivery/orders/{order_id}/tracking - Get order tracking"""
        print_section("9. GET Order Tracking", 2)
        
        try:
            # First get an order ID
            if not self.test_order_id:
                response = self.session.get(f"{API_BASE}/delivery/orders", timeout=10)
                if response.status_code == 200:
                    orders = response.json()
                    if len(orders) > 0:
                        self.test_order_id = orders[0].get('id')
                    else:
                        print_warning("No orders available to test")
                        return True  # Not an error
            
            if self.test_order_id:
                response = self.session.get(
                    f"{API_BASE}/delivery/orders/{self.test_order_id}/tracking",
                    timeout=10
                )
                # 404 is acceptable if tracking doesn't exist
                if response.status_code in [200, 404]:
                    if response.status_code == 200:
                        tracking = response.json()
                        print_success(f"Retrieved tracking for order: {self.test_order_id[:8]}...")
                    else:
                        print_success("Correctly returned 404 (no tracking found)")
                    return True
                else:
                    print_error(f"Failed with status {response.status_code}: {response.text[:200]}")
                    return False
            else:
                print_warning("No order ID available for testing")
                return True
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_get_delivery_batches(self):
        """Test 10: GET /api/delivery/batches - Get delivery batches"""
        print_section("10. GET Delivery Batches", 2)
        
        try:
            # Test without filters (defaults to today)
            response = self.session.get(f"{API_BASE}/delivery/batches", timeout=10)
            if response.status_code == 200:
                data = response.json()
                batches = data.get('batches', [])
                print_success(f"Retrieved {len(batches)} batch(es)")
                if len(batches) > 0:
                    batch = batches[0]
                    self.test_batch_id = batch.get('batch_id')
                    print_info(f"  Sample Batch ID: {batch.get('batch_id', 'Unknown')[:8]}...")
                    print_info(f"  Area: {batch.get('area_name', 'N/A')}")
                
                # Test with target_date filter
                today = date.today().isoformat()
                response = self.session.get(
                    f"{API_BASE}/delivery/batches",
                    params={"target_date": today},
                    timeout=10
                )
                if response.status_code == 200:
                    filtered = response.json()
                    print_success(f"Filtered by target_date={today}: {len(filtered.get('batches', []))} result(s)")
                
                return True
            else:
                print_error(f"Failed with status {response.status_code}: {response.text[:200]}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_get_batch_details(self):
        """Test 11: GET /api/delivery/batches/{batch_id} - Get batch details"""
        print_section("11. GET Batch Details", 2)
        
        try:
            # First get a batch ID
            if not self.test_batch_id:
                response = self.session.get(f"{API_BASE}/delivery/batches", timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    batches = data.get('batches', [])
                    if len(batches) > 0:
                        self.test_batch_id = batches[0].get('batch_id')
                    else:
                        print_warning("No batches available to test")
                        return True  # Not an error
            
            if self.test_batch_id:
                response = self.session.get(
                    f"{API_BASE}/delivery/batches/{self.test_batch_id}",
                    timeout=10
                )
                # 404 or 403 is acceptable (batch might not exist or not assigned)
                if response.status_code in [200, 404, 403]:
                    if response.status_code == 200:
                        batch = response.json()
                        print_success(f"Retrieved batch details: {self.test_batch_id[:8]}...")
                        print_info(f"  Total Orders: {batch.get('total_orders', 0)}")
                    else:
                        print_success(f"Correctly returned {response.status_code} (batch not found or not assigned)")
                    return True
                else:
                    print_error(f"Failed with status {response.status_code}: {response.text[:200]}")
                    return False
            else:
                print_warning("No batch ID available for testing")
                return True
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_checkin_no_auth(self):
        """Test 12: POST /api/delivery/checkin - No Auth"""
        print_section("12. POST Checkin - No Auth", 2)
        
        try:
            temp_session = requests.Session()
            response = temp_session.post(
                f"{API_BASE}/delivery/checkin",
                json={"online": True},
                timeout=10
            )
            if response.status_code in [401, 403]:
                print_success(f"Correctly returned {response.status_code} for unauthenticated request")
                return True
            else:
                print_error(f"Expected 401 or 403, got {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_assign_order_no_auth(self):
        """Test 13: PATCH /api/delivery/orders/{order_id}/assign - No Auth"""
        print_section("13. PATCH Assign Order - No Auth", 2)
        
        try:
            temp_session = requests.Session()
            fake_order_id = "test-order-123"
            response = temp_session.patch(
                f"{API_BASE}/delivery/orders/{fake_order_id}/assign",
                json={"delivery_person": "Test Agent", "estimated_delivery_time": "2024-01-01T12:00:00"},
                timeout=10
            )
            if response.status_code in [401, 403]:
                print_success(f"Correctly returned {response.status_code} for unauthenticated request")
                return True
            else:
                print_error(f"Expected 401 or 403, got {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_pickup_order_no_auth(self):
        """Test 14: PATCH /api/delivery/orders/{order_id}/pickup - No Auth"""
        print_section("14. PATCH Pickup Order - No Auth", 2)
        
        try:
            temp_session = requests.Session()
            fake_order_id = "test-order-123"
            response = temp_session.patch(
                f"{API_BASE}/delivery/orders/{fake_order_id}/pickup",
                timeout=10
            )
            if response.status_code in [401, 403]:
                print_success(f"Correctly returned {response.status_code} for unauthenticated request")
                return True
            else:
                print_error(f"Expected 401 or 403, got {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_start_delivery_no_auth(self):
        """Test 15: PATCH /api/delivery/orders/{order_id}/start-delivery - No Auth"""
        print_section("15. PATCH Start Delivery - No Auth", 2)
        
        try:
            temp_session = requests.Session()
            fake_order_id = "test-order-123"
            response = temp_session.patch(
                f"{API_BASE}/delivery/orders/{fake_order_id}/start-delivery",
                timeout=10
            )
            if response.status_code in [401, 403]:
                print_success(f"Correctly returned {response.status_code} for unauthenticated request")
                return True
            else:
                print_error(f"Expected 401 or 403, got {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_mark_delivered_no_auth(self):
        """Test 16: PATCH /api/delivery/orders/{order_id}/deliver - No Auth"""
        print_section("16. PATCH Mark Delivered - No Auth", 2)
        
        try:
            temp_session = requests.Session()
            fake_order_id = "test-order-123"
            response = temp_session.patch(
                f"{API_BASE}/delivery/orders/{fake_order_id}/deliver",
                json={"notes": "Test delivery"},
                timeout=10
            )
            if response.status_code in [401, 403]:
                print_success(f"Correctly returned {response.status_code} for unauthenticated request")
                return True
            else:
                print_error(f"Expected 401 or 403, got {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_arrived_kitchen_no_auth(self):
        """Test 17: POST /api/delivery/batches/{batch_id}/arrived-kitchen - No Auth"""
        print_section("17. POST Arrived at Kitchen - No Auth", 2)
        
        try:
            temp_session = requests.Session()
            fake_batch_id = "test-batch-123"
            response = temp_session.post(
                f"{API_BASE}/delivery/batches/{fake_batch_id}/arrived-kitchen",
                timeout=10
            )
            if response.status_code in [401, 403]:
                print_success(f"Correctly returned {response.status_code} for unauthenticated request")
                return True
            else:
                print_error(f"Expected 401 or 403, got {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_pickup_order_from_batch_no_auth(self):
        """Test 18: POST /api/delivery/batches/{batch_id}/pickup-order/{order_id} - No Auth"""
        print_section("18. POST Pickup Order from Batch - No Auth", 2)
        
        try:
            temp_session = requests.Session()
            fake_batch_id = "test-batch-123"
            fake_order_id = "test-order-123"
            response = temp_session.post(
                f"{API_BASE}/delivery/batches/{fake_batch_id}/pickup-order/{fake_order_id}",
                timeout=10
            )
            if response.status_code in [401, 403]:
                print_success(f"Correctly returned {response.status_code} for unauthenticated request")
                return True
            else:
                print_error(f"Expected 401 or 403, got {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_pickup_complete_no_auth(self):
        """Test 19: POST /api/delivery/batches/{batch_id}/pickup-complete - No Auth"""
        print_section("19. POST Pickup Complete - No Auth", 2)
        
        try:
            temp_session = requests.Session()
            fake_batch_id = "test-batch-123"
            response = temp_session.post(
                f"{API_BASE}/delivery/batches/{fake_batch_id}/pickup-complete",
                timeout=10
            )
            if response.status_code in [401, 403]:
                print_success(f"Correctly returned {response.status_code} for unauthenticated request")
                return True
            else:
                print_error(f"Expected 401 or 403, got {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_mark_delivered_batch_no_auth(self):
        """Test 20: POST /api/delivery/orders/{order_id}/delivered - No Auth"""
        print_section("20. POST Mark Delivered (Batch) - No Auth", 2)
        
        try:
            temp_session = requests.Session()
            fake_order_id = "test-order-123"
            response = temp_session.post(
                f"{API_BASE}/delivery/orders/{fake_order_id}/delivered",
                json={"verification_type": "none"},
                timeout=10
            )
            if response.status_code in [401, 403]:
                print_success(f"Correctly returned {response.status_code} for unauthenticated request")
                return True
            else:
                print_error(f"Expected 401 or 403, got {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_report_issue_no_auth(self):
        """Test 21: POST /api/delivery/orders/{order_id}/report-issue - No Auth"""
        print_section("21. POST Report Issue - No Auth", 2)
        
        try:
            temp_session = requests.Session()
            fake_order_id = "test-order-123"
            response = temp_session.post(
                f"{API_BASE}/delivery/orders/{fake_order_id}/report-issue",
                json={"reason": "CUSTOMER_UNREACHABLE", "note": "Test issue"},
                timeout=10
            )
            if response.status_code in [401, 403]:
                print_success(f"Correctly returned {response.status_code} for unauthenticated request")
                return True
            else:
                print_error(f"Expected 401 or 403, got {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_complete_batch_no_auth(self):
        """Test 22: POST /api/delivery/batches/{batch_id}/complete - No Auth"""
        print_section("22. POST Complete Batch - No Auth", 2)
        
        try:
            temp_session = requests.Session()
            fake_batch_id = "test-batch-123"
            response = temp_session.post(
                f"{API_BASE}/delivery/batches/{fake_batch_id}/complete",
                timeout=10
            )
            if response.status_code in [401, 403]:
                print_success(f"Correctly returned {response.status_code} for unauthenticated request")
                return True
            else:
                print_error(f"Expected 401 or 403, got {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_order_not_found(self):
        """Test 23: GET /api/delivery/orders/{order_id}/tracking - Not Found"""
        print_section("23. GET Order Tracking - Not Found", 2)
        
        try:
            fake_order_id = "non-existent-order-12345"
            response = self.session.get(
                f"{API_BASE}/delivery/orders/{fake_order_id}/tracking",
                timeout=10
            )
            # 404 or 403 is acceptable (order might not exist or auth required)
            if response.status_code in [404, 403]:
                print_success(f"Correctly returned {response.status_code} for non-existent order")
                return True
            else:
                print_error(f"Expected 404 or 403, got {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_batch_not_found(self):
        """Test 24: GET /api/delivery/batches/{batch_id} - Not Found"""
        print_section("24. GET Batch Details - Not Found", 2)
        
        try:
            fake_batch_id = "non-existent-batch-12345"
            response = self.session.get(
                f"{API_BASE}/delivery/batches/{fake_batch_id}",
                timeout=10
            )
            # 404 or 403 is acceptable (batch might not exist or auth required)
            if response.status_code in [404, 403]:
                print_success(f"Correctly returned {response.status_code} for non-existent batch")
                return True
            else:
                print_error(f"Expected 404 or 403, got {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def cleanup(self):
        """Cleanup created test data"""
        print_section("Cleanup", 2)
        # No cleanup needed for read-only tests
        print_info("No cleanup needed (read-only tests)")
    
    def print_summary(self):
        """Print test summary"""
        print_section("TEST SUMMARY", 1)
        
        total = self.results["passed"] + self.results["failed"]
        pass_rate = (self.results["passed"] / total * 100) if total > 0 else 0
        
        print(f"\nTotal Tests: {total}")
        print(f"Passed: {self.results['passed']}")
        print(f"Failed: {self.results['failed']}")
        print(f"Warnings: {self.results['warnings']}")
        print(f"\nPass Rate: {pass_rate:.1f}%")
        
        print("\nTest Details:")
        for test in self.results["tests"]:
            status = test["status"]
            name = test["name"]
            if status == "PASS":
                print(f"  {Colors.GREEN}PASS{Colors.RESET}: {name}")
            elif status == "FAIL":
                print(f"  {Colors.RED}FAIL{Colors.RESET}: {name}")
            else:
                error = test.get("error", "Unknown error")
                print(f"  {Colors.RED}ERROR{Colors.RESET}: {name} - {error}")
        
        print(f"\nTest User: {self.username}")
        print(f"Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    def run_all_tests(self):
        """Run all tests"""
        print_section("DELIVERY API END-TO-END TEST", 1)
        print_info(f"Testing against: {BASE_URL}")
        print_info(f"Test User: {self.username}")
        print_info(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Run tests
        self.test("Server Health", self.check_server)
        auth_success = self.test("Authentication", self.register_and_login)
        
        if not auth_success:
            print_warning("Authentication failed. Will skip authenticated tests but continue with public endpoint tests.")
        
        # GET tests (auth required, but will test error handling if auth fails)
        if auth_success:
            self.test("GET All Delivery Orders", self.test_get_delivery_orders)
            self.test("GET Delivery Orders with Filters", self.test_get_delivery_orders_with_filters)
            self.test("GET Assigned Orders", self.test_get_assigned_orders)
            self.test("GET In-Transit Orders", self.test_get_in_transit_orders)
            self.test("GET Delivered Orders", self.test_get_delivered_orders)
            self.test("GET Delivery Stats", self.test_get_delivery_stats)
            self.test("GET Order Tracking", self.test_get_order_tracking)
            self.test("GET Delivery Batches", self.test_get_delivery_batches)
            self.test("GET Batch Details", self.test_get_batch_details)
        
        # Error handling tests (work without auth)
        self.test("GET Order Tracking - Not Found", self.test_order_not_found)
        self.test("GET Batch Details - Not Found", self.test_batch_not_found)
        self.test("POST Checkin - No Auth", self.test_checkin_no_auth)
        self.test("PATCH Assign Order - No Auth", self.test_assign_order_no_auth)
        self.test("PATCH Pickup Order - No Auth", self.test_pickup_order_no_auth)
        self.test("PATCH Start Delivery - No Auth", self.test_start_delivery_no_auth)
        self.test("PATCH Mark Delivered - No Auth", self.test_mark_delivered_no_auth)
        self.test("POST Arrived at Kitchen - No Auth", self.test_arrived_kitchen_no_auth)
        self.test("POST Pickup Order from Batch - No Auth", self.test_pickup_order_from_batch_no_auth)
        self.test("POST Pickup Complete - No Auth", self.test_pickup_complete_no_auth)
        self.test("POST Mark Delivered (Batch) - No Auth", self.test_mark_delivered_batch_no_auth)
        self.test("POST Report Issue - No Auth", self.test_report_issue_no_auth)
        self.test("POST Complete Batch - No Auth", self.test_complete_batch_no_auth)
        
        # Cleanup
        self.cleanup()
        
        # Print summary
        self.print_summary()

if __name__ == "__main__":
    tester = DeliveryAPITester()
    tester.run_all_tests()

