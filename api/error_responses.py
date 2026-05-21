"""
Standardized error response format for all API endpoints
"""
from fastapi import HTTPException, status
from typing import Optional, Dict, Any
from datetime import datetime

def create_error_response(
    status_code: int,
    message: str,
    detail: Optional[str] = None,
    error_code: Optional[str] = None,
    field: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Create a standardized error response
    
    Args:
        status_code: HTTP status code
        message: User-friendly error message
        detail: Detailed error description (for debugging)
        error_code: Machine-readable error code
        field: Field name if validation error
        metadata: Additional error metadata
    
    Returns:
        Standardized error response dictionary
    """
    response = {
        "error": {
            "message": message,
            "status_code": status_code,
            "timestamp": datetime.now().isoformat(),
        }
    }
    
    if detail:
        response["error"]["detail"] = detail
    
    if error_code:
        response["error"]["code"] = error_code
    
    if field:
        response["error"]["field"] = field
    
    if metadata:
        response["error"]["metadata"] = metadata
    
    return response


def raise_http_exception(
    status_code: int,
    message: str,
    detail: Optional[str] = None,
    error_code: Optional[str] = None,
    field: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> None:
    """
    Raise a standardized HTTPException with consistent error format
    
    Args:
        status_code: HTTP status code
        message: User-friendly error message
        detail: Detailed error description
        error_code: Machine-readable error code
        field: Field name if validation error
        metadata: Additional error metadata
    """
    error_response = create_error_response(
        status_code=status_code,
        message=message,
        detail=detail,
        error_code=error_code,
        field=field,
        metadata=metadata
    )
    
    raise HTTPException(
        status_code=status_code,
        detail=error_response
    )


# Common error codes
class ErrorCode:
    """Standard error codes for the application"""
    VALIDATION_ERROR = "VALIDATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    CONFLICT = "CONFLICT"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    DATABASE_ERROR = "DATABASE_ERROR"
    NETWORK_ERROR = "NETWORK_ERROR"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    INVALID_STATE_TRANSITION = "INVALID_STATE_TRANSITION"
    BATCH_NOT_READY = "BATCH_NOT_READY"
    ORDER_ALREADY_PROCESSED = "ORDER_ALREADY_PROCESSED"
