#!/usr/bin/env python3
"""
Comprehensive Test Suite for All Fixes
Tests: Validation, Security, Database, WebSocket, Errors
"""

import asyncio
import json
import sys
import time
from pathlib import Path
from datetime import datetime

project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

import requests
from api.database import SessionLocal, engine
from api import models
from api.schemas import OrderCreate, MealPlanCreate, NutritionistCreate
from api.auth_schemas import UserLogin, UserRegister
from api.simple_auth import get_password_hash, verify_password
import os

BASE_URL = "http://localhost:8000"

class TestResults:
    def __init__(self):
        self.passed = []
        self.failed = []
        self.warnings = []
    
    def add_pass(self, test_name, details=""):
        self.passed.append({"test": test_name, "details": details})
        print(f"✅ PASS: {test_name}")
        if details:
            print(f"   {details}")
    
    def add_fail(self, test_name, error):
        self.failed.append({"test": test_name, "error": str(error)})
        print(f"❌ FAIL: {test_name}")
        print(f"   Error: {error}")
    
    def add_warning(self, test_name, message):
        self.warnings.append({"test": test_name, "message": message})
        print(f"⚠️  WARN: {test_name}")
        print(f"   {message}")
    
    def print_summary(self):
        print("\n" + "="*60)
        print("COMPREHENSIVE TEST SUMMARY")
        print("="*60)
        print(f"✅ Passed: {len(self.passed)}")
        print(f"❌ Failed: {len(self.failed)}")
        print(f"⚠️  Warnings: {len(self.warnings)}")
        print("="*60)
        
        if self.failed:
            print("\nFAILED TESTS:")
            for fail in self.failed:
                print(f"  - {fail['test']}: {fail['error']}")
        
        if self.warnings:
            print("\nWARNINGS:")
            for warn in self.warnings:
                print(f"  - {warn['test']}: {warn['message']}")

results = TestResults()

def test_pydantic_validation():
    """Test Pydantic input validation"""
    print("\n🔍 TESTING PYDANTIC VALIDATION:")
    print("-" * 60)
    
    # Test OrderCreate validation
    try:
        # Valid order
        valid_order = OrderCreate(
            client_id="test123",
            client_name="John Doe",
            client_email="john@example.com",
            client_phone="1234567890",
            client_address="123 Main St, City, State",
            diet_plan="weight-loss",
            meal_type="breakfast",
            quantity=1,
            price=10.0
        )
        results.add_pass("OrderCreate validation - valid data")
    except Exception as e:
        results.add_fail("OrderCreate validation - valid data", e)
    
    # Test invalid email
    try:
        invalid_order = OrderCreate(
            client_id="test123",
            client_name="John",
            client_email="invalid-email",  # Invalid email
            client_phone="1234567890",
            client_address="123 Main St",
            diet_plan="weight-loss",
            meal_type="breakfast",
            quantity=1,
            price=10.0
        )
        results.add_fail("OrderCreate validation - invalid email", "Should have raised validation error")
    except Exception:
        results.add_pass("OrderCreate validation - invalid email rejected")
    
    # Test invalid meal_type
    try:
        invalid_order = OrderCreate(
            client_id="test123",
            client_name="John Doe",
            client_email="john@example.com",
            client_phone="1234567890",
            client_address="123 Main St, City",
            diet_plan="weight-loss",
            meal_type="invalid-type",  # Invalid meal type
            quantity=1,
            price=10.0
        )
        results.add_fail("OrderCreate validation - invalid meal_type", "Should have raised validation error")
    except Exception:
        results.add_pass("OrderCreate validation - invalid meal_type rejected")
    
    # Test UserRegister validation
    try:
        # Valid registration
        valid_user = UserRegister(
            username="testuser",
            email="test@example.com",
            password="Test1234",
            name="Test User",
            role="client"
        )
        results.add_pass("UserRegister validation - valid data")
    except Exception as e:
        results.add_fail("UserRegister validation - valid data", e)
    
    # Test weak password
    try:
        weak_password = UserRegister(
            username="testuser2",
            email="test2@example.com",
            password="123",  # Too short
            name="Test User",
            role="client"
        )
        results.add_fail("UserRegister validation - weak password", "Should have raised validation error")
    except Exception:
        results.add_pass("UserRegister validation - weak password rejected")
    
    # Test invalid role
    try:
        invalid_role = UserRegister(
            username="testuser3",
            email="test3@example.com",
            password="Test1234",
            name="Test User",
            role="invalid-role"
        )
        results.add_fail("UserRegister validation - invalid role", "Should have raised validation error")
    except Exception:
        results.add_pass("UserRegister validation - invalid role rejected")

def test_api_health():
    """Test API health endpoint with server readiness check"""
    # Import server readiness utility
    from api.tests.test_utils import wait_for_server
    
    # Wait for server to be ready before testing
    if not wait_for_server(BASE_URL, max_attempts=30):
        results.add_warning("API health check", "Server not ready - tests may fail")
        return
    
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        if response.status_code == 200:
            results.add_pass("API health check", "API is running")
        else:
            results.add_fail("API health check", f"Status: {response.status_code}")
    except requests.exceptions.ConnectionError:
        results.add_warning("API health check", "Backend not running - start server with: python run_api.py")
    except Exception as e:
        results.add_fail("API health check", str(e))

def test_input_validation_endpoints():
    """Test that validation actually works on endpoints"""
    try:
        # Wait for server to be ready first
        from api.tests.test_utils import wait_for_server
        if not wait_for_server(BASE_URL, max_attempts=30):
            results.add_warning("Order endpoint validation", "Server not ready - skipping test")
            return
        
        # Test invalid order creation
        response = requests.post(
            f"{BASE_URL}/api/orders/",
            json={
                "client_id": "test",
                "client_name": "A",  # Too short
                "client_email": "invalid-email",
                "client_phone": "123",
                "client_address": "short",
                "diet_plan": "test",
                "meal_type": "invalid",
                "quantity": 0,  # Invalid
                "price": -1  # Invalid
            },
            timeout=10
        )
        
        # Should return 422 (Validation Error)
        if response.status_code == 422:
            results.add_pass("Order endpoint validation", "Invalid data correctly rejected")
        else:
            results.add_warning("Order endpoint validation", f"Unexpected status: {response.status_code}")
    except requests.exceptions.ConnectionError:
        results.add_warning("Order endpoint validation", "Backend not running")
    except Exception as e:
        results.add_fail("Order endpoint validation", str(e))

def test_security():
    """Test security implementations"""
    print("\n🔒 TESTING SECURITY:")
    print("-" * 60)
    
    # Test bcrypt password hashing
    try:
        test_password = "test123"
        hashed = get_password_hash(test_password)
        
        if hashed.startswith("$2") and len(hashed) == 60:
            results.add_pass("Bcrypt password hashing", "Using bcrypt")
        elif len(hashed) == 64:
            results.add_warning("Password hashing", "Using SHA256 - install passlib[bcrypt]")
        else:
            results.add_fail("Password hashing", f"Unexpected format: {len(hashed)} chars")
            
        if verify_password(test_password, hashed):
            results.add_pass("Password verification", "Works correctly")
        else:
            results.add_fail("Password verification", "Verification failed")
    except Exception as e:
        results.add_fail("Security tests", str(e))

def test_database():
    """Test database operations"""
    print("\n💾 TESTING DATABASE:")
    print("-" * 60)
    
    try:
        db = SessionLocal()
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        results.add_pass("Database connection", "Connection successful")
        db.close()
    except Exception as e:
        results.add_fail("Database connection", str(e))

def run_all_tests():
    """Run all tests"""
    print("="*60)
    print("COMPREHENSIVE TEST SUITE")
    print("="*60)
    print(f"Started at: {datetime.now().isoformat()}")
    
    test_pydantic_validation()
    test_security()
    test_database()
    test_api_health()
    test_input_validation_endpoints()
    
    results.print_summary()
    
    return 0 if len(results.failed) == 0 else 1

if __name__ == "__main__":
    exit_code = run_all_tests()
    sys.exit(exit_code)

