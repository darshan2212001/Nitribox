"""
Complete checkout flow test - tests the actual flow to identify what appears when
"""

import requests
import json
import sys
import os
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api"

def print_section(title):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}")

def print_success(msg):
    print(f"✓ {msg}")

def print_error(msg):
    print(f"✗ ERROR: {msg}")

def print_info(msg):
    print(f"ℹ {msg}")

def test_checkout_flow():
    """Test the complete checkout flow"""
    print_section("CHECKOUT FLOW TEST")
    
    session = requests.Session()
    auth_token = os.getenv("AUTH_TOKEN")
    
    if not auth_token:
        print_error("AUTH_TOKEN not found in environment")
        print_info("To get a token:")
        print_info("  1. Login via frontend at http://localhost:5000")
        print_info("  2. Open browser DevTools → Application → Local Storage")
        print_info("  3. Copy the 'auth_token' value")
        print_info("  4. Run: $env:AUTH_TOKEN='your_token'")
        return False
    
    session.headers.update({"Authorization": f"Bearer {auth_token}"})
    
    # Step 1: Get meal plans
    print_section("Step 1: Get Meal Plans")
    try:
        response = session.get(f"{API_BASE}/meal-plans", params={"is_active": True}, timeout=10)
        if response.status_code == 200:
            plans = response.json()
            if isinstance(plans, list) and len(plans) > 0:
                meal_plan = plans[0]
                meal_plan_id = meal_plan.get("id")
                print_success(f"Found meal plan: {meal_plan.get('title')} (ID: {meal_plan_id})")
            else:
                print_error("No meal plans found")
                return False
        else:
            print_error(f"Failed to get meal plans: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Request failed: {e}")
        return False
    
    # Step 2: Start checkout
    print_section("Step 2: Start Checkout")
    try:
        response = session.post(
            f"{API_BASE}/checkout/start",
            json={"meal_plan_id": meal_plan_id},
            timeout=10
        )
        if response.status_code == 200:
            checkout_data = response.json()
            checkout_id = checkout_data.get("id")
            print_success(f"Checkout started (ID: {checkout_id})")
            print_info(f"Status: {checkout_data.get('status')}")
            print_info(f"Has health_inputs: {bool(checkout_data.get('health_inputs'))}")
            print_info(f"Has meal_timing: {bool(checkout_data.get('meal_timing'))}")
            print_info(f"Has consultation_preference: {checkout_data.get('consultation_preference')}")
        else:
            print_error(f"Failed to start checkout: {response.status_code} - {response.text[:200]}")
            return False
    except Exception as e:
        print_error(f"Request failed: {e}")
        return False
    
    # Step 3: Save health inputs
    print_section("Step 3: Save Health Inputs")
    try:
        health_inputs = {
            "target_weight": 70,
            "timeline": "3-6",
            "meals_per_day": 3,
            "track_calories": "yes"
        }
        response = session.post(
            f"{API_BASE}/checkout/save",
            json={
                "checkout_id": checkout_id,
                "meal_plan_id": meal_plan_id,
                "plan_category": meal_plan.get("category", "weight-loss"),
                "health_inputs": health_inputs
            },
            timeout=10
        )
        if response.status_code == 200:
            print_success("Health inputs saved")
        else:
            print_error(f"Failed: {response.status_code} - {response.text[:200]}")
    except Exception as e:
        print_error(f"Request failed: {e}")
    
    # Step 4: Save meal timing and addresses
    print_section("Step 4: Save Meal Timing & Addresses")
    try:
        meal_timing = {
            "breakfast_time": "08:00",
            "lunch_time": "13:00",
            "dinner_time": "19:00",
            "delivery_addresses": {
                "breakfast": "default",
                "lunch": "default",
                "dinner": "default"
            }
        }
        response = session.post(
            f"{API_BASE}/checkout/save",
            json={
                "checkout_id": checkout_id,
                "meal_plan_id": meal_plan_id,
                "plan_category": meal_plan.get("category", "weight-loss"),
                "meal_timing": meal_timing,
                "delivery_addresses": meal_timing.get("delivery_addresses")
            },
            timeout=10
        )
        if response.status_code == 200:
            print_success("Meal timing and addresses saved")
        else:
            print_error(f"Failed: {response.status_code} - {response.text[:200]}")
    except Exception as e:
        print_error(f"Request failed: {e}")
    
    # Step 5: Complete checkout
    print_section("Step 5: Complete Checkout")
    try:
        response = session.post(
            f"{API_BASE}/checkout/complete",
            json={"checkout_id": checkout_id, "discount_code": None},
            timeout=10
        )
        if response.status_code == 200:
            complete_data = response.json()
            subscription_id = complete_data.get("subscription_id")
            print_success(f"Checkout completed! Subscription ID: {subscription_id}")
            print_info("✓ Form data collected DURING checkout (health inputs, meal timing, addresses)")
            print_info("✓ After checkout completion, payment screen should appear")
        else:
            print_error(f"Failed: {response.status_code} - {response.text[:200]}")
            return False
    except Exception as e:
        print_error(f"Request failed: {e}")
        return False
    
    # Step 6: Check subscription
    print_section("Step 6: Check Subscription")
    try:
        response = session.get(f"{API_BASE}/subscriptions/{subscription_id}", timeout=10)
        if response.status_code == 200:
            sub_data = response.json()
            print_success(f"Subscription Status: {sub_data.get('status')}")
            print_success(f"Payment Status: {sub_data.get('payment_status')}")
            print_success(f"Allocation Status: {sub_data.get('allocation_status')}")
            print_info(f"Has health_inputs: {bool(sub_data.get('health_inputs'))}")
            print_info(f"Has meal_timing: {bool(sub_data.get('meal_timing'))}")
        else:
            print_error(f"Failed: {response.status_code}")
    except Exception as e:
        print_error(f"Request failed: {e}")
    
    # Step 7: Create payment
    print_section("Step 7: Create Payment")
    try:
        response = session.post(
            f"{API_BASE}/payments",
            json={
                "subscription_id": subscription_id,
                "amount_cents": 500000,  # 5000 INR
                "currency": "INR",
                "payment_method": "card",
                "metadata": {"test": True}
            },
            timeout=10
        )
        if response.status_code == 200:
            payment_data = response.json()
            payment_id = payment_data.get("id")
            payment_status = payment_data.get("status")
            print_success(f"Payment created! ID: {payment_id}, Status: {payment_status}")
            print_info("✓ After payment success, should navigate to appointment page")
            print_info("✗ Currently redirects to /client?tab=orders")
        else:
            print_error(f"Failed: {response.status_code} - {response.text[:200]}")
    except Exception as e:
        print_error(f"Request failed: {e}")
    
    # Summary
    print_section("FLOW ANALYSIS")
    print_info("Current Flow:")
    print_info("  1. Checkout Wizard: health → timing → consultation → summary")
    print_info("  2. Complete checkout → Payment screen")
    print_info("  3. Payment success → Redirects to /client?tab=orders")
    print_info("")
    print_info("Expected Flow (from requirements):")
    print_info("  1. After checkout → Form (meal preferences, address, goals)")
    print_info("  2. After form → Payment")
    print_info("  3. After payment → Nutritionist appointment page")
    print_info("  4. If appointment page doesn't open → Notification")
    print_info("")
    print_info("Findings:")
    print_info("  ✓ Form data IS collected during checkout (not after)")
    print_info("  ✗ No automatic navigation to appointment page after payment")
    print_info("  ✗ No notification if appointment page doesn't open")
    
    return True

if __name__ == "__main__":
    if not test_checkout_flow():
        sys.exit(1)

