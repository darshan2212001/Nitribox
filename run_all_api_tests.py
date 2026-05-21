"""
Master Test Runner for All API Test Suites
Runs Nutritionist, Kitchen, and Delivery API tests and provides a comprehensive summary
"""

import subprocess
import sys
import time
from datetime import datetime

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_header(title):
    print(f"\n{Colors.BOLD}{Colors.HEADER}{'='*80}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.HEADER}  {title}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.HEADER}{'='*80}{Colors.RESET}\n")

def print_section(title):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'-'*60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}  {title}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'-'*60}{Colors.RESET}\n")

def run_test_suite(test_file, suite_name):
    """Run a test suite and return the exit code"""
    print_section(f"Running {suite_name} API Tests")
    print(f"{Colors.CYAN}Executing: python {test_file}{Colors.RESET}\n")
    
    start_time = time.time()
    try:
        result = subprocess.run(
            [sys.executable, test_file],
            capture_output=False,
            text=True
        )
        elapsed = time.time() - start_time
        return result.returncode, elapsed
    except Exception as e:
        elapsed = time.time() - start_time
        print(f"{Colors.RED}Error running {test_file}: {e}{Colors.RESET}")
        return 1, elapsed

def main():
    print_header("COMPREHENSIVE API TEST SUITE")
    print(f"{Colors.CYAN}Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{Colors.RESET}\n")
    
    test_suites = [
        ("test_nutritionist_api.py", "Nutritionist"),
        ("test_kitchen_api.py", "Kitchen"),
        ("test_delivery_api.py", "Delivery"),
        ("test_admin_api.py", "Admin"),
        ("test_client_api.py", "Client")
    ]
    
    results = []
    total_start_time = time.time()
    
    for test_file, suite_name in test_suites:
        exit_code, elapsed = run_test_suite(test_file, suite_name)
        results.append({
            "suite": suite_name,
            "file": test_file,
            "exit_code": exit_code,
            "elapsed": elapsed,
            "status": "PASS" if exit_code == 0 else "FAIL"
        })
        time.sleep(1)  # Small delay between test suites
    
    total_elapsed = time.time() - total_start_time
    
    # Print summary
    print_header("COMPREHENSIVE TEST SUMMARY")
    
    total_passed = sum(1 for r in results if r["status"] == "PASS")
    total_failed = sum(1 for r in results if r["status"] == "FAIL")
    total_suites = len(results)
    
    print(f"\n{Colors.BOLD}Test Suites Run: {total_suites}{Colors.RESET}")
    print(f"{Colors.GREEN}Passed: {total_passed}{Colors.RESET}")
    print(f"{Colors.RED}Failed: {total_failed}{Colors.RESET}")
    print(f"{Colors.CYAN}Total Time: {total_elapsed:.2f} seconds{Colors.RESET}\n")
    
    print(f"{Colors.BOLD}Individual Suite Results:{Colors.RESET}\n")
    for result in results:
        status_color = Colors.GREEN if result["status"] == "PASS" else Colors.RED
        status_icon = "✓" if result["status"] == "PASS" else "✗"
        print(f"  {status_color}{status_icon} {result['suite']:15} {Colors.RESET} - {result['elapsed']:.2f}s - {result['status']}")
    
    print(f"\n{Colors.CYAN}Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{Colors.RESET}\n")
    
    # Return exit code based on results
    return 0 if total_failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())

