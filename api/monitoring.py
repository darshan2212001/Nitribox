import logging
import time
from functools import wraps
from typing import Any, Dict, Optional
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import uvicorn
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('api.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

class PerformanceMonitor:
    """Monitor API performance metrics"""
    
    def __init__(self):
        self.request_count = 0
        self.total_response_time = 0
        self.error_count = 0
        self.endpoint_stats: Dict[str, Dict[str, Any]] = {}
    
    def record_request(self, endpoint: str, method: str, response_time: float, status_code: int):
        """Record request metrics"""
        self.request_count += 1
        self.total_response_time += response_time
        
        if status_code >= 400:
            self.error_count += 1
        
        if endpoint not in self.endpoint_stats:
            self.endpoint_stats[endpoint] = {
                'count': 0,
                'total_time': 0,
                'avg_time': 0,
                'errors': 0,
                'methods': {}
            }
        
        stats = self.endpoint_stats[endpoint]
        stats['count'] += 1
        stats['total_time'] += response_time
        stats['avg_time'] = stats['total_time'] / stats['count']
        
        if status_code >= 400:
            stats['errors'] += 1
        
        if method not in stats['methods']:
            stats['methods'][method] = 0
        stats['methods'][method] += 1
    
    def get_stats(self) -> Dict[str, Any]:
        """Get performance statistics"""
        avg_response_time = (
            self.total_response_time / self.request_count 
            if self.request_count > 0 else 0
        )
        
        error_rate = (
            self.error_count / self.request_count 
            if self.request_count > 0 else 0
        )
        
        return {
            'total_requests': self.request_count,
            'average_response_time': round(avg_response_time, 3),
            'error_rate': round(error_rate * 100, 2),
            'endpoint_stats': self.endpoint_stats
        }

# Global performance monitor
performance_monitor = PerformanceMonitor()

def monitor_performance(func):
    """Decorator to monitor function performance"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = await func(*args, **kwargs)
            return result
        except Exception as e:
            logger.error(f"Error in {func.__name__}: {str(e)}")
            raise
        finally:
            execution_time = time.time() - start_time
            logger.info(f"{func.__name__} executed in {execution_time:.3f}s")
    return wrapper

class SecurityHeaders:
    """Add security headers to responses"""
    
    @staticmethod
    def add_security_headers(response: Response, request: Request = None):
        """Add security headers"""
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # More permissive CSP for docs endpoints to allow Swagger UI to work
        if request and (request.url.path in ["/docs", "/redoc", "/openapi.json"] or request.url.path.startswith("/docs") or request.url.path.startswith("/redoc")):
            # Allow Swagger UI resources (CDNs, inline scripts, etc.)
            response.headers["Content-Security-Policy"] = "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com data: blob:; img-src 'self' data: https:;"
        else:
            # Strict CSP for API endpoints
            response.headers["Content-Security-Policy"] = "default-src 'self'"
        
        return response

class RateLimiter:
    """Simple rate limiter"""
    
    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, list] = {}
    
    def is_allowed(self, client_ip: str) -> bool:
        """Check if request is allowed"""
        now = time.time()
        window_start = now - self.window_seconds
        
        if client_ip not in self.requests:
            self.requests[client_ip] = []
        
        # Remove old requests
        self.requests[client_ip] = [
            req_time for req_time in self.requests[client_ip] 
            if req_time > window_start
        ]
        
        # Check if under limit
        if len(self.requests[client_ip]) < self.max_requests:
            self.requests[client_ip].append(now)
            return True
        
        return False

# Global rate limiter
rate_limiter = RateLimiter()

class AuditLogger:
    """Log security and business events"""
    
    @staticmethod
    def log_auth_event(event_type: str, user_id: Optional[str], ip: str, success: bool, details: str = ""):
        """Log authentication events"""
        logger.info(f"AUTH_{event_type}: user={user_id}, ip={ip}, success={success}, details={details}")
    
    @staticmethod
    def log_business_event(event_type: str, user_id: Optional[str], data: Dict[str, Any]):
        """Log business events"""
        logger.info(f"BUSINESS_{event_type}: user={user_id}, data={data}")
    
    @staticmethod
    def log_security_event(event_type: str, ip: str, details: str):
        """Log security events"""
        logger.warning(f"SECURITY_{event_type}: ip={ip}, details={details}")

class MonitoringMiddleware(BaseHTTPMiddleware):
    """Middleware for monitoring and rate limiting"""
    
    def _get_cors_headers(self, request: Request) -> dict:
        """Get CORS headers for the request origin"""
        headers = {}
        origin = request.headers.get("origin")
        if origin:
            # Allow localhost origins for development
            allowed_origins = [
                "http://localhost:3000", "http://localhost:5000", "http://localhost:5001", "http://localhost:5173",
                "http://127.0.0.1:3000", "http://127.0.0.1:5000", "http://127.0.0.1:5001", "http://127.0.0.1:5173"
            ]
            if origin in allowed_origins:
                headers["Access-Control-Allow-Origin"] = origin
                headers["Access-Control-Allow-Credentials"] = "true"
                headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
                headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, Accept, Origin"
        return headers
    
    async def dispatch(self, request: Request, call_next):
        """Monitor all requests"""
        start_time = time.time()
        
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"
        
        # Rate limiting
        if not rate_limiter.is_allowed(client_ip):
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            cors_headers = self._get_cors_headers(request)
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded"},
                headers=cors_headers
            )
        
        # Process request
        try:
            response = await call_next(request)
            
            # Record metrics
            response_time = time.time() - start_time
            endpoint = f"{request.method} {request.url.path}"
            performance_monitor.record_request(
                endpoint, 
                request.method, 
                response_time, 
                response.status_code
            )
            
            # Add security headers
            SecurityHeaders.add_security_headers(response, request)
            
            # Log request
            logger.info(f"{request.method} {request.url.path} - {response.status_code} - {response_time:.3f}s")
            
            return response
            
        except Exception as e:
            # Log error
            logger.error(f"Request error: {str(e)}")
            
            # Record error metrics
            response_time = time.time() - start_time
            endpoint = f"{request.method} {request.url.path}"
            performance_monitor.record_request(endpoint, request.method, response_time, 500)
            
            # Preserve CORS headers on error
            cors_headers = self._get_cors_headers(request)
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal server error"},
                headers=cors_headers
            )

def setup_middleware(app):
    """Setup monitoring and security middleware"""
    app.add_middleware(MonitoringMiddleware)

def get_health_check():
    """Enhanced health check with monitoring data"""
    stats = performance_monitor.get_stats()
    
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "version": "1.0.0",
        "performance": {
            "total_requests": stats['total_requests'],
            "average_response_time": stats['average_response_time'],
            "error_rate": stats['error_rate']
        },
        "uptime": time.time() - start_time if 'start_time' in globals() else 0
    }

# Start time for uptime calculation
start_time = time.time()

# Export monitoring functions
__all__ = [
    'monitor_performance',
    'performance_monitor',
    'rate_limiter',
    'AuditLogger',
    'SecurityHeaders',
    'setup_middleware',
    'get_health_check'
]
