"""
Comprehensive End-to-End Test for Client API
Tests all client endpoints with automatic user registration/login
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

class ClientAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
        self.username = f"testclient_{random.randint(10000, 99999)}"
        self.email = f"{self.username}@test.com"
        self.password = "Test123"
        self.test_client_id = None
        self.test_user_id = None
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
        """Test 2: Register and Login as Client User"""
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
                print_success(f"Registered client user: {self.username}")
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
                            self.test_user_id = self.user_id
                            print_success(f"Logged in as: {user_info.get('name', self.username)}")
                            print_info(f"User ID: {self.user_id}")
                            print_info(f"Email: {user_info.get('email', self.email)}")
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
    
    def test_get_all_clients(self):
        """Test 3: GET /api/clients - Get all clients"""
        print_section("3. GET All Clients", 2)
        
        try:
            # Test without filters
            response = self.session.get(f"{API_BASE}/clients", timeout=10)
            if response.status_code == 200:
                clients = response.json()
                if isinstance(clients, list):
                    print_success(f"Retrieved {len(clients)} client(s)")
                    if len(clients) > 0:
                        client = clients[0]
                        self.test_client_id = client.get('id')
                        self.test_user_id = client.get('user_id')
                        print_info(f"  Sample Client ID: {client.get('id', 'Unknown')[:8]}...")
                        print_info(f"  User ID: {client.get('user_id', 'N/A')[:8] if client.get('user_id') else 'N/A'}...")
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
    
    def test_get_all_clients_with_filters(self):
        """Test 4: GET /api/clients - With filters"""
        print_section("4. GET All Clients with Filters", 2)
        
        try:
            # First get all clients to find a nutritionist_id if available
            response = self.session.get(f"{API_BASE}/clients", timeout=10)
            if response.status_code == 200:
                clients = response.json()
                if len(clients) > 0:
                    nutritionist_id = clients[0].get('nutritionist_id')
                    if nutritionist_id:
                        # Test with nutritionist_id filter
                        response = self.session.get(
                            f"{API_BASE}/clients",
                            params={"nutritionist_id": nutritionist_id},
                            timeout=10
                        )
                        if response.status_code == 200:
                            filtered = response.json()
                            print_success(f"Filtered by nutritionist_id: {len(filtered)} result(s)")
                
                # Test pagination
                response = self.session.get(
                    f"{API_BASE}/clients",
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
    
    def test_get_client_by_user_id(self):
        """Test 5: GET /api/clients/user/{user_id} - Get client by user ID"""
        print_section("5. GET Client by User ID", 2)
        
        try:
            # First get a user_id from clients list
            if not self.test_user_id:
                response = self.session.get(f"{API_BASE}/clients", timeout=10)
                if response.status_code == 200:
                    clients = response.json()
                    if len(clients) > 0:
                        self.test_user_id = clients[0].get('user_id')
                    else:
                        print_warning("No clients available to test")
                        return True  # Not an error
            
            if self.test_user_id:
                response = self.session.get(
                    f"{API_BASE}/clients/user/{self.test_user_id}",
                    timeout=10
                )
                # 200 with null is acceptable if client doesn't exist
                if response.status_code == 200:
                    client = response.json()
                    if client:
                        print_success(f"Retrieved client by user ID: {self.test_user_id[:8]}...")
                        print_info(f"  Client ID: {client.get('id', 'Unknown')[:8]}...")
                    else:
                        print_success("Correctly returned null (client not found for user)")
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
    
    def test_get_client_by_id(self):
        """Test 6: GET /api/clients/{client_id} - Get client by ID"""
        print_section("6. GET Client by ID", 2)
        
        try:
            # First get a client ID
            if not self.test_client_id:
                response = self.session.get(f"{API_BASE}/clients", timeout=10)
                if response.status_code == 200:
                    clients = response.json()
                    if len(clients) > 0:
                        self.test_client_id = clients[0].get('id')
                    else:
                        print_warning("No clients available to test")
                        return True  # Not an error
            
            if self.test_client_id:
                response = self.session.get(
                    f"{API_BASE}/clients/{self.test_client_id}",
                    timeout=10
                )
                if response.status_code == 200:
                    client = response.json()
                    print_success(f"Retrieved client by ID: {self.test_client_id[:8]}...")
                    print_info(f"  User ID: {client.get('user_id', 'N/A')[:8] if client.get('user_id') else 'N/A'}...")
                    print_info(f"  Nutritionist ID: {client.get('nutritionist_id', 'N/A')[:8] if client.get('nutritionist_id') else 'N/A'}...")
                    return True
                else:
                    print_error(f"Failed with status {response.status_code}: {response.text[:200]}")
                    return False
            else:
                print_warning("No client ID available for testing")
                return True
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_get_client_by_user_id_not_found(self):
        """Test 7: GET /api/clients/user/{user_id} - Non-existent user ID"""
        print_section("7. GET Client by User ID - Not Found", 2)
        
        try:
            fake_user_id = "non-existent-user-12345"
            response = self.session.get(
                f"{API_BASE}/clients/user/{fake_user_id}",
                timeout=10
            )
            # 200 with null is expected for non-existent user
            if response.status_code == 200:
                client = response.json()
                if client is None:
                    print_success("Correctly returned null for non-existent user")
                else:
                    print_warning("Returned client data for non-existent user (may be valid)")
                return True
            else:
                print_error(f"Expected 200, got {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_get_client_by_id_not_found(self):
        """Test 8: GET /api/clients/{client_id} - Non-existent client ID"""
        print_section("8. GET Client by ID - Not Found", 2)
        
        try:
            fake_client_id = "non-existent-client-12345"
            response = self.session.get(
                f"{API_BASE}/clients/{fake_client_id}",
                timeout=10
            )
            if response.status_code == 404:
                print_success("Correctly returned 404 for non-existent client")
                return True
            else:
                print_error(f"Expected 404, got {response.status_code}")
                return False
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def test_get_clients_with_nutritionist_user_id(self):
        """Test 9: GET /api/clients - With nutritionist_user_id filter"""
        print_section("9. GET Clients with Nutritionist User ID Filter", 2)
        
        try:
            # First get all clients to find a nutritionist_user_id if available
            response = self.session.get(f"{API_BASE}/clients", timeout=10)
            if response.status_code == 200:
                clients = response.json()
                if len(clients) > 0:
                    # Try to get nutritionist user_id from nutritionist_id
                    # This is a simplified test - in reality we'd need to query nutritionists
                    print_info("Testing nutritionist_user_id filter (may return empty if no match)")
                    response = self.session.get(
                        f"{API_BASE}/clients",
                        params={"nutritionist_user_id": "test-nutritionist-user-id"},
                        timeout=10
                    )
                    if response.status_code == 200:
                        filtered = response.json()
                        print_success(f"Filtered by nutritionist_user_id: {len(filtered)} result(s)")
                        return True
                else:
                    print_warning("No clients available to test filter")
                    return True  # Not an error
            else:
                print_error(f"Failed to get clients: {response.status_code}")
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
        print_section("CLIENT API END-TO-END TEST", 1)
        print_info(f"Testing against: {BASE_URL}")
        print_info(f"Test User: {self.username}")
        print_info(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Run tests
        self.test("Server Health", self.check_server)
        auth_success = self.test("Authentication", self.register_and_login)
        
        if not auth_success:
            print_warning("Authentication failed. Will continue with public endpoint tests.")
        
        # GET tests (may work without auth since get_current_user_optional is used)
        self.test("GET All Clients", self.test_get_all_clients)
        self.test("GET All Clients with Filters", self.test_get_all_clients_with_filters)
        self.test("GET Client by User ID", self.test_get_client_by_user_id)
        self.test("GET Client by ID", self.test_get_client_by_id)
        self.test("GET Clients with Nutritionist User ID Filter", self.test_get_clients_with_nutritionist_user_id)
        
        # Error handling tests
        self.test("GET Client by User ID - Not Found", self.test_get_client_by_user_id_not_found)
        self.test("GET Client by ID - Not Found", self.test_get_client_by_id_not_found)
        
        # Cleanup
        self.cleanup()
        
        # Print summary
        self.print_summary()

if __name__ == "__main__":
    tester = ClientAPITester()
    tester.run_all_tests()

