# 🧪 ZyaeL NutriBox - Testing Documentation

## 📋 Testing Overview

This document provides comprehensive testing documentation for the ZyaeL NutriBox application, covering unit tests, integration tests, end-to-end tests, and automated testing strategies.

---

## 🏗️ Testing Architecture

### Testing Pyramid
```
        ┌─────────────────┐
        │   E2E Tests     │  ← Few, Slow, Expensive
        │   (Playwright)  │
        ├─────────────────┤
        │ Integration     │  ← Some, Medium Speed
        │ Tests (API)     │
        ├─────────────────┤
        │   Unit Tests    │  ← Many, Fast, Cheap
        │   (Jest/Pytest) │
        └─────────────────┘
```

### Test Categories
- **Unit Tests**: Individual component/function testing
- **Integration Tests**: API endpoint and database testing
- **End-to-End Tests**: Complete user workflow testing
- **Performance Tests**: Load and stress testing
- **Security Tests**: Vulnerability and penetration testing

---

## 🔧 Backend Testing

### Test Structure
```
api/tests/
├── unit/                    # Unit tests
│   ├── test_models.py
│   ├── test_schemas.py
│   └── test_utils.py
├── integration/             # Integration tests
│   ├── test_endpoints.py
│   ├── test_database.py
│   └── test_websocket.py
├── fixtures/                # Test fixtures
│   ├── sample_data.py
│   └── mock_data.py
├── conftest.py              # Pytest configuration
└── test_runner.py           # Test execution script
```

### Unit Tests

#### Model Tests (`test_models.py`)
```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from api.models import Base, Client, Order, DailyMealSchedule

@pytest.fixture
def db_session():
    """Create test database session"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    yield session
    session.close()

def test_client_creation(db_session):
    """Test client model creation"""
    client = Client(
        id="test-client-1",
        user_id="user-123",
        weight_start=70.0,
        weight_goal=65.0,
        height=170.0,
        age=30,
        gender="Female"
    )
    
    db_session.add(client)
    db_session.commit()
    
    retrieved_client = db_session.query(Client).filter(Client.id == "test-client-1").first()
    assert retrieved_client is not None
    assert retrieved_client.weight_start == 70.0
    assert retrieved_client.weight_goal == 65.0

def test_order_status_transitions(db_session):
    """Test order status transitions"""
    order = Order(
        id="test-order-1",
        client_id="client-123",
        meal_type="breakfast",
        status="pending"
    )
    
    db_session.add(order)
    db_session.commit()
    
    # Test status transition
    order.status = "preparing"
    db_session.commit()
    
    assert order.status == "preparing"
    
    # Test invalid status
    with pytest.raises(ValueError):
        order.status = "invalid_status"
```

#### Schema Tests (`test_schemas.py`)
```python
import pytest
from pydantic import ValidationError
from api.schemas import ClientCreate, OrderCreate, MealStatusUpdate

def test_client_create_schema():
    """Test client creation schema validation"""
    # Valid data
    valid_data = {
        "user_id": "user-123",
        "weight_start": 70.0,
        "weight_goal": 65.0,
        "height": 170.0,
        "age": 30,
        "gender": "Female"
    }
    
    client = ClientCreate(**valid_data)
    assert client.user_id == "user-123"
    assert client.weight_start == 70.0
    
    # Invalid data
    invalid_data = {
        "user_id": "user-123",
        "weight_start": -10.0,  # Negative weight
        "age": 150  # Invalid age
    }
    
    with pytest.raises(ValidationError):
        ClientCreate(**invalid_data)

def test_meal_status_update_schema():
    """Test meal status update schema"""
    valid_data = {
        "meal_type": "breakfast",
        "status": "preparing",
        "notes": "Started preparation"
    }
    
    update = MealStatusUpdate(**valid_data)
    assert update.meal_type == "breakfast"
    assert update.status == "preparing"
    
    # Test invalid meal type
    with pytest.raises(ValidationError):
        MealStatusUpdate(meal_type="invalid", status="preparing")
```

### Integration Tests

#### API Endpoint Tests (`test_endpoints.py`)
```python
import pytest
from fastapi.testclient import TestClient
from api.main import app
from api.database import get_db
from api.models import Base, Client, Order
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

@pytest.fixture
def client():
    """Create test client"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    
    def override_get_db():
        session = SessionLocal()
        try:
            yield session
        finally:
            session.close()
    
    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)

@pytest.fixture
def sample_client(client):
    """Create sample client for testing"""
    response = client.post("/api/clients", json={
        "user_id": "user-123",
        "weight_start": 70.0,
        "weight_goal": 65.0,
        "height": 170.0,
        "age": 30,
        "gender": "Female"
    })
    return response.json()

def test_create_client(client):
    """Test client creation endpoint"""
    response = client.post("/api/clients", json={
        "user_id": "user-123",
        "weight_start": 70.0,
        "weight_goal": 65.0,
        "height": 170.0,
        "age": 30,
        "gender": "Female"
    })
    
    assert response.status_code == 201
    data = response.json()
    assert data["user_id"] == "user-123"
    assert data["weight_start"] == 70.0

def test_get_clients(client, sample_client):
    """Test get clients endpoint"""
    response = client.get("/api/clients")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["user_id"] == "user-123"

def test_update_meal_status(client, sample_client):
    """Test meal status update endpoint"""
    # Create a daily meal schedule
    schedule_data = {
        "subscription_id": "sub-123",
        "date": "2024-01-20",
        "breakfast_item": "Oats Bowl",
        "breakfast_calories": 350,
        "breakfast_status": "pending"
    }
    
    response = client.post("/api/daily-meals", json=schedule_data)
    schedule_id = response.json()["id"]
    
    # Update meal status
    update_data = {
        "meal_type": "breakfast",
        "status": "preparing",
        "notes": "Started preparation"
    }
    
    response = client.patch(f"/api/daily-meals/{schedule_id}/meal-status", json=update_data)
    
    assert response.status_code == 200
    data = response.json()
    assert data["breakfast_status"] == "preparing"

def test_delivery_tracking(client, sample_client):
    """Test delivery tracking endpoints"""
    # Create an order
    order_data = {
        "client_id": sample_client["id"],
        "meal_type": "breakfast",
        "meal_item": "Oats Bowl",
        "calories": 350
    }
    
    response = client.post("/api/orders", json=order_data)
    order_id = response.json()["id"]
    
    # Assign delivery agent
    assign_data = {
        "order_id": order_id,
        "delivery_agent_id": "agent-123"
    }
    
    response = client.post("/api/delivery-tracking/assign", json=assign_data)
    assert response.status_code == 201
    
    # Update location
    location_data = {
        "latitude": "28.6139",
        "longitude": "77.2090",
        "status": "in_transit"
    }
    
    response = client.post(f"/api/delivery-tracking/{order_id}/location", json=location_data)
    assert response.status_code == 200
```

#### WebSocket Tests (`test_websocket.py`)
```python
import pytest
import asyncio
import websockets
from api.main import app
from api.connection_manager import ConnectionManager

@pytest.fixture
def websocket_url():
    """Get WebSocket URL"""
    return "ws://localhost:8000/ws"

@pytest.mark.asyncio
async def test_websocket_connection(websocket_url):
    """Test WebSocket connection"""
    async with websockets.connect(websocket_url) as websocket:
        # Send subscription message
        await websocket.send('{"action": "subscribe", "channel": "test_channel"}')
        
        # Wait for confirmation
        response = await websocket.recv()
        data = json.loads(response)
        assert data["type"] == "subscription_confirmed"

@pytest.mark.asyncio
async def test_meal_status_broadcast(websocket_url):
    """Test meal status broadcast"""
    async with websockets.connect(websocket_url) as websocket:
        # Subscribe to client channel
        await websocket.send('{"action": "subscribe", "channel": "client_test-123"}')
        
        # Simulate meal status update
        manager = ConnectionManager()
        await manager.broadcast_to_channel("client_test-123", {
            "type": "meal.preparing",
            "data": {
                "order_id": "order-123",
                "client_id": "test-123",
                "meal_type": "breakfast"
            }
        })
        
        # Wait for message
        response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
        data = json.loads(response)
        assert data["type"] == "meal.preparing"
        assert data["data"]["meal_type"] == "breakfast"
```

### Performance Tests

#### Load Testing (`test_performance.py`)
```python
import pytest
import asyncio
import aiohttp
import time
from concurrent.futures import ThreadPoolExecutor

@pytest.mark.asyncio
async def test_api_load():
    """Test API under load"""
    async def make_request(session):
        async with session.get("http://localhost:8000/api/health") as response:
            return await response.json()
    
    async with aiohttp.ClientSession() as session:
        # Create 100 concurrent requests
        tasks = [make_request(session) for _ in range(100)]
        start_time = time.time()
        
        results = await asyncio.gather(*tasks)
        end_time = time.time()
        
        # Verify all requests succeeded
        assert all(result["status"] == "healthy" for result in results)
        
        # Check response time
        avg_response_time = (end_time - start_time) / 100
        assert avg_response_time < 1.0  # Less than 1 second average

def test_database_performance():
    """Test database query performance"""
    from api.database import SessionLocal
    from api.models import Order
    
    db = SessionLocal()
    
    # Test query performance
    start_time = time.time()
    orders = db.query(Order).limit(1000).all()
    end_time = time.time()
    
    query_time = end_time - start_time
    assert query_time < 0.5  # Less than 500ms
    assert len(orders) <= 1000
    
    db.close()
```

---

## 🎨 Frontend Testing

### Test Structure
```
client/src/
├── __tests__/               # Test files
│   ├── components/          # Component tests
│   ├── pages/              # Page tests
│   ├── hooks/              # Hook tests
│   └── utils/              # Utility tests
├── test-utils/             # Test utilities
│   ├── render.tsx          # Custom render function
│   ├── mock-data.ts        # Mock data
│   └── server.ts           # MSW server setup
└── setupTests.ts           # Test setup
```

### Component Tests

#### MealStatusCard Test
```typescript
// __tests__/components/MealStatusCard.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MealStatusCard } from '@/components/MealStatusCard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('MealStatusCard', () => {
  const defaultProps = {
    orderId: 'order-123',
    mealType: 'breakfast' as const,
    mealItem: 'Oats Bowl with Berries',
    calories: 350,
    status: 'preparing',
    kitchenStatus: 'preparing',
    onConsumptionLog: jest.fn(),
  };

  it('renders meal information correctly', () => {
    renderWithQueryClient(<MealStatusCard {...defaultProps} />);
    
    expect(screen.getByText('Breakfast - Oats Bowl with Berries')).toBeInTheDocument();
    expect(screen.getByText('350 cal')).toBeInTheDocument();
    expect(screen.getByText('Preparing')).toBeInTheDocument();
  });

  it('shows progress bar with correct value', () => {
    renderWithQueryClient(<MealStatusCard {...defaultProps} />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '25');
  });

  it('calls onConsumptionLog when consumption is logged', async () => {
    const mockOnConsumptionLog = jest.fn();
    renderWithQueryClient(
      <MealStatusCard 
        {...defaultProps} 
        status="delivered"
        onConsumptionLog={mockOnConsumptionLog}
      />
    );
    
    const consumeButton = screen.getByText('Mark as Consumed');
    fireEvent.click(consumeButton);
    
    await waitFor(() => {
      expect(mockOnConsumptionLog).toHaveBeenCalledWith('consumed', undefined);
    });
  });

  it('shows skip dialog when skip button is clicked', async () => {
    renderWithQueryClient(
      <MealStatusCard 
        {...defaultProps} 
        status="delivered"
      />
    );
    
    const skipButton = screen.getByText('Skip Meal');
    fireEvent.click(skipButton);
    
    await waitFor(() => {
      expect(screen.getByText('Why are you skipping this meal?')).toBeInTheDocument();
    });
  });
});
```

#### useRealtime Hook Test
```typescript
// __tests__/hooks/useRealtime.test.tsx
import { renderHook, act } from '@testing-library/react';
import { useRealtime } from '@/hooks/use-realtime';
import { DeliveryWebSocket } from '@/lib/websocket';

// Mock WebSocket
jest.mock('@/lib/websocket');
const MockWebSocket = DeliveryWebSocket as jest.MockedClass<typeof DeliveryWebSocket>;

describe('useRealtime', () => {
  let mockWebSocket: jest.Mocked<DeliveryWebSocket>;

  beforeEach(() => {
    mockWebSocket = {
      on: jest.fn(),
      send: jest.fn(),
      close: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    } as any;
    
    MockWebSocket.mockImplementation(() => mockWebSocket);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('connects to WebSocket on mount', () => {
    renderHook(() => useRealtime({
      events: ['meal.preparing'],
      channels: ['client_123'],
    }));

    expect(MockWebSocket).toHaveBeenCalled();
    expect(mockWebSocket.on).toHaveBeenCalledWith('open', expect.any(Function));
    expect(mockWebSocket.subscribe).toHaveBeenCalledWith('client_123');
  });

  it('calls onEvent when message is received', () => {
    const mockOnEvent = jest.fn();
    
    renderHook(() => useRealtime({
      events: ['meal.preparing'],
      onEvent: mockOnEvent,
    }));

    // Simulate message received
    const messageHandler = mockWebSocket.on.mock.calls.find(
      call => call[0] === 'message'
    )?.[1];
    
    const testEvent = {
      type: 'meal.preparing',
      data: { order_id: 'order-123' },
      timestamp: '2024-01-20T10:00:00Z',
    };
    
    act(() => {
      messageHandler?.(testEvent);
    });

    expect(mockOnEvent).toHaveBeenCalledWith(testEvent);
  });

  it('returns connection status', () => {
    const { result } = renderHook(() => useRealtime({
      events: ['meal.preparing'],
    }));

    expect(result.current.isConnected).toBe(false);

    // Simulate connection open
    const openHandler = mockWebSocket.on.mock.calls.find(
      call => call[0] === 'open'
    )?.[1];
    
    act(() => {
      openHandler?.();
    });

    expect(result.current.isConnected).toBe(true);
  });
});
```

### Page Tests

#### ClientPortal Test
```typescript
// __tests__/pages/ClientPortal.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ClientPortal from '@/pages/ClientPortal';
import { useAuth } from '@/hooks/useAuth';

// Mock authentication
jest.mock('@/hooks/useAuth');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

describe('ClientPortal', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'client',
      },
      login: jest.fn(),
      logout: jest.fn(),
      isLoading: false,
    });
  });

  it('renders home tab by default', () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ClientPortal />
      </QueryClientProvider>
    );

    expect(screen.getByText('Home-Cooked Goodness, Perfected by Nutritionists')).toBeInTheDocument();
  });

  it('switches to track tab when clicked', () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ClientPortal />
      </QueryClientProvider>
    );

    const trackTab = screen.getByText('Track');
    fireEvent.click(trackTab);

    expect(screen.getByText('Your Nutrition Journey')).toBeInTheDocument();
  });

  it('shows user information', () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ClientPortal />
      </QueryClientProvider>
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
```

---

## 🔄 End-to-End Testing

### Playwright Configuration
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### E2E Test Examples

#### Complete User Journey Test
```typescript
// e2e/user-journey.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Complete User Journey', () => {
  test('client can view meal status and log consumption', async ({ page }) => {
    // Navigate to client portal
    await page.goto('/');
    
    // Select client role
    await page.click('[data-testid="role-client"]');
    
    // Wait for portal to load
    await page.waitForSelector('[data-testid="client-portal"]');
    
    // Navigate to track tab
    await page.click('text=Track');
    
    // Check meal status card is visible
    await expect(page.locator('[data-testid="meal-status-card"]')).toBeVisible();
    
    // Wait for meal to be delivered (simulated)
    await page.waitForSelector('text=Delivered', { timeout: 10000 });
    
    // Click consume button
    await page.click('text=Mark as Consumed');
    
    // Verify consumption logged
    await expect(page.locator('text=Meal consumed successfully')).toBeVisible();
  });

  test('kitchen can update meal status', async ({ page }) => {
    // Navigate to kitchen portal
    await page.goto('/');
    await page.click('[data-testid="role-kitchen"]');
    
    // Wait for kitchen dashboard
    await page.waitForSelector('[data-testid="kitchen-portal"]');
    
    // Find pending order
    const pendingOrder = page.locator('[data-testid="pending-order"]').first();
    await expect(pendingOrder).toBeVisible();
    
    // Start preparation
    await pendingOrder.click('text=Start Preparation');
    
    // Verify status updated
    await expect(pendingOrder.locator('text=Preparing')).toBeVisible();
    
    // Mark as packed
    await pendingOrder.click('text=Mark Packed');
    
    // Verify packed status
    await expect(pendingOrder.locator('text=Packed')).toBeVisible();
  });

  test('delivery agent can track location', async ({ page }) => {
    // Navigate to delivery portal
    await page.goto('/');
    await page.click('[data-testid="role-delivery"]');
    
    // Wait for delivery dashboard
    await page.waitForSelector('[data-testid="delivery-portal"]');
    
    // Accept delivery assignment
    const assignedOrder = page.locator('[data-testid="assigned-order"]').first();
    await assignedOrder.click('text=Accept');
    
    // Verify GPS tracking is active
    await expect(page.locator('[data-testid="gps-status"]')).toContainText('Active');
    
    // Mark delivery complete
    await assignedOrder.click('text=Mark Delivered');
    
    // Verify delivery completed
    await expect(page.locator('text=Delivery completed successfully')).toBeVisible();
  });
});
```

#### Real-time Updates Test
```typescript
// e2e/realtime-updates.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Real-time Updates', () => {
  test('meal status updates in real-time', async ({ browser }) => {
    // Create two browser contexts
    const clientContext = await browser.newContext();
    const kitchenContext = await browser.newContext();
    
    const clientPage = await clientContext.newPage();
    const kitchenPage = await kitchenContext.newPage();
    
    // Setup client portal
    await clientPage.goto('/');
    await clientPage.click('[data-testid="role-client"]');
    await clientPage.click('text=Track');
    
    // Setup kitchen portal
    await kitchenPage.goto('/');
    await kitchenPage.click('[data-testid="role-kitchen"]');
    
    // Kitchen updates meal status
    await kitchenPage.click('[data-testid="start-preparation"]');
    
    // Verify client sees update in real-time
    await expect(clientPage.locator('text=Preparing')).toBeVisible({ timeout: 5000 });
    
    // Kitchen marks as packed
    await kitchenPage.click('[data-testid="mark-packed"]');
    
    // Verify client sees packed status
    await expect(clientPage.locator('text=Packed')).toBeVisible({ timeout: 5000 });
    
    await clientContext.close();
    await kitchenContext.close();
  });
});
```

---

## 🚀 Automated Testing Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_nutribox
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:6
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'
    
    - name: Install dependencies
      run: |
        cd api
        pip install -r requirements.txt
        pip install pytest pytest-asyncio pytest-cov
    
    - name: Run backend tests
      run: |
        cd api
        pytest tests/ --cov=. --cov-report=xml
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_nutribox
        REDIS_URL: redis://localhost:6379
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./api/coverage.xml

  frontend-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: client/package-lock.json
    
    - name: Install dependencies
      run: |
        cd client
        npm ci
    
    - name: Run frontend tests
      run: |
        cd client
        npm run test:ci
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./client/coverage/lcov.info

  e2e-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: client/package-lock.json
    
    - name: Install dependencies
      run: |
        cd client
        npm ci
    
    - name: Install Playwright
      run: |
        cd client
        npx playwright install --with-deps
    
    - name: Run E2E tests
      run: |
        cd client
        npm run test:e2e
    
    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: failure()
      with:
        name: playwright-report
        path: client/playwright-report/
```

### Test Scripts
```json
// client/package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:ci": "jest --ci --coverage --watchAll=false",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm run test && npm run test:e2e"
  }
}
```

---

## 📊 Test Coverage & Metrics

### Coverage Configuration
```javascript
// jest.config.js
module.exports = {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### Coverage Reports
- **Unit Tests**: Target 90%+ coverage
- **Integration Tests**: Target 80%+ coverage
- **E2E Tests**: Cover critical user paths

### Performance Benchmarks
```typescript
// Performance test example
test('API response time benchmark', async () => {
  const startTime = Date.now();
  
  const response = await fetch('/api/health');
  const data = await response.json();
  
  const endTime = Date.now();
  const responseTime = endTime - startTime;
  
  expect(responseTime).toBeLessThan(200); // Less than 200ms
  expect(data.status).toBe('healthy');
});
```

---

## 🐛 Debugging Tests

### Common Test Issues

#### 1. Async/Await Issues
```typescript
// ❌ Wrong
test('async test', () => {
  fetch('/api/data').then(data => {
    expect(data).toBeDefined();
  });
});

// ✅ Correct
test('async test', async () => {
  const data = await fetch('/api/data');
  expect(data).toBeDefined();
});
```

#### 2. Component Not Found
```typescript
// ❌ Wrong
expect(screen.getByText('Submit')).toBeInTheDocument();

// ✅ Correct
expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
```

#### 3. WebSocket Testing
```typescript
// Mock WebSocket for testing
global.WebSocket = jest.fn(() => ({
  close: jest.fn(),
  send: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));
```

### Debug Commands
```bash
# Run tests with debug output
npm run test -- --verbose

# Run specific test file
npm run test -- MealStatusCard.test.tsx

# Run tests in watch mode
npm run test:watch

# Debug E2E tests
npm run test:e2e:ui
```

---

## 📈 Continuous Testing

### Pre-commit Hooks
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged && npm run test:ci",
      "pre-push": "npm run test:all"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

### Test Monitoring
- **Test Results**: Track pass/fail rates
- **Coverage Trends**: Monitor coverage changes
- **Performance**: Track test execution time
- **Flaky Tests**: Identify and fix unstable tests

---

*This testing documentation is maintained alongside the codebase and updated with each test modification.*
