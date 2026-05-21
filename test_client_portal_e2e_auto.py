"""
Comprehensive End-to-End Test for Client Portal (Auto Authentication)
Tests all features with automatic user registration/login
"""

import requests
import json
import sys
import os
from datetime import datetime, timedelta
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

class ClientPortalTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
        self.username = f"testclient_{random.randint(10000, 99999)}"
        self.email = f"{self.username}@test.com"
        self.password = "Test123"
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
        """Test 2: Register and Login"""
        print_section("2. Authentication (Auto Register/Login)", 2)
        
        # Try to register
        try:
            response = self.session.post(
                f"{API_BASE}/auth/register",
                json={
                    "username": self.username,
                    "email": self.email,
                    "password": self.password,
                    "name": "Test Client User",
                    "role": "client"
                },
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                print_success(f"Registered user: {self.username}")
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
                    
                    # Get user info
                    user_info = data.get("user", {})
                    self.user_id = user_info.get("id")
                    print_success(f"Logged in as: {user_info.get('name', self.username)}")
                    print_info(f"User ID: {self.user_id}")
                    print_info(f"Email: {user_info.get('email', self.email)}")
                    return True
                else:
                    print_error("No access token in response")
                    return False
            else:
                print_error(f"Login failed: {response.status_code} - {response.text[:200]}")
                return False
        except Exception as e:
            print_error(f"Login failed: {e}")
            return False
    
    def test_meal_plans(self):
        """Test 3: Meal Plans"""
        print_section("3. Meal Plans", 2)
        try:
            response = self.session.get(f"{API_BASE}/meal-plans", params={"is_active": True}, timeout=10)
            if response.status_code == 200:
                plans = response.json()
                if isinstance(plans, list) and len(plans) > 0:
                    print_success(f"Found {len(plans)} meal plan(s)")
                    for plan in plans[:3]:
                        print_info(f"  - {plan.get('title', 'Unknown')} (₹{plan.get('current_price', 0)})")
                    return True
                else:
                    print_warning("No meal plans found")
                    return False
            else:
                print_error(f"Failed to get meal plans: {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_nutritionists(self):
        """Test 4: Nutritionists"""
        print_section("4. Nutritionists", 2)
        try:
            response = self.session.get(f"{API_BASE}/nutritionists", timeout=10)
            if response.status_code == 200:
                nutritionists = response.json()
                if isinstance(nutritionists, list):
                    print_success(f"Found {len(nutritionists)} nutritionist(s)")
                    for nut in nutritionists[:3]:
                        print_info(f"  - {nut.get('name', 'Unknown')} ({nut.get('specialization', 'N/A')})")
                    return True
                else:
                    print_warning("No nutritionists found")
                    return False
            else:
                print_error(f"Failed to get nutritionists: {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_subscriptions(self):
        """Test 5: Subscriptions"""
        print_section("5. Subscriptions", 2)
        if not self.user_id:
            print_warning("No user ID available")
            return False
        
        try:
            response = self.session.get(f"{API_BASE}/subscriptions/client/{self.user_id}", timeout=10)
            if response.status_code == 200:
                subscriptions = response.json()
                if isinstance(subscriptions, list):
                    print_success(f"Found {len(subscriptions)} subscription(s)")
                    for sub in subscriptions:
                        print_info(f"  - Status: {sub.get('status', 'Unknown')}, Payment: {sub.get('payment_status', 'Unknown')}")
                    return True
                else:
                    print_warning("No subscriptions found (new user)")
                    return True  # Not an error for new user
            else:
                print_error(f"Failed to get subscriptions: {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_orders(self):
        """Test 6: Orders"""
        print_section("6. Orders", 2)
        if not self.user_id:
            print_warning("No user ID available")
            return False
        
        try:
            response = self.session.get(f"{API_BASE}/orders", params={"client_id": self.user_id}, timeout=10)
            if response.status_code == 200:
                orders = response.json()
                if isinstance(orders, list):
                    print_success(f"Found {len(orders)} order(s)")
                    for order in orders[:3]:
                        print_info(f"  - Order {order.get('id', 'Unknown')[:8]}... Status: {order.get('status', 'Unknown')}")
                    return True
                else:
                    print_warning("No orders found (new user)")
                    return True  # Not an error for new user
            else:
                print_error(f"Failed to get orders: {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_addresses(self):
        """Test 7: Addresses"""
        print_section("7. Addresses", 2)
        if not self.user_id:
            print_warning("No user ID available")
            return False
        
        try:
            response = self.session.get(f"{API_BASE}/addresses", timeout=10)
            if response.status_code == 200:
                addresses = response.json()
                if isinstance(addresses, list):
                    print_success(f"Found {len(addresses)} address(es)")
                    for addr in addresses:
                        print_info(f"  - {addr.get('label', 'Unknown')}: {addr.get('line1', 'N/A')}")
                    return True
                else:
                    print_warning("No addresses found (new user)")
                    return True  # Not an error for new user
            else:
                print_error(f"Failed to get addresses: {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_create_address(self):
        """Test 8: Create Address"""
        print_section("8. Create Address", 2)
        if not self.user_id:
            print_warning("No user ID available")
            return False
        
        try:
            address_data = {
                "label": "Home",
                "line1": "123 Test Street",
                "line2": "Apt 4B",
                "city": "Mumbai",
                "state": "Maharashtra",
                "postal_code": "400001",
                "country": "India",
                "is_default": True
            }
            response = self.session.post(f"{API_BASE}/addresses", json=address_data, timeout=10)
            if response.status_code in [200, 201]:
                addr = response.json()
                print_success(f"Address created: {addr.get('label', 'Unknown')}")
                print_info(f"  Address ID: {addr.get('id', 'Unknown')[:8]}...")
                return True
            else:
                print_error(f"Failed to create address: {response.status_code} - {response.text[:200]}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_consultations(self):
        """Test 9: Consultations"""
        print_section("9. Consultations", 2)
        if not self.user_id:
            print_warning("No user ID available")
            return False
        
        try:
            response = self.session.get(f"{API_BASE}/consultations", params={"client_id": self.user_id}, timeout=10)
            if response.status_code == 200:
                consultations = response.json()
                if isinstance(consultations, list):
                    print_success(f"Found {len(consultations)} consultation(s)")
                    return True
                else:
                    print_warning("No consultations found (new user)")
                    return True  # Not an error
            else:
                print_error(f"Failed to get consultations: {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_daily_meals(self):
        """Test 10: Today's Meals"""
        print_section("10. Today's Meals", 2)
        if not self.user_id:
            print_warning("No user ID available")
            return False
        
        try:
            response = self.session.get(f"{API_BASE}/daily-meals/client/{self.user_id}/today", timeout=10)
            if response.status_code == 200:
                meals = response.json()
                if meals:
                    print_success("Today's meals retrieved")
                    return True
                else:
                    print_warning("No meals scheduled for today")
                    return True  # Not an error
            elif response.status_code == 404:
                print_warning("No meals found for today (new user)")
                return True  # Not an error
            else:
                print_error(f"Failed to get today's meals: {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_delivery_tracking(self):
        """Test 11: Delivery Tracking"""
        print_section("11. Delivery Tracking", 2)
        if not self.user_id:
            print_warning("No user ID available")
            return False
        
        try:
            response = self.session.get(f"{API_BASE}/delivery-tracking/client/{self.user_id}", timeout=10)
            if response.status_code == 200:
                tracking = response.json()
                if isinstance(tracking, list):
                    print_success(f"Found {len(tracking)} active delivery(ies)")
                    return True
                else:
                    print_warning("No active deliveries")
                    return True  # Not an error
            else:
                print_error(f"Failed to get delivery tracking: {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_notifications(self):
        """Test 12: Notifications"""
        print_section("12. Notifications", 2)
        if not self.user_id:
            print_warning("No user ID available")
            return False
        
        try:
            response = self.session.get(f"{API_BASE}/notifications", params={"user_id": self.user_id}, timeout=10)
            if response.status_code == 200:
                notifications = response.json()
                if isinstance(notifications, list):
                    print_success(f"Found {len(notifications)} notification(s)")
                    return True
                else:
                    print_warning("No notifications found")
                    return True  # Not an error
            else:
                print_error(f"Failed to get notifications: {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_checkout_flow(self):
        """Test 13: Checkout Flow"""
        print_section("13. Checkout Flow", 2)
        
        # Get a meal plan
        try:
            response = self.session.get(f"{API_BASE}/meal-plans", params={"is_active": True}, timeout=10)
            if response.status_code != 200:
                print_warning("Cannot test checkout - no meal plans available")
                return False
            
            plans = response.json()
            if not isinstance(plans, list) or len(plans) == 0:
                print_warning("Cannot test checkout - no meal plans available")
                return False
            
            meal_plan_id = plans[0].get("id")
            meal_plan_title = plans[0].get("title", "Unknown")
            
            # Start checkout
            response = self.session.post(f"{API_BASE}/checkout/start", json={"meal_plan_id": meal_plan_id}, timeout=10)
            if response.status_code == 200:
                checkout_data = response.json()
                checkout_id = checkout_data.get("id")
                print_success(f"Checkout started for: {meal_plan_title}")
                print_info(f"  Checkout ID: {checkout_id[:8]}...")
                
                # Save health inputs
                health_data = {
                    "checkout_id": checkout_id,
                    "meal_plan_id": meal_plan_id,
                    "plan_category": plans[0].get("category", "weight-loss"),
                    "health_inputs": {
                        "target_weight": 70,
                        "timeline": "3-6",
                        "meals_per_day": 3,
                        "track_calories": "yes"
                    }
                }
                response = self.session.post(f"{API_BASE}/checkout/save", json=health_data, timeout=10)
                if response.status_code == 200:
                    print_success("Health inputs saved")
                
                # Save meal timing
                timing_data = {
                    "checkout_id": checkout_id,
                    "meal_plan_id": meal_plan_id,
                    "plan_category": plans[0].get("category", "weight-loss"),
                    "meal_timing": {
                        "breakfast_time": "08:00",
                        "lunch_time": "13:00",
                        "dinner_time": "19:00"
                    }
                }
                response = self.session.post(f"{API_BASE}/checkout/save", json=timing_data, timeout=10)
                if response.status_code == 200:
                    print_success("Meal timing saved")
                
                print_info("Checkout flow test completed (payment not processed)")
                return True
            else:
                print_error(f"Failed to start checkout: {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Checkout flow test failed: {e}")
            return False
    
    def run_all_tests(self):
        """Run all tests"""
        print_section("CLIENT PORTAL END-TO-END TEST (Auto Auth)", 1)
        print_info(f"Testing against: {BASE_URL}")
        print_info(f"Test User: {self.username}")
        print_info(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Run tests
        self.test("Server Health", self.check_server)
        if not self.test("Authentication", self.register_and_login):
            print_error("Authentication failed. Cannot proceed with other tests.")
            self.print_summary()
            return
        
        self.test("Meal Plans", self.test_meal_plans)
        self.test("Nutritionists", self.test_nutritionists)
        self.test("Subscriptions", self.test_subscriptions)
        self.test("Orders", self.test_orders)
        self.test("Addresses", self.test_addresses)
        self.test("Create Address", self.test_create_address)
        self.test("Consultations", self.test_consultations)
        self.test("Today's Meals", self.test_daily_meals)
        self.test("Delivery Tracking", self.test_delivery_tracking)
        self.test("Notifications", self.test_notifications)
        self.test("Checkout Flow", self.test_checkout_flow)
        
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print_section("TEST SUMMARY", 1)
        
        total = self.results["passed"] + self.results["failed"]
        pass_rate = (self.results["passed"] / total * 100) if total > 0 else 0
        
        print(f"\n{Colors.BOLD}Total Tests: {total}{Colors.RESET}")
        print(f"{Colors.GREEN}Passed: {self.results['passed']}{Colors.RESET}")
        print(f"{Colors.RED}Failed: {self.results['failed']}{Colors.RESET}")
        print(f"{Colors.YELLOW}Warnings: {self.results['warnings']}{Colors.RESET}")
        print(f"\n{Colors.BOLD}Pass Rate: {pass_rate:.1f}%{Colors.RESET}")
        
        print(f"\n{Colors.BOLD}Test Details:{Colors.RESET}")
        for test in self.results["tests"]:
            status_color = Colors.GREEN if test["status"] == "PASS" else Colors.RED
            print(f"  {status_color}{test['status']}{Colors.RESET}: {test['name']}")
            if "error" in test:
                print(f"    {Colors.RED}Error: {test['error']}{Colors.RESET}")
        
        print(f"\n{Colors.BOLD}Test User: {self.username}{Colors.RESET}")
        print(f"{Colors.BOLD}Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{Colors.RESET}")

if __name__ == "__main__":
    tester = ClientPortalTester()
    tester.run_all_tests()
    
    # Exit with appropriate code
    if tester.results["failed"] == 0:
        sys.exit(0)
    else:
        sys.exit(1)

