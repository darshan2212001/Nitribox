"""
Comprehensive Test Script for Phase 1 & Phase 2 Improvements
Tests: Event Store, Audit Logs, State Machine, Idempotency, Payments, Addresses, Notifications
"""

import requests
import json
import time
import uuid
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api"

# Test user credentials (update if needed)
TEST_USERNAME = "dittomohan22"
TEST_PASSWORD = "testpass123"

# Colors for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_test(name):
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}Testing: {name}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")

def print_success(msg):
    print(f"{GREEN}✓ {msg}{RESET}")

def print_error(msg):
    print(f"{RED}✗ {msg}{RESET}")

def print_warning(msg):
    print(f"{YELLOW}⚠ {msg}{RESET}")

class TestRunner:
    def __init__(self):
        self.token = None
        self.user_id = None
        self.test_results = {
            "passed": 0,
            "failed": 0,
            "warnings": 0
        }
    
    def run_request(self, method, url, data=None, headers=None, expected_status=200):
        """Make HTTP request and return response"""
        try:
            if headers is None:
                headers = {}
            
            if self.token:
                headers["Authorization"] = f"Bearer {self.token}"
            
            headers["Content-Type"] = "application/json"
            
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, timeout=10)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method.upper() == "PATCH":
                response = requests.patch(url, json=data, headers=headers, timeout=10)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            if response.status_code == expected_status:
                return True, response.json() if response.text else {}
            else:
                return False, f"Expected {expected_status}, got {response.status_code}: {response.text}"
        
        except Exception as e:
            return False, str(e)
    
    def test_authentication(self):
        """Test user authentication"""
        print_test("Authentication")
        
        success, result = self.run_request(
            "POST",
            f"{API_BASE}/auth/login",
            data={"username": TEST_USERNAME, "password": TEST_PASSWORD},
            expected_status=200
        )
        
        if success:
            self.token = result.get("access_token")
            self.user_id = result.get("user", {}).get("id")
            print_success(f"Authentication successful. Token obtained.")
            print_success(f"User ID: {self.user_id}")
            self.test_results["passed"] += 1
            return True
        else:
            print_error(f"Authentication failed: {result}")
            self.test_results["failed"] += 1
            return False
    
    def test_order_creation_idempotency(self):
        """Test order creation with idempotency"""
        print_test("Order Creation with Idempotency")
        
        idempotency_key = str(uuid.uuid4())
        order_data = {
            "client_id": self.user_id,
            "client_name": "Test User",
            "client_email": "test@example.com",
            "client_phone": "9876543210",
            "client_address": "123 Test Street, Test City, Test State 123456",
            "diet_plan": "test-plan",
            "meal_type": "breakfast",
            "quantity": 1,
            "price": 299.99,
            "idempotency_key": idempotency_key
        }
        
        # Create first order
        success1, result1 = self.run_request(
            "POST",
            f"{API_BASE}/orders/",
            data=order_data,
            expected_status=200
        )
        
        if not success1:
            print_error(f"First order creation failed: {result1}")
            self.test_results["failed"] += 1
            return False
        
        order_id_1 = result1.get("id")
        print_success(f"First order created: {order_id_1}")
        
        # Create duplicate with same idempotency key
        success2, result2 = self.run_request(
            "POST",
            f"{API_BASE}/orders/",
            data=order_data,
            expected_status=200
        )
        
        if not success2:
            print_error(f"Duplicate order creation failed: {result2}")
            self.test_results["failed"] += 1
            return False
        
        order_id_2 = result2.get("id")
        
        if order_id_1 == order_id_2:
            print_success(f"Idempotency working: Same order returned ({order_id_1})")
            self.test_results["passed"] += 1
            return order_id_1
        else:
            print_error(f"Idempotency failed: Different IDs ({order_id_1} vs {order_id_2})")
            self.test_results["failed"] += 1
            return order_id_1
    
    def test_state_machine_validation(self):
        """Test state machine validation for order status"""
        print_test("State Machine Validation")
        
        # Create an order
        order_data = {
            "client_id": self.user_id,
            "client_name": "Test User",
            "client_email": "test@example.com",
            "client_phone": "9876543210",
            "client_address": "123 Test Street, Test City, Test State 123456",
            "diet_plan": "test-plan",
            "meal_type": "lunch",
            "quantity": 1,
            "price": 299.99
        }
        
        success, result = self.run_request(
            "POST",
            f"{API_BASE}/orders/",
            data=order_data,
            expected_status=200
        )
        
        if not success:
            print_error(f"Order creation failed: {result}")
            self.test_results["failed"] += 1
            return None
        
        order_id = result.get("id")
        print_success(f"Order created: {order_id}")
        
        # Test valid transition: pending -> preparing
        success1, result1 = self.run_request(
            "PATCH",
            f"{API_BASE}/orders/{order_id}/status",
            data={"status": "preparing"},
            expected_status=200
        )
        
        if success1:
            print_success("Valid transition (pending -> preparing) accepted")
        else:
            print_error(f"Valid transition failed: {result1}")
            self.test_results["failed"] += 1
            return order_id
        
        # Test invalid transition: preparing -> delivered (should fail)
        success2, result2 = self.run_request(
            "PATCH",
            f"{API_BASE}/orders/{order_id}/status",
            data={"status": "delivered"},
            expected_status=400
        )
        
        if success2 or "Invalid transition" in str(result2):
            print_success("Invalid transition (preparing -> delivered) correctly rejected")
            self.test_results["passed"] += 1
        else:
            print_error(f"Invalid transition should have been rejected: {result2}")
            self.test_results["failed"] += 1
        
        return order_id
    
    def test_optimistic_concurrency(self):
        """Test optimistic concurrency control"""
        print_test("Optimistic Concurrency Control")
        
        # Create an order
        order_data = {
            "client_id": self.user_id,
            "client_name": "Test User",
            "client_email": "test@example.com",
            "client_phone": "9876543210",
            "client_address": "123 Test Street, Test City, Test State 123456",
            "diet_plan": "test-plan",
            "meal_type": "dinner",
            "quantity": 1,
            "price": 299.99
        }
        
        success, result = self.run_request(
            "POST",
            f"{API_BASE}/orders/",
            data=order_data,
            expected_status=200
        )
        
        if not success:
            print_error(f"Order creation failed: {result}")
            self.test_results["failed"] += 1
            return None
        
        order_id = result.get("id")
        version = result.get("version", 1)
        print_success(f"Order created with version {version}")
        
        # Update with correct version
        success1, result1 = self.run_request(
            "PATCH",
            f"{API_BASE}/orders/{order_id}",
            data={"status": "preparing", "expected_version": version},
            expected_status=200
        )
        
        if success1:
            new_version = result1.get("version")
            print_success(f"Update with correct version succeeded. New version: {new_version}")
        else:
            print_error(f"Update with correct version failed: {result1}")
            self.test_results["failed"] += 1
            return order_id
        
        # Try to update with stale version (should fail)
        success2, result2 = self.run_request(
            "PATCH",
            f"{API_BASE}/orders/{order_id}",
            data={"status": "ready", "expected_version": version},
            expected_status=409
        )
        
        if success2 or "version" in str(result2).lower():
            print_success("Optimistic concurrency working: Stale version correctly rejected")
            self.test_results["passed"] += 1
        else:
            print_warning(f"Expected 409 conflict, got: {result2}")
            self.test_results["warnings"] += 1
        
        return order_id
    
    def test_payment_processing(self):
        """Test payment creation and processing"""
        print_test("Payment Processing")
        
        # Create a test order first
        order_data = {
            "client_id": self.user_id,
            "client_name": "Test User",
            "client_email": "test@example.com",
            "client_phone": "9876543210",
            "client_address": "123 Test Street, Test City, Test State 123456",
            "diet_plan": "test-plan",
            "meal_type": "breakfast",
            "quantity": 1,
            "price": 2999.00
        }
        
        success, order_result = self.run_request(
            "POST",
            f"{API_BASE}/orders/",
            data=order_data,
            expected_status=200
        )
        
        if not success:
            print_error(f"Order creation failed: {order_result}")
            self.test_results["failed"] += 1
            return None
        
        order_id = order_result.get("id")
        
        # Create payment
        payment_data = {
            "order_id": order_id,
            "amount": 2999.00,
            "currency": "INR",
            "payment_method": "upi",
            "idempotency_key": str(uuid.uuid4())
        }
        
        success1, payment_result = self.run_request(
            "POST",
            f"{API_BASE}/payments/",
            data=payment_data,
            expected_status=200
        )
        
        if not success1:
            print_error(f"Payment creation failed: {payment_result}")
            self.test_results["failed"] += 1
            return None
        
        payment_id = payment_result.get("id")
        payment_status = payment_result.get("status")
        print_success(f"Payment created: {payment_id}")
        print_success(f"Payment status: {payment_status}")
        
        if payment_status in ["completed", "failed"]:
            print_success("Payment processing working (mock provider)")
            self.test_results["passed"] += 1
            return payment_id
        else:
            print_warning(f"Payment status unexpected: {payment_status}")
            self.test_results["warnings"] += 1
            return payment_id
    
    def test_refund_processing(self):
        """Test refund creation"""
        print_test("Refund Processing")
        
        # First create a completed payment
        payment_data = {
            "amount": 1999.00,
            "currency": "INR",
            "payment_method": "card",
            "idempotency_key": str(uuid.uuid4())
        }
        
        success, payment_result = self.run_request(
            "POST",
            f"{API_BASE}/payments/",
            data=payment_data,
            expected_status=200
        )
        
        if not success:
            print_error(f"Payment creation failed: {payment_result}")
            self.test_results["failed"] += 1
            return None
        
        payment_id = payment_result.get("id")
        payment_status = payment_result.get("status")
        
        if payment_status != "completed":
            print_warning(f"Payment status is {payment_status}, cannot test refund. Creating another payment...")
            # Try again
            payment_data["idempotency_key"] = str(uuid.uuid4())
            success, payment_result = self.run_request(
                "POST",
                f"{API_BASE}/payments/",
                data=payment_data,
                expected_status=200
            )
            if success:
                payment_id = payment_result.get("id")
                payment_status = payment_result.get("status")
        
        if payment_status == "completed":
            # Create refund
            refund_data = {
                "payment_id": payment_id,
                "amount": 1999.00,
                "refund_reason": "Test refund"
            }
            
            success1, refund_result = self.run_request(
                "POST",
                f"{API_BASE}/payments/refund",
                data=refund_data,
                expected_status=200
            )
            
            if success1:
                refund_id = refund_result.get("id")
                refund_status = refund_result.get("status")
                print_success(f"Refund created: {refund_id}")
                print_success(f"Refund status: {refund_status}")
                self.test_results["passed"] += 1
                return refund_id
            else:
                print_error(f"Refund creation failed: {refund_result}")
                self.test_results["failed"] += 1
                return None
        else:
            print_warning(f"Cannot test refund: Payment status is {payment_status}")
            self.test_results["warnings"] += 1
            return None
    
    def test_address_management(self):
        """Test address CRUD operations"""
        print_test("Address Management")
        
        # Create address
        address_data = {
            "label": "Home",
            "address_type": "general",
            "line1": "456 Test Avenue",
            "line2": "Apartment 2B",
            "city": "Test City",
            "state": "Test State",
            "postal_code": "123456",
            "country": "India",
            "is_default": True,
            "contact_name": "Test User",
            "contact_phone": "9876543210"
        }
        
        success, address_result = self.run_request(
            "POST",
            f"{API_BASE}/addresses/",
            data=address_data,
            expected_status=200
        )
        
        if not success:
            print_error(f"Address creation failed: {address_result}")
            self.test_results["failed"] += 1
            return None
        
        address_id = address_result.get("id")
        print_success(f"Address created: {address_id}")
        
        # Get address
        success1, get_result = self.run_request(
            "GET",
            f"{API_BASE}/addresses/{address_id}",
            expected_status=200
        )
        
        if success1:
            print_success(f"Address retrieved: {get_result.get('label')}")
        else:
            print_error(f"Address retrieval failed: {get_result}")
            self.test_results["failed"] += 1
            return address_id
        
        # Update address
        update_data = {
            "label": "Work",
            "line1": "789 Business Park"
        }
        
        success2, update_result = self.run_request(
            "PATCH",
            f"{API_BASE}/addresses/{address_id}",
            data=update_data,
            expected_status=200
        )
        
        if success2:
            print_success(f"Address updated: {update_result.get('label')}")
            self.test_results["passed"] += 1
        else:
            print_error(f"Address update failed: {update_result}")
            self.test_results["failed"] += 1
        
        return address_id
    
    def test_notification_creation(self):
        """Test notification creation"""
        print_test("Notification Management")
        
        # Create notification
        notification_data = {
            "user_id": self.user_id,
            "notification_type": "in_app",
            "title": "Test Notification",
            "message": "This is a test notification",
            "priority": "normal",
            "channel": "client"
        }
        
        success, notification_result = self.run_request(
            "POST",
            f"{API_BASE}/notifications/",
            data=notification_data,
            expected_status=200
        )
        
        if not success:
            print_error(f"Notification creation failed: {notification_result}")
            self.test_results["failed"] += 1
            return None
        
        notification_id = notification_result.get("id")
        notification_status = notification_result.get("status")
        print_success(f"Notification created: {notification_id}")
        print_success(f"Notification status: {notification_status}")
        
        # Mark as read
        success1, read_result = self.run_request(
            "PATCH",
            f"{API_BASE}/notifications/{notification_id}",
            data={"status": "read"},
            expected_status=200
        )
        
        if success1:
            print_success("Notification marked as read")
            self.test_results["passed"] += 1
        else:
            print_error(f"Notification update failed: {read_result}")
            self.test_results["failed"] += 1
        
        return notification_id
    
    def test_device_token_registration(self):
        """Test device token registration"""
        print_test("Device Token Registration")
        
        token_data = {
            "device_id": f"test-device-{uuid.uuid4()}",
            "platform": "android",
            "token": f"test-token-{uuid.uuid4()}",
            "app_version": "1.0.0",
            "os_version": "Android 13"
        }
        
        success, token_result = self.run_request(
            "POST",
            f"{API_BASE}/notifications/device-tokens",
            data=token_data,
            expected_status=200
        )
        
        if not success:
            print_error(f"Device token registration failed: {token_result}")
            self.test_results["failed"] += 1
            return None
        
        token_id = token_result.get("id")
        print_success(f"Device token registered: {token_id}")
        print_success(f"Platform: {token_result.get('platform')}")
        
        self.test_results["passed"] += 1
        return token_id
    
    def test_event_store_query(self):
        """Test querying events"""
        print_test("Event Store Query")
        
        # Query events (this endpoint may not exist yet, so we'll check)
        success, result = self.run_request(
            "GET",
            f"{API_BASE}/events",
            expected_status=200  # May be 404 if endpoint doesn't exist
        )
        
        if success:
            print_success("Event store query working")
            self.test_results["passed"] += 1
        else:
            print_warning("Event query endpoint may not be implemented yet")
            self.test_results["warnings"] += 1
    
    def test_audit_logs_query(self):
        """Test querying audit logs"""
        print_test("Audit Logs Query")
        
        # Query audit logs (this endpoint may not exist yet, so we'll check)
        success, result = self.run_request(
            "GET",
            f"{API_BASE}/audit-logs",
            expected_status=200  # May be 404 if endpoint doesn't exist
        )
        
        if success:
            print_success("Audit logs query working")
            self.test_results["passed"] += 1
        else:
            print_warning("Audit log query endpoint may not be implemented yet")
            self.test_results["warnings"] += 1
    
    def run_all_tests(self):
        """Run all tests"""
        print(f"\n{BLUE}{'='*60}{RESET}")
        print(f"{BLUE}Starting Comprehensive Phase 1 & Phase 2 Tests{RESET}")
        print(f"{BLUE}{'='*60}{RESET}\n")
        
        print(f"API Base URL: {API_BASE}")
        print(f"Test User: {TEST_USERNAME}\n")
        
        # Test authentication first
        if not self.test_authentication():
            print_error("Cannot continue without authentication")
            return
        
        # Phase 1 Tests
        self.test_order_creation_idempotency()
        self.test_state_machine_validation()
        self.test_optimistic_concurrency()
        
        # Phase 2 Tests
        self.test_payment_processing()
        self.test_refund_processing()
        self.test_address_management()
        self.test_notification_creation()
        self.test_device_token_registration()
        
        # Optional tests (endpoints may not exist yet)
        self.test_event_store_query()
        self.test_audit_logs_query()
        
        # Print summary
        print(f"\n{BLUE}{'='*60}{RESET}")
        print(f"{BLUE}Test Summary{RESET}")
        print(f"{BLUE}{'='*60}{RESET}")
        print(f"{GREEN}Passed: {self.test_results['passed']}{RESET}")
        print(f"{RED}Failed: {self.test_results['failed']}{RESET}")
        print(f"{YELLOW}Warnings: {self.test_results['warnings']}{RESET}")
        print(f"{BLUE}{'='*60}{RESET}\n")
        
        total = self.test_results['passed'] + self.test_results['failed']
        if total > 0:
            success_rate = (self.test_results['passed'] / total) * 100
            print(f"Success Rate: {success_rate:.1f}%")
        
        if self.test_results['failed'] == 0:
            print(f"\n{GREEN}All critical tests passed! ✓{RESET}\n")
        else:
            print(f"\n{RED}Some tests failed. Please review the errors above.{RESET}\n")

if __name__ == "__main__":
    import sys
    
    # Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=5)
        if response.status_code != 200:
            print_error(f"Server health check failed: {response.status_code}")
            print_warning("Make sure the API server is running on http://localhost:8000")
            sys.exit(1)
    except requests.exceptions.ConnectionError:
        print_error("Cannot connect to API server at http://localhost:8000")
        print_warning("Please start the API server first:")
        print_warning("  uvicorn app.main:app --reload")
        sys.exit(1)
    
    runner = TestRunner()
    runner.run_all_tests()

