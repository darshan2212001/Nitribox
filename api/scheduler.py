"""
Background scheduler for ZyaeL NutriBox daily automation tasks.
Handles automated meal assignment, weekly report generation, and other scheduled tasks.
"""

import asyncio
from datetime import datetime, date, timedelta
from typing import List
import logging
from sqlalchemy.orm import Session
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from api.database import get_db
from api import models
from api.connection_manager import manager
from api.events import EventType, EventChannel, EventBuilder

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DailyScheduler:
    """Handles daily automation tasks for the nutrition ecosystem"""

    def __init__(self):
        self._async_scheduler = AsyncIOScheduler()

    async def start(self):
        """Start APScheduler-driven background jobs."""
        if self._async_scheduler.running:
            logger.warning("Scheduler is already running")
            return
        logger.info("Starting ZyaeL NutriBox APScheduler")

        async def safe_daily_meals():
            try:
                await self._assign_daily_meals()
            except Exception as e:
                logger.exception("daily_meals job failed: %s", e)

        async def safe_weekly():
            try:
                await self._generate_weekly_reports()
            except Exception as e:
                logger.exception("weekly_reports job failed: %s", e)

        async def safe_consultation():
            try:
                await self._send_consultation_reminders()
            except Exception as e:
                logger.exception("consultation_reminders job failed: %s", e)

        async def safe_agent():
            try:
                await self._update_delivery_agent_availability()
            except Exception as e:
                logger.exception("delivery_agent_availability job failed: %s", e)

        async def safe_batches():
            try:
                await self._create_batches_from_orders()
            except Exception as e:
                logger.exception("auto_batch_creation job failed: %s", e)

        # Cron / interval jobs (replaces previous asyncio while-loops)
        self._async_scheduler.add_job(
            safe_daily_meals, "cron", hour=6, minute=0, id="daily_meals", replace_existing=True
        )
        self._async_scheduler.add_job(
            safe_weekly, "cron", day_of_week="sun", hour=20, minute=0, id="weekly_reports", replace_existing=True
        )
        self._async_scheduler.add_job(
            safe_consultation, "cron", hour=9, minute=0, id="consultation_reminders", replace_existing=True
        )
        self._async_scheduler.add_job(
            safe_agent, "interval", minutes=30, id="delivery_agent_availability", replace_existing=True
        )
        self._async_scheduler.add_job(
            safe_batches, "cron", minute=0, id="auto_batch_creation", replace_existing=True
        )
        self._async_scheduler.start()
        logger.info("APScheduler started")

    async def stop(self):
        """Stop APScheduler."""
        if not self._async_scheduler.running:
            return
        self._async_scheduler.shutdown(wait=True)
        logger.info("Scheduler stopped")

    async def _assign_daily_meals(self):
        """Assign meals for today from active subscriptions"""
        try:
            logger.info("Starting daily meal assignment")
            
            db = next(get_db())
            today = date.today()
            
            # Get all active subscriptions
            active_subscriptions = db.query(models.Subscription).filter(
                models.Subscription.status == "active",
                models.Subscription.start_date <= today,
                models.Subscription.end_date >= today
            ).all()
            
            logger.info(f"Found {len(active_subscriptions)} active subscriptions")
            
            assigned_count = 0
            
            for subscription in active_subscriptions:
                # Get today's daily meal schedule
                daily_schedule = db.query(models.DailyMealSchedule).filter(
                    models.DailyMealSchedule.subscription_id == subscription.id,
                    models.DailyMealSchedule.date >= datetime.combine(today, datetime.min.time()),
                    models.DailyMealSchedule.date < datetime.combine(today + timedelta(days=1), datetime.min.time())
                ).first()
                
                if daily_schedule:
                    # Check if orders already exist for today
                    existing_orders = db.query(models.Order).filter(
                        models.Order.daily_meal_schedule_id == daily_schedule.id
                    ).count()
                    
                    if existing_orders == 0:
                        # Create orders from daily meal schedule
                        await self._create_orders_from_schedule(daily_schedule, db)
                        assigned_count += 1
            
            db.close()
            
            logger.info(f"Assigned meals for {assigned_count} subscriptions")
            
            # Broadcast daily meals assigned event
            event_data = EventBuilder.build_event(
                EventType.DAILY_MEALS_ASSIGNED,
                {
                    "date": today.isoformat(),
                    "subscriptions_processed": len(active_subscriptions),
                    "meals_assigned": assigned_count
                }
            )
            
            await manager.broadcast_to_channel(EventChannel.KITCHEN, event_data)
            await manager.broadcast_to_channel(EventChannel.ADMIN, event_data)
            
        except Exception as e:
            logger.error(f"Error assigning daily meals: {e}")
    
    async def _create_orders_from_schedule(self, schedule: models.DailyMealSchedule, db: Session):
        """Create orders from a daily meal schedule"""
        try:
            # Get client details
            client = db.query(models.User).filter(
                models.User.id == schedule.client_id
            ).first()
            
            if not client:
                logger.error(f"Client not found for schedule {schedule.id}")
                return
            
            # Get subscription details
            subscription = db.query(models.Subscription).filter(
                models.Subscription.id == schedule.subscription_id
            ).first()
            
            if not subscription:
                logger.error(f"Subscription not found for schedule {schedule.id}")
                return
            
            created_orders = []
            
            # Create orders for each meal type
            meal_types = [
                ("breakfast", schedule.breakfast_item, schedule.breakfast_calories),
                ("lunch", schedule.lunch_item, schedule.lunch_calories),
                ("dinner", schedule.dinner_item, schedule.dinner_calories)
            ]
            
            for meal_type, meal_item, calories in meal_types:
                if meal_item:  # Only create order if meal is scheduled
                    order = models.Order(
                        subscription_id=schedule.subscription_id,
                        daily_meal_schedule_id=schedule.id,
                        client_id=schedule.client_id,
                        client_name=client.name,
                        client_email=client.email,
                        client_phone=client.phone or "",
                        client_address="",  # Will be updated from client profile
                        diet_plan=subscription.meal_plan_id,
                        meal_type=meal_type,
                        quantity=1,
                        price=0.0,  # Price handled at subscription level
                        status="pending",
                        kitchen_status="pending"
                    )
                    db.add(order)
                    created_orders.append(order)
            
            db.commit()
            
            # Refresh orders to get IDs
            for order in created_orders:
                db.refresh(order)
            
            logger.info(f"Created {len(created_orders)} orders for schedule {schedule.id}")
            
        except Exception as e:
            logger.error(f"Error creating orders from schedule: {e}")
            db.rollback()
    
    async def _generate_weekly_reports(self):
        """Generate weekly reports for all active subscriptions"""
        try:
            logger.info("Starting weekly report generation")
            
            db = next(get_db())
            today = date.today()
            
            # Calculate current week number for each subscription
            active_subscriptions = db.query(models.Subscription).filter(
                models.Subscription.status == "active"
            ).all()
            
            generated_count = 0
            
            for subscription in active_subscriptions:
                if subscription.start_date:
                    # Calculate week number
                    days_since_start = (today - subscription.start_date.date()).days
                    week_number = (days_since_start // 7) + 1
                    
                    # Check if report already exists
                    existing_report = db.query(models.WeeklyReport).filter(
                        models.WeeklyReport.client_id == subscription.client_id,
                        models.WeeklyReport.week_number == week_number
                    ).first()
                    
                    if not existing_report and week_number <= subscription.duration_days // 7:
                        # Generate report
                        await self._create_weekly_report(subscription, week_number, db)
                        generated_count += 1
            
            db.close()
            
            logger.info(f"Generated {generated_count} weekly reports")
            
        except Exception as e:
            logger.error(f"Error generating weekly reports: {e}")
    
    async def _create_weekly_report(self, subscription: models.Subscription, week_number: int, db: Session):
        """Create a weekly report for a subscription"""
        try:
            # Calculate week start and end dates
            week_start = subscription.start_date + timedelta(weeks=week_number - 1)
            week_end = week_start + timedelta(days=6)
            
            # Get all orders for this week
            orders = db.query(models.Order).filter(
                models.Order.client_id == subscription.client_id,
                models.Order.created_at >= week_start,
                models.Order.created_at <= week_end + timedelta(days=1)
            ).all()
            
            # Calculate statistics
            total_meals_delivered = len([o for o in orders if o.status == "delivered"])
            meals_consumed = len([o for o in orders if o.consumed_status == "consumed"])
            meals_skipped = len([o for o in orders if o.consumed_status == "skipped"])
            
            # Calculate total calories
            total_calories = 0
            for order in orders:
                if order.daily_meal_schedule_id:
                    schedule = db.query(models.DailyMealSchedule).filter(
                        models.DailyMealSchedule.id == order.daily_meal_schedule_id
                    ).first()
                    
                    if schedule:
                        if order.meal_type == "breakfast" and schedule.breakfast_calories:
                            total_calories += schedule.breakfast_calories
                        elif order.meal_type == "lunch" and schedule.lunch_calories:
                            total_calories += schedule.lunch_calories
                        elif order.meal_type == "dinner" and schedule.dinner_calories:
                            total_calories += schedule.dinner_calories
            
            avg_calories_per_day = total_calories // 7 if total_calories > 0 else 0
            
            # Get weight change from progress logs
            weight_change = None
            progress_logs = db.query(models.ProgressLog).filter(
                models.ProgressLog.client_id == subscription.client_id,
                models.ProgressLog.log_date >= week_start,
                models.ProgressLog.log_date <= week_end
            ).order_by(models.ProgressLog.log_date).all()
            
            if len(progress_logs) >= 2:
                start_weight = progress_logs[0].weight
                end_weight = progress_logs[-1].weight
                if start_weight and end_weight:
                    weight_change = end_weight - start_weight
            
            # Create weekly report
            report = models.WeeklyReport(
                client_id=subscription.client_id,
                subscription_id=subscription.id,
                week_number=week_number,
                total_meals_delivered=total_meals_delivered,
                meals_consumed=meals_consumed,
                meals_skipped=meals_skipped,
                total_calories=total_calories,
                avg_calories_per_day=avg_calories_per_day,
                weight_change=weight_change
            )
            
            db.add(report)
            db.commit()
            db.refresh(report)
            
            # Broadcast weekly report ready event
            event_data = EventBuilder.weekly_report_ready(
                client_id=subscription.client_id,
                week_number=week_number,
                subscription_id=subscription.id,
                nutritionist_id=subscription.nutritionist_id
            )
            
            # Broadcast to client
            await manager.broadcast_to_channel(
                EventChannel.client(subscription.client_id),
                event_data
            )
            
            # Broadcast to nutritionist if assigned
            if subscription.nutritionist_id:
                await manager.broadcast_to_channel(
                    EventChannel.nutritionist(subscription.nutritionist_id),
                    event_data
                )
            
            logger.info(f"Created weekly report for client {subscription.client_id}, week {week_number}")
            
        except Exception as e:
            logger.error(f"Error creating weekly report: {e}")
            db.rollback()
    
    async def _send_consultation_reminders(self):
        """Send consultation reminders for upcoming sessions"""
        try:
            logger.info("Sending consultation reminders")
            
            db = next(get_db())
            today = date.today()
            tomorrow = today + timedelta(days=1)
            
            # Get sessions scheduled for tomorrow
            upcoming_sessions = db.query(models.Session).filter(
                models.Session.session_date >= datetime.combine(tomorrow, datetime.min.time()),
                models.Session.session_date < datetime.combine(tomorrow + timedelta(days=1), datetime.min.time()),
                models.Session.status == "scheduled"
            ).all()
            
            for session in upcoming_sessions:
                # Broadcast consultation reminder
                event_data = EventBuilder.build_event(
                    EventType.CONSULTATION_REMINDER,
                    {
                        "session_id": session.id,
                        "client_id": session.client_id,
                        "nutritionist_id": session.nutritionist_id,
                        "session_date": session.session_date.isoformat(),
                        "duration_minutes": session.duration_minutes
                    }
                )
                
                # Broadcast to client and nutritionist
                await manager.broadcast_to_channel(
                    EventChannel.client(session.client_id),
                    event_data
                )
                
                await manager.broadcast_to_channel(
                    EventChannel.nutritionist(session.nutritionist_id),
                    event_data
                )
            
            db.close()
            
            logger.info(f"Sent {len(upcoming_sessions)} consultation reminders")
            
        except Exception as e:
            logger.error(f"Error sending consultation reminders: {e}")
    
    async def _update_delivery_agent_availability(self):
        """Update delivery agent availability based on completed deliveries"""
        try:
            db = next(get_db())
            
            # Find agents who have completed all their deliveries
            agents_with_orders = db.query(models.DeliveryAgent).join(
                models.Order, models.DeliveryAgent.id == models.Order.delivery_agent_id
            ).filter(
                models.Order.status.in_(["assigned", "in_transit"])
            ).all()
            
            # Mark agents as available if they have no active orders
            for agent in agents_with_orders:
                active_orders = db.query(models.Order).filter(
                    models.Order.delivery_agent_id == agent.id,
                    models.Order.status.in_(["assigned", "in_transit"])
                ).count()
                
                if active_orders == 0 and not agent.is_available:
                    agent.is_available = True
                    db.commit()
                    logger.info(f"Marked delivery agent {agent.id} as available")
            
            db.close()
            
        except Exception as e:
            logger.error(f"Error updating delivery agent availability: {e}")

    async def _create_batches_from_orders(self):
        """Auto-create batches from orders grouped by area + meal + timeslot"""
        try:
            from api.services.batch_service import create_batches_from_orders
            
            logger.info("Starting auto batch creation")
            
            db = next(get_db())
            today = date.today()
            
            # Create batches for today's orders
            result = create_batches_from_orders(db, today, None)
            
            logger.info(f"Created {result['batches_created']} batches, grouped {result['orders_grouped']} orders")
            
            # Broadcast batch created events
            if result['batches_created'] > 0:
                event_data = EventBuilder.build_event(
                    EventType.BATCH_CREATED,
                    {
                        "date": today.isoformat(),
                        "batches_created": result['batches_created'],
                        "orders_grouped": result['orders_grouped']
                    }
                )
                
                await manager.broadcast_to_channel(EventChannel.KITCHEN, event_data)
                await manager.broadcast_to_channel(EventChannel.ADMIN, event_data)
            
            db.close()
            
        except Exception as e:
            logger.error(f"Error creating batches from orders: {e}")

# Global scheduler instance
scheduler = DailyScheduler()

# Functions to start/stop scheduler from main app
async def start_scheduler():
    """Start the daily scheduler"""
    await scheduler.start()

async def stop_scheduler():
    """Stop the daily scheduler"""
    await scheduler.stop()
