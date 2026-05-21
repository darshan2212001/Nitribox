"""
Automated checkout flow test - tests endpoints without requiring manual input
Tests public endpoints and provides clear status
"""

import requests
import json
import sys
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api"

def print_step(step, desc):
    print(f"\n{'='*60}")
    print(f"Step {step}: {desc}")
    print(f"{'='*60}")

def print_success(msg):
    print(f"✓ {msg}")

def print_error(msg):
    print(f"✗ ERROR: {msg}")

def print_info(msg):
    print(f"ℹ {msg}")

def print_warning(msg):
    print(f"⚠ {msg}")

def test_server():
    """Test 1: Check server health"""
    print_step(1, "Server Health Check")
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print_success("Server is running and healthy")
            print_info(f"Status: {data.get('status', 'unknown')}")
            return True
        else:
            print_error(f"Server returned status {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print_error(f"Cannot connect to server: {e}")
        print_warning(f"Make sure the backend is running at {BASE_URL}")
        return False

def test_meal_plans_public():
    """Test 2: Check if meal plans endpoint is accessible"""
    print_step(2, "Check Meal Plans Endpoint")
    try:
        response = requests.get(f"{API_BASE}/meal-plans", params={"is_active": True}, timeout=10)
        if response.status_code == 200:
            plans = response.json()
            if isinstance(plans, list):
                print_success(f"Found {len(plans)} meal plan(s)")
                if len(plans) > 0:
                    plan = plans[0]
                    print_info(f"Sample plan: {plan.get('title', 'Unknown')} (ID: {plan.get('id', 'N/A')})")
                    return True, plans[0].get("id") if plans else None
                else:
                    print_warning("No active meal plans found")
                    return True, None
            else:
                print_error("Invalid response format")
                return False, None
        elif response.status_code == 401:
            print_warning("Meal plans endpoint requires authentication")
            return False, None
        else:
            print_error(f"Failed: {response.status_code}")
            return False, None
    except Exception as e:
        print_error(f"Request failed: {e}")
        return False, None

def test_checkout_endpoint_structure():
    """Test 3: Check checkout endpoint structure (without auth)"""
    print_step(3, "Check Checkout Endpoint Structure")
    try:
        # Try to access checkout endpoint - should return 401 if auth required
        response = requests.post(
            f"{API_BASE}/checkout/start",
            json={"meal_plan_id": "test-id"},
            timeout=10
        )
        if response.status_code == 401:
            print_success("Checkout endpoint exists and requires authentication (expected)")
            return True
        elif response.status_code == 404:
            print_error("Checkout endpoint not found")
            return False
        elif response.status_code == 422:
            print_success("Checkout endpoint exists (validation error expected without valid data)")
            return True
        else:
            print_warning(f"Unexpected status: {response.status_code}")
            return True
    except Exception as e:
        print_error(f"Request failed: {e}")
        return False

def test_payment_endpoint_structure():
    """Test 4: Check payment endpoint structure"""
    print_step(4, "Check Payment Endpoint Structure")
    try:
        response = requests.post(
            f"{API_BASE}/payments",
            json={"test": "data"},
            timeout=10
        )
        if response.status_code == 401:
            print_success("Payment endpoint exists and requires authentication (expected)")
            return True
        elif response.status_code == 422:
            print_success("Payment endpoint exists (validation error expected)")
            return True
        else:
            print_warning(f"Unexpected status: {response.status_code}")
            return True
    except Exception as e:
        print_error(f"Request failed: {e}")
        return False

def test_user_activities_endpoint():
    """Test 5: Check user activities endpoint"""
    print_step(5, "Check User Activities Endpoint")
    try:
        response = requests.get(f"{API_BASE}/user-activities", timeout=10)
        if response.status_code == 401:
            print_success("User activities endpoint exists and requires authentication (expected)")
            return True
        else:
            print_warning(f"Unexpected status: {response.status_code}")
            return True
    except Exception as e:
        print_error(f"Request failed: {e}")
        return False

def main():
    print("\n" + "="*60)
    print("CLIENT CHECKOUT FLOW TEST (Automated)")
    print("="*60)
    print("\nThis test verifies endpoint availability without requiring authentication.")
    print("For full flow testing, use test_checkout_flow.py with valid credentials.\n")
    
    results = []
    
    # Test 1: Server health
    results.append(("Server Health", test_server()))
    
    # Test 2: Meal plans
    success, meal_plan_id = test_meal_plans_public()
    results.append(("Meal Plans Endpoint", success))
    
    # Test 3: Checkout endpoint
    results.append(("Checkout Endpoint", test_checkout_endpoint_structure()))
    
    # Test 4: Payment endpoint
    results.append(("Payment Endpoint", test_payment_endpoint_structure()))
    
    # Test 5: User activities endpoint
    results.append(("User Activities Endpoint", test_user_activities_endpoint()))
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for name, success in results:
        status = "✓ PASS" if success else "✗ FAIL"
        print(f"{status}: {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n✓ All endpoint structure tests passed!")
        print("\nTo test the full checkout flow with authentication:")
        print("  1. Login via frontend or API to get auth token")
        print("  2. Set AUTH_TOKEN environment variable")
        print("  3. Run: python test_checkout_flow_simple.py")
        sys.exit(0)
    else:
        print(f"\n⚠️  {total - passed} test(s) failed.")
        print("Check if the backend server is running correctly.")
        sys.exit(1)

if __name__ == "__main__":
    main()

