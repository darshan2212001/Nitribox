from pathlib import Path
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError, ResponseValidationError
from sqlalchemy.orm import Session
from typing import List, Optional
import json
from datetime import datetime
import os
import sys
import traceback
import asyncio
import time
from urllib.parse import urlparse

from api.database import engine, get_db, Base, verify_database_connection
from api import models, schemas
from api.simple_auth import get_current_user_optional, get_current_user_required

# Import all endpoint routers
from api.endpoints import auth, orders, meal_plans, nutritionists, kitchen, delivery, admin, consultations, subscriptions, daily_meals, delivery_tracking, reports, monitoring, clients, delivery_agents, geocoding, routing, delivery_optimization, payments, addresses, notifications, areas, batches, products, checkout, admin_allocation, nutritionist_activities, user_activities
from api.scheduler import start_scheduler, stop_scheduler

# Import cache from cache module
from api.cache import cache

# CORS middleware - restrict origins for security
# Allow localhost for development, but require specific origins in production
cors_origins_env = os.getenv("CORS_ORIGINS", "")
if cors_origins_env:
    # Parse comma-separated origins from environment
    cors_origins = [origin.strip() for origin in cors_origins_env.split(",")]
else:
    # Default to localhost for development (insecure for production)
    is_production = os.getenv("ENVIRONMENT") == "production" or os.getenv("NODE_ENV") == "production"
    if is_production:
        # In production, default to empty (no CORS) - must be configured
        cors_origins = []
        print("WARNING: CORS_ORIGINS not set in production. CORS is disabled. Set CORS_ORIGINS environment variable.")
    else:
        # Development: allow common localhost ports
        cors_origins = [
            "http://localhost:3000",
            "http://localhost:5000",
            "http://localhost:5001",
            "http://localhost:5173",
            "http://localhost:8081",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5000",
            "http://127.0.0.1:5001",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:8081",
        ]

_cors_allow_all = os.getenv("ENVIRONMENT", "development") != "production" and os.getenv("NODE_ENV", "") != "production"


@asynccontextmanager
async def lifespan(app: FastAPI):
    await startup_event()
    yield
    await shutdown_event()


app = FastAPI(
    title="ZyaeL NutriBox API",
    description="Complete API for ZyaeL NutriBox - Nutrition and Meal Delivery Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"] if _cors_allow_all else ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"] if _cors_allow_all else ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
    expose_headers=["Content-Type", "Authorization"],
)

# Setup monitoring and rate limiting middleware (must be before startup)
from api.monitoring import setup_middleware
setup_middleware(app)

# Exception handlers to ensure CORS headers are always present
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions and ensure CORS headers are present"""
    headers = {}
    # Add CORS headers if origin is allowed
    origin = request.headers.get("origin")
    if origin and origin in cors_origins:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, Accept, Origin"
    
    # Merge with existing headers from exception
    if exc.headers:
        headers.update(exc.headers)
    
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": jsonable_encoder(exc.detail)},
        headers=headers
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors and ensure CORS headers are present"""
    headers = {}
    # Add CORS headers if origin is allowed
    origin = request.headers.get("origin")
    if origin and origin in cors_origins:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, Accept, Origin"
    
    return JSONResponse(
        status_code=422,
        content={"detail": jsonable_encoder(exc.errors())},
        headers=headers
    )


@app.exception_handler(ResponseValidationError)
async def response_validation_exception_handler(request: Request, exc: ResponseValidationError):
    """Return value did not match response_model (often ORM vs Pydantic mismatch)."""
    headers = {}
    origin = request.headers.get("origin")
    if origin and origin in cors_origins:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, Accept, Origin"
    errs = exc.errors()
    print(f"[ResponseValidationError] {request.method} {request.url.path}: {errs}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Response validation failed", "errors": jsonable_encoder(errs)},
        headers=headers,
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions and ensure CORS headers are present"""
    headers = {}
    # Add CORS headers if origin is allowed
    origin = request.headers.get("origin")
    if origin and origin in cors_origins:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, Accept, Origin"
    
    # Log the error for debugging
    print(f"[Error] Unhandled exception: {type(exc).__name__}: {str(exc)}")
    import traceback
    traceback.print_exc()
    
    # Hide internals only when ENVIRONMENT=production (NODE_ENV alone is often set by front-end builds and hides useful API errors in dev)
    hide_internal_details = os.getenv("ENVIRONMENT") == "production"
    error_detail = str(exc) if not hide_internal_details else "Internal server error"
    
    return JSONResponse(
        status_code=500,
        content={"detail": error_detail},
        headers=headers
    )

# Global variable to track database initialization status
db_initialized = False
db_init_error = None

# Database initialization and auto-seed on startup (invoked from lifespan)
async def startup_event():
    """Initialize database tables and seed if empty (with robust retry logic for production)"""
    global db_initialized, db_init_error
    
    # Production-safe settings (longer timeouts for Neon cold starts)
    max_retries = 8  # More retries for production
    retry_delay = 5  # Longer delay between retries
    is_production = os.getenv("NODE_ENV") == "production" or os.getenv("REPL_DEPLOYMENT") == "1"
    
    # Mask database credentials for security
    db_url = os.getenv('DATABASE_URL', 'Not Set')
    if db_url != 'Not Set':
        parsed = urlparse(db_url)
        port_str = f":{parsed.port}" if parsed.port else ""
        masked_url = f"{parsed.scheme}://*****:*****@{parsed.hostname}{port_str}{parsed.path}"
    else:
        masked_url = "Not Set"
    
    print("\n" + "="*60)
    print("ZyaeL NutriBox API Starting Up")
    print(f"   Environment: {'PRODUCTION' if is_production else 'DEVELOPMENT'}")
    print(f"   Database: {masked_url}")
    ping = verify_database_connection()
    if ping.get("ok"):
        print(f"   DB ping: OK (dialect={ping.get('dialect')}, current_database={ping.get('current_database')!r})")
    else:
        print(f"   DB ping: FAILED — {ping.get('error')}")
    print("="*60 + "\n")
    
    # Pre-check: Try to detect database locks before starting
    try:
        from pathlib import Path
        db_url = os.getenv("DATABASE_URL", "")
        if db_url.startswith("sqlite:///"):
            db_path_str = db_url.replace("sqlite:///", "")
            db_path = Path(db_path_str) if os.path.isabs(db_path_str) else Path(__file__).parent.parent / db_path_str
            
            if db_path.exists():
                # Quick lock check
                try:
                    import sqlite3
                    test_conn = sqlite3.connect(str(db_path), timeout=0.1)
                    test_conn.execute("BEGIN IMMEDIATE")
                    test_conn.rollback()
                    test_conn.close()
                except sqlite3.OperationalError as lock_error:
                    if "database is locked" in str(lock_error):
                        print("\n⚠️  WARNING: Database file appears to be locked")
                        print(f"   Database path: {db_path}")
                        print("   Another process may be using the database.")
                        print("   Solutions:")
                        print("     • Stop other API instances: Get-Process python | Stop-Process")
                        print("     • Close database viewers (DB Browser, etc.)")
                        print("     • Restart your terminal/IDE")
                        print("   Continuing anyway... Will retry...\n")
    except Exception:
        pass  # Ignore pre-check errors, will be caught during actual operations
    
    for attempt in range(max_retries):
        try:
            print(f"Database initialization attempt {attempt + 1}/{max_retries}...")
            
            auto_schema = os.getenv("AUTO_CREATE_DB_SCHEMA", "true").lower() in ("1", "true", "yes")
            if auto_schema:
                # Step 1: Create tables if they don't exist
                print("   Creating/verifying database tables...")
                Base.metadata.create_all(bind=engine)
                print("   Database tables created/verified successfully")
            else:
                print("   Skipping create_all (AUTO_CREATE_DB_SCHEMA=false); using Alembic/migrations only.")
            
            # Step 1.5: Add missing columns to existing tables (migration)
            if not auto_schema:
                print("   Skipping ad-hoc ALTER migrations (AUTO_CREATE_DB_SCHEMA=false).")
            else:
                print("   Checking for missing columns and adding them...")
                from sqlalchemy import text, inspect
                conn = engine.connect()
                try:
                    inspector = inspect(engine)

                    # Add missing columns to subscriptions table
                    if 'subscriptions' in inspector.get_table_names():
                        columns = [col['name'] for col in inspector.get_columns('subscriptions')]
                        if 'allocation_status' not in columns:
                            conn.execute(text("ALTER TABLE subscriptions ADD COLUMN allocation_status VARCHAR(255) DEFAULT 'pending_allocation'"))
                            print("   ✓ Added allocation_status column to subscriptions")
                        if 'checkout_data_id' not in columns:
                            conn.execute(text("ALTER TABLE subscriptions ADD COLUMN checkout_data_id VARCHAR(255)"))
                            print("   ✓ Added checkout_data_id column to subscriptions")
                        if 'health_inputs' not in columns:
                            conn.execute(text("ALTER TABLE subscriptions ADD COLUMN health_inputs TEXT"))
                            print("   ✓ Added health_inputs column to subscriptions")
                        if 'meal_timing' not in columns:
                            conn.execute(text("ALTER TABLE subscriptions ADD COLUMN meal_timing TEXT"))
                            print("   ✓ Added meal_timing column to subscriptions")

                    # Add missing columns to delivery_agents table
                    if 'delivery_agents' in inspector.get_table_names():
                        columns = [col['name'] for col in inspector.get_columns('delivery_agents')]
                        if 'is_online' not in columns:
                            conn.execute(text("ALTER TABLE delivery_agents ADD COLUMN is_online BOOLEAN DEFAULT 0"))
                            print("   ✓ Added is_online column to delivery_agents")
                        if 'areas_served' not in columns:
                            conn.execute(text("ALTER TABLE delivery_agents ADD COLUMN areas_served TEXT"))
                            print("   ✓ Added areas_served column to delivery_agents")
                        if 'current_batch_id' not in columns:
                            conn.execute(text("ALTER TABLE delivery_agents ADD COLUMN current_batch_id VARCHAR(255)"))
                            print("   ✓ Added current_batch_id column to delivery_agents")
                        if 'updated_at' not in columns:
                            conn.execute(text("ALTER TABLE delivery_agents ADD COLUMN updated_at TIMESTAMP"))
                            print("   ✓ Added updated_at column to delivery_agents")

                    # Add missing columns to orders table
                    if 'orders' in inspector.get_table_names():
                        columns = [col['name'] for col in inspector.get_columns('orders')]
                        if 'area_id' not in columns:
                            conn.execute(text("ALTER TABLE orders ADD COLUMN area_id VARCHAR(255)"))
                            print("   ✓ Added area_id column to orders")
                        if 'batch_id' not in columns:
                            conn.execute(text("ALTER TABLE orders ADD COLUMN batch_id VARCHAR(255)"))
                            print("   ✓ Added batch_id column to orders")
                        if 'timeslot_start' not in columns:
                            conn.execute(text("ALTER TABLE orders ADD COLUMN timeslot_start TIMESTAMP"))
                            print("   ✓ Added timeslot_start column to orders")
                        if 'timeslot_end' not in columns:
                            conn.execute(text("ALTER TABLE orders ADD COLUMN timeslot_end TIMESTAMP"))
                            print("   ✓ Added timeslot_end column to orders")
                        if 'label_printed' not in columns:
                            conn.execute(text("ALTER TABLE orders ADD COLUMN label_printed BOOLEAN DEFAULT 0"))
                            print("   ✓ Added label_printed column to orders")
                        if 'label_scanned_at' not in columns:
                            conn.execute(text("ALTER TABLE orders ADD COLUMN label_scanned_at TIMESTAMP"))
                            print("   ✓ Added label_scanned_at column to orders")

                    conn.commit()
                except Exception as e:
                    conn.rollback()
                    print(f"   ⚠️  Warning: Could not add missing columns (may already exist): {e}")
                finally:
                    conn.close()
            
            # Step 2: Check and seed if empty
            print("   Checking if database needs seeding...")
            db = next(get_db())
            try:
                meal_plan_count = db.query(models.MealPlan).count()
                print(f"   Found {meal_plan_count} meal plans in database")
                
                if meal_plan_count == 0:
                    print("\n   Database is EMPTY - Starting auto-seed process...")
                    print("   " + "-"*50)
                    from api.seed_data import seed_database
                    seed_database()
                    print("   " + "-"*50)
                    print("   AUTO-SEED COMPLETED SUCCESSFULLY!\n")
                    
                    # Verify seeding worked
                    final_count = db.query(models.MealPlan).count()
                    print(f"   Verification: Database now has {final_count} meal plans")
                else:
                    print(f"   Database already initialized with {meal_plan_count} meal plans")
            finally:
                db.close()
            
            # Success!
            db_initialized = True
            print("\n" + "="*60)
            print("DATABASE INITIALIZATION COMPLETE")
            print("="*60 + "\n")
            
            # Start the daily scheduler
            print("Starting Daily Scheduler...")
            await start_scheduler()
            print("Daily Scheduler started successfully!")
            
            # Clear expired blacklisted tokens on startup
            from api.simple_auth import clear_expired_blacklist
            
            # Clear expired blacklisted tokens on startup
            try:
                db_for_cleanup = next(get_db())
                try:
                    clear_expired_blacklist(db=db_for_cleanup)
                finally:
                    db_for_cleanup.close()
            except Exception as e:
                print(f"Warning: Could not clear expired tokens: {e}")
            
            print("="*60 + "\n")
            break
            
        except Exception as e:
            error_msg = str(e)
            error_trace = traceback.format_exc()
            
            if attempt < max_retries - 1:
                print(f"\n⚠️  WARNING: Database initialization attempt {attempt + 1}/{max_retries} failed")
                print(f"   Error: {error_msg}")
                print(f"   Retrying in {retry_delay} seconds...")
                print(f"   This may be normal if database is initializing for the first time.\n")
                await asyncio.sleep(retry_delay)
            else:
                db_init_error = error_msg
                print("\n" + "="*60)
                print(f"❌ DATABASE INITIALIZATION FAILED AFTER {max_retries} ATTEMPTS")
                print("="*60)
                print(f"Error: {error_msg}")
                print("\nCommon causes:")
                print("  1. Database file is locked (another process using it)")
                print("  2. Database path is incorrect or inaccessible")
                print("  3. SQLite permissions issue")
                print("  4. Connection timeout (for remote databases)")
                print("\nFull traceback:")
                print(error_trace)
                print("="*60)
                print("⚠️  WARNING: API will start but database operations WILL FAIL")
                print("   Solutions:")
                print("   1. Check database connection settings in .env file")
                print("   2. Ensure database file is not locked")
                print("   3. Try manual seeding: python -c 'from api.seed_data import seed_database; seed_database()'")
                print("   4. Restart the API server")
                print("="*60 + "\n")
                sys.stdout.flush()

async def shutdown_event():
    """Cleanup on shutdown"""
    print("\n" + "="*60)
    print("ZyaeL NutriBox API Shutting Down")
    print("="*60)
    
    # Stop the daily scheduler
    print("Stopping Daily Scheduler...")
    await stop_scheduler()
    print("Daily Scheduler stopped successfully!")
    
    print("API shutdown complete")
    print("="*60 + "\n")

# WebSocket connection manager
from api.connection_manager import manager

# Auth and REST resources: use /api/* routers only (legacy non-prefixed routes removed).

# WebSocket endpoint with authentication
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time communication.
    Authentication is required in production, optional in development.
    Pass token as query parameter: ws://host/ws?token=YOUR_TOKEN
    """
    # Extract token from query parameters
    token = None
    query_params = websocket.query_params
    if query_params and "token" in query_params:
        token = query_params.get("token")
    
    # Check if production mode
    is_production = os.getenv("ENVIRONMENT") == "production" or os.getenv("NODE_ENV") == "production"
    
    # Verify token
    user_id = None
    user_role = None
    username = None
    
    if token:
        from api.simple_auth import verify_token as verify_jwt
        from api.database import get_db
        
        # Get database session for token verification and user lookup
        db_session = next(get_db())
        try:
            payload = verify_jwt(token, token_type="access", db=db_session)
            if not payload:
                print(f"[WebSocket] Token verification failed")
                await websocket.close(code=403, reason="Invalid authentication token")
                return
            
            # Token is valid, get user info
            username = payload.get("sub")
            user_role = payload.get("role")
            
            # Get user ID from database
            user = db_session.query(models.User).filter(models.User.username == username).first()
            if user:
                user_id = user.id
            else:
                print(f"[WebSocket] User not found for username: {username}")
                await websocket.close(code=403, reason="User not found")
                return
        except Exception as e:
            print(f"[WebSocket] Error during token verification: {str(e)}")
            await websocket.close(code=403, reason="Authentication error")
            return
        finally:
            db_session.close()
        
        print(f"[WebSocket] Authenticated connection for user: {username} (role: {user_role}, id: {user_id})")
    else:
        # No token provided
        if is_production:
            # In production, authentication is mandatory
            print(f"[WebSocket] Connection rejected: No token provided in production")
            await websocket.close(code=403, reason="Authentication required")
            return
        else:
            # In development, allow unauthenticated but log warning
            print("[WebSocket] Warning: Connection without authentication token (development mode)")
    
    # Accept connection after authentication check
    await websocket.accept()
    
    # Store user info in connection manager (websocket.state is read-only)
    user_info = {
        "user_id": user_id,
        "user_role": user_role,
        "username": username,
        "authenticated": token is not None
    }
    
    # Connect to manager (this will add to active connections)
    async with manager._lock:
        manager.active_connections.append(websocket)
        manager.connection_channels[websocket] = set()
        manager.connection_user_info[websocket] = user_info
        # Initialize message count for rate limiting
        manager.message_counts[websocket] = {"count": 0, "last_reset": time.time()}
        
        # Set connection timeout (30 minutes of inactivity)
        async def timeout_connection():
            await asyncio.sleep(30 * 60)  # 30 minutes
            if websocket in manager.active_connections:
                await manager.disconnect(websocket)
        
        manager.connection_timeouts[websocket] = asyncio.create_task(timeout_connection())
        
    print(f"[WebSocket] Client connected. Total connections: {len(manager.active_connections)}")
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                # Handle subscription and other message types
                await manager.handle_message(websocket, message)
            except json.JSONDecodeError as e:
                # Handle invalid JSON gracefully
                error_message = {
                    "type": "error",
                    "data": {
                        "message": "Invalid JSON format",
                        "error": str(e)
                    }
                }
                await websocket.send_text(json.dumps(error_message))
            except Exception as e:
                # Handle other errors
                error_message = {
                    "type": "error", 
                    "data": {
                        "message": "WebSocket error",
                        "error": str(e)
                    }
                }
                await websocket.send_text(json.dumps(error_message))
            
    except WebSocketDisconnect:
        pass  # Client disconnected normally
    finally:
        # Clean up connection
        if websocket in manager.active_connections:
            await manager.disconnect(websocket)

@app.post("/admin/seed-database")
def seed_database_endpoint(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """
    Seed the database with production sample data.
    
    This endpoint seeds:
    - Essential users (admin and nutritionist accounts)
    - Meal plans (9 predefined plans)
    - Nutritionists (6 nutritionist profiles)
    
    Note: This will clear all existing data first!
    Only nutritionists and meal plans are seeded - all other data 
    (clients, orders, sessions, etc.) must be created by users.
    
    Admin access required.
    """
    # Authorization check: Only admins can seed database
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required to seed database"
        )
    
    try:
        from api.seed_data import seed_database
        seed_database()
        
        # Get actual counts after seeding
        meal_plan_count = db.query(models.MealPlan).count()
        nutritionist_count = db.query(models.Nutritionist).count()
        user_count = db.query(models.User).count()
        
        return {
            "message": "Database seeded successfully", 
            "status": "success",
            "data": {
                "users": user_count,
                "meal_plans": meal_plan_count,
                "nutritionists": nutritionist_count
            },
            "note": "Only nutritionists and meal plans are seeded. All other data must be created by users."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Seeding failed: {str(e)}")


@app.get("/health")
def health():
    """Minimal liveness probe."""
    return {"status": "ok"}


@app.get("/api/health")
def api_health_check():
    """
    API Health Check - Fast response without database dependency
    """
    # Quick response without blocking on database
    base_response = {
        "message": "ZyaeL NutriBox API",
        "status": "running",
        "environment": os.getenv("NODE_ENV", "development"),
        "timestamp": datetime.now().isoformat()
    }
    
    # Try to get database status without blocking
    ping = verify_database_connection()
    db_status = {
        "initialized": db_initialized,
        "connected": False,
        "ping_ok": ping.get("ok", False),
        "ping_error": ping.get("error"),
        "current_database": ping.get("current_database"),
        "dialect": ping.get("dialect"),
        "error": db_init_error or "Not checked",
        "meal_plans": 0,
        "nutritionists": 0,
        "users_table_ok": None,
        "auth_error": None,
    }
    
    # Try to check database in a non-blocking way
    try:
        db = next(get_db())
        try:
            meal_plan_count = db.query(models.MealPlan).count()
            nutritionist_count = db.query(models.Nutritionist).count()
            db_status.update({
                "connected": True,
                "meal_plans": meal_plan_count,
                "nutritionists": nutritionist_count,
                "error": None
            })
            # Login/register require the users table — detect partial/missing schema early
            try:
                db.query(models.User).first()
                db_status["users_table_ok"] = True
            except Exception as user_probe_err:
                db_status["users_table_ok"] = False
                db_status["auth_error"] = str(user_probe_err)
                db_status["error"] = db_status["error"] or str(user_probe_err)
        except Exception as db_error:
            db_status["error"] = str(db_error)
        finally:
            db.close()
    except Exception as e:
        # Database connection failed, but server is still running
        db_status["error"] = str(e)
    
    return {
        **base_response,
        "database": db_status
    }

# Include all routers BEFORE the root endpoint
app.include_router(auth.router, prefix="/api", tags=["Authentication"])
app.include_router(orders.router, prefix="/api", tags=["Orders"])
app.include_router(meal_plans.router, prefix="/api", tags=["Meal Plans"])
app.include_router(nutritionists.router, prefix="/api", tags=["Nutritionists"])
app.include_router(kitchen.router, prefix="/api", tags=["Kitchen"])
app.include_router(delivery.router, prefix="/api", tags=["Delivery"])
app.include_router(admin.router, prefix="/api", tags=["Admin"])
app.include_router(consultations.router, prefix="/api", tags=["Consultations"])
app.include_router(subscriptions.router, prefix="/api", tags=["Subscriptions"])
app.include_router(daily_meals.router, prefix="/api", tags=["Daily Meals"])
app.include_router(delivery_tracking.router, prefix="/api", tags=["Delivery Tracking"])
app.include_router(reports.router, prefix="/api", tags=["Reports"])
app.include_router(monitoring.router, prefix="/api", tags=["Monitoring"])
app.include_router(clients.router, prefix="/api", tags=["Clients"])
app.include_router(delivery_agents.router, prefix="/api", tags=["Delivery Agents"])
app.include_router(geocoding.router, tags=["Geocoding"])
app.include_router(routing.router, tags=["Routing"])
app.include_router(delivery_optimization.router, tags=["Delivery Optimization"])
app.include_router(payments.router, prefix="/api", tags=["Payments"])
app.include_router(addresses.router, prefix="/api", tags=["Addresses"])
app.include_router(notifications.router, prefix="/api", tags=["Notifications"])
app.include_router(areas.router, prefix="/api", tags=["Areas"])
app.include_router(batches.router, prefix="/api", tags=["Batches"])
app.include_router(products.router, tags=["Products"])
app.include_router(checkout.router, prefix="/api", tags=["Checkout"])
app.include_router(admin_allocation.router, prefix="/api", tags=["Admin - Nutritionist Allocation"])
app.include_router(nutritionist_activities.router, prefix="/api", tags=["Nutritionist Activities"])
app.include_router(user_activities.router, prefix="/api", tags=["User Activities"])

@app.get("/")
def root():
    """Root endpoint redirecting to API docs"""
    return {"message": "ZyaeL NutriBox API", "docs": "/docs", "health": "/api/health"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("API_PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
