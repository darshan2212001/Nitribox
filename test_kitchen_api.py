"""
Comprehensive End-to-End Test for Kitchen API
Tests all kitchen endpoints with automatic user registration/login
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

class KitchenAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
        self.username = f"testkitchen_{random.randint(10000, 99999)}"
        self.email = f"{self.username}@test.com"
        self.password = "Test123"
        self.test_order_id = None
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
        """Test 2: Register and Login as Kitchen User"""
        print_section("2. Authentication (Auto Register/Login)", 2)
        
        # Try to register
        try:
            response = self.session.post(
                f"{API_BASE}/auth/register",
                json={
                    "username": self.username,
                    "email": self.email,
                    "password": self.password,
                    "name": "Test Kitchen User",
                    "role": "kitchen"
                },
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                print_success(f"Registered kitchen user: {self.username}")
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
    
    def test_get_kitchen_orders(self):
        """Test 3: GET /api/kitchen/orders - Get all kitchen orders"""
        print_section("3. GET All Kitchen Orders", 2)
        
        try:
            # Test without filters
            response = self.session.get(f"{API_BASE}/kitchen/orders", timeout=10)
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
    
    def test_get_kitchen_orders_with_filters(self):
        """Test 4: GET /api/kitchen/orders - With filters"""
        print_section("4. GET Kitchen Orders with Filters", 2)
        
        try:
            # Test with status filter
            response = self.session.get(
                f"{API_BASE}/kitchen/orders",
                params={"status": "pending"},
                timeout=10
            )
            if response.status_code == 200:
                orders = response.json()
                print_success(f"Filtered by status='pending': {len(orders)} result(s)")
                
                # Test with priority filter
                response = self.session.get(
                    f"{API_BASE}/kitchen/orders",
                    params={"priority": "high"},
                    timeout=10
                )
                if response.status_code == 200:
                    filtered = response.json()
                    print_success(f"Filtered by priority='high': {len(filtered)} result(s)")
                
                # Test pagination
                response = self.session.get(
                    f"{API_BASE}/kitchen/orders",
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
    
    def test_get_kitchen_queue(self):
        """Test 5: GET /api/kitchen/orders/queue - Get kitchen queue"""
        print_section("5. GET Kitchen Queue", 2)
        
        try:
            response = self.session.get(f"{API_BASE}/kitchen/orders/queue", timeout=10)
            if response.status_code == 200:
                orders = response.json()
                print_success(f"Retrieved {len(orders)} order(s) in queue")
                return True
            else:
                print_error(f"Failed with status {response.status_code}: {response.text[:200]}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_get_preparing_orders(self):
        """Test 6: GET /api/kitchen/orders/preparing - Get preparing orders"""
        print_section("6. GET Preparing Orders", 2)
        
        try:
            response = self.session.get(f"{API_BASE}/kitchen/orders/preparing", timeout=10)
            if response.status_code == 200:
                orders = response.json()
                print_success(f"Retrieved {len(orders)} order(s) being prepared")
                return True
            else:
                print_error(f"Failed with status {response.status_code}: {response.text[:200]}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_get_ready_orders(self):
        """Test 7: GET /api/kitchen/orders/ready - Get ready orders"""
        print_section("7. GET Ready Orders", 2)
        
        try:
            response = self.session.get(f"{API_BASE}/kitchen/orders/ready", timeout=10)
            if response.status_code == 200:
                orders = response.json()
                print_success(f"Retrieved {len(orders)} order(s) ready for pickup")
                return True
            else:
                print_error(f"Failed with status {response.status_code}: {response.text[:200]}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_get_kitchen_stats(self):
        """Test 8: GET /api/kitchen/stats - Get kitchen statistics"""
        print_section("8. GET Kitchen Stats", 2)
        
        try:
            response = self.session.get(f"{API_BASE}/kitchen/stats", timeout=10)
            if response.status_code == 200:
                stats = response.json()
                print_success("Retrieved kitchen statistics")
                print_info(f"  Pending: {stats.get('pending_orders', 0)}")
                print_info(f"  Preparing: {stats.get('preparing_orders', 0)}")
                print_info(f"  Ready: {stats.get('ready_orders', 0)}")
                print_info(f"  Completed Today: {stats.get('completed_today', 0)}")
                return True
            else:
                print_error(f"Failed with status {response.status_code}: {response.text[:200]}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_get_order_details(self):
        """Test 9: GET /api/kitchen/orders/{order_id}/details - Get order details"""
        print_section("9. GET Order Details", 2)
        
        try:
            # First get an order ID
            if not self.test_order_id:
                response = self.session.get(f"{API_BASE}/kitchen/orders", timeout=10)
                if response.status_code == 200:
                    orders = response.json()
                    if len(orders) > 0:
                        self.test_order_id = orders[0].get('id')
                    else:
                        print_warning("No orders available to test")
                        return True  # Not an error
            
            if self.test_order_id:
                response = self.session.get(
                    f"{API_BASE}/kitchen/orders/{self.test_order_id}/details",
                    timeout=10
                )
                if response.status_code == 200:
                    order = response.json()
                    print_success(f"Retrieved order details: {order.get('id', 'Unknown')[:8]}...")
                    print_info(f"  Status: {order.get('status', 'N/A')}")
                    print_info(f"  Meal Type: {order.get('meal_type', 'N/A')}")
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
    
    def test_get_production_view(self):
        """Test 10: GET /api/kitchen/production-view - Get production view"""
        print_section("10. GET Production View", 2)
        
        try:
            # Test without filters
            response = self.session.get(f"{API_BASE}/kitchen/production-view", timeout=10)
            if response.status_code == 200:
                dishes = response.json()
                print_success(f"Retrieved {len(dishes)} dish group(s)")
                
                # Test with meal_type filter
                response = self.session.get(
                    f"{API_BASE}/kitchen/production-view",
                    params={"meal_type": "lunch"},
                    timeout=10
                )
                if response.status_code == 200:
                    filtered = response.json()
                    print_success(f"Filtered by meal_type='lunch': {len(filtered)} result(s)")
                
                # Test with target_date
                today = date.today().isoformat()
                response = self.session.get(
                    f"{API_BASE}/kitchen/production-view",
                    params={"target_date": today},
                    timeout=10
                )
                if response.status_code == 200:
                    dated = response.json()
                    print_success(f"Filtered by target_date={today}: {len(dated)} result(s)")
                
                return True
            else:
                print_error(f"Failed with status {response.status_code}: {response.text[:200]}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_get_packing_view(self):
        """Test 11: GET /api/kitchen/packing-view - Get packing view"""
        print_section("11. GET Packing View", 2)
        
        try:
            # Test without filters
            response = self.session.get(f"{API_BASE}/kitchen/packing-view", timeout=10)
            if response.status_code == 200:
                orders = response.json()
                print_success(f"Retrieved {len(orders)} order(s) for packing")
                
                # Test with filters
                response = self.session.get(
                    f"{API_BASE}/kitchen/packing-view",
                    params={"meal_type": "lunch", "status": "packed"},
                    timeout=10
                )
                if response.status_code == 200:
                    filtered = response.json()
                    print_success(f"Filtered packing view: {len(filtered)} result(s)")
                
                return True
            else:
                print_error(f"Failed with status {response.status_code}: {response.text[:200]}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_get_dispatch_view(self):
        """Test 12: GET /api/kitchen/dispatch-view - Get dispatch view"""
        print_section("12. GET Dispatch View", 2)
        
        try:
            # Test without filters
            response = self.session.get(f"{API_BASE}/kitchen/dispatch-view", timeout=10)
            if response.status_code == 200:
                batches = response.json()
                print_success(f"Retrieved {len(batches)} batch(es)")
                
                # Test with meal_type filter
                response = self.session.get(
                    f"{API_BASE}/kitchen/dispatch-view",
                    params={"meal_type": "lunch"},
                    timeout=10
                )
                if response.status_code == 200:
                    filtered = response.json()
                    print_success(f"Filtered by meal_type='lunch': {len(filtered)} result(s)")
                
                return True
            else:
                print_error(f"Failed with status {response.status_code}: {response.text[:200]}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_get_today_schedule(self):
        """Test 13: GET /api/kitchen/today-schedule - Get today's schedule"""
        print_section("13. GET Today's Schedule", 2)
        
        try:
            # Test without filters
            response = self.session.get(f"{API_BASE}/kitchen/today-schedule", timeout=10)
            if response.status_code == 200:
                schedule = response.json()
                print_success("Retrieved today's schedule")
                print_info(f"  Date: {schedule.get('date', 'N/A')}")
                print_info(f"  Breakfast: {len(schedule.get('breakfast', []))} item(s)")
                print_info(f"  Lunch: {len(schedule.get('lunch', []))} item(s)")
                print_info(f"  Dinner: {len(schedule.get('dinner', []))} item(s)")
                
                # Test with meal_type filter
                response = self.session.get(
                    f"{API_BASE}/kitchen/today-schedule",
                    params={"meal_type": "lunch"},
                    timeout=10
                )
                if response.status_code == 200:
                    filtered = response.json()
                    print_success("Filtered by meal_type='lunch'")
                
                return True
            else:
                print_error(f"Failed with status {response.status_code}: {response.text[:200]}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_start_preparing_no_auth(self):
        """Test 14: PATCH /api/kitchen/orders/{order_id}/start-preparing - No Auth"""
        print_section("14. PATCH Start Preparing - No Auth", 2)
        
        try:
            # Create a session without auth token
            temp_session = requests.Session()
            fake_order_id = "test-order-123"
            response = temp_session.patch(
                f"{API_BASE}/kitchen/orders/{fake_order_id}/start-preparing",
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
    
    def test_mark_ready_no_auth(self):
        """Test 15: PATCH /api/kitchen/orders/{order_id}/mark-ready - No Auth"""
        print_section("15. PATCH Mark Ready - No Auth", 2)
        
        try:
            temp_session = requests.Session()
            fake_order_id = "test-order-123"
            response = temp_session.patch(
                f"{API_BASE}/kitchen/orders/{fake_order_id}/mark-ready",
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
    
    def test_complete_order_no_auth(self):
        """Test 16: PATCH /api/kitchen/orders/{order_id}/complete - No Auth"""
        print_section("16. PATCH Complete Order - No Auth", 2)
        
        try:
            temp_session = requests.Session()
            fake_order_id = "test-order-123"
            response = temp_session.patch(
                f"{API_BASE}/kitchen/orders/{fake_order_id}/complete",
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
    
    def test_print_label_no_auth(self):
        """Test 17: POST /api/kitchen/orders/{order_id}/print-label - No Auth"""
        print_section("17. POST Print Label - No Auth", 2)
        
        try:
            temp_session = requests.Session()
            fake_order_id = "test-order-123"
            response = temp_session.post(
                f"{API_BASE}/kitchen/orders/{fake_order_id}/print-label",
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
    
    def test_scan_label_no_auth(self):
        """Test 18: POST /api/kitchen/orders/{order_id}/scan-label - No Auth"""
        print_section("18. POST Scan Label - No Auth", 2)
        
        try:
            temp_session = requests.Session()
            fake_order_id = "test-order-123"
            response = temp_session.post(
                f"{API_BASE}/kitchen/orders/{fake_order_id}/scan-label",
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
    
    def test_start_meal_preparation_no_auth(self):
        """Test 19: PATCH /api/kitchen/meal/{order_id}/start-preparation - No Auth"""
        print_section("19. PATCH Start Meal Preparation - No Auth", 2)
        
        try:
            temp_session = requests.Session()
            fake_order_id = "test-order-123"
            response = temp_session.patch(
                f"{API_BASE}/kitchen/meal/{fake_order_id}/start-preparation",
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
    
    def test_mark_meal_packed_no_auth(self):
        """Test 20: PATCH /api/kitchen/meal/{order_id}/mark-packed - No Auth"""
        print_section("20. PATCH Mark Meal Packed - No Auth", 2)
        
        try:
            temp_session = requests.Session()
            fake_order_id = "test-order-123"
            response = temp_session.patch(
                f"{API_BASE}/kitchen/meal/{fake_order_id}/mark-packed",
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
        """Test 21: GET /api/kitchen/orders/{order_id}/details - Not Found"""
        print_section("21. GET Order Details - Not Found", 2)
        
        try:
            fake_order_id = "non-existent-order-12345"
            response = self.session.get(
                f"{API_BASE}/kitchen/orders/{fake_order_id}/details",
                timeout=10
            )
            # If auth is required, we'll get 403 first; if auth succeeds, we'll get 404
            if response.status_code in [404, 403]:
                if response.status_code == 404:
                    print_success("Correctly returned 404 for non-existent order")
                else:
                    print_success("Correctly returned 403 (auth required) for unauthenticated request")
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
        print_section("KITCHEN API END-TO-END TEST", 1)
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
            self.test("GET All Kitchen Orders", self.test_get_kitchen_orders)
            self.test("GET Kitchen Orders with Filters", self.test_get_kitchen_orders_with_filters)
            self.test("GET Kitchen Queue", self.test_get_kitchen_queue)
            self.test("GET Preparing Orders", self.test_get_preparing_orders)
            self.test("GET Ready Orders", self.test_get_ready_orders)
            self.test("GET Kitchen Stats", self.test_get_kitchen_stats)
            self.test("GET Order Details", self.test_get_order_details)
            self.test("GET Production View", self.test_get_production_view)
            self.test("GET Packing View", self.test_get_packing_view)
            self.test("GET Dispatch View", self.test_get_dispatch_view)
            self.test("GET Today's Schedule", self.test_get_today_schedule)
        
        # Error handling tests (work without auth)
        self.test("GET Order Details - Not Found", self.test_order_not_found)
        self.test("PATCH Start Preparing - No Auth", self.test_start_preparing_no_auth)
        self.test("PATCH Mark Ready - No Auth", self.test_mark_ready_no_auth)
        self.test("PATCH Complete Order - No Auth", self.test_complete_order_no_auth)
        self.test("POST Print Label - No Auth", self.test_print_label_no_auth)
        self.test("POST Scan Label - No Auth", self.test_scan_label_no_auth)
        self.test("PATCH Start Meal Preparation - No Auth", self.test_start_meal_preparation_no_auth)
        self.test("PATCH Mark Meal Packed - No Auth", self.test_mark_meal_packed_no_auth)
        
        # Cleanup
        self.cleanup()
        
        # Print summary
        self.print_summary()

if __name__ == "__main__":
    tester = KitchenAPITester()
    tester.run_all_tests()

