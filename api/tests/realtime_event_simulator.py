#!/usr/bin/env python3
"""
Real-Time Event Simulator for ZyaeL NutriBox Testing
Simulates realistic real-time events for comprehensive testing
"""

import asyncio
import json
import random
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import websockets
import requests
from sqlalchemy.orm import Session
from api.database import SessionLocal
from api import models
from api.events import EventType, EventChannel, EventBuilder

class RealtimeEventSimulator:
    """Simulates real-time events for testing"""
    
    def __init__(self, base_url: str = "http://localhost:8000", ws_url: str = "ws://localhost:8000/ws"):
        self.base_url = base_url
        self.ws_url = ws_url
        self.db = SessionLocal()
        self.running = False
        self.event_handlers = {}
        self.active_simulations = {}
        
        # Event simulation intervals (in seconds)
        self.intervals = {
            "meal_status_updates": 30,  # Every 30 seconds
            "gps_updates": 10,          # Every 10 seconds
            "consumption_logging": 60,  # Every minute
            "skip_alerts": 120,         # Every 2 minutes
            "weekly_reports": 3600,     # Every hour
            "consultation_reminders": 1800,  # Every 30 minutes
            "admin_announcements": 600  # Every 10 minutes
        }
        
    async def start_simulation(self):
        """Start all event simulations"""
        print("🚀 Starting real-time event simulation...")
        self.running = True
        
        # Start all simulation tasks
        tasks = [
            asyncio.create_task(self.simulate_meal_status_updates()),
            asyncio.create_task(self.simulate_gps_tracking()),
            asyncio.create_task(self.simulate_consumption_logging()),
            asyncio.create_task(self.simulate_skip_alerts()),
            asyncio.create_task(self.simulate_weekly_reports()),
            asyncio.create_task(self.simulate_consultation_reminders()),
            asyncio.create_task(self.simulate_admin_announcements()),
            asyncio.create_task(self.simulate_daily_workflow())
        ]
        
        try:
            await asyncio.gather(*tasks)
        except Exception as e:
            print(f"❌ Simulation error: {e}")
        finally:
            self.running = False
    
    async def stop_simulation(self):
        """Stop all simulations"""
        print("🛑 Stopping real-time event simulation...")
        self.running = False
        
        # Cancel all active simulations
        for simulation_id, task in self.active_simulations.items():
            if not task.done():
                task.cancel()
        
        self.active_simulations.clear()
    
    async def simulate_meal_status_updates(self):
        """Simulate meal status transitions"""
        print("🍽️ Starting meal status simulation...")
        
        while self.running:
            try:
                # Get orders that need status updates
                orders = self.db.query(models.Order).filter(
                    models.Order.status.in_(["pending", "preparing", "packed"])
                ).limit(5).all()
                
                for order in orders:
                    await self.simulate_meal_status_transition(order)
                
                await asyncio.sleep(self.intervals["meal_status_updates"])
                
            except Exception as e:
                print(f"❌ Meal status simulation error: {e}")
                await asyncio.sleep(5)
    
    async def simulate_meal_status_transition(self, order: models.Order):
        """Simulate a single meal status transition"""
        try:
            current_status = order.status
            
            # Define status progression
            status_progression = {
                "pending": "preparing",
                "preparing": "packed",
                "packed": "assigned"
            }
            
            if current_status in status_progression:
                new_status = status_progression[current_status]
                
                # Update order status
                order.status = new_status
                order.kitchen_status = new_status if new_status in ["preparing", "packed"] else order.kitchen_status
                
                # If moving to assigned, assign delivery agent
                if new_status == "assigned":
                    await self.assign_delivery_agent(order)
                
                self.db.commit()
                
                # Broadcast event
                await self.broadcast_meal_status_event(order, new_status)
                
                print(f"📦 Order {order.id} status: {current_status} → {new_status}")
                
        except Exception as e:
            print(f"❌ Error simulating meal status transition: {e}")
    
    async def assign_delivery_agent(self, order: models.Order):
        """Assign delivery agent to order"""
        try:
            # Get available delivery agents
            available_agents = self.db.query(models.DeliveryAgent).filter(
                models.DeliveryAgent.is_available == True
            ).all()
            
            if available_agents:
                agent = random.choice(available_agents)
                order.delivery_agent_id = agent.id
                order.delivery_agent_name = agent.name
                order.status = "assigned"
                
                print(f"🚚 Assigned delivery agent {agent.name} to order {order.id}")
                
        except Exception as e:
            print(f"❌ Error assigning delivery agent: {e}")
    
    async def simulate_gps_tracking(self):
        """Simulate GPS location updates for deliveries"""
        print("📍 Starting GPS tracking simulation...")
        
        while self.running:
            try:
                # Get orders in transit
                orders = self.db.query(models.Order).filter(
                    models.Order.status.in_(["assigned", "in_transit"])
                ).all()
                
                for order in orders:
                    await self.simulate_gps_update(order)
                
                await asyncio.sleep(self.intervals["gps_updates"])
                
            except Exception as e:
                print(f"❌ GPS tracking simulation error: {e}")
                await asyncio.sleep(5)
    
    async def simulate_gps_update(self, order: models.Order):
        """Simulate GPS update for a single order"""
        try:
            if not order.delivery_agent_id:
                return
            
            # Get delivery agent
            agent = self.db.query(models.DeliveryAgent).filter(
                models.DeliveryAgent.id == order.delivery_agent_id
            ).first()
            
            if not agent:
                return
            
            # Simulate movement (small random changes)
            current_lat = float(agent.current_location_lat)
            current_lng = float(agent.current_location_lng)
            
            # Random movement within 0.001 degrees (~100m)
            lat_change = random.uniform(-0.001, 0.001)
            lng_change = random.uniform(-0.001, 0.001)
            
            new_lat = current_lat + lat_change
            new_lng = current_lng + lng_change
            
            # Update agent location
            agent.current_location_lat = str(new_lat)
            agent.current_location_lng = str(new_lng)
            
            # Update order status to in_transit if it was assigned
            if order.status == "assigned":
                order.status = "in_transit"
            
            self.db.commit()
            
            # Broadcast GPS update event
            await self.broadcast_gps_update_event(order, new_lat, new_lng)
            
            print(f"📍 GPS update for order {order.id}: ({new_lat:.6f}, {new_lng:.6f})")
            
        except Exception as e:
            print(f"❌ Error simulating GPS update: {e}")
    
    async def simulate_consumption_logging(self):
        """Simulate meal consumption logging"""
        print("🍴 Starting consumption logging simulation...")
        
        while self.running:
            try:
                # Get delivered orders that haven't been logged yet
                orders = self.db.query(models.Order).filter(
                    models.Order.status == "delivered"
                ).limit(3).all()
                
                for order in orders:
                    await self.simulate_consumption_log(order)
                
                await asyncio.sleep(self.intervals["consumption_logging"])
                
            except Exception as e:
                print(f"❌ Consumption logging simulation error: {e}")
                await asyncio.sleep(5)
    
    async def simulate_consumption_log(self, order: models.Order):
        """Simulate consumption logging for a single order"""
        try:
            # Randomly decide if meal was consumed or skipped
            consumed = random.choice([True, False])
            status = "consumed" if consumed else "skipped"
            
            # Update order status
            order.status = status
            self.db.commit()
            
            # Broadcast consumption event
            await self.broadcast_consumption_event(order, consumed)
            
            print(f"🍴 Order {order.id} logged as: {status}")
            
        except Exception as e:
            print(f"❌ Error simulating consumption log: {e}")
    
    async def simulate_skip_alerts(self):
        """Simulate skip meal alerts"""
        print("⚠️ Starting skip alerts simulation...")
        
        while self.running:
            try:
                # Get skipped orders
                skipped_orders = self.db.query(models.Order).filter(
                    models.Order.status == "skipped"
                ).limit(2).all()
                
                for order in skipped_orders:
                    await self.broadcast_skip_alert(order)
                
                await asyncio.sleep(self.intervals["skip_alerts"])
                
            except Exception as e:
                print(f"❌ Skip alerts simulation error: {e}")
                await asyncio.sleep(5)
    
    async def simulate_weekly_reports(self):
        """Simulate weekly report generation"""
        print("📊 Starting weekly reports simulation...")
        
        while self.running:
            try:
                # Generate weekly reports for active subscriptions
                subscriptions = self.db.query(models.Subscription).filter(
                    models.Subscription.status == "active"
                ).limit(3).all()
                
                for subscription in subscriptions:
                    await self.generate_weekly_report(subscription)
                
                await asyncio.sleep(self.intervals["weekly_reports"])
                
            except Exception as e:
                print(f"❌ Weekly reports simulation error: {e}")
                await asyncio.sleep(5)
    
    async def generate_weekly_report(self, subscription: models.Subscription):
        """Generate weekly report for a subscription"""
        try:
            # Calculate week statistics
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=7)
            
            # Get orders for the week
            orders = self.db.query(models.Order).join(models.DailyMealSchedule).filter(
                models.DailyMealSchedule.subscription_id == subscription.id,
                models.DailyMealSchedule.date >= start_date,
                models.DailyMealSchedule.date <= end_date
            ).all()
            
            total_meals = len(orders)
            consumed_meals = len([o for o in orders if o.status == "consumed"])
            skipped_meals = len([o for o in orders if o.status == "skipped"])
            
            if total_meals > 0:
                completion_rate = (consumed_meals / total_meals) * 100
                
                # Create weekly report
                report = models.WeeklyReport(
                    id=f"sim-report-{subscription.client_id}-{int(time.time())}",
                    client_id=subscription.client_id,
                    nutritionist_id=subscription.nutritionist_id,
                    week_number=1,
                    start_date=start_date,
                    end_date=end_date,
                    total_meals=total_meals,
                    consumed_meals=consumed_meals,
                    skipped_meals=skipped_meals,
                    completion_rate=completion_rate,
                    weight_change=random.uniform(-1.0, 0.5),
                    nutritionist_notes=f"Simulated weekly report for {subscription.client_id}",
                    recommendations=[
                        "Continue with current meal plan",
                        "Increase water intake",
                        "Add daily exercise"
                    ],
                    generated_at=datetime.now()
                )
                
                self.db.add(report)
                self.db.commit()
                
                # Broadcast report ready event
                await self.broadcast_weekly_report_event(report)
                
                print(f"📊 Generated weekly report for client {subscription.client_id}")
                
        except Exception as e:
            print(f"❌ Error generating weekly report: {e}")
    
    async def simulate_consultation_reminders(self):
        """Simulate consultation reminders"""
        print("💬 Starting consultation reminders simulation...")
        
        while self.running:
            try:
                # Get upcoming consultations
                tomorrow = datetime.now().date() + timedelta(days=1)
                consultations = self.db.query(models.Consultation).filter(
                    models.Consultation.scheduled_date == tomorrow,
                    models.Consultation.status == "scheduled"
                ).limit(2).all()
                
                for consultation in consultations:
                    await self.broadcast_consultation_reminder(consultation)
                
                await asyncio.sleep(self.intervals["consultation_reminders"])
                
            except Exception as e:
                print(f"❌ Consultation reminders simulation error: {e}")
                await asyncio.sleep(5)
    
    async def simulate_admin_announcements(self):
        """Simulate admin announcements"""
        print("📢 Starting admin announcements simulation...")
        
        announcements = [
            "Lunch delivery may be delayed by 15 minutes due to heavy traffic",
            "New meal options available for next week's menu",
            "Kitchen maintenance scheduled for Sunday - no deliveries",
            "Weather alert: Heavy rain expected - deliveries may be delayed",
            "Special offer: 20% off on next month's subscription"
        ]
        
        while self.running:
            try:
                # Randomly send announcements
                if random.random() < 0.3:  # 30% chance every interval
                    announcement = random.choice(announcements)
                    await self.broadcast_admin_announcement(announcement)
                
                await asyncio.sleep(self.intervals["admin_announcements"])
                
            except Exception as e:
                print(f"❌ Admin announcements simulation error: {e}")
                await ascio.sleep(5)
    
    async def simulate_daily_workflow(self):
        """Simulate complete daily workflow"""
        print("🔄 Starting daily workflow simulation...")
        
        while self.running:
            try:
                current_hour = datetime.now().hour
                
                # Morning workflow (6-8 AM)
                if current_hour == 6:
                    await self.simulate_morning_workflow()
                
                # Lunch workflow (11 AM - 1 PM)
                elif current_hour == 11:
                    await self.simulate_lunch_workflow()
                
                # Dinner workflow (5-7 PM)
                elif current_hour == 17:
                    await self.simulate_dinner_workflow()
                
                await asyncio.sleep(3600)  # Check every hour
                
            except Exception as e:
                print(f"❌ Daily workflow simulation error: {e}")
                await asyncio.sleep(60)
    
    async def simulate_morning_workflow(self):
        """Simulate morning meal workflow"""
        print("🌅 Simulating morning workflow...")
        
        # Get breakfast orders for today
        today = datetime.now().date()
        breakfast_orders = self.db.query(models.Order).join(models.DailyMealSchedule).filter(
            models.DailyMealSchedule.date == today,
            models.Order.meal_type == "breakfast"
        ).all()
        
        for order in breakfast_orders:
            # Start preparation
            order.status = "preparing"
            order.kitchen_status = "preparing"
            self.db.commit()
            
            await self.broadcast_meal_status_event(order, "preparing")
            
            # Wait a bit, then pack
            await asyncio.sleep(2)
            order.status = "packed"
            order.kitchen_status = "packed"
            self.db.commit()
            
            await self.broadcast_meal_status_event(order, "packed")
            
            # Assign delivery
            await self.assign_delivery_agent(order)
    
    async def simulate_lunch_workflow(self):
        """Simulate lunch meal workflow"""
        print("🌞 Simulating lunch workflow...")
        
        # Similar to morning workflow but for lunch
        today = datetime.now().date()
        lunch_orders = self.db.query(models.Order).join(models.DailyMealSchedule).filter(
            models.DailyMealSchedule.date == today,
            models.Order.meal_type == "lunch"
        ).all()
        
        for order in lunch_orders:
            order.status = "preparing"
            order.kitchen_status = "preparing"
            self.db.commit()
            
            await self.broadcast_meal_status_event(order, "preparing")
            
            await asyncio.sleep(2)
            order.status = "packed"
            order.kitchen_status = "packed"
            self.db.commit()
            
            await self.broadcast_meal_status_event(order, "packed")
            
            await self.assign_delivery_agent(order)
    
    async def simulate_dinner_workflow(self):
        """Simulate dinner meal workflow"""
        print("🌙 Simulating dinner workflow...")
        
        # Similar to morning workflow but for dinner
        today = datetime.now().date()
        dinner_orders = self.db.query(models.Order).join(models.DailyMealSchedule).filter(
            models.DailyMealSchedule.date == today,
            models.Order.meal_type == "dinner"
        ).all()
        
        for order in dinner_orders:
            order.status = "preparing"
            order.kitchen_status = "preparing"
            self.db.commit()
            
            await self.broadcast_meal_status_event(order, "preparing")
            
            await asyncio.sleep(2)
            order.status = "packed"
            order.kitchen_status = "packed"
            self.db.commit()
            
            await self.broadcast_meal_status_event(order, "packed")
            
            await self.assign_delivery_agent(order)
    
    # Event broadcasting methods
    async def broadcast_meal_status_event(self, order: models.Order, status: str):
        """Broadcast meal status event"""
        try:
            event_data = EventBuilder.meal_status_changed(
                order_id=order.id,
                client_id=order.client_id,
                meal_type=order.meal_type,
                status=status,
                meal_item=order.meal_item
            )
            
            await self.broadcast_event(EventChannel.client(order.client_id), event_data)
            await self.broadcast_event(EventChannel.KITCHEN, event_data)
            await self.broadcast_event(EventChannel.ADMIN, event_data)
            
        except Exception as e:
            print(f"❌ Error broadcasting meal status event: {e}")
    
    async def broadcast_gps_update_event(self, order: models.Order, lat: float, lng: float):
        """Broadcast GPS update event"""
        try:
            event_data = EventBuilder.delivery_location_update(
                order_id=order.id,
                client_id=order.client_id,
                delivery_agent_id=order.delivery_agent_id,
                latitude=lat,
                longitude=lng,
                estimated_time=datetime.now() + timedelta(minutes=random.randint(5, 20))
            )
            
            await self.broadcast_event(EventChannel.client(order.client_id), event_data)
            await self.broadcast_event(EventChannel.KITCHEN, event_data)
            await self.broadcast_event(EventChannel.ADMIN, event_data)
            
        except Exception as e:
            print(f"❌ Error broadcasting GPS update event: {e}")
    
    async def broadcast_consumption_event(self, order: models.Order, consumed: bool):
        """Broadcast consumption event"""
        try:
            event_data = EventBuilder.meal_consumption_logged(
                order_id=order.id,
                client_id=order.client_id,
                nutritionist_id=order.subscription.nutritionist_id,
                consumed=consumed,
                meal_type=order.meal_type,
                meal_item=order.meal_item
            )
            
            await self.broadcast_event(EventChannel.nutritionist(order.subscription.nutritionist_id), event_data)
            await self.broadcast_event(EventChannel.ADMIN, event_data)
            
        except Exception as e:
            print(f"❌ Error broadcasting consumption event: {e}")
    
    async def broadcast_skip_alert(self, order: models.Order):
        """Broadcast skip alert"""
        try:
            event_data = EventBuilder.skip_meal_alert(
                order_id=order.id,
                client_id=order.client_id,
                nutritionist_id=order.subscription.nutritionist_id,
                meal_type=order.meal_type,
                meal_item=order.meal_item,
                skip_reason="Not hungry"
            )
            
            await self.broadcast_event(EventChannel.nutritionist(order.subscription.nutritionist_id), event_data)
            await self.broadcast_event(EventChannel.ADMIN, event_data)
            
        except Exception as e:
            print(f"❌ Error broadcasting skip alert: {e}")
    
    async def broadcast_weekly_report_event(self, report: models.WeeklyReport):
        """Broadcast weekly report event"""
        try:
            event_data = EventBuilder.weekly_report_ready(
                report_id=report.id,
                client_id=report.client_id,
                nutritionist_id=report.nutritionist_id,
                completion_rate=report.completion_rate,
                week_number=report.week_number
            )
            
            await self.broadcast_event(EventChannel.client(report.client_id), event_data)
            await self.broadcast_event(EventChannel.nutritionist(report.nutritionist_id), event_data)
            await self.broadcast_event(EventChannel.ADMIN, event_data)
            
        except Exception as e:
            print(f"❌ Error broadcasting weekly report event: {e}")
    
    async def broadcast_consultation_reminder(self, consultation: models.Consultation):
        """Broadcast consultation reminder"""
        try:
            event_data = EventBuilder.consultation_reminder(
                consultation_id=consultation.id,
                client_id=consultation.client_id,
                nutritionist_id=consultation.nutritionist_id,
                scheduled_date=consultation.scheduled_date,
                scheduled_time=consultation.scheduled_time
            )
            
            await self.broadcast_event(EventChannel.client(consultation.client_id), event_data)
            await self.broadcast_event(EventChannel.nutritionist(consultation.nutritionist_id), event_data)
            
        except Exception as e:
            print(f"❌ Error broadcasting consultation reminder: {e}")
    
    async def broadcast_admin_announcement(self, message: str):
        """Broadcast admin announcement"""
        try:
            event_data = EventBuilder.admin_announcement(
                message=message,
                announcement_type="general",
                priority="medium"
            )
            
            # Broadcast to all channels
            await self.broadcast_event(EventChannel.ADMIN, event_data)
            await self.broadcast_event(EventChannel.KITCHEN, event_data)
            await self.broadcast_event(EventChannel.DELIVERY, event_data)
            
        except Exception as e:
            print(f"❌ Error broadcasting admin announcement: {e}")
    
    async def broadcast_event(self, channel: str, event_data: Dict[str, Any]):
        """Broadcast event to WebSocket channel"""
        try:
            # In a real implementation, this would connect to WebSocket and send the event
            # For testing, we'll just log the event
            print(f"📡 Broadcasting to {channel}: {event_data['type']}")
            
            # Simulate WebSocket broadcast
            await asyncio.sleep(0.01)  # Small delay to simulate network
            
        except Exception as e:
            print(f"❌ Error broadcasting event: {e}")
    
    def close(self):
        """Close database connection"""
        self.db.close()

async def main():
    """Main function to run event simulation"""
    simulator = RealtimeEventSimulator()
    try:
        await simulator.start_simulation()
    except KeyboardInterrupt:
        print("\n🛑 Simulation interrupted by user")
    except Exception as e:
        print(f"❌ Simulation error: {e}")
    finally:
        await simulator.stop_simulation()
        simulator.close()

if __name__ == "__main__":
    asyncio.run(main())
