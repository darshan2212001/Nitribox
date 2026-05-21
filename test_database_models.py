"""
Test Database Models - Verify all new models can be imported and initialized
This tests the database schema without requiring the API server
"""

import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """Test that all modules can be imported"""
    print("=" * 60)
    print("Testing Module Imports")
    print("=" * 60)
    
    try:
        from api import models
        print("✓ Models imported successfully")
        
        from api.event_store import EventStore
        print("✓ EventStore imported successfully")
        
        from api.audit_logger import AuditLogger
        print("✓ AuditLogger imported successfully")
        
        from api.state_machine import OrderStateMachine, KitchenStatusStateMachine
        print("✓ StateMachine classes imported successfully")
        
        from api.services.payment_service import PaymentService
        print("✓ PaymentService imported successfully")
        
        from api.endpoints import payments, addresses, notifications
        print("✓ Payment endpoints imported successfully")
        print("✓ Address endpoints imported successfully")
        print("✓ Notification endpoints imported successfully")
        
        return True
    except ImportError as e:
        print(f"✗ Import failed: {e}")
        return False

def test_models():
    """Test that all models have required attributes"""
    print("\n" + "=" * 60)
    print("Testing Model Definitions")
    print("=" * 60)
    
    from api import models
    
    # Test Event model
    assert hasattr(models, 'Event'), "Event model not found"
    assert hasattr(models.Event, '__tablename__'), "Event missing __tablename__"
    assert models.Event.__tablename__ == 'events', "Event table name incorrect"
    print("✓ Event model valid")
    
    # Test AuditLog model
    assert hasattr(models, 'AuditLog'), "AuditLog model not found"
    assert models.AuditLog.__tablename__ == 'audit_logs', "AuditLog table name incorrect"
    print("✓ AuditLog model valid")
    
    # Test Payment model
    assert hasattr(models, 'Payment'), "Payment model not found"
    assert models.Payment.__tablename__ == 'payments', "Payment table name incorrect"
    print("✓ Payment model valid")
    
    # Test Refund model
    assert hasattr(models, 'Refund'), "Refund model not found"
    assert models.Refund.__tablename__ == 'refunds', "Refund table name incorrect"
    print("✓ Refund model valid")
    
    # Test Address model
    assert hasattr(models, 'Address'), "Address model not found"
    assert models.Address.__tablename__ == 'addresses', "Address table name incorrect"
    print("✓ Address model valid")
    
    # Test Notification model
    assert hasattr(models, 'Notification'), "Notification model not found"
    assert models.Notification.__tablename__ == 'notifications', "Notification table name incorrect"
    print("✓ Notification model valid")
    
    # Test DeviceToken model
    assert hasattr(models, 'DeviceToken'), "DeviceToken model not found"
    assert models.DeviceToken.__tablename__ == 'device_tokens', "DeviceToken table name incorrect"
    print("✓ DeviceToken model valid")
    
    # Test Order model has new fields
    assert hasattr(models.Order, 'version'), "Order missing version field"
    assert hasattr(models.Order, 'idempotency_key'), "Order missing idempotency_key field"
    assert hasattr(models.Order, 'notes'), "Order missing notes field"
    print("✓ Order model has new fields (version, idempotency_key, notes)")
    
    return True

def test_state_machine():
    """Test state machine validation"""
    print("\n" + "=" * 60)
    print("Testing State Machine Validation")
    print("=" * 60)
    
    from api.state_machine import OrderStateMachine, KitchenStatusStateMachine
    
    # Test valid transition
    is_valid, msg = OrderStateMachine.is_valid_transition('pending', 'preparing')
    assert is_valid, f"Valid transition rejected: {msg}"
    print("✓ Valid transition (pending -> preparing) accepted")
    
    # Test invalid transition
    is_valid, msg = OrderStateMachine.is_valid_transition('pending', 'delivered')
    assert not is_valid, "Invalid transition should be rejected"
    print("✓ Invalid transition (pending -> delivered) correctly rejected")
    
    # Test terminal state
    is_valid, msg = OrderStateMachine.is_valid_transition('completed', 'preparing')
    assert not is_valid, "Terminal state transition should be rejected"
    print("✓ Terminal state transition correctly rejected")
    
    # Test kitchen state machine
    try:
        KitchenStatusStateMachine.validate_transition('pending', 'preparing')
        print("✓ Kitchen state machine validation working")
    except Exception as e:
        print(f"✗ Kitchen state machine error: {e}")
        return False
    
    return True

def test_event_store():
    """Test event store functionality"""
    print("\n" + "=" * 60)
    print("Testing Event Store")
    print("=" * 60)
    
    from api.event_store import EventStore
    
    # Check that methods exist
    assert hasattr(EventStore, 'append_event'), "EventStore missing append_event"
    assert hasattr(EventStore, 'get_events_by_aggregate'), "EventStore missing get_events_by_aggregate"
    assert hasattr(EventStore, 'get_events_by_type'), "EventStore missing get_events_by_type"
    assert hasattr(EventStore, 'replay_events'), "EventStore missing replay_events"
    print("✓ EventStore has all required methods")
    
    return True

def test_audit_logger():
    """Test audit logger functionality"""
    print("\n" + "=" * 60)
    print("Testing Audit Logger")
    print("=" * 60)
    
    from api.audit_logger import AuditLogger
    
    # Check that methods exist
    assert hasattr(AuditLogger, 'log_action'), "AuditLogger missing log_action"
    assert hasattr(AuditLogger, 'log_create'), "AuditLogger missing log_create"
    assert hasattr(AuditLogger, 'log_update'), "AuditLogger missing log_update"
    assert hasattr(AuditLogger, 'log_delete'), "AuditLogger missing log_delete"
    print("✓ AuditLogger has all required methods")
    
    return True

def test_payment_service():
    """Test payment service functionality"""
    print("\n" + "=" * 60)
    print("Testing Payment Service")
    print("=" * 60)
    
    from api.services.payment_service import PaymentService
    
    # Check that methods exist
    assert hasattr(PaymentService, 'generate_provider_id'), "PaymentService missing generate_provider_id"
    assert hasattr(PaymentService, 'process_payment'), "PaymentService missing process_payment"
    assert hasattr(PaymentService, 'initiate_payment'), "PaymentService missing initiate_payment"
    assert hasattr(PaymentService, 'process_refund'), "PaymentService missing process_refund"
    assert hasattr(PaymentService, 'verify_payment_webhook'), "PaymentService missing verify_payment_webhook"
    print("✓ PaymentService has all required methods")
    
    # Test provider ID generation
    provider_id = PaymentService.generate_provider_id()
    assert provider_id.startswith('mock_txn_'), f"Invalid provider ID format: {provider_id}"
    print("✓ Provider ID generation working")
    
    return True

def run_all_tests():
    """Run all tests"""
    print("\n" + "=" * 60)
    print("Phase 1 & Phase 2 - Database Models & Services Test")
    print("=" * 60 + "\n")
    
    results = {
        "passed": 0,
        "failed": 0
    }
    
    tests = [
        ("Module Imports", test_imports),
        ("Model Definitions", test_models),
        ("State Machine", test_state_machine),
        ("Event Store", test_event_store),
        ("Audit Logger", test_audit_logger),
        ("Payment Service", test_payment_service),
    ]
    
    for test_name, test_func in tests:
        try:
            if test_func():
                results["passed"] += 1
            else:
                results["failed"] += 1
                print(f"\n✗ {test_name} failed")
        except Exception as e:
            results["failed"] += 1
            print(f"\n✗ {test_name} failed with exception: {e}")
            import traceback
            traceback.print_exc()
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    print(f"✓ Passed: {results['passed']}")
    print(f"✗ Failed: {results['failed']}")
    print("=" * 60 + "\n")
    
    if results['failed'] == 0:
        print("✓ All tests passed! The code structure is correct.")
        print("\nNote: To test API endpoints, start the server and run test_phase1_phase2.py")
        print("  uvicorn api.main:app --reload")
    else:
        print("✗ Some tests failed. Please review the errors above.")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(run_all_tests())

