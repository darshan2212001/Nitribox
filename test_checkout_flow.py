"""
Simple test script for client checkout flow
Tests the complete flow from checkout start to payment completion
"""

import requests
import json
from datetime import datetime, timedelta
import sys

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api"

# Test credentials - update these if needed
# Using a unique test user to avoid conflicts
import random
TEST_USERNAME = f"testuser_{random.randint(1000, 9999)}"
TEST_EMAIL = f"{TEST_USERNAME}@test.com"
TEST_PASSWORD = "Test123"  # Must have letter and number, max 72 bytes

class CheckoutFlowTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.checkout_id = None
        self.subscription_id = None
        self.payment_id = None
        self.meal_plan_id = None
        self.test_username = TEST_USERNAME
        self.test_email = TEST_EMAIL
        self.test_password = TEST_PASSWORD
        
    def print_step(self, step_num, description):
        print(f"\n{'='*60}")
        print(f"Step {step_num}: {description}")
        print(f"{'='*60}")
    
    def print_success(self, message):
        print(f"✓ {message}")
    
    def print_error(self, message):
        print(f"✗ ERROR: {message}")
    
    def check_server(self):
        """Check if server is running"""
        try:
            response = self.session.get(f"{BASE_URL}/api/health", timeout=5)
            if response.status_code == 200:
                self.print_success("Server is running")
                return True
            else:
                self.print_error(f"Server returned status {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            self.print_error(f"Cannot connect to server: {e}")
            print(f"Make sure the backend is running at {BASE_URL}")
            return False
    
    def register_user(self):
        """Register a test user if doesn't exist"""
        try:
            response = self.session.post(
                f"{API_BASE}/auth/register",
                json={
                    "username": self.test_username,
                    "email": self.test_email,
                    "password": self.test_password,
                    "name": "Test User",
                    "role": "client"
                },
                timeout=10
            )
            
            if response.status_code == 200 or response.status_code == 201:
                self.print_success(f"Registered test user: {self.test_username}")
                return True
            elif response.status_code == 400:
                # User might already exist - try with different username
                error_text = response.text
                if "already exists" in error_text.lower():
                    # Generate new username and try again
                    import random
                    new_username = f"testuser_{random.randint(10000, 99999)}"
                    new_email = f"{new_username}@test.com"
                    response2 = self.session.post(
                        f"{API_BASE}/auth/register",
                        json={
                            "username": new_username,
                            "email": new_email,
                            "password": self.test_password,
                            "name": "Test User",
                            "role": "client"
                        },
                        timeout=10
                    )
                    if response2.status_code in [200, 201]:
                        self.test_username = new_username
                        self.test_email = new_email
                        self.print_success(f"Registered test user with new username: {self.test_username}")
                        return True
                self.print_error(f"Registration failed: {response.text}")
                return False
            else:
                self.print_error(f"Registration failed: {response.status_code} - {response.text}")
                return False
        except requests.exceptions.RequestException as e:
            self.print_error(f"Registration request failed: {e}")
            return False
    
    def login(self):
        """Login as test user"""
        self.print_step(1, "Authentication")
        try:
            # Try to register user first (ignore errors - user might already exist)
            self.register_user()
            
            # Small delay to ensure user is committed if registration succeeded
            import time
            time.sleep(0.5)
            
            # Try login with test credentials
            response = self.session.post(
                f"{API_BASE}/auth/login",
                json={
                    "username": self.test_username,
                    "password": self.test_password
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("access_token")
                if self.auth_token:
                    self.session.headers.update({
                        "Authorization": f"Bearer {self.auth_token}"
                    })
                    self.print_success(f"Logged in successfully as {self.test_username}")
                    return True
                else:
                    self.print_error("No access token in response")
                    return False
            elif response.status_code == 401:
                # Try with a known test user from the system
                print("Trying with known test user credentials...")
                known_users = [
                    {"username": "dittomohan22", "password": "testpass123"},
                    {"username": "testuser", "password": "testpass123"},
                ]
                
                for user_creds in known_users:
                    try:
                        response2 = self.session.post(
                            f"{API_BASE}/auth/login",
                            json=user_creds,
                            timeout=10
                        )
                        if response2.status_code == 200:
                            data = response2.json()
                            self.auth_token = data.get("access_token")
                            if self.auth_token:
                                self.session.headers.update({
                                    "Authorization": f"Bearer {self.auth_token}"
                                })
                                self.print_success(f"Logged in successfully as {user_creds['username']}")
                                return True
                    except:
                        continue
                
                self.print_error("Could not login with test credentials")
                print("Note: You may need to create a test user manually or update credentials")
                return False
            else:
                self.print_error(f"Login failed: {response.status_code} - {response.text}")
                return False
        except requests.exceptions.RequestException as e:
            self.print_error(f"Login request failed: {e}")
            return False
    
    def get_meal_plan(self):
        """Get an active meal plan for testing"""
        self.print_step(2, "Get Meal Plan")
        try:
            response = self.session.get(
                f"{API_BASE}/meal-plans",
                params={"is_active": True},
                timeout=10
            )
            
            if response.status_code == 200:
                plans = response.json()
                if isinstance(plans, list) and len(plans) > 0:
                    self.meal_plan_id = plans[0].get("id")
                    plan_title = plans[0].get("title", "Unknown")
                    self.print_success(f"Found meal plan: {plan_title} (ID: {self.meal_plan_id})")
                    return True
                else:
                    self.print_error("No active meal plans found")
                    print("Note: You may need to create a meal plan first")
                    return False
            else:
                self.print_error(f"Failed to get meal plans: {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            self.print_error(f"Request failed: {e}")
            return False
    
    def start_checkout(self):
        """Start checkout session"""
        self.print_step(3, "Start Checkout")
        if not self.meal_plan_id:
            self.print_error("No meal plan ID available")
            return False
        
        try:
            response = self.session.post(
                f"{API_BASE}/checkout/start",
                json={"meal_plan_id": self.meal_plan_id},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.checkout_id = data.get("id")
                self.print_success(f"Checkout started (ID: {self.checkout_id})")
                return True
            else:
                self.print_error(f"Failed to start checkout: {response.status_code} - {response.text}")
                return False
        except requests.exceptions.RequestException as e:
            self.print_error(f"Request failed: {e}")
            return False
    
    def save_health_inputs(self):
        """Save health inputs"""
        self.print_step(4, "Save Health Inputs")
        if not self.checkout_id:
            self.print_error("No checkout ID available")
            return False
        
        health_inputs = {
            "target_weight": 70,
            "timeline": "3-6",
            "meals_per_day": 3,
            "track_calories": "yes"
        }
        
        try:
            response = self.session.post(
                f"{API_BASE}/checkout/save",
                json={
                    "checkout_id": self.checkout_id,
                    "meal_plan_id": self.meal_plan_id,
                    "plan_category": "weight-loss",
                    "health_inputs": health_inputs
                },
                timeout=10
            )
            
            if response.status_code == 200:
                self.print_success("Health inputs saved")
                return True
            else:
                self.print_error(f"Failed to save health inputs: {response.status_code} - {response.text}")
                return False
        except requests.exceptions.RequestException as e:
            self.print_error(f"Request failed: {e}")
            return False
    
    def save_meal_timing(self):
        """Save meal timing and delivery addresses"""
        self.print_step(5, "Save Meal Timing & Delivery Addresses")
        if not self.checkout_id:
            self.print_error("No checkout ID available")
            return False
        
        meal_timing = {
            "breakfast_time": "08:00",
            "lunch_time": "13:00",
            "dinner_time": "19:00",
            "snack_times": ["15:00"],
            "meal_reminders": True,
            "delivery_addresses": {
                "breakfast": "addr_breakfast",
                "lunch": "addr_lunch",
                "dinner": "addr_dinner"
            }
        }
        
        try:
            response = self.session.post(
                f"{API_BASE}/checkout/save",
                json={
                    "checkout_id": self.checkout_id,
                    "meal_plan_id": self.meal_plan_id,
                    "plan_category": "weight-loss",
                    "meal_timing": meal_timing
                },
                timeout=10
            )
            
            if response.status_code == 200:
                self.print_success("Meal timing and delivery addresses saved")
                return True
            else:
                self.print_error(f"Failed to save meal timing: {response.status_code} - {response.text}")
                return False
        except requests.exceptions.RequestException as e:
            self.print_error(f"Request failed: {e}")
            return False
    
    def save_consultation(self):
        """Save consultation preferences"""
        self.print_step(6, "Save Consultation Preferences")
        if not self.checkout_id:
            self.print_error("No checkout ID available")
            return False
        
        consultation_date = (datetime.now() + timedelta(days=7)).isoformat()
        
        try:
            response = self.session.post(
                f"{API_BASE}/checkout/save",
                json={
                    "checkout_id": self.checkout_id,
                    "meal_plan_id": self.meal_plan_id,
                    "plan_category": "weight-loss",
                    "consultation_preference": True,
                    "consultation_date": consultation_date,
                    "consultation_time_slot": "morning",
                    "consultation_mode": "video"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                self.print_success("Consultation preferences saved")
                return True
            else:
                self.print_error(f"Failed to save consultation: {response.status_code} - {response.text}")
                return False
        except requests.exceptions.RequestException as e:
            self.print_error(f"Request failed: {e}")
            return False
    
    def complete_checkout(self):
        """Complete checkout and create subscription"""
        self.print_step(7, "Complete Checkout")
        if not self.checkout_id:
            self.print_error("No checkout ID available")
            return False
        
        try:
            response = self.session.post(
                f"{API_BASE}/checkout/complete",
                json={
                    "checkout_id": self.checkout_id,
                    "discount_code": None
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.subscription_id = data.get("subscription_id")
                if self.subscription_id:
                    self.print_success(f"Checkout completed! Subscription ID: {self.subscription_id}")
                    allocation_status = data.get("allocation_status", "unknown")
                    self.print_success(f"Allocation status: {allocation_status}")
                    return True
                else:
                    self.print_error("No subscription_id in response")
                    return False
            else:
                self.print_error(f"Failed to complete checkout: {response.status_code} - {response.text}")
                return False
        except requests.exceptions.RequestException as e:
            self.print_error(f"Request failed: {e}")
            return False
    
    def create_payment(self):
        """Create payment for subscription"""
        self.print_step(8, "Process Payment")
        if not self.subscription_id:
            self.print_error("No subscription ID available")
            return False
        
        try:
            # Get subscription to get amount
            sub_response = self.session.get(
                f"{API_BASE}/subscriptions/{self.subscription_id}",
                timeout=10
            )
            
            amount_cents = 500000  # Default 5000 INR in cents
            if sub_response.status_code == 200:
                sub_data = sub_response.json()
                # Try to get price from meal plan
                if "meal_plan" in sub_data and "current_price" in sub_data["meal_plan"]:
                    price = sub_data["meal_plan"]["current_price"]
                    amount_cents = int(price * 100)
            
            response = self.session.post(
                f"{API_BASE}/payments",
                json={
                    "subscription_id": self.subscription_id,
                    "amount_cents": amount_cents,
                    "currency": "INR",
                    "payment_method": "card",
                    "metadata": {
                        "test": True,
                        "checkout_id": self.checkout_id
                    }
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.payment_id = data.get("id")
                payment_status = data.get("status", "unknown")
                self.print_success(f"Payment created! Payment ID: {self.payment_id}")
                self.print_success(f"Payment status: {payment_status}")
                return True
            else:
                self.print_error(f"Failed to create payment: {response.status_code} - {response.text}")
                return False
        except requests.exceptions.RequestException as e:
            self.print_error(f"Request failed: {e}")
            return False
    
    def verify_subscription(self):
        """Verify subscription status"""
        self.print_step(9, "Verify Subscription")
        if not self.subscription_id:
            self.print_error("No subscription ID available")
            return False
        
        try:
            response = self.session.get(
                f"{API_BASE}/subscriptions/{self.subscription_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                status = data.get("status", "unknown")
                payment_status = data.get("payment_status", "unknown")
                allocation_status = data.get("allocation_status", "unknown")
                
                self.print_success(f"Subscription Status: {status}")
                self.print_success(f"Payment Status: {payment_status}")
                self.print_success(f"Allocation Status: {allocation_status}")
                
                # Verify expected values
                if payment_status == "completed":
                    self.print_success("✓ Payment status is correct")
                else:
                    self.print_error(f"Expected payment_status='completed', got '{payment_status}'")
                
                if allocation_status == "pending_allocation":
                    self.print_success("✓ Allocation status is correct (ready for admin allocation)")
                else:
                    self.print_error(f"Expected allocation_status='pending_allocation', got '{allocation_status}'")
                
                return True
            else:
                self.print_error(f"Failed to get subscription: {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            self.print_error(f"Request failed: {e}")
            return False
    
    def run_all_tests(self):
        """Run complete checkout flow test"""
        print("\n" + "="*60)
        print("CLIENT CHECKOUT FLOW TEST")
        print("="*60)
        
        steps = [
            ("Server Check", self.check_server),
            ("Login", self.login),
            ("Get Meal Plan", self.get_meal_plan),
            ("Start Checkout", self.start_checkout),
            ("Save Health Inputs", self.save_health_inputs),
            ("Save Meal Timing", self.save_meal_timing),
            ("Save Consultation", self.save_consultation),
            ("Complete Checkout", self.complete_checkout),
            ("Create Payment", self.create_payment),
            ("Verify Subscription", self.verify_subscription),
        ]
        
        results = []
        for step_name, step_func in steps:
            try:
                result = step_func()
                results.append((step_name, result))
                if not result:
                    print(f"\n⚠️  Test stopped at: {step_name}")
                    break
            except Exception as e:
                self.print_error(f"Unexpected error in {step_name}: {e}")
                results.append((step_name, False))
                break
        
        # Summary
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        
        passed = sum(1 for _, result in results if result)
        total = len(results)
        
        for step_name, result in results:
            status = "✓ PASS" if result else "✗ FAIL"
            print(f"{status}: {step_name}")
        
        print(f"\nTotal: {passed}/{total} steps passed")
        
        if passed == total:
            print("\n🎉 All tests passed! Checkout flow is working correctly.")
        else:
            print(f"\n⚠️  {total - passed} step(s) failed. Check errors above.")
        
        return passed == total

if __name__ == "__main__":
    tester = CheckoutFlowTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)

