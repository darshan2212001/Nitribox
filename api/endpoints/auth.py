from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError, ProgrammingError, IntegrityError
from api.database import get_db
from api import models, schemas
from api.simple_auth import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    verify_token as verify_jwt,
    blacklist_token,
    get_current_user_required,
    get_current_user_optional,
)
from api.auth_schemas import UserLogin, UserRegister, Token, UserResponse as AuthUserResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import time

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Stricter rate limiter for auth endpoints (5 attempts per 15 minutes)
class AuthRateLimiter:
    """Rate limiter for authentication endpoints"""
    def __init__(self, max_requests: int = 5, window_seconds: int = 900):  # 5 requests per 15 minutes
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: dict[str, list] = {}
    
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

auth_rate_limiter = AuthRateLimiter()

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, request: Request, db: Session = Depends(get_db)):
    """User login endpoint - returns access and refresh tokens"""
    import time
    start_time = time.time()
    
    try:
        # Rate limiting check
        client_ip = request.client.host if request.client else "unknown"
        if not auth_rate_limiter.is_allowed(client_ip):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts. Please try again in 15 minutes."
            )
        
        try:
            user = authenticate_user(db, credentials.username, credentials.password)
        except OperationalError as db_error:
            print(f"[Auth] Database operational error during authentication: {db_error}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database connection error. Check that the database server is running and DATABASE_URL is correct.",
            )
        except ProgrammingError as db_error:
            print(f"[Auth] Database schema error during authentication: {db_error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database schema is missing or out of date. Run alembic upgrade head, or enable AUTO_CREATE_DB_SCHEMA and restart the API.",
            )
        except Exception as db_error:
            print(f"[Auth] Unexpected error during authentication: {type(db_error).__name__}: {db_error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication failed due to a server error. Check API logs for details.",
            )
        
        elapsed = time.time() - start_time
        if elapsed > 5:
            print(f"[Auth] Warning: Login took {elapsed:.2f} seconds (slow database query)")
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Create tokens - ensure user has required fields
        if not user.username:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="User data is invalid: missing username"
            )
        
        user_role = user.role or "client"  # Default role if None
        
        try:
            access_token = create_access_token(data={"sub": user.username, "role": user_role})
            refresh_token = create_refresh_token(data={"sub": user.username, "role": user_role})
        except Exception as token_error:
            print(f"[Auth] Token creation error: {type(token_error).__name__}: {str(token_error)}")
            import traceback
            print(f"[Auth] Token creation traceback:\n{traceback.format_exc()}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create authentication tokens: {str(token_error)}"
            )
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": 30 * 60  # 30 minutes in seconds
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[Auth] Unexpected error during login: {type(e).__name__}: {str(e)}")
        print(f"[Auth] Traceback:\n{error_trace}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during login: {str(e)}"
        )

@router.post("/register", response_model=schemas.RegisterResponse)
async def register(user_data: UserRegister, request: Request, db: Session = Depends(get_db)):
    """User registration endpoint"""
    # Rate limiting check
    client_ip = request.client.host if request.client else "unknown"
    if not auth_rate_limiter.is_allowed(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many registration attempts. Please try again in 15 minutes."
        )
    
    try:
        # Check if user already exists
        try:
            existing_user = db.query(models.User).filter(
                (models.User.username == user_data.username) | 
                (models.User.email == user_data.email)
            ).first()
        except OperationalError as db_error:
            print(f"[Auth] Database operational error during registration lookup: {db_error}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database connection error. Check that the database server is running and DATABASE_URL is correct.",
            )
        except ProgrammingError as db_error:
            print(f"[Auth] Database schema error during registration lookup: {db_error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database schema is missing or out of date. Run alembic upgrade head, or enable AUTO_CREATE_DB_SCHEMA and restart the API.",
            )
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username or email already registered"
            )
        
        # Create new user
        from api.simple_auth import get_password_hash
        
        try:
            hashed_password = get_password_hash(user_data.password)
        except Exception as hash_error:
            print(f"[Auth] Password hashing error: {type(hash_error).__name__}: {str(hash_error)}")
            import traceback
            print(f"[Auth] Password hashing traceback:\n{traceback.format_exc()}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to hash password: {str(hash_error)}"
            )
        
        try:
            db_user = models.User(
                username=user_data.username,
                email=user_data.email,
                password=hashed_password,
                name=user_data.name,
                phone=user_data.phone,
                role=user_data.role or "client"
            )
            
            db.add(db_user)
            db.flush()  # Flush to get the ID and created_at
            
            # Ensure created_at is set if not already set by database
            if not db_user.created_at:
                db_user.created_at = datetime.now(timezone.utc)
            
            db.commit()
        except IntegrityError as commit_error:
            db.rollback()
            err_s = str(commit_error.orig) if getattr(commit_error, "orig", None) else str(commit_error)
            print(f"[Auth] Integrity error on user insert: {err_s}")
            if "1062" in err_s or "Duplicate" in err_s or "UNIQUE" in err_s.upper():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username or email already registered",
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save user to database: {err_s}",
            )
        except Exception as commit_error:
            db.rollback()
            print(f"[Auth] Database commit error: {type(commit_error).__name__}: {str(commit_error)}")
            import traceback
            print(f"[Auth] Commit traceback:\n{traceback.format_exc()}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save user to database: {str(commit_error)}"
            )
        
        db.refresh(db_user)

        created_at = db_user.created_at
        if created_at is None:
            created_at = datetime.now(timezone.utc)
        user_out = schemas.UserResponse(
            id=str(db_user.id),
            username=db_user.username,
            email=db_user.email,
            name=db_user.name,
            phone=db_user.phone,
            role=db_user.role or "client",
            created_at=created_at,
        )
        user_role = db_user.role or "client"
        access_token = create_access_token(
            data={"sub": db_user.username, "role": user_role}
        )
        refresh_token = create_refresh_token(
            data={"sub": db_user.username, "role": user_role}
        )
        return schemas.RegisterResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=30 * 60,
            user=user_out,
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        import traceback
        error_trace = traceback.format_exc()
        print(f"[Auth] Registration error: {type(e).__name__}: {str(e)}")
        print(f"[Auth] Traceback:\n{error_trace}")
        raise HTTPException(status_code=500, detail=f"Failed to register user: {str(e)}")

@router.get("/me", response_model=schemas.UserResponse)
async def get_current_user_info(current_user: models.User = Depends(get_current_user_required)):
    """Get current user information"""
    return current_user

class RefreshTokenRequest(BaseModel):
    refresh_token: str

@router.post("/refresh", response_model=Token)
async def refresh_token(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Refresh access token using refresh token (with token rotation)"""
    try:
        # Verify refresh token
        payload = verify_jwt(request.refresh_token, token_type="refresh", db=db)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token"
            )
        
        # Get user from database
        username = payload.get("sub")
        if not username:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )
        
        user = db.query(models.User).filter(models.User.username == username).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        # Blacklist old refresh token (token rotation) - wrap in try-except to handle errors gracefully
        try:
            blacklist_token(request.refresh_token, db=db, reason="refresh_rotation")
        except Exception as e:
            # Log but don't fail the refresh if blacklisting fails
            print(f"[Auth] Warning: Failed to blacklist refresh token: {e}")
        
        # Create new tokens
        new_access_token = create_access_token(data={"sub": user.username, "role": user.role})
        new_refresh_token = create_refresh_token(data={"sub": user.username, "role": user.role})
        
        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
            "expires_in": 30 * 60  # 30 minutes in seconds
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[Auth] Refresh token error: {type(e).__name__}: {str(e)}")
        print(f"[Auth] Traceback:\n{error_trace}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to refresh token: {str(e)}"
        )

@router.post("/logout")
async def logout(
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    refresh_token: Optional[str] = None
):
    """User logout endpoint - blacklists tokens"""
    # If refresh token provided, blacklist it
    if refresh_token:
        db = next(get_db())
        try:
            blacklist_token(refresh_token, db=db, reason="logout")
        finally:
            db.close()
    
    # Note: Access tokens are short-lived, so we don't need to blacklist them
    # If you want to blacklist access tokens on logout, you'd need to pass it as well
    
    return {"message": "Successfully logged out"}

@router.get("/verify")
async def verify_auth_session(current_user: Optional[models.User] = Depends(get_current_user_optional)):
    """Verify if token is valid"""
    if current_user:
        return {
            "valid": True,
            "user": schemas.UserResponse.model_validate(current_user),
        }
    return {"valid": False}
