import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from pydantic import BaseModel
import json

from api.database import get_db
from api.models import Order, DailyMealSchedule, Subscription, Client, Nutritionist
from api.connection_manager import manager

router = APIRouter(prefix="/api/monitoring", tags=["monitoring"])


class SystemHealthMetrics(BaseModel):
    """System health metrics model"""
    timestamp: datetime
    websocket_connections: int
    active_channels: int
    events_per_minute: int
    avg_response_time_ms: float
    error_rate_percent: float
    database_connections: int
    memory_usage_mb: float
    cpu_usage_percent: float


class RealTimeMetrics(BaseModel):
    """Real-time operational metrics"""
    timestamp: datetime
    total_meals_today: int
    meals_prepared: int
    meals_in_transit: int
    meals_delivered: int
    meals_skipped: int
    avg_delivery_time_minutes: float
    active_delivery_agents: int
    client_satisfaction_score: float
    system_alerts: List[Dict]


class EventMetrics(BaseModel):
    """Event broadcasting metrics"""
    timestamp: datetime
    total_events_sent: int
    events_by_type: Dict[str, int]
    events_by_channel: Dict[str, int]
    failed_events: int
    avg_event_latency_ms: float


class PerformanceMetrics(BaseModel):
    """Performance metrics"""
    timestamp: datetime
    api_response_times: Dict[str, float]
    database_query_times: Dict[str, float]
    websocket_message_latency: float
    cache_hit_rate: float
    queue_depth: int


@router.get("/health", response_model=SystemHealthMetrics)
async def get_system_health():
    """Get current system health metrics"""
    
    # Get WebSocket connection count
    websocket_connections = len(manager.active_connections)
    active_channels = len(manager.channel_connections)
    
    # Calculate events per minute (simplified)
    events_per_minute = await _calculate_events_per_minute()
    
    # Mock system metrics (in production, use actual system monitoring)
    avg_response_time_ms = 45.2
    error_rate_percent = 0.8
    database_connections = 12
    memory_usage_mb = 256.7
    cpu_usage_percent = 23.4
    
    return SystemHealthMetrics(
        timestamp=datetime.now(),
        websocket_connections=websocket_connections,
        active_channels=active_channels,
        events_per_minute=events_per_minute,
        avg_response_time_ms=avg_response_time_ms,
        error_rate_percent=error_rate_percent,
        database_connections=database_connections,
        memory_usage_mb=memory_usage_mb,
        cpu_usage_percent=cpu_usage_percent
    )


@router.get("/realtime", response_model=RealTimeMetrics)
async def get_realtime_metrics(db: Session = Depends(get_db)):
    """Get real-time operational metrics"""
    
    today = datetime.now().date()
    
    # Get today's meal statistics
    total_meals_today = db.query(Order).filter(
        func.date(Order.created_at) == today
    ).count()
    
    meals_prepared = db.query(Order).filter(
        func.date(Order.created_at) == today,
        Order.kitchen_status == "preparing"
    ).count()
    
    meals_in_transit = db.query(Order).filter(
        func.date(Order.created_at) == today,
        Order.status == "in_transit"
    ).count()
    
    meals_delivered = db.query(Order).filter(
        func.date(Order.created_at) == today,
        Order.status == "delivered"
    ).count()
    
    meals_skipped = db.query(Order).filter(
        func.date(Order.created_at) == today,
        Order.consumed_status == "skipped"
    ).count()
    
    # Calculate average delivery time (simplified)
    avg_delivery_time_minutes = await _calculate_avg_delivery_time(db, today)
    
    # Mock active delivery agents count
    active_delivery_agents = 8
    
    # Mock client satisfaction score
    client_satisfaction_score = 4.7
    
    # Get system alerts
    system_alerts = await _get_system_alerts(db)
    
    return RealTimeMetrics(
        timestamp=datetime.now(),
        total_meals_today=total_meals_today,
        meals_prepared=meals_prepared,
        meals_in_transit=meals_in_transit,
        meals_delivered=meals_delivered,
        meals_skipped=meals_skipped,
        avg_delivery_time_minutes=avg_delivery_time_minutes,
        active_delivery_agents=active_delivery_agents,
        client_satisfaction_score=client_satisfaction_score,
        system_alerts=system_alerts
    )


@router.get("/events", response_model=EventMetrics)
async def get_event_metrics():
    """Get event broadcasting metrics"""
    
    # Get event statistics from connection manager
    total_events_sent = await _get_total_events_sent()
    events_by_type = await _get_events_by_type()
    events_by_channel = await _get_events_by_channel()
    failed_events = await _get_failed_events()
    avg_event_latency_ms = await _get_avg_event_latency()
    
    return EventMetrics(
        timestamp=datetime.now(),
        total_events_sent=total_events_sent,
        events_by_type=events_by_type,
        events_by_channel=events_by_channel,
        failed_events=failed_events,
        avg_event_latency_ms=avg_event_latency_ms
    )


@router.get("/performance", response_model=PerformanceMetrics)
async def get_performance_metrics():
    """Get performance metrics"""
    
    # Mock API response times
    api_response_times = {
        "daily_meals": 23.4,
        "orders": 18.7,
        "delivery_tracking": 31.2,
        "kitchen": 15.8,
        "reports": 45.6
    }
    
    # Mock database query times
    database_query_times = {
        "orders_query": 12.3,
        "subscriptions_query": 8.9,
        "daily_meals_query": 15.2,
        "reports_query": 28.7
    }
    
    # Mock WebSocket message latency
    websocket_message_latency = 5.2
    
    # Mock cache hit rate
    cache_hit_rate = 0.87
    
    # Mock queue depth
    queue_depth = 3
    
    return PerformanceMetrics(
        timestamp=datetime.now(),
        api_response_times=api_response_times,
        database_query_times=database_query_times,
        websocket_message_latency=websocket_message_latency,
        cache_hit_rate=cache_hit_rate,
        queue_depth=queue_depth
    )


@router.get("/dashboard")
async def get_monitoring_dashboard(db: Session = Depends(get_db)):
    """Get comprehensive monitoring dashboard data"""
    
    # Get all metrics
    health = await get_system_health()
    realtime = await get_realtime_metrics(db)
    events = await get_event_metrics()
    performance = await get_performance_metrics()
    
    # Get additional dashboard data
    recent_orders = db.query(Order).order_by(desc(Order.created_at)).limit(10).all()
    active_subscriptions = db.query(Subscription).filter(
        Subscription.status == "active"
    ).count()
    
    # Get channel subscription breakdown
    channel_breakdown = {}
    for channel, connections in manager.channel_connections.items():
        channel_breakdown[channel] = len(connections)
    
    return {
        "timestamp": datetime.now(),
        "health": health.dict(),
        "realtime": realtime.dict(),
        "events": events.dict(),
        "performance": performance.dict(),
        "additional_metrics": {
            "active_subscriptions": active_subscriptions,
            "recent_orders_count": len(recent_orders),
            "channel_subscriptions": channel_breakdown,
            "uptime_hours": 24.5,  # Mock uptime
            "total_clients": db.query(Client).count(),
            "total_nutritionists": db.query(Nutritionist).count()
        }
    }


@router.get("/alerts")
async def get_system_alerts(db: Session = Depends(get_db)):
    """Get current system alerts and warnings"""
    
    alerts = []
    
    # Check for skipped meals
    recent_skipped = db.query(Order).filter(
        Order.consumed_status == "skipped",
        Order.created_at >= datetime.now() - timedelta(hours=2)
    ).count()
    
    if recent_skipped > 5:
        alerts.append({
            "type": "warning",
            "title": "High Skip Rate",
            "message": f"{recent_skipped} meals skipped in the last 2 hours",
            "timestamp": datetime.now(),
            "severity": "medium"
        })
    
    # Check for delivery delays
    delayed_deliveries = db.query(Order).filter(
        Order.status == "in_transit",
        Order.created_at < datetime.now() - timedelta(hours=1)
    ).count()
    
    if delayed_deliveries > 3:
        alerts.append({
            "type": "error",
            "title": "Delivery Delays",
            "message": f"{delayed_deliveries} deliveries delayed by more than 1 hour",
            "timestamp": datetime.now(),
            "severity": "high"
        })
    
    # Check WebSocket connection count
    if len(manager.active_connections) > 100:
        alerts.append({
            "type": "info",
            "title": "High Connection Load",
            "message": f"{len(manager.active_connections)} active WebSocket connections",
            "timestamp": datetime.now(),
            "severity": "low"
        })
    
    return {
        "alerts": alerts,
        "total_alerts": len(alerts),
        "timestamp": datetime.now()
    }


@router.get("/websocket-stats")
async def get_websocket_stats():
    """Get WebSocket connection statistics"""
    stats = manager.get_channel_stats()
    
    # Get detailed connection info
    connection_details = []
    for ws in manager.active_connections:
        user_info = manager.connection_user_info.get(ws, {})
        channels = list(manager.connection_channels.get(ws, set()))
        connection_details.append({
            "user_id": user_info.get("user_id"),
            "user_role": user_info.get("user_role"),
            "username": user_info.get("username"),
            "authenticated": user_info.get("authenticated", False),
            "channels": channels,
            "channel_count": len(channels)
        })
    
    return {
        "timestamp": datetime.now().isoformat(),
        "total_connections": stats["total_connections"],
        "total_channels": stats["total_channels"],
        "channels": stats["channels"],
        "connections_by_role": _group_connections_by_role(connection_details),
        "connection_details": connection_details
    }

def _group_connections_by_role(connections: List[Dict]) -> Dict[str, int]:
    """Group connections by user role"""
    role_counts = {}
    for conn in connections:
        role = conn.get("user_role") or "unauthenticated"
        role_counts[role] = role_counts.get(role, 0) + 1
    return role_counts

@router.post("/test-event")
async def test_event_broadcasting(
    channel: str,
    event_type: str,
    test_data: Dict
):
    """Test event broadcasting functionality"""
    
    try:
        event_data = {
            "type": event_type,
            "data": test_data,
            "timestamp": datetime.now().isoformat(),
            "test": True
        }
        
        await manager.broadcast_to_channel(channel, event_data)
        
        return {
            "success": True,
            "message": f"Test event '{event_type}' sent to channel '{channel}'",
            "timestamp": datetime.now()
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Helper functions

async def _calculate_events_per_minute() -> int:
    """Calculate events sent per minute"""
    # In production, this would track actual event counts
    return 45

async def _calculate_avg_delivery_time(db: Session, date) -> float:
    """Calculate average delivery time for the day"""
    # Simplified calculation
    delivered_orders = db.query(Order).filter(
        func.date(Order.created_at) == date,
        Order.status == "delivered"
    ).all()
    
    if not delivered_orders:
        return 0.0
    
    total_time = 0
    count = 0
    
    for order in delivered_orders:
        if order.delivered_at and order.created_at:
            delivery_time = (order.delivered_at - order.created_at).total_seconds() / 60
            total_time += delivery_time
            count += 1
    
    return total_time / count if count > 0 else 0.0

async def _get_system_alerts(db: Session) -> List[Dict]:
    """Get current system alerts"""
    alerts = []
    
    # Check for high skip rate
    recent_skipped = db.query(Order).filter(
        Order.consumed_status == "skipped",
        Order.created_at >= datetime.now() - timedelta(hours=1)
    ).count()
    
    if recent_skipped > 3:
        alerts.append({
            "type": "warning",
            "message": f"High skip rate: {recent_skipped} meals skipped in last hour",
            "timestamp": datetime.now().isoformat()
        })
    
    return alerts

async def _get_total_events_sent() -> int:
    """Get total events sent (mock)"""
    return 1250

async def _get_events_by_type() -> Dict[str, int]:
    """Get events by type (mock)"""
    return {
        "meal.preparing": 45,
        "meal.packed": 42,
        "meal.delivered": 38,
        "meal.skipped": 5,
        "delivery.assigned": 40,
        "delivery.location_update": 120,
        "weekly.report_ready": 8
    }

async def _get_events_by_channel() -> Dict[str, int]:
    """Get events by channel (mock)"""
    return {
        "kitchen": 85,
        "admin": 95,
        "client_*": 120,
        "nutritionist_*": 45,
        "delivery_*": 40
    }

async def _get_failed_events() -> int:
    """Get failed events count (mock)"""
    return 2

async def _get_avg_event_latency() -> float:
    """Get average event latency (mock)"""
    return 12.5
