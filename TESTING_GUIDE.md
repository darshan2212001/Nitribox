# Testing Guide - Phase 1 & Phase 2

## Quick Test Status

✅ **All code structure tests passed** (22/22)

## Running Tests

### 1. Structural Tests (No Server Required)
```bash
python test_database_models.py
```
This tests:
- Module imports
- Model definitions
- State machine validation
- Service methods

### 2. API Endpoint Tests (Server Required)

**Start the server first:**
```bash
uvicorn api.main:app --reload
```

**Then run API tests:**
```bash
python test_phase1_phase2.py
```

This tests:
- Authentication
- Order creation with idempotency
- State machine validation
- Optimistic concurrency
- Payment processing
- Refunds
- Address management
- Notifications
- Device tokens

## Database Migration Required

Before testing API endpoints, create the new tables:

```python
from api.database import engine, Base
from api import models

# Create all tables
Base.metadata.create_all(bind=engine)
```

Or use Alembic if configured.

## Test Credentials

Update in `test_phase1_phase2.py`:
```python
TEST_USERNAME = "dittomohan22"
TEST_PASSWORD = "testpass123"
```

## Expected API Endpoints

### Payments
- `POST /api/payments/` - Create payment
- `GET /api/payments/` - List payments
- `GET /api/payments/{id}` - Get payment
- `POST /api/payments/refund` - Create refund
- `POST /api/payments/webhook` - Payment webhook

### Addresses
- `POST /api/addresses/` - Create address
- `GET /api/addresses/` - List addresses
- `GET /api/addresses/{id}` - Get address
- `PATCH /api/addresses/{id}` - Update address
- `DELETE /api/addresses/{id}` - Delete address
- `GET /api/addresses/client/{id}/default` - Get default address

### Notifications
- `POST /api/notifications/` - Create notification
- `GET /api/notifications/` - List notifications
- `PATCH /api/notifications/{id}` - Update notification
- `POST /api/notifications/device-tokens` - Register device token
- `GET /api/notifications/device-tokens` - List device tokens
- `DELETE /api/notifications/device-tokens/{id}` - Deactivate token

## Troubleshooting

### Server Timeout
- Check if server is running: `netstat -ano | findstr :8000`
- Restart server: `uvicorn api.main:app --reload`
- Check server logs for errors

### Import Errors
- Ensure you're in the project root directory
- Check Python path includes the project
- Verify all dependencies installed: `pip install -r requirements.txt`

### Database Errors
- Ensure database is accessible
- Run migrations to create new tables
- Check database permissions

