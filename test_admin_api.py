"""
Comprehensive End-to-End Test for Admin API
Tests all admin endpoints with automatic user registration/login
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

class AdminAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
        self.username = f"testadmin_{random.randint(10000, 99999)}"
        self.email = f"{self.username}@test.com"
        self.password = "Test123"
        self.test_user_id = None
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
        """Test 2: Register and Login as Admin User"""
        print_section("2. Authentication (Auto Register/Login)", 2)
        
        # Try to register
        try:
            response = self.session.post(
                f"{API_BASE}/auth/register",
                json={
                    "username": self.username,
                    "email": self.email,
                    "password": self.password,
                    "name": "Test Admin User",
                    "role": "admin"
                },
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                print_success(f"Registered admin user: {self.username}")
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
                            print_info(f"Role: {user_info.get('role', 'N/A')}")
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
    
    def test_get_admin_dashboard(self):
        """Test 3: GET /api/admin/dashboard - Get admin dashboard"""
        print_section("3. GET Admin Dashboard", 2)
        
        try:
            response = self.session.get(f"{API_BASE}/admin/dashboard", timeout=10)
            if response.status_code == 200:
                dashboard = response.json()
                print_success("Retrieved admin dashboard")
                stats = dashboard.get('statistics', {})
                print_info(f"  Total Users: {stats.get('total_users', 0)}")
                print_info(f"  Total Orders: {stats.get('total_orders', 0)}")
                print_info(f"  Total Meal Plans: {stats.get('total_meal_plans', 0)}")
                return True
            else:
                print_error(f"Failed with status {response.status_code}: {response.text[:200]}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_get_all_users(self):
        """Test 4: GET /api/admin/users - Get all users"""
        print_section("4. GET All Users", 2)
        
        try:
            # Test without filters
            response = self.session.get(f"{API_BASE}/admin/users", timeout=10)
            if response.status_code == 200:
                users = response.json()
                if isinstance(users, list):
                    print_success(f"Retrieved {len(users)} user(s)")
                    if len(users) > 0:
                        user = users[0]
                        self.test_user_id = user.get('id')
                        print_info(f"  Sample User ID: {user.get('id', 'Unknown')[:8]}...")
                        print_info(f"  Name: {user.get('name', 'N/A')}")
                        print_info(f"  Role: {user.get('role', 'N/A')}")
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
    
    def test_get_all_users_with_filters(self):
        """Test 5: GET /api/admin/users - With filters"""
        print_section("5. GET All Users with Filters", 2)
        
        try:
            # Test with role filter
            response = self.session.get(
                f"{API_BASE}/admin/users",
                params={"role": "client"},
                timeout=10
            )
            if response.status_code == 200:
                users = response.json()
                print_success(f"Filtered by role='client': {len(users)} result(s)")
                
                # Test pagination
                response = self.session.get(
                    f"{API_BASE}/admin/users",
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
    
    def test_get_user_details(self):
        """Test 6: GET /api/admin/users/{user_id} - Get user details"""
        print_section("6. GET User Details", 2)
        
        try:
            # First get a user ID
            if not self.test_user_id:
                response = self.session.get(f"{API_BASE}/admin/users", timeout=10)
                if response.status_code == 200:
                    users = response.json()
                    if len(users) > 0:
                        self.test_user_id = users[0].get('id')
                    else:
                        print_warning("No users available to test")
                        return True  # Not an error
            
            if self.test_user_id:
                response = self.session.get(
                    f"{API_BASE}/admin/users/{self.test_user_id}",
                    timeout=10
                )
                if response.status_code == 200:
                    user = response.json()
                    print_success(f"Retrieved user details: {user.get('id', 'Unknown')[:8]}...")
                    print_info(f"  Name: {user.get('name', 'N/A')}")
                    print_info(f"  Email: {user.get('email', 'N/A')}")
                    return True
                else:
                    print_error(f"Failed with status {response.status_code}: {response.text[:200]}")
                    return False
            else:
                print_warning("No user ID available for testing")
                return True
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_get_all_orders(self):
        """Test 7: GET /api/admin/orders - Get all orders"""
        print_section("7. GET All Orders", 2)
        
        try:
            # Test without filters
            response = self.session.get(f"{API_BASE}/admin/orders", timeout=10)
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
    
    def test_get_all_orders_with_filters(self):
        """Test 8: GET /api/admin/orders - With filters"""
        print_section("8. GET All Orders with Filters", 2)
        
        try:
            # Test with status filter
            response = self.session.get(
                f"{API_BASE}/admin/orders",
                params={"status": "pending"},
                timeout=10
            )
            if response.status_code == 200:
                orders = response.json()
                print_success(f"Filtered by status='pending': {len(orders)} result(s)")
                
                # Test pagination
                response = self.session.get(
                    f"{API_BASE}/admin/orders",
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
    
    def test_get_order_details(self):
        """Test 9: GET /api/admin/orders/{order_id} - Get order details"""
        print_section("9. GET Order Details", 2)
        
        try:
            # First get an order ID
            if not self.test_order_id:
                response = self.session.get(f"{API_BASE}/admin/orders", timeout=10)
                if response.status_code == 200:
                    orders = response.json()
                    if len(orders) > 0:
                        self.test_order_id = orders[0].get('id')
                    else:
                        print_warning("No orders available to test")
                        return True  # Not an error
            
            if self.test_order_id:
                response = self.session.get(
                    f"{API_BASE}/admin/orders/{self.test_order_id}",
                    timeout=10
                )
                if response.status_code == 200:
                    order = response.json()
                    print_success(f"Retrieved order details: {order.get('id', 'Unknown')[:8]}...")
                    print_info(f"  Status: {order.get('status', 'N/A')}")
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
    
    def test_get_system_health(self):
        """Test 10: GET /api/admin/system/health - Get system health"""
        print_section("10. GET System Health", 2)
        
        try:
            response = self.session.get(f"{API_BASE}/admin/system/health", timeout=10)
            if response.status_code == 200:
                health = response.json()
                print_success("Retrieved system health")
                print_info(f"  Status: {health.get('status', 'N/A')}")
                print_info(f"  Database: {health.get('database', 'N/A')}")
                return True
            else:
                print_error(f"Failed with status {response.status_code}: {response.text[:200]}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_get_system_alerts(self):
        """Test 11: GET /api/admin/alerts - Get system alerts"""
        print_section("11. GET System Alerts", 2)
        
        try:
            response = self.session.get(f"{API_BASE}/admin/alerts", timeout=10)
            if response.status_code == 200:
                alerts_data = response.json()
                alerts = alerts_data.get('alerts', [])
                print_success(f"Retrieved {len(alerts)} alert(s)")
                return True
            else:
                print_error(f"Failed with status {response.status_code}: {response.text[:200]}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_get_live_dashboard(self):
        """Test 12: GET /api/admin/dashboard/live - Get live operations dashboard"""
        print_section("12. GET Live Operations Dashboard", 2)
        
        try:
            response = self.session.get(f"{API_BASE}/admin/dashboard/live", timeout=10)
            if response.status_code == 200:
                dashboard = response.json()
                print_success("Retrieved live operations dashboard")
                metrics = dashboard.get('live_metrics', {})
                print_info(f"  Meals Prepared: {metrics.get('meals_prepared', 0)}")
                print_info(f"  Meals Packed: {metrics.get('meals_packed', 0)}")
                print_info(f"  Active Subscriptions: {metrics.get('active_subscriptions', 0)}")
                return True
            else:
                print_error(f"Failed with status {response.status_code}: {response.text[:200]}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_get_kitchen_performance(self):
        """Test 13: GET /api/admin/kitchen/performance - Get kitchen performance"""
        print_section("13. GET Kitchen Performance", 2)
        
        try:
            response = self.session.get(f"{API_BASE}/admin/kitchen/performance", timeout=10)
            if response.status_code == 200:
                performance = response.json()
                print_success("Retrieved kitchen performance metrics")
                print_info(f"  Avg Prep Time: {performance.get('avg_prep_time_minutes', 0)} minutes")
                print_info(f"  Completion Rate: {performance.get('completion_rate_percent', 0)}%")
                return True
            else:
                print_error(f"Failed with status {response.status_code}: {response.text[:200]}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_get_delivery_performance(self):
        """Test 14: GET /api/admin/delivery/performance - Get delivery performance"""
        print_section("14. GET Delivery Performance", 2)
        
        try:
            response = self.session.get(f"{API_BASE}/admin/delivery/performance", timeout=10)
            if response.status_code == 200:
                performance = response.json()
                agents = performance.get('delivery_agents', [])
                print_success(f"Retrieved delivery performance for {len(agents)} agent(s)")
                return True
            else:
                print_error(f"Failed with status {response.status_code}: {response.text[:200]}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_get_all_subscriptions(self):
        """Test 15: GET /api/admin/subscriptions - Get all subscriptions"""
        print_section("15. GET All Subscriptions", 2)
        
        try:
            # Test without filters
            response = self.session.get(f"{API_BASE}/admin/subscriptions", timeout=10)
            if response.status_code == 200:
                subscriptions = response.json()
                print_success(f"Retrieved {len(subscriptions)} subscription(s)")
                
                # Test with status filter
                response = self.session.get(
                    f"{API_BASE}/admin/subscriptions",
                    params={"status": "active"},
                    timeout=10
                )
                if response.status_code == 200:
                    filtered = response.json()
                    print_success(f"Filtered by status='active': {len(filtered)} result(s)")
                
                return True
            else:
                print_error(f"Failed with status {response.status_code}: {response.text[:200]}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_dashboard_no_auth(self):
        """Test 16: GET /api/admin/dashboard - No Auth"""
        print_section("16. GET Admin Dashboard - No Auth", 2)
        
        try:
            temp_session = requests.Session()
            response = temp_session.get(f"{API_BASE}/admin/dashboard", timeout=10)
            if response.status_code in [401, 403]:
                print_success(f"Correctly returned {response.status_code} for unauthenticated request")
                return True
            else:
                print_error(f"Expected 401 or 403, got {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_get_users_no_auth(self):
        """Test 17: GET /api/admin/users - No Auth"""
        print_section("17. GET All Users - No Auth", 2)
        
        try:
            temp_session = requests.Session()
            response = temp_session.get(f"{API_BASE}/admin/users", timeout=10)
            if response.status_code in [401, 403]:
                print_success(f"Correctly returned {response.status_code} for unauthenticated request")
                return True
            else:
                print_error(f"Expected 401 or 403, got {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_update_user_no_auth(self):
        """Test 18: PATCH /api/admin/users/{user_id} - No Auth"""
        print_section("18. PATCH Update User - No Auth", 2)
        
        try:
            temp_session = requests.Session()
            fake_user_id = "test-user-123"
            response = temp_session.patch(
                f"{API_BASE}/admin/users/{fake_user_id}",
                json={"name": "Updated Name"},
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
    
    def test_delete_user_no_auth(self):
        """Test 19: DELETE /api/admin/users/{user_id} - No Auth"""
        print_section("19. DELETE User - No Auth", 2)
        
        try:
            temp_session = requests.Session()
            fake_user_id = "test-user-123"
            response = temp_session.delete(f"{API_BASE}/admin/users/{fake_user_id}", timeout=10)
            if response.status_code in [401, 403]:
                print_success(f"Correctly returned {response.status_code} for unauthenticated request")
                return True
            else:
                print_error(f"Expected 401 or 403, got {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_get_orders_no_auth(self):
        """Test 20: GET /api/admin/orders - No Auth"""
        print_section("20. GET All Orders - No Auth", 2)
        
        try:
            temp_session = requests.Session()
            response = temp_session.get(f"{API_BASE}/admin/orders", timeout=10)
            if response.status_code in [401, 403]:
                print_success(f"Correctly returned {response.status_code} for unauthenticated request")
                return True
            else:
                print_error(f"Expected 401 or 403, got {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_update_order_no_auth(self):
        """Test 21: PATCH /api/admin/orders/{order_id} - No Auth"""
        print_section("21. PATCH Update Order - No Auth", 2)
        
        try:
            temp_session = requests.Session()
            fake_order_id = "test-order-123"
            response = temp_session.patch(
                f"{API_BASE}/admin/orders/{fake_order_id}",
                json={"status": "delivered"},
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
    
    def test_delete_order_no_auth(self):
        """Test 22: DELETE /api/admin/orders/{order_id} - No Auth"""
        print_section("22. DELETE Order - No Auth", 2)
        
        try:
            temp_session = requests.Session()
            fake_order_id = "test-order-123"
            response = temp_session.delete(f"{API_BASE}/admin/orders/{fake_order_id}", timeout=10)
            if response.status_code in [401, 403]:
                print_success(f"Correctly returned {response.status_code} for unauthenticated request")
                return True
            else:
                print_error(f"Expected 401 or 403, got {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_broadcast_no_auth(self):
        """Test 23: POST /api/admin/broadcast - No Auth"""
        print_section("23. POST Broadcast Announcement - No Auth", 2)
        
        try:
            temp_session = requests.Session()
            response = temp_session.post(
                f"{API_BASE}/admin/broadcast",
                json={"message": "Test announcement", "target_audience": "all"},
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
    
    def test_user_not_found(self):
        """Test 24: GET /api/admin/users/{user_id} - Not Found"""
        print_section("24. GET User Details - Not Found", 2)
        
        try:
            fake_user_id = "non-existent-user-12345"
            response = self.session.get(
                f"{API_BASE}/admin/users/{fake_user_id}",
                timeout=10
            )
            # 404 or 403 is acceptable (user might not exist or auth required)
            if response.status_code in [404, 403]:
                print_success(f"Correctly returned {response.status_code} for non-existent user")
                return True
            else:
                print_error(f"Expected 404 or 403, got {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_order_not_found(self):
        """Test 25: GET /api/admin/orders/{order_id} - Not Found"""
        print_section("25. GET Order Details - Not Found", 2)
        
        try:
            fake_order_id = "non-existent-order-12345"
            response = self.session.get(
                f"{API_BASE}/admin/orders/{fake_order_id}",
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
        print_section("ADMIN API END-TO-END TEST", 1)
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
            self.test("GET Admin Dashboard", self.test_get_admin_dashboard)
            self.test("GET All Users", self.test_get_all_users)
            self.test("GET All Users with Filters", self.test_get_all_users_with_filters)
            self.test("GET User Details", self.test_get_user_details)
            self.test("GET All Orders", self.test_get_all_orders)
            self.test("GET All Orders with Filters", self.test_get_all_orders_with_filters)
            self.test("GET Order Details", self.test_get_order_details)
            self.test("GET System Health", self.test_get_system_health)
            self.test("GET System Alerts", self.test_get_system_alerts)
            self.test("GET Live Operations Dashboard", self.test_get_live_dashboard)
            self.test("GET Kitchen Performance", self.test_get_kitchen_performance)
            self.test("GET Delivery Performance", self.test_get_delivery_performance)
            self.test("GET All Subscriptions", self.test_get_all_subscriptions)
        
        # Error handling tests (work without auth)
        self.test("GET User Details - Not Found", self.test_user_not_found)
        self.test("GET Order Details - Not Found", self.test_order_not_found)
        self.test("GET Admin Dashboard - No Auth", self.test_dashboard_no_auth)
        self.test("GET All Users - No Auth", self.test_get_users_no_auth)
        self.test("PATCH Update User - No Auth", self.test_update_user_no_auth)
        self.test("DELETE User - No Auth", self.test_delete_user_no_auth)
        self.test("GET All Orders - No Auth", self.test_get_orders_no_auth)
        self.test("PATCH Update Order - No Auth", self.test_update_order_no_auth)
        self.test("DELETE Order - No Auth", self.test_delete_order_no_auth)
        self.test("POST Broadcast - No Auth", self.test_broadcast_no_auth)
        
        # Cleanup
        self.cleanup()
        
        # Print summary
        self.print_summary()

if __name__ == "__main__":
    tester = AdminAPITester()
    tester.run_all_tests()

