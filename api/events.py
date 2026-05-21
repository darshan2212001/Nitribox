"""
Centralized event type definitions for ZyaeL NutriBox real-time system.
All event types are defined here to ensure consistency across the application.
"""

from enum import Enum
from typing import Dict, Any, Optional
from datetime import datetime

class EventType(Enum):
    """Centralized event type definitions"""
    
    # Subscription Events
    SUBSCRIPTION_CREATED = "subscription.created"
    SUBSCRIPTION_ACTIVATED = "subscription.activated"
    SUBSCRIPTION_PAUSED = "subscription.paused"
    SUBSCRIPTION_RENEWED = "subscription.renewed"
    SUBSCRIPTION_UPDATED = "subscription.updated"
    
    # Allocation Events
    NEW_PENDING_ALLOCATION = "allocation.pending"
    USER_ASSIGNED = "allocation.assigned"
    ALLOCATION_COMPLETED = "allocation.completed"
    
    # Meal Plan Events
    MEAL_PLAN_GENERATED = "meal_plan.generated"
    MEAL_PLAN_UPDATED = "meal_plan.updated"
    DAILY_MEALS_ASSIGNED = "daily.meals_assigned"
    
    # Meal Status Events
    MEAL_PREPARING = "meal.preparing"
    MEAL_PACKED = "meal.packed"
    MEAL_ASSIGNED = "meal.assigned"
    MEAL_IN_TRANSIT = "meal.in_transit"
    MEAL_DELIVERED = "meal.delivered"
    MEAL_CONSUMED = "meal.consumed"
    MEAL_SKIPPED = "meal.skipped"
    MEAL_STATUS_CHANGED = "meal.status_changed"
    
    # Batch Events
    BATCH_CREATED = "batch.created"
    BATCH_READY_FOR_PICKUP = "batch.ready_for_pickup"
    BATCH_ASSIGNED = "batch.assigned"
    BATCH_PICKUP_COMPLETE = "batch.pickup_complete"
    BATCH_COMPLETED = "batch.completed"
    
    # Label Events
    ORDER_LABEL_PRINTED = "order.label_printed"
    ORDER_LABEL_SCANNED = "order.label_scanned"
    
    # Order Pickup Events
    ORDER_PICKED_UP = "order.picked_up"
    ORDER_DELIVERED = "order.delivered"
    ORDER_FAILED = "order.failed"
    
    # Delivery Events
    DELIVERY_ASSIGNED = "delivery.assigned"
    DELIVERY_REASSIGNED = "delivery.reassigned"
    DELIVERY_LOCATION_UPDATE = "delivery.location_update"
    DELIVERY_COMPLETED = "delivery.completed"
    
    # Route Optimization Events
    ROUTE_OPTIMIZED = "route_optimized"
    STOP_COMPLETED = "stop_completed"
    ROUTE_RECALCULATED = "route_recalculated"
    NEXT_STOP_CHANGED = "next_stop_changed"
    
    # Consultation Events
    CONSULTATION_SCHEDULED = "consultation.scheduled"
    CONSULTATION_REMINDER = "consultation.reminder"
    CONSULTATION_COMPLETED = "consultation.completed"
    
    # Progress Events
    PROGRESS_LOGGED = "progress.logged"
    WEEKLY_REPORT_READY = "weekly.report_ready"
    
    # User Activity Events
    MEAL_CHECKIN = "activity.meal_checkin"
    WEIGHT_LOGGED = "activity.weight_logged"
    SYMPTOM_LOGGED = "activity.symptom_logged"
    CONSULTATION_UPDATE = "activity.consultation_update"
    
    # Admin Events
    ANNOUNCEMENT_BROADCAST = "announcement.broadcast"
    
    # Address Events
    ADDRESS_CREATED = "address.created"
    ADDRESS_UPDATED = "address.updated"
    ADDRESS_DELETED = "address.deleted"
    
    # Notification Events
    NOTIFICATION_CREATED = "notification.created"
    NOTIFICATION_UPDATED = "notification.updated"
    
    # System Events
    SYSTEM_ERROR = "system.error"
    CONNECTION_STATUS = "connection.status"

class EventChannel:
    """Channel naming conventions for WebSocket subscriptions"""
    
    @staticmethod
    def client(client_id: str) -> str:
        return f"client_{client_id}"
    
    @staticmethod
    def nutritionist(nutritionist_id: str) -> str:
        return f"nutritionist_{nutritionist_id}"
    
    @staticmethod
    def delivery_agent(agent_id: str) -> str:
        return f"delivery_{agent_id}"
    
    @staticmethod
    def order(order_id: str) -> str:
        return f"order_{order_id}"
    
    @staticmethod
    def subscription(subscription_id: str) -> str:
        return f"subscription_{subscription_id}"
    
    # Role-based channels
    KITCHEN = "kitchen"
    ADMIN = "admin"
    ALL_CLIENTS = "all_clients"
    ALL_NUTRITIONISTS = "all_nutritionists"
    ALL_DELIVERY_AGENTS = "all_delivery_agents"

class EventBuilder:
    """Helper class to build standardized event messages"""
    
    @staticmethod
    def build_event(
        event_type: EventType,
        data: Dict[str, Any],
        timestamp: Optional[datetime] = None,
        source: Optional[str] = None
    ) -> Dict[str, Any]:
        """Build a standardized event message"""
        return {
            "type": event_type.value,
            "data": data,
            "timestamp": timestamp or datetime.now().isoformat(),
            "source": source or "api"
        }
    
    @staticmethod
    def meal_status_changed(
        order_id: str,
        client_id: str,
        meal_type: str,
        old_status: str,
        new_status: str,
        nutritionist_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Build meal status changed event"""
        return EventBuilder.build_event(
            EventType.MEAL_STATUS_CHANGED,
            {
                "order_id": order_id,
                "client_id": client_id,
                "meal_type": meal_type,
                "old_status": old_status,
                "new_status": new_status,
                "nutritionist_id": nutritionist_id
            }
        )
    
    @staticmethod
    def delivery_assigned(
        order_id: str,
        client_id: str,
        delivery_agent_id: str,
        delivery_agent_name: str,
        estimated_delivery_time: Optional[str] = None
    ) -> Dict[str, Any]:
        """Build delivery assigned event"""
        return EventBuilder.build_event(
            EventType.DELIVERY_ASSIGNED,
            {
                "order_id": order_id,
                "client_id": client_id,
                "delivery_agent_id": delivery_agent_id,
                "delivery_agent_name": delivery_agent_name,
                "estimated_delivery_time": estimated_delivery_time
            }
        )
    
    @staticmethod
    def location_update(
        order_id: str,
        client_id: str,
        delivery_agent_id: str,
        latitude: str,
        longitude: str,
        eta_minutes: Optional[int] = None
    ) -> Dict[str, Any]:
        """Build location update event"""
        return EventBuilder.build_event(
            EventType.DELIVERY_LOCATION_UPDATE,
            {
                "order_id": order_id,
                "client_id": client_id,
                "delivery_agent_id": delivery_agent_id,
                "latitude": latitude,
                "longitude": longitude,
                "eta_minutes": eta_minutes
            }
        )
    
    @staticmethod
    def delivery_reassigned(
        order_id: str,
        client_id: str,
        old_agent_id: str,
        new_agent_id: str,
        new_agent_name: str
    ) -> Dict[str, Any]:
        """Build delivery reassigned event"""
        return EventBuilder.build_event(
            EventType.DELIVERY_REASSIGNED,
            {
                "order_id": order_id,
                "client_id": client_id,
                "old_agent_id": old_agent_id,
                "new_agent_id": new_agent_id,
                "new_agent_name": new_agent_name
            }
        )
    
    @staticmethod
    def consumption_logged(
        order_id: str,
        client_id: str,
        meal_type: str,
        status: str,  # consumed or skipped
        nutritionist_id: Optional[str] = None,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """Build consumption logged event"""
        return EventBuilder.build_event(
            EventType.MEAL_CONSUMED if status == "consumed" else EventType.MEAL_SKIPPED,
            {
                "order_id": order_id,
                "client_id": client_id,
                "meal_type": meal_type,
                "status": status,
                "nutritionist_id": nutritionist_id,
                "reason": reason
            }
        )
    
    @staticmethod
    def weekly_report_ready(
        client_id: str,
        week_number: int,
        subscription_id: str,
        nutritionist_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Build weekly report ready event"""
        return EventBuilder.build_event(
            EventType.WEEKLY_REPORT_READY,
            {
                "client_id": client_id,
                "week_number": week_number,
                "subscription_id": subscription_id,
                "nutritionist_id": nutritionist_id
            }
        )

# Event type mappings for easy lookup
EVENT_CHANNELS = {
    EventType.SUBSCRIPTION_CREATED: [EventChannel.ADMIN, EventChannel.ALL_NUTRITIONISTS],
    EventType.SUBSCRIPTION_ACTIVATED: [EventChannel.KITCHEN, EventChannel.ADMIN],
    EventType.MEAL_PREPARING: [EventChannel.KITCHEN],
    EventType.MEAL_PACKED: [EventChannel.KITCHEN, EventChannel.ALL_DELIVERY_AGENTS],
    EventType.MEAL_ASSIGNED: [EventChannel.ALL_DELIVERY_AGENTS],
    EventType.MEAL_IN_TRANSIT: [EventChannel.KITCHEN],
    EventType.MEAL_DELIVERED: [EventChannel.KITCHEN, EventChannel.ADMIN],
    EventType.MEAL_CONSUMED: [EventChannel.ALL_NUTRITIONISTS],
    EventType.MEAL_SKIPPED: [EventChannel.ALL_NUTRITIONISTS, EventChannel.ADMIN],
    EventType.DELIVERY_ASSIGNED: [EventChannel.ALL_DELIVERY_AGENTS],
    EventType.DELIVERY_LOCATION_UPDATE: [EventChannel.KITCHEN],
    EventType.WEEKLY_REPORT_READY: [EventChannel.ALL_NUTRITIONISTS],
    EventType.ANNOUNCEMENT_BROADCAST: [EventChannel.ALL_CLIENTS],
    # Batch Events
    EventType.BATCH_CREATED: [EventChannel.KITCHEN, EventChannel.ADMIN],
    EventType.BATCH_READY_FOR_PICKUP: [EventChannel.ALL_DELIVERY_AGENTS, EventChannel.KITCHEN],
    EventType.BATCH_ASSIGNED: [EventChannel.ALL_DELIVERY_AGENTS, EventChannel.KITCHEN],
    EventType.BATCH_PICKUP_COMPLETE: [EventChannel.KITCHEN, EventChannel.ADMIN],
    # Label Events
    EventType.ORDER_LABEL_PRINTED: [EventChannel.KITCHEN],
    EventType.ORDER_LABEL_SCANNED: [EventChannel.KITCHEN, EventChannel.ALL_DELIVERY_AGENTS],
    # Order Pickup Events
    EventType.ORDER_PICKED_UP: [EventChannel.KITCHEN, EventChannel.ALL_CLIENTS],
    EventType.ORDER_DELIVERED: [EventChannel.KITCHEN, EventChannel.ALL_CLIENTS],
    EventType.ORDER_FAILED: [EventChannel.KITCHEN, EventChannel.ADMIN],
    # Batch Completion
    EventType.BATCH_COMPLETED: [EventChannel.KITCHEN, EventChannel.ADMIN],
    # Allocation Events
    EventType.NEW_PENDING_ALLOCATION: [EventChannel.ADMIN],
    EventType.USER_ASSIGNED: [EventChannel.ALL_NUTRITIONISTS],
    EventType.ALLOCATION_COMPLETED: [EventChannel.ADMIN, EventChannel.ALL_NUTRITIONISTS],
    # Activity Events
    EventType.MEAL_CHECKIN: [EventChannel.ALL_NUTRITIONISTS],
    EventType.WEIGHT_LOGGED: [EventChannel.ALL_NUTRITIONISTS],
    EventType.SYMPTOM_LOGGED: [EventChannel.ALL_NUTRITIONISTS],
    EventType.CONSULTATION_UPDATE: [EventChannel.ALL_NUTRITIONISTS, EventChannel.ALL_CLIENTS]
}
