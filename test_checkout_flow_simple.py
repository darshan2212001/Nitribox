"""
Simple checkout flow test - verifies endpoints are accessible
Can use manual auth token if provided
"""

import requests
import json
import sys
import os
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

def check_server():
    """Check if server is running"""
    print_step(1, "Server Check")
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=5)
        if response.status_code == 200:
            print_success("Server is running")
            data = response.json()
            print_info(f"Status: {data.get('status', 'unknown')}")
            return True
        else:
            print_error(f"Server returned status {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print_error(f"Cannot connect to server: {e}")
        print_info(f"Make sure the backend is running at {BASE_URL}")
        return False

def get_auth_token():
    """Get auth token - try from env or prompt user"""
    token = os.getenv("AUTH_TOKEN")
    if token:
        print_info("Using AUTH_TOKEN from environment")
        return token
    
    print_info("No AUTH_TOKEN found in environment")
    print_info("To get a token:")
    print_info("  1. Login via API: POST /api/auth/login")
    print_info("  2. Or set AUTH_TOKEN environment variable")
    print_info("  3. Or manually authenticate in the frontend and copy token")
    
    manual_token = input("\nEnter auth token (or press Enter to skip auth tests): ").strip()
    if manual_token:
        return manual_token
    return None

def test_checkout_endpoints(token):
    """Test checkout endpoints with auth token"""
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    
    results = []
    
    # Test 1: Get meal plans
    print_step(2, "Get Meal Plans")
    try:
        response = requests.get(f"{API_BASE}/meal-plans", params={"is_active": True}, headers=headers, timeout=10)
        if response.status_code == 200:
            plans = response.json()
            if isinstance(plans, list) and len(plans) > 0:
                meal_plan_id = plans[0].get("id")
                plan_title = plans[0].get("title", "Unknown")
                print_success(f"Found meal plan: {plan_title} (ID: {meal_plan_id})")
                results.append(("Get Meal Plans", True, meal_plan_id))
            else:
                print_error("No active meal plans found")
                results.append(("Get Meal Plans", False, None))
        else:
            print_error(f"Failed: {response.status_code} - {response.text[:200]}")
            results.append(("Get Meal Plans", False, None))
    except Exception as e:
        print_error(f"Request failed: {e}")
        results.append(("Get Meal Plans", False, None))
        return results
    
    if not results[0][1] or not results[0][2]:
        return results
    
    meal_plan_id = results[0][2]
    
    # Test 2: Start checkout
    print_step(3, "Start Checkout")
    try:
        response = requests.post(
            f"{API_BASE}/checkout/start",
            json={"meal_plan_id": meal_plan_id},
            headers=headers,
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            checkout_id = data.get("id")
            print_success(f"Checkout started (ID: {checkout_id})")
            results.append(("Start Checkout", True, checkout_id))
        else:
            print_error(f"Failed: {response.status_code} - {response.text[:200]}")
            results.append(("Start Checkout", False, None))
            return results
    except Exception as e:
        print_error(f"Request failed: {e}")
        results.append(("Start Checkout", False, None))
        return results
    
    checkout_id = results[1][2]
    
    # Test 3: Save health inputs
    print_step(4, "Save Health Inputs")
    try:
        health_inputs = {
            "target_weight": 70,
            "timeline": "3-6",
            "meals_per_day": 3,
            "track_calories": "yes"
        }
        response = requests.post(
            f"{API_BASE}/checkout/save",
            json={
                "checkout_id": checkout_id,
                "meal_plan_id": meal_plan_id,
                "plan_category": "weight-loss",
                "health_inputs": health_inputs
            },
            headers=headers,
            timeout=10
        )
        if response.status_code == 200:
            print_success("Health inputs saved")
            results.append(("Save Health Inputs", True, None))
        else:
            print_error(f"Failed: {response.status_code} - {response.text[:200]}")
            results.append(("Save Health Inputs", False, None))
    except Exception as e:
        print_error(f"Request failed: {e}")
        results.append(("Save Health Inputs", False, None))
    
    # Test 4: Save meal timing
    print_step(5, "Save Meal Timing")
    try:
        meal_timing = {
            "breakfast_time": "08:00",
            "lunch_time": "13:00",
            "dinner_time": "19:00",
            "delivery_addresses": {
                "breakfast": "addr_breakfast",
                "lunch": "addr_lunch",
                "dinner": "addr_dinner"
            }
        }
        response = requests.post(
            f"{API_BASE}/checkout/save",
            json={
                "checkout_id": checkout_id,
                "meal_plan_id": meal_plan_id,
                "plan_category": "weight-loss",
                "meal_timing": meal_timing
            },
            headers=headers,
            timeout=10
        )
        if response.status_code == 200:
            print_success("Meal timing saved")
            results.append(("Save Meal Timing", True, None))
        else:
            print_error(f"Failed: {response.status_code} - {response.text[:200]}")
            results.append(("Save Meal Timing", False, None))
    except Exception as e:
        print_error(f"Request failed: {e}")
        results.append(("Save Meal Timing", False, None))
    
    # Test 5: Complete checkout
    print_step(6, "Complete Checkout")
    try:
        response = requests.post(
            f"{API_BASE}/checkout/complete",
            json={"checkout_id": checkout_id, "discount_code": None},
            headers=headers,
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            subscription_id = data.get("subscription_id")
            if subscription_id:
                print_success(f"Checkout completed! Subscription ID: {subscription_id}")
                results.append(("Complete Checkout", True, subscription_id))
            else:
                print_error("No subscription_id in response")
                results.append(("Complete Checkout", False, None))
        else:
            print_error(f"Failed: {response.status_code} - {response.text[:200]}")
            results.append(("Complete Checkout", False, None))
            return results
    except Exception as e:
        print_error(f"Request failed: {e}")
        results.append(("Complete Checkout", False, None))
        return results
    
    subscription_id = results[4][2] if results[4][1] else None
    
    # Test 6: Create payment
    if subscription_id:
        print_step(7, "Create Payment")
        try:
            response = requests.post(
                f"{API_BASE}/payments",
                json={
                    "subscription_id": subscription_id,
                    "amount_cents": 500000,  # 5000 INR
                    "currency": "INR",
                    "payment_method": "card",
                    "metadata": {"test": True}
                },
                headers=headers,
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                payment_id = data.get("id")
                payment_status = data.get("status")
                print_success(f"Payment created! ID: {payment_id}, Status: {payment_status}")
                results.append(("Create Payment", True, payment_id))
            else:
                print_error(f"Failed: {response.status_code} - {response.text[:200]}")
                results.append(("Create Payment", False, None))
        except Exception as e:
            print_error(f"Request failed: {e}")
            results.append(("Create Payment", False, None))
    
    # Test 7: Verify subscription
    if subscription_id:
        print_step(8, "Verify Subscription")
        try:
            response = requests.get(
                f"{API_BASE}/subscriptions/{subscription_id}",
                headers=headers,
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                status = data.get("status")
                payment_status = data.get("payment_status")
                allocation_status = data.get("allocation_status")
                print_success(f"Subscription Status: {status}")
                print_success(f"Payment Status: {payment_status}")
                print_success(f"Allocation Status: {allocation_status}")
                results.append(("Verify Subscription", True, None))
            else:
                print_error(f"Failed: {response.status_code} - {response.text[:200]}")
                results.append(("Verify Subscription", False, None))
        except Exception as e:
            print_error(f"Request failed: {e}")
            results.append(("Verify Subscription", False, None))
    
    return results

def main():
    print("\n" + "="*60)
    print("CLIENT CHECKOUT FLOW TEST (Simple)")
    print("="*60)
    
    # Check server
    if not check_server():
        print("\n⚠️  Server is not running. Please start the backend first.")
        sys.exit(1)
    
    # Get auth token
    token = get_auth_token()
    if not token:
        print("\n⚠️  No auth token provided. Some tests will be skipped.")
        print("To test with authentication:")
        print("  1. Set AUTH_TOKEN environment variable")
        print("  2. Or login via frontend and copy token from browser")
        print("  3. Or run: export AUTH_TOKEN='your_token_here'")
        sys.exit(0)
    
    # Run tests
    results = test_checkout_endpoints(token)
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for name, success, _ in results if success)
    total = len(results)
    
    for name, success, _ in results:
        status = "✓ PASS" if success else "✗ FAIL"
        print(f"{status}: {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Checkout flow is working correctly.")
        sys.exit(0)
    else:
        print(f"\n⚠️  {total - passed} test(s) failed.")
        sys.exit(1)

if __name__ == "__main__":
    main()

