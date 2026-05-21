from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
import os
import hashlib

from api.database import get_db
from api import models
import hashlib as hash_lib

# Try to use bcrypt, fallback to SHA256 for backward compatibility during migration
USE_BCRYPT = False
pwd_context = None
try:
    from passlib.context import CryptContext
    # Try to initialize bcrypt context
    try:
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        # Test if bcrypt actually works
        test_hash = pwd_context.hash("test")
        USE_BCRYPT = True
    except Exception as bcrypt_error:
        # Bcrypt failed to initialize or has compatibility issues
        print(f"WARNING: bcrypt initialization failed: {str(bcrypt_error)}")
        print("Falling back to SHA256 (INSECURE - development only)")
        USE_BCRYPT = False
        pwd_context = None
except ImportError:
    USE_BCRYPT = False
    pwd_context = None
    # Check if we're in production
    is_production = os.getenv("ENVIRONMENT") == "production" or os.getenv("NODE_ENV") == "production"
    if is_production:
        raise ValueError(
            "bcrypt is REQUIRED in production. "
            "Install with: pip install passlib[bcrypt]"
        )
    print("WARNING: passlib not installed. Using SHA256 (INSECURE). Install with: pip install passlib[bcrypt]")

# Auth configuration - SECRET_KEY is REQUIRED in production
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY or SECRET_KEY == "your-secret-key-change-in-production":
    # Only allow default in development mode
    if os.getenv("ENVIRONMENT") == "production" or os.getenv("NODE_ENV") == "production":
        raise ValueError(
            "SECRET_KEY environment variable is REQUIRED in production. "
            "Generate a secure key and set it in your environment."
        )
    else:
        SECRET_KEY = "your-secret-key-change-in-production"
        print("WARNING: Using default SECRET_KEY. This is INSECURE for production!")

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

# Database-backed token blacklist
def blacklist_token(token: str, db: Optional[Session] = None, reason: str = "logout"):
    """
    Add a token to the blacklist.
    If db is provided, uses database; otherwise uses in-memory (fallback).
    Caller-owned sessions are never closed here (only sessions opened inside this function are).
    """
    owned_session = False
    # Try to use database if available
    if db is None:
        try:
            db = next(get_db())
            owned_session = True
            use_db = True
        except Exception:
            # Fallback to in-memory if database unavailable
            use_db = False
            if not hasattr(blacklist_token, '_in_memory_blacklist'):
                blacklist_token._in_memory_blacklist = set()
            blacklist_token._in_memory_blacklist.add(token)
            return
    else:
        use_db = True
    
    if use_db:
        try:
            # Get token expiration from JWT payload
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_signature": False})
                expires_at = datetime.utcfromtimestamp(payload.get("exp", 0))
            except Exception:
                # If token can't be decoded, set expiration to 7 days from now (default for refresh tokens)
                expires_at = datetime.utcnow() + timedelta(days=7)
            
            # Create hash of token for faster lookup (first 64 chars of SHA256)
            token_hash = hash_lib.sha256(token.encode()).hexdigest()[:64]
            
            # Check if already blacklisted
            existing = db.query(models.BlacklistedToken).filter(
                models.BlacklistedToken.token_hash == token_hash
            ).first()
            
            if not existing:
                blacklisted_token = models.BlacklistedToken(
                    token=token,
                    token_hash=token_hash,
                    expires_at=expires_at,
                    reason=reason
                )
                db.add(blacklisted_token)
                db.commit()
        except Exception as e:
            # Fallback to in-memory if database operation fails
            print(f"[Auth] Warning: Failed to blacklist token in database: {e}. Using in-memory fallback.")
            if not hasattr(blacklist_token, '_in_memory_blacklist'):
                blacklist_token._in_memory_blacklist = set()
            blacklist_token._in_memory_blacklist.add(token)
        finally:
            if owned_session and db:
                db.close()

def is_token_blacklisted(token: str, db: Optional[Session] = None) -> bool:
    """
    Check if a token is blacklisted.
    If db is provided, uses database; otherwise uses in-memory (fallback).
    Caller-owned sessions are never closed here.
    """
    owned_session = False
    # Try to use database if available
    if db is None:
        try:
            db = next(get_db())
            owned_session = True
            use_db = True
        except Exception:
            # Fallback to in-memory if database unavailable
            use_db = False
            if hasattr(blacklist_token, '_in_memory_blacklist'):
                return token in blacklist_token._in_memory_blacklist
            return False
    else:
        use_db = True
    
    if use_db:
        try:
            # Use hash for faster lookup
            token_hash = hash_lib.sha256(token.encode()).hexdigest()[:64]
            
            # Check database
            blacklisted = db.query(models.BlacklistedToken).filter(
                models.BlacklistedToken.token_hash == token_hash,
                models.BlacklistedToken.expires_at > datetime.utcnow()
            ).first()
            
            if blacklisted:
                return True
            
            # Also check in-memory fallback
            if hasattr(blacklist_token, '_in_memory_blacklist'):
                return token in blacklist_token._in_memory_blacklist
            
            return False
        except Exception as e:
            # Fallback to in-memory if database operation fails
            if hasattr(blacklist_token, '_in_memory_blacklist'):
                return token in blacklist_token._in_memory_blacklist
            return False
        finally:
            if owned_session and db:
                db.close()
    
    return False

def clear_expired_blacklist(db: Optional[Session] = None):
    """Clear expired blacklisted tokens from database.
    Caller-owned sessions are never closed here (only sessions opened inside this function are).
    """
    owned_session = False
    if db is None:
        try:
            db = next(get_db())
            owned_session = True
            use_db = True
        except Exception:
            use_db = False
    else:
        use_db = True
    
    if use_db:
        try:
            # Delete expired tokens
            deleted = db.query(models.BlacklistedToken).filter(
                models.BlacklistedToken.expires_at < datetime.utcnow()
            ).delete()
            db.commit()
            if deleted > 0:
                print(f"[Auth] Cleared {deleted} expired blacklisted tokens")
        except Exception as e:
            print(f"[Auth] Warning: Failed to clear expired tokens: {e}")
        finally:
            if owned_session and db:
                db.close()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Password verification supporting both bcrypt and SHA256 (for migration)"""
    if USE_BCRYPT:
        try:
            # Try bcrypt verification first
            return pwd_context.verify(plain_password, hashed_password)
        except (ValueError, Exception):
            # If it fails, might be old SHA256 hash - try that
            sha256_hash = hashlib.sha256(plain_password.encode()).hexdigest()
            if sha256_hash == hashed_password:
                # This is an old SHA256 hash - should be migrated
                return True
            return False
    else:
        # Fallback to SHA256 if bcrypt not available
        return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password

def get_password_hash(password: str) -> str:
    """Password hashing using bcrypt (or SHA256 if bcrypt unavailable in development only)"""
    # Bcrypt has a 72-byte limit, so truncate if necessary
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        # Truncate to 72 bytes, but try to preserve as much as possible
        password = password_bytes[:72].decode('utf-8', errors='ignore')
        print(f"[Auth] Warning: Password truncated to 72 bytes for bcrypt compatibility")
    
    if USE_BCRYPT and pwd_context:
        try:
            return pwd_context.hash(password)
        except Exception as e:
            # If bcrypt fails, fall back to SHA256 in development
            is_production = os.getenv("ENVIRONMENT") == "production" or os.getenv("NODE_ENV") == "production"
            if is_production:
                raise ValueError(
                    f"bcrypt password hashing failed: {str(e)}. "
                    "This is required in production."
                )
            print(f"[Auth] Warning: bcrypt failed ({str(e)}), falling back to SHA256 (INSECURE)")
            return hashlib.sha256(password.encode()).hexdigest()
    else:
        # Check if we're in production
        is_production = os.getenv("ENVIRONMENT") == "production" or os.getenv("NODE_ENV") == "production"
        if is_production:
            raise ValueError(
                "bcrypt is REQUIRED in production. "
                "Install with: pip install passlib[bcrypt]"
            )
        # Fallback to SHA256 if bcrypt not available (INSECURE - development only)
        if not hasattr(get_password_hash, '_warned'):
            print("WARNING: Using SHA256 password hashing. Install passlib[bcrypt] for secure hashing.")
            get_password_hash._warned = True
        return hashlib.sha256(password.encode()).hexdigest()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a short-lived access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access", "iat": datetime.utcnow()})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a long-lived refresh token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({"exp": expire, "type": "refresh", "iat": datetime.utcnow()})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str, token_type: str = "access", db: Optional[Session] = None) -> Optional[dict]:
    """Verify and decode JWT token"""
    try:
        # Check if token is blacklisted
        if is_token_blacklisted(token, db):
            print(f"[Auth] Token is blacklisted")
            return None
            
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Verify token type - make it optional if token doesn't have type field
        token_type_in_payload = payload.get("type")
        if token_type_in_payload is not None:
            # If token has type field, verify it matches
            if token_type_in_payload != token_type:
                print(f"[Auth] Token type mismatch. Expected {token_type}, got {token_type_in_payload}")
                return None
        # If token doesn't have type field, assume it's an access token (backward compatibility)
        else:
            print(f"[Auth] Token has no type field, assuming access token")
            
        return payload
    except JWTError as e:
        # JWTError includes ExpiredSignatureError and other JWT-related errors
        error_type = type(e).__name__
        if "expired" in str(e).lower() or "ExpiredSignatureError" in error_type:
            print(f"[Auth] Token has expired")
        else:
            print(f"[Auth] JWT decode error: {error_type}")
        return None
    except Exception as e:
        # Log the error for debugging but don't expose details
        print(f"[Auth] Token verification failed: {type(e).__name__}: {str(e)}")
        return None

def authenticate_user(db: Session, username: str, password: str) -> Optional[models.User]:
    """Authenticate user with password verification"""
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        return None
    # Password verification supports both bcrypt and SHA256 (for migration)
    if not verify_password(password, user.password):
        return None
    return user

def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> Optional[models.User]:
    """Optional authentication - returns None if not authenticated"""
    if not credentials:
        return None
    
    try:
        payload = verify_token(credentials.credentials, token_type="access", db=db)
        if payload is None:
            return None
        
        username: str = payload.get("sub")
        if username is None:
            return None
        
        user = db.query(models.User).filter(models.User.username == username).first()
        return user
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Log but don't expose details
        print(f"[Auth] Error in get_current_user_optional: {type(e).__name__}")
        return None

def get_current_user_required(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
    db: Session = Depends(get_db)
) -> models.User:
    """Required authentication - raises error if not authenticated"""
    try:
        payload = verify_token(credentials.credentials, token_type="access", db=db)
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user = db.query(models.User).filter(models.User.username == username).first()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Log the error for debugging but return generic error
        print(f"[Auth] Error in get_current_user_required: {type(e).__name__}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
