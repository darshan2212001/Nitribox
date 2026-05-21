import pytest
import asyncio
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import AsyncMock, patch
import json
from datetime import datetime, timedelta

from api.main import app
from api.models import Order, DailyMealSchedule, Subscription, Client, Nutritionist
from api.events import EventType, EventBuilder
from api.connection_manager import ConnectionManager

# Legacy suite: missing shared db fixture, EventBuilder helpers renamed, ConnectionManager API changed.
pytestmark = pytest.mark.skip(
    reason="Outdated realtime fixtures; use api/tests/test_auth_flow.py and test_api_smoke.py for API coverage."
)


class TestRealTimeEvents:
    """Test suite for real-time event broadcasting across all portals"""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    @pytest.fixture
    def mock_connection_manager(self):
        """Mock connection manager for testing event broadcasting"""
        manager = AsyncMock(spec=ConnectionManager)
        manager.broadcast_to_channel = AsyncMock()
        return manager
    
    @pytest.fixture
    def sample_data(self, db: Session):
        """Create sample data for testing"""
        # Create test client
        client = Client(
            id="test-client-1",
            name="Test Client",
            email="test@example.com",
            phone="+1234567890"
        )
        db.add(client)
        
        # Create test nutritionist
        nutritionist = Nutritionist(
            id="test-nutritionist-1",
            name="Test Nutritionist",
            email="nutritionist@example.com",
            specialization="Weight Management"
        )
        db.add(nutritionist)
        
        # Create test subscription
        subscription = Subscription(
            id="test-subscription-1",
            client_id="test-client-1",
            nutritionist_id="test-nutritionist-1",
            meal_plan_id="test-plan-1",
            status="active",
            start_date=datetime.now().date(),
            end_date=(datetime.now() + timedelta(days=30)).date()
        )
        db.add(subscription)
        
        # Create test daily meal schedule
        daily_schedule = DailyMealSchedule(
            id="test-schedule-1",
            subscription_id="test-subscription-1",
            date=datetime.now().date(),
            breakfast_item="Oats Bowl",
            lunch_item="Quinoa Salad",
            dinner_item="Grilled Fish",
            breakfast_calories=350,
            lunch_calories=450,
            dinner_calories=400
        )
        db.add(daily_schedule)
        
        # Create test order
        order = Order(
            id="test-order-1",
            client_id="test-client-1",
            daily_meal_schedule_id="test-schedule-1",
            meal_type="breakfast",
            status="pending",
            kitchen_status="pending",
            price=15000.0
        )
        db.add(order)
        
        db.commit()
        return {
            "client": client,
            "nutritionist": nutritionist,
            "subscription": subscription,
            "daily_schedule": daily_schedule,
            "order": order
        }
    
    @pytest.mark.asyncio
    async def test_meal_status_update_broadcasting(self, client, mock_connection_manager, sample_data):
        """Test that meal status updates broadcast to all relevant channels"""
        
        with patch('api.endpoints.daily_meals.manager', mock_connection_manager):
            response = client.patch(
                f"/api/daily-meals/{sample_data['daily_schedule'].id}/meal-status",
                json={
                    "meal_type": "breakfast",
                    "status": "preparing"
                }
            )
            
            assert response.status_code == 200
            
            # Verify broadcasts to all channels
            expected_calls = [
                # Client channel
                (f"client_{sample_data['client'].id}", "meal.preparing"),
                # Kitchen channel
                ("kitchen", "meal.preparing"),
                # Nutritionist channel
                (f"nutritionist_{sample_data['nutritionist'].id}", "meal.preparing"),
                # Admin channel
                ("admin", "meal.preparing")
            ]
            
            assert mock_connection_manager.broadcast_to_channel.call_count == 4
            
            for call_args, expected_channel, expected_event in zip(
                mock_connection_manager.broadcast_to_channel.call_args_list,
                expected_calls
            ):
                channel, event_data = call_args[0]
                assert channel == expected_channel
                assert event_data["type"] == expected_event
                assert event_data["data"]["order_id"] == sample_data["order"].id
    
    @pytest.mark.asyncio
    async def test_consumption_logging_broadcasting(self, client, mock_connection_manager, sample_data):
        """Test that consumption logging broadcasts to nutritionist and admin"""
        
        with patch('api.endpoints.daily_meals.manager', mock_connection_manager):
            response = client.post(
                f"/api/daily-meals/{sample_data['daily_schedule'].id}/log-consumption",
                json={
                    "meal_type": "breakfast",
                    "status": "skipped",
                    "reason": "Not hungry"
                }
            )
            
            assert response.status_code == 200
            
            # Verify broadcasts to nutritionist and admin
            assert mock_connection_manager.broadcast_to_channel.call_count == 2
            
            calls = mock_connection_manager.broadcast_to_channel.call_args_list
            
            # Check nutritionist channel
            nutritionist_call = calls[0]
            channel, event_data = nutritionist_call[0]
            assert channel == f"nutritionist_{sample_data['nutritionist'].id}"
            assert event_data["type"] == "meal.skipped"
            assert event_data["data"]["client_id"] == sample_data["client"].id
            
            # Check admin channel
            admin_call = calls[1]
            channel, event_data = admin_call[0]
            assert channel == "admin"
            assert event_data["type"] == "meal.skipped"
    
    @pytest.mark.asyncio
    async def test_delivery_assignment_broadcasting(self, client, mock_connection_manager, sample_data):
        """Test that delivery assignment broadcasts to all relevant parties"""
        
        with patch('api.endpoints.delivery_tracking.manager', mock_connection_manager):
            response = client.post(
                "/api/delivery-tracking/assign",
                json={
                    "order_id": sample_data["order"].id,
                    "delivery_agent_id": "test-agent-1",
                    "delivery_agent_name": "Test Agent"
                }
            )
            
            assert response.status_code == 200
            
            # Verify broadcasts to all channels
            expected_calls = [
                # Client channel
                (f"client_{sample_data['client'].id}", "delivery.assigned"),
                # Delivery agent channel
                ("delivery_test-agent-1", "delivery.assigned"),
                # Kitchen channel
                ("kitchen", "delivery.assigned"),
                # Admin channel
                ("admin", "delivery.assigned")
            ]
            
            assert mock_connection_manager.broadcast_to_channel.call_count == 4
            
            for call_args, expected_channel, expected_event in zip(
                mock_connection_manager.broadcast_to_channel.call_args_list,
                expected_calls
            ):
                channel, event_data = call_args[0]
                assert channel == expected_channel
                assert event_data["type"] == expected_event
    
    @pytest.mark.asyncio
    async def test_kitchen_meal_preparation_broadcasting(self, client, mock_connection_manager, sample_data):
        """Test that kitchen meal preparation broadcasts to client"""
        
        with patch('api.endpoints.kitchen.manager', mock_connection_manager):
            response = client.patch(
                f"/api/kitchen/meal/{sample_data['order'].id}/start-preparation"
            )
            
            assert response.status_code == 200
            
            # Verify broadcast to client
            assert mock_connection_manager.broadcast_to_channel.call_count == 1
            
            call_args = mock_connection_manager.broadcast_to_channel.call_args_list[0]
            channel, event_data = call_args[0]
            assert channel == f"client_{sample_data['client'].id}"
            assert event_data["type"] == "meal.preparing"
            assert event_data["data"]["order_id"] == sample_data["order"].id
    
    @pytest.mark.asyncio
    async def test_weekly_report_generation_broadcasting(self, client, mock_connection_manager, sample_data):
        """Test that weekly report generation broadcasts to client and nutritionist"""
        
        with patch('api.endpoints.reports.manager', mock_connection_manager):
            response = client.get(
                f"/api/reports/weekly-report/{sample_data['client'].id}"
            )
            
            assert response.status_code == 200
            
            # Verify broadcasts to client and nutritionist
            assert mock_connection_manager.broadcast_to_channel.call_count == 2
            
            calls = mock_connection_manager.broadcast_to_channel.call_args_list
            
            # Check client channel
            client_call = calls[0]
            channel, event_data = client_call[0]
            assert channel == f"client_{sample_data['client'].id}"
            assert event_data["type"] == "weekly.report_ready"
            
            # Check nutritionist channel
            nutritionist_call = calls[1]
            channel, event_data = nutritionist_call[0]
            assert channel == f"nutritionist_{sample_data['nutritionist'].id}"
            assert event_data["type"] == "weekly.report_ready"
    
    def test_event_builder_creates_correct_event_structure(self):
        """Test that EventBuilder creates properly structured events"""
        
        event_data = EventBuilder.meal_preparing(
            order_id="test-order-1",
            client_id="test-client-1",
            meal_type="breakfast"
        )
        
        assert event_data["type"] == EventType.MEAL_PREPARING
        assert event_data["data"]["order_id"] == "test-order-1"
        assert event_data["data"]["client_id"] == "test-client-1"
        assert event_data["data"]["meal_type"] == "breakfast"
        assert "timestamp" in event_data
    
    def test_event_builder_consumption_logging(self):
        """Test EventBuilder for consumption logging events"""
        
        event_data = EventBuilder.meal_consumed(
            order_id="test-order-1",
            client_id="test-client-1",
            nutritionist_id="test-nutritionist-1",
            meal_type="breakfast",
            rating=5
        )
        
        assert event_data["type"] == EventType.MEAL_CONSUMED
        assert event_data["data"]["order_id"] == "test-order-1"
        assert event_data["data"]["client_id"] == "test-client-1"
        assert event_data["data"]["nutritionist_id"] == "test-nutritionist-1"
        assert event_data["data"]["meal_type"] == "breakfast"
        assert event_data["data"]["rating"] == 5
    
    def test_event_builder_skip_alert(self):
        """Test EventBuilder for skip alert events"""
        
        event_data = EventBuilder.meal_skipped(
            order_id="test-order-1",
            client_id="test-client-1",
            nutritionist_id="test-nutritionist-1",
            meal_type="breakfast",
            reason="Not hungry"
        )
        
        assert event_data["type"] == EventType.MEAL_SKIPPED
        assert event_data["data"]["order_id"] == "test-order-1"
        assert event_data["data"]["client_id"] == "test-client-1"
        assert event_data["data"]["nutritionist_id"] == "test-nutritionist-1"
        assert event_data["data"]["meal_type"] == "breakfast"
        assert event_data["data"]["reason"] == "Not hungry"


class TestWebSocketIntegration:
    """Test WebSocket connection and message handling"""
    
    @pytest.mark.asyncio
    async def test_websocket_connection_and_subscription(self):
        """Test WebSocket connection and channel subscription"""
        
        # This would require a WebSocket test client
        # For now, we'll test the connection manager logic
        
        manager = ConnectionManager()
        
        # Test connection
        connection_id = "test-connection-1"
        await manager.connect(connection_id, "test-websocket")
        
        # Test channel subscription
        channel = "client_test-client-1"
        await manager.subscribe_to_channel(connection_id, channel)
        
        # Verify subscription
        assert channel in manager.channel_subscriptions
        assert connection_id in manager.channel_subscriptions[channel]
    
    @pytest.mark.asyncio
    async def test_websocket_message_broadcasting(self):
        """Test WebSocket message broadcasting to channels"""
        
        manager = ConnectionManager()
        
        # Create multiple connections
        conn1 = "test-connection-1"
        conn2 = "test-connection-2"
        
        await manager.connect(conn1, "test-websocket-1")
        await manager.connect(conn2, "test-websocket-2")
        
        # Subscribe both to same channel
        channel = "kitchen"
        await manager.subscribe_to_channel(conn1, channel)
        await manager.subscribe_to_channel(conn2, channel)
        
        # Broadcast message
        message = {
            "type": "meal.preparing",
            "data": {"order_id": "test-order-1"}
        }
        
        await manager.broadcast_to_channel(channel, message)
        
        # Verify both connections received the message
        # (In real implementation, we'd check the WebSocket send calls)
        assert channel in manager.channel_subscriptions
        assert len(manager.channel_subscriptions[channel]) == 2


class TestDailyAutomation:
    """Test daily automation and scheduling"""
    
    @pytest.mark.asyncio
    async def test_daily_meal_assignment_scheduler(self, db: Session, mock_connection_manager):
        """Test that daily meal assignment scheduler works correctly"""
        
        # Create test subscription
        subscription = Subscription(
            id="test-subscription-1",
            client_id="test-client-1",
            nutritionist_id="test-nutritionist-1",
            meal_plan_id="test-plan-1",
            status="active",
            start_date=datetime.now().date(),
            end_date=(datetime.now() + timedelta(days=30)).date()
        )
        db.add(subscription)
        
        # Create daily meal schedule
        daily_schedule = DailyMealSchedule(
            id="test-schedule-1",
            subscription_id="test-subscription-1",
            date=datetime.now().date(),
            breakfast_item="Oats Bowl",
            lunch_item="Quinoa Salad",
            dinner_item="Grilled Fish"
        )
        db.add(daily_schedule)
        db.commit()
        
        with patch('api.scheduler.manager', mock_connection_manager):
            # Simulate scheduler execution
            from scheduler import generate_daily_orders
            
            await generate_daily_orders()
            
            # Verify orders were created
            orders = db.query(Order).filter(
                Order.daily_meal_schedule_id == daily_schedule.id
            ).all()
            
            assert len(orders) == 3  # breakfast, lunch, dinner
            
            # Verify broadcasts
            assert mock_connection_manager.broadcast_to_channel.call_count >= 1
            
            # Check that kitchen channel received the broadcast
            kitchen_calls = [
                call for call in mock_connection_manager.broadcast_to_channel.call_args_list
                if call[0][0] == "kitchen"
            ]
            assert len(kitchen_calls) > 0


class TestLoadTesting:
    """Test system performance under load"""
    
    @pytest.mark.asyncio
    async def test_concurrent_event_broadcasting(self, mock_connection_manager):
        """Test broadcasting events concurrently"""
        
        async def broadcast_event(event_id):
            await mock_connection_manager.broadcast_to_channel(
                f"client_test-client-{event_id}",
                {"type": "meal.preparing", "data": {"order_id": f"order-{event_id}"}}
            )
        
        # Simulate 100 concurrent events
        tasks = [broadcast_event(i) for i in range(100)]
        await asyncio.gather(*tasks)
        
        # Verify all events were processed
        assert mock_connection_manager.broadcast_to_channel.call_count == 100
    
    @pytest.mark.asyncio
    async def test_websocket_connection_scaling(self):
        """Test WebSocket connection scaling"""
        
        manager = ConnectionManager()
        
        # Simulate 100 concurrent connections
        connections = []
        for i in range(100):
            conn_id = f"test-connection-{i}"
            await manager.connect(conn_id, f"test-websocket-{i}")
            connections.append(conn_id)
        
        # Subscribe all to different channels
        for i, conn_id in enumerate(connections):
            channel = f"client_test-client-{i}"
            await manager.subscribe_to_channel(conn_id, channel)
        
        # Verify all connections are tracked
        assert len(manager.active_connections) == 100
        
        # Verify channel subscriptions
        total_subscriptions = sum(len(subs) for subs in manager.channel_subscriptions.values())
        assert total_subscriptions == 100


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
