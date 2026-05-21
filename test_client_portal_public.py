"""
Client Portal Public Endpoints Test
Tests endpoints that don't require authentication
"""

import requests
import sys
from datetime import datetime

BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    CYAN = '\033[96m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_section(title):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}  {title}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.RESET}")

def print_success(msg):
    print(f"{Colors.GREEN}✓ {msg}{Colors.RESET}")

def print_error(msg):
    print(f"{Colors.RED}✗ {msg}{Colors.RESET}")

def print_info(msg):
    print(f"{Colors.CYAN}ℹ {msg}{Colors.RESET}")

def test_public_endpoints():
    """Test public endpoints"""
    print_section("CLIENT PORTAL PUBLIC ENDPOINTS TEST")
    
    session = requests.Session()
    results = {"passed": 0, "failed": 0}
    
    # Test 1: Health Check
    print_section("1. Server Health")
    try:
        response = session.get(f"{BASE_URL}/api/health", timeout=5)
        if response.status_code == 200:
            print_success("Server is running")
            results["passed"] += 1
        else:
            print_error(f"Server returned {response.status_code}")
            results["failed"] += 1
    except Exception as e:
        print_error(f"Cannot connect: {e}")
        results["failed"] += 1
        return results
    
    # Test 2: Meal Plans (may be public)
    print_section("2. Meal Plans")
    try:
        response = session.get(f"{API_BASE}/meal-plans", params={"is_active": True}, timeout=10)
        if response.status_code == 200:
            plans = response.json()
            if isinstance(plans, list):
                print_success(f"Found {len(plans)} meal plan(s)")
                results["passed"] += 1
            else:
                print_error("Invalid response format")
                results["failed"] += 1
        elif response.status_code == 401:
            print_info("Meal plans require authentication (expected)")
            results["passed"] += 1
        else:
            print_error(f"Unexpected status: {response.status_code}")
            results["failed"] += 1
    except Exception as e:
        print_error(f"Request failed: {e}")
        results["failed"] += 1
    
    # Test 3: Nutritionists (may be public)
    print_section("3. Nutritionists")
    try:
        response = session.get(f"{API_BASE}/nutritionists", timeout=10)
        if response.status_code == 200:
            nutritionists = response.json()
            if isinstance(nutritionists, list):
                print_success(f"Found {len(nutritionists)} nutritionist(s)")
                results["passed"] += 1
            else:
                print_error("Invalid response format")
                results["failed"] += 1
        elif response.status_code == 401:
            print_info("Nutritionists require authentication (expected)")
            results["passed"] += 1
        else:
            print_error(f"Unexpected status: {response.status_code}")
            results["failed"] += 1
    except Exception as e:
        print_error(f"Request failed: {e}")
        results["failed"] += 1
    
    # Summary
    print_section("SUMMARY")
    total = results["passed"] + results["failed"]
    pass_rate = (results["passed"] / total * 100) if total > 0 else 0
    
    print(f"{Colors.BOLD}Total: {total}{Colors.RESET}")
    print(f"{Colors.GREEN}Passed: {results['passed']}{Colors.RESET}")
    print(f"{Colors.RED}Failed: {results['failed']}{Colors.RESET}")
    print(f"{Colors.BOLD}Pass Rate: {pass_rate:.1f}%{Colors.RESET}")
    
    print(f"\n{Colors.YELLOW}Note: Most client portal features require authentication.{Colors.RESET}")
    print(f"{Colors.YELLOW}For full testing, use the frontend at http://localhost:5000{Colors.RESET}")
    
    return results

if __name__ == "__main__":
    results = test_public_endpoints()
    sys.exit(0 if results["failed"] == 0 else 1)

