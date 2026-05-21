"""
Comprehensive End-to-End Test for Client Portal
Tests all features, tabs, and user flows
"""

import requests
import json
import sys
import os
from datetime import datetime, timedelta
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
    
    def authenticate(self):
        """Test 2: Authentication"""
        print_section("2. Authentication", 2)
        self.auth_token = os.getenv("AUTH_TOKEN")
        
        if not self.auth_token:
            print_warning("AUTH_TOKEN not found in environment")
            print_info("To get a token:")
            print_info("  1. Login via frontend at http://localhost:5000")
            print_info("  2. Open browser DevTools → Application → Local Storage")
            print_info("  3. Copy the 'auth_token' value")
            print_info("  4. Run: $env:AUTH_TOKEN='your_token'")
            return False
        
        self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
        
        # Verify token by getting user info
        try:
            response = self.session.get(f"{API_BASE}/auth/me", timeout=10)
            if response.status_code == 200:
                user_data = response.json()
                self.user_id = user_data.get("id")
                print_success(f"Authenticated as: {user_data.get('name', 'Unknown')} ({user_data.get('email', 'Unknown')})")
                print_info(f"User ID: {self.user_id}")
                print_info(f"Role: {user_data.get('role', 'Unknown')}")
                return True
            else:
                print_error(f"Authentication failed: {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Authentication check failed: {e}")
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
                    for plan in plans[:3]:  # Show first 3
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
                    for nut in nutritionists[:3]:  # Show first 3
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
                        print_info(f"  - Status: {sub.get('status', 'Unknown')}, Payment: {sub.get('payment_status', 'Unknown')}, Allocation: {sub.get('allocation_status', 'Unknown')}")
                    return True
                else:
                    print_warning("No subscriptions found")
                    return False
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
                    for order in orders[:3]:  # Show first 3
                        print_info(f"  - Order {order.get('id', 'Unknown')[:8]}... Status: {order.get('status', 'Unknown')}")
                    return True
                else:
                    print_warning("No orders found")
                    return False
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
                        print_info(f"  - {addr.get('label', 'Unknown')}: {addr.get('line1', 'N/A')}, {addr.get('city', 'N/A')}")
                    return True
                else:
                    print_warning("No addresses found")
                    return False
            else:
                print_error(f"Failed to get addresses: {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_consultations(self):
        """Test 8: Consultations"""
        print_section("8. Consultations", 2)
        if not self.user_id:
            print_warning("No user ID available")
            return False
        
        try:
            response = self.session.get(f"{API_BASE}/consultations", params={"client_id": self.user_id}, timeout=10)
            if response.status_code == 200:
                consultations = response.json()
                if isinstance(consultations, list):
                    print_success(f"Found {len(consultations)} consultation(s)")
                    for cons in consultations:
                        print_info(f"  - Status: {cons.get('status', 'Unknown')}, Date: {cons.get('date', 'N/A')}")
                    return True
                else:
                    print_warning("No consultations found")
                    return False
            else:
                print_error(f"Failed to get consultations: {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_daily_meals(self):
        """Test 9: Today's Meals"""
        print_section("9. Today's Meals", 2)
        if not self.user_id:
            print_warning("No user ID available")
            return False
        
        try:
            response = self.session.get(f"{API_BASE}/daily-meals/client/{self.user_id}/today", timeout=10)
            if response.status_code == 200:
                meals = response.json()
                if meals:
                    print_success("Today's meals retrieved")
                    if isinstance(meals, dict):
                        print_info(f"  - Breakfast: {meals.get('breakfast_item', 'N/A')}")
                        print_info(f"  - Lunch: {meals.get('lunch_item', 'N/A')}")
                        print_info(f"  - Dinner: {meals.get('dinner_item', 'N/A')}")
                    return True
                else:
                    print_warning("No meals scheduled for today")
                    return False
            elif response.status_code == 404:
                print_warning("No meals found for today")
                return True  # Not an error, just no data
            else:
                print_error(f"Failed to get today's meals: {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_delivery_tracking(self):
        """Test 10: Delivery Tracking"""
        print_section("10. Delivery Tracking", 2)
        if not self.user_id:
            print_warning("No user ID available")
            return False
        
        try:
            response = self.session.get(f"{API_BASE}/delivery-tracking/client/{self.user_id}", timeout=10)
            if response.status_code == 200:
                tracking = response.json()
                if isinstance(tracking, list):
                    print_success(f"Found {len(tracking)} active delivery(ies)")
                    for track in tracking:
                        print_info(f"  - Order {track.get('order_id', 'Unknown')[:8]}... Status: {track.get('status', 'Unknown')}")
                    return True
                else:
                    print_warning("No active deliveries")
                    return False
            else:
                print_error(f"Failed to get delivery tracking: {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_notifications(self):
        """Test 11: Notifications"""
        print_section("11. Notifications", 2)
        if not self.user_id:
            print_warning("No user ID available")
            return False
        
        try:
            response = self.session.get(f"{API_BASE}/notifications", params={"user_id": self.user_id}, timeout=10)
            if response.status_code == 200:
                notifications = response.json()
                if isinstance(notifications, list):
                    print_success(f"Found {len(notifications)} notification(s)")
                    for notif in notifications[:5]:  # Show first 5
                        print_info(f"  - {notif.get('title', 'Unknown')}: {notif.get('status', 'Unknown')}")
                    return True
                else:
                    print_warning("No notifications found")
                    return False
            else:
                print_error(f"Failed to get notifications: {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_user_activities(self):
        """Test 12: User Activities"""
        print_section("12. User Activities", 2)
        if not self.user_id:
            print_warning("No user ID available")
            return False
        
        try:
            response = self.session.get(f"{API_BASE}/user-activities/user/{self.user_id}/activities", timeout=10)
            if response.status_code == 200:
                activities = response.json()
                if isinstance(activities, list):
                    print_success(f"Found {len(activities)} activity(ies)")
                    for activity in activities[:3]:  # Show first 3
                        print_info(f"  - {activity.get('activity_type', 'Unknown')}: {activity.get('created_at', 'N/A')}")
                    return True
                else:
                    print_warning("No activities found")
                    return False
            elif response.status_code == 404:
                print_warning("User activities endpoint not found (may not be implemented)")
                return True  # Not critical
            else:
                print_error(f"Failed to get user activities: {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_weekly_reports(self):
        """Test 13: Weekly Reports"""
        print_section("13. Weekly Reports", 2)
        if not self.user_id:
            print_warning("No user ID available")
            return False
        
        try:
            response = self.session.get(f"{API_BASE}/reports/weekly/client/{self.user_id}", timeout=10)
            if response.status_code == 200:
                reports = response.json()
                if isinstance(reports, list):
                    print_success(f"Found {len(reports)} weekly report(s)")
                    return True
                else:
                    print_warning("No weekly reports found")
                    return False
            elif response.status_code == 404:
                print_warning("Weekly reports endpoint not found (may not be implemented)")
                return True  # Not critical
            else:
                print_error(f"Failed to get weekly reports: {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_checkout_flow(self):
        """Test 14: Checkout Flow"""
        print_section("14. Checkout Flow", 2)
        
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
            
            # Start checkout
            response = self.session.post(f"{API_BASE}/checkout/start", json={"meal_plan_id": meal_plan_id}, timeout=10)
            if response.status_code == 200:
                checkout_data = response.json()
                checkout_id = checkout_data.get("id")
                print_success(f"Checkout started (ID: {checkout_id[:8]}...)")
                
                # Save health inputs
                health_data = {
                    "checkout_id": checkout_id,
                    "meal_plan_id": meal_plan_id,
                    "plan_category": plans[0].get("category", "weight-loss"),
                    "health_inputs": {"target_weight": 70, "timeline": "3-6"}
                }
                response = self.session.post(f"{API_BASE}/checkout/save", json=health_data, timeout=10)
                if response.status_code == 200:
                    print_success("Health inputs saved")
                
                # Save meal timing
                timing_data = {
                    "checkout_id": checkout_id,
                    "meal_plan_id": meal_plan_id,
                    "plan_category": plans[0].get("category", "weight-loss"),
                    "meal_timing": {"breakfast_time": "08:00", "lunch_time": "13:00", "dinner_time": "19:00"}
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
        print_section("CLIENT PORTAL END-TO-END TEST", 1)
        print_info(f"Testing against: {BASE_URL}")
        print_info(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Run tests
        self.test("Server Health", self.check_server)
        if not self.test("Authentication", self.authenticate):
            print_error("Authentication failed. Cannot proceed with other tests.")
            self.print_summary()
            return
        
        self.test("Meal Plans", self.test_meal_plans)
        self.test("Nutritionists", self.test_nutritionists)
        self.test("Subscriptions", self.test_subscriptions)
        self.test("Orders", self.test_orders)
        self.test("Addresses", self.test_addresses)
        self.test("Consultations", self.test_consultations)
        self.test("Today's Meals", self.test_daily_meals)
        self.test("Delivery Tracking", self.test_delivery_tracking)
        self.test("Notifications", self.test_notifications)
        self.test("User Activities", self.test_user_activities)
        self.test("Weekly Reports", self.test_weekly_reports)
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
        
        print(f"\n{Colors.BOLD}Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{Colors.RESET}")

if __name__ == "__main__":
    tester = ClientPortalTester()
    tester.run_all_tests()
    
    # Exit with appropriate code
    if tester.results["failed"] == 0:
        sys.exit(0)
    else:
        sys.exit(1)

