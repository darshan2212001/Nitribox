"""
Event Store - Immutable append-only log for all critical events.
Provides event persistence, replay, and debugging capabilities.
"""

from sqlalchemy.orm import Session
from api import models
from api.events import EventType
from datetime import datetime
from typing import Dict, Any, Optional, List
import json
import uuid


class EventStore:
    """Manages immutable event log persistence"""
    
    @staticmethod
    def append_event(
        db: Session,
        aggregate_id: str,
        aggregate_type: str,
        event_type: EventType,
        payload: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None,
        event_version: int = 1
    ) -> models.Event:
        """
        Append an event to the event store.
        This should be called within the same transaction as the state change.
        
        Args:
            db: Database session
            aggregate_id: ID of the aggregate (order_id, client_id, etc.)
            aggregate_type: Type of aggregate ('order', 'subscription', 'client', etc.)
            event_type: EventType enum value
            payload: Event data dictionary
            metadata: Optional metadata (user_id, IP address, etc.)
            event_version: Version of the event schema (for future migrations)
            
        Returns:
            Created Event model instance
        """
        event = models.Event(
            aggregate_id=aggregate_id,
            aggregate_type=aggregate_type,
            event_type=event_type.value if hasattr(event_type, 'value') else str(event_type),
            event_version=event_version,
            payload=json.dumps(payload, default=str),
            event_metadata=json.dumps(metadata, default=str) if metadata else None
        )
        db.add(event)
        # Note: Don't commit here - let caller commit within their transaction
        return event
    
    @staticmethod
    def get_events_by_aggregate(
        db: Session,
        aggregate_id: str,
        aggregate_type: Optional[str] = None,
        limit: Optional[int] = None
    ) -> List[models.Event]:
        """
        Get all events for a specific aggregate, ordered by creation time.
        Useful for replay and debugging.
        
        Args:
            db: Database session
            aggregate_id: ID of the aggregate
            aggregate_type: Optional type filter
            limit: Optional limit on number of events
            
        Returns:
            List of Event model instances
        """
        query = db.query(models.Event).filter(
            models.Event.aggregate_id == aggregate_id
        )
        
        if aggregate_type:
            query = query.filter(models.Event.aggregate_type == aggregate_type)
        
        query = query.order_by(models.Event.created_at.asc())
        
        if limit:
            query = query.limit(limit)
        
        return query.all()
    
    @staticmethod
    def get_events_by_type(
        db: Session,
        event_type: EventType,
        since: Optional[datetime] = None,
        limit: Optional[int] = None
    ) -> List[models.Event]:
        """
        Get all events of a specific type, optionally filtered by time.
        Useful for analytics and debugging.
        
        Args:
            db: Database session
            event_type: EventType enum value
            since: Optional datetime to filter events after this time
            limit: Optional limit on number of events
            
        Returns:
            List of Event model instances
        """
        query = db.query(models.Event).filter(
            models.Event.event_type == (event_type.value if hasattr(event_type, 'value') else str(event_type))
        )
        
        if since:
            query = query.filter(models.Event.created_at >= since)
        
        query = query.order_by(models.Event.created_at.desc())
        
        if limit:
            query = query.limit(limit)
        
        return query.all()
    
    @staticmethod
    def replay_events(
        db: Session,
        aggregate_id: str,
        aggregate_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Replay all events for an aggregate and return as list of dictionaries.
        Useful for rebuilding state or debugging.
        
        Args:
            db: Database session
            aggregate_id: ID of the aggregate
            aggregate_type: Optional type filter
            
        Returns:
            List of event dictionaries with parsed payloads
        """
        events = EventStore.get_events_by_aggregate(db, aggregate_id, aggregate_type)
        
        result = []
        for event in events:
            result.append({
                'id': event.id,
                'aggregate_id': event.aggregate_id,
                'aggregate_type': event.aggregate_type,
                'event_type': event.event_type,
                'event_version': event.event_version,
                'payload': json.loads(event.payload),
                'metadata': json.loads(event.event_metadata) if event.event_metadata else None,
                'created_at': event.created_at.isoformat() if event.created_at else None
            })
        
        return result

