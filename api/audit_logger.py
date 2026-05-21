"""
Audit Logger - Persists all mutations to audit_logs table for compliance and debugging.
Automatically tracks who, what, when, and how data was changed.
"""

from sqlalchemy.orm import Session
from api import models
from typing import Dict, Any, Optional
from datetime import datetime
import json
from fastapi import Request


class AuditLogger:
    """Manages audit log persistence for compliance and debugging"""
    
    @staticmethod
    def _serialize_state(obj: Any) -> Optional[str]:
        """Serialize an object to JSON string"""
        if obj is None:
            return None
        try:
            # If it's a SQLAlchemy model, convert to dict first
            if hasattr(obj, '__dict__'):
                # Remove SQLAlchemy internal attributes
                data = {k: v for k, v in obj.__dict__.items() 
                       if not k.startswith('_')}
                return json.dumps(data, default=str)
            return json.dumps(obj, default=str)
        except Exception:
            return str(obj)
    
    @staticmethod
    def _get_changed_fields(before: Dict[str, Any], after: Dict[str, Any]) -> list:
        """Determine which fields changed between before and after states"""
        if not before or not after:
            return []
        
        changed = []
        all_keys = set(before.keys()) | set(after.keys())
        
        for key in all_keys:
            if key.startswith('_'):
                continue  # Skip SQLAlchemy internals
            if before.get(key) != after.get(key):
                changed.append(key)
        
        return changed
    
    @staticmethod
    def log_action(
        db: Session,
        action: str,
        target_type: str,
        target_id: str,
        before_state: Optional[Any] = None,
        after_state: Optional[Any] = None,
        user_id: Optional[str] = None,
        user_role: Optional[str] = None,
        request: Optional[Request] = None
    ) -> models.AuditLog:
        """
        Log an action to the audit log.
        Should be called within the same transaction as the state change.
        
        Args:
            db: Database session
            action: Action type ('create', 'update', 'delete', etc.)
            target_type: Type of entity ('order', 'subscription', 'client', etc.)
            target_id: ID of the entity
            before_state: Object state before change (None for creates)
            after_state: Object state after change (None for deletes)
            user_id: ID of user performing action (None for system actions)
            user_role: Role of user at time of action
            request: FastAPI Request object to extract IP and user agent
            
        Returns:
            Created AuditLog model instance
        """
        before_json = AuditLogger._serialize_state(before_state)
        after_json = AuditLogger._serialize_state(after_state)
        
        # Determine changed fields
        changed = []
        if before_state and after_state:
            try:
                before_dict = json.loads(before_json) if before_json else {}
                after_dict = json.loads(after_json) if after_json else {}
                changed = AuditLogger._get_changed_fields(before_dict, after_dict)
            except Exception:
                changed = []
        
        # Extract IP and user agent from request
        ip_address = None
        user_agent = None
        if request:
            ip_address = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent")
        
        audit_log = models.AuditLog(
            user_id=user_id,
            user_role=user_role,
            action=action,
            target_type=target_type,
            target_id=target_id,
            before_state=before_json,
            after_state=after_json,
            changed_fields=json.dumps(changed) if changed else None,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(audit_log)
        # Note: Don't commit here - let caller commit within their transaction
        return audit_log
    
    @staticmethod
    def log_create(
        db: Session,
        target_type: str,
        target_id: str,
        new_state: Any,
        user_id: Optional[str] = None,
        user_role: Optional[str] = None,
        request: Optional[Request] = None
    ) -> models.AuditLog:
        """Convenience method for logging create actions"""
        return AuditLogger.log_action(
            db=db,
            action='create',
            target_type=target_type,
            target_id=target_id,
            before_state=None,
            after_state=new_state,
            user_id=user_id,
            user_role=user_role,
            request=request
        )
    
    @staticmethod
    def log_update(
        db: Session,
        target_type: str,
        target_id: str,
        before_state: Any,
        after_state: Any,
        user_id: Optional[str] = None,
        user_role: Optional[str] = None,
        request: Optional[Request] = None
    ) -> models.AuditLog:
        """Convenience method for logging update actions"""
        return AuditLogger.log_action(
            db=db,
            action='update',
            target_type=target_type,
            target_id=target_id,
            before_state=before_state,
            after_state=after_state,
            user_id=user_id,
            user_role=user_role,
            request=request
        )
    
    @staticmethod
    def log_delete(
        db: Session,
        target_type: str,
        target_id: str,
        deleted_state: Any,
        user_id: Optional[str] = None,
        user_role: Optional[str] = None,
        request: Optional[Request] = None
    ) -> models.AuditLog:
        """Convenience method for logging delete actions"""
        return AuditLogger.log_action(
            db=db,
            action='delete',
            target_type=target_type,
            target_id=target_id,
            before_state=deleted_state,
            after_state=None,
            user_id=user_id,
            user_role=user_role,
            request=request
        )

