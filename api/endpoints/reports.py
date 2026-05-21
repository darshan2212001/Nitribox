from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, timedelta
from api.database import get_db
from api import models
from pydantic import BaseModel, ConfigDict
from api.connection_manager import manager
from api.events import EventType, EventChannel, EventBuilder

router = APIRouter(prefix="/reports", tags=["Reports"])

# Pydantic schemas
class WeeklyReportResponse(BaseModel):
    id: str
    client_id: str
    subscription_id: str
    week_number: int
    total_meals_delivered: int
    meals_consumed: int
    meals_skipped: int
    total_calories: int
    avg_calories_per_day: int
    weight_change: Optional[float]
    nutritionist_notes: Optional[str]
    generated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class WeeklyReportCreate(BaseModel):
    client_id: str
    subscription_id: str
    week_number: int
    nutritionist_notes: Optional[str] = None

@router.post("/weekly/generate")
async def generate_weekly_report(
    report_data: WeeklyReportCreate,
    db: Session = Depends(get_db)
):
    """Generate weekly report for a client (called by scheduler)"""
    try:
        # Check if report already exists
        existing_report = db.query(models.WeeklyReport).filter(
            models.WeeklyReport.client_id == report_data.client_id,
            models.WeeklyReport.week_number == report_data.week_number
        ).first()
        
        if existing_report:
            return existing_report
        
        # Calculate week start and end dates
        subscription = db.query(models.Subscription).filter(
            models.Subscription.id == report_data.subscription_id
        ).first()
        
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        # Calculate week start date based on subscription start and week number
        week_start = subscription.start_date + timedelta(weeks=report_data.week_number - 1)
        week_end = week_start + timedelta(days=6)
        
        # Get all orders for this week
        orders = db.query(models.Order).filter(
            models.Order.client_id == report_data.client_id,
            models.Order.created_at >= week_start,
            models.Order.created_at <= week_end + timedelta(days=1)
        ).all()
        
        # Calculate statistics
        total_meals_delivered = len([o for o in orders if o.status == "delivered"])
        meals_consumed = len([o for o in orders if o.consumed_status == "consumed"])
        meals_skipped = len([o for o in orders if o.consumed_status == "skipped"])
        
        # Calculate total calories (from daily meal schedules)
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
            models.ProgressLog.client_id == report_data.client_id,
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
            client_id=report_data.client_id,
            subscription_id=report_data.subscription_id,
            week_number=report_data.week_number,
            total_meals_delivered=total_meals_delivered,
            meals_consumed=meals_consumed,
            meals_skipped=meals_skipped,
            total_calories=total_calories,
            avg_calories_per_day=avg_calories_per_day,
            weight_change=weight_change,
            nutritionist_notes=report_data.nutritionist_notes
        )
        
        db.add(report)
        db.commit()
        db.refresh(report)
        
        # Broadcast weekly report ready event
        event_data = EventBuilder.weekly_report_ready(
            client_id=report_data.client_id,
            week_number=report_data.week_number,
            subscription_id=report_data.subscription_id,
            nutritionist_id=subscription.nutritionist_id
        )
        
        # Broadcast to client
        await manager.broadcast_to_channel(
            EventChannel.client(report_data.client_id),
            event_data
        )
        
        # Broadcast to nutritionist if assigned
        if subscription.nutritionist_id:
            await manager.broadcast_to_channel(
                EventChannel.nutritionist(subscription.nutritionist_id),
                event_data
            )
        
        return report
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to generate weekly report: {str(e)}")

@router.get("/weekly/client/{client_id}")
async def get_client_weekly_reports(
    client_id: str,
    db: Session = Depends(get_db)
):
    """Get all weekly reports for a specific client"""
    try:
        # client_id can be either user_id or actual client_id
        # First, try to find Client record by user_id
        client = db.query(models.Client).filter(models.Client.user_id == client_id).first()
        if client:
            actual_client_id = client.id
        else:
            # If not found, assume client_id is the actual Client record ID
            client = db.query(models.Client).filter(models.Client.id == client_id).first()
            if not client:
                # Return empty list if client not found
                return []
            actual_client_id = client.id
        
        reports = db.query(models.WeeklyReport).filter(
            models.WeeklyReport.client_id == actual_client_id
        ).order_by(models.WeeklyReport.week_number).all()
        
        # Return empty list if no reports found (not an error)
        if not reports:
            return []
        
        # Convert to response format manually to avoid validation issues
        return [
            {
                "id": report.id,
                "client_id": report.client_id,
                "subscription_id": report.subscription_id,
                "week_number": report.week_number,
                "total_meals_delivered": report.total_meals_delivered,
                "meals_consumed": report.meals_consumed,
                "meals_skipped": report.meals_skipped,
                "total_calories": report.total_calories,
                "avg_calories_per_day": report.avg_calories_per_day,
                "weight_change": report.weight_change,
                "nutritionist_notes": report.nutritionist_notes,
                "generated_at": report.generated_at.isoformat() if report.generated_at else None
            }
            for report in reports
        ]
    except Exception as e:
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to fetch weekly reports: {str(e)}")

@router.get("/weekly/{client_id}/{week_number}", response_model=WeeklyReportResponse)
async def get_weekly_report(
    client_id: str,
    week_number: int,
    db: Session = Depends(get_db)
):
    """Get weekly report for a specific client and week"""
    report = db.query(models.WeeklyReport).filter(
        models.WeeklyReport.client_id == client_id,
        models.WeeklyReport.week_number == week_number
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Weekly report not found")
    
    return report

@router.patch("/weekly/{report_id}", response_model=WeeklyReportResponse)
async def update_weekly_report(
    report_id: str,
    nutritionist_notes: str,
    db: Session = Depends(get_db)
):
    """Update nutritionist notes on weekly report"""
    report = db.query(models.WeeklyReport).filter(
        models.WeeklyReport.id == report_id
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Weekly report not found")
    
    report.nutritionist_notes = nutritionist_notes
    db.commit()
    db.refresh(report)
    
    # Broadcast report updated event
    event_data = EventBuilder.build_event(
        EventType.WEEKLY_REPORT_READY,
        {
            "report_id": report_id,
            "client_id": report.client_id,
            "week_number": report.week_number,
            "updated": True
        }
    )
    
    # Broadcast to client
    await manager.broadcast_to_channel(
        EventChannel.client(report.client_id),
        event_data
    )
    
    return report

@router.get("/analytics/client/{client_id}")
async def get_client_analytics(
    client_id: str,
    weeks: int = 4,
    db: Session = Depends(get_db)
):
    """Get analytics for a client over multiple weeks"""
    reports = db.query(models.WeeklyReport).filter(
        models.WeeklyReport.client_id == client_id
    ).order_by(models.WeeklyReport.week_number.desc()).limit(weeks).all()
    
    if not reports:
        return {
            "client_id": client_id,
            "message": "No weekly reports found",
            "analytics": {}
        }
    
    # Calculate trends
    total_weeks = len(reports)
    avg_consumption_rate = sum(r.meals_consumed / max(r.total_meals_delivered, 1) for r in reports) / total_weeks
    avg_calories = sum(r.avg_calories_per_day for r in reports) / total_weeks
    total_weight_change = sum(r.weight_change or 0 for r in reports)
    
    # Recent trends (last 2 weeks vs previous 2 weeks)
    recent_reports = reports[:2] if len(reports) >= 2 else reports
    previous_reports = reports[2:4] if len(reports) >= 4 else []
    
    recent_consumption = sum(r.meals_consumed / max(r.total_meals_delivered, 1) for r in recent_reports) / len(recent_reports)
    previous_consumption = sum(r.meals_consumed / max(r.total_meals_delivered, 1) for r in previous_reports) / len(previous_reports) if previous_reports else 0
    
    consumption_trend = "improving" if recent_consumption > previous_consumption else "declining" if recent_consumption < previous_consumption else "stable"
    
    return {
        "client_id": client_id,
        "analytics": {
            "total_weeks": total_weeks,
            "avg_consumption_rate": round(avg_consumption_rate * 100, 1),
            "avg_calories_per_day": round(avg_calories),
            "total_weight_change": round(total_weight_change, 1),
            "consumption_trend": consumption_trend,
            "recent_performance": {
                "consumption_rate": round(recent_consumption * 100, 1),
                "avg_calories": round(sum(r.avg_calories_per_day for r in recent_reports) / len(recent_reports))
            }
        },
        "weekly_data": [
            {
                "week_number": r.week_number,
                "consumption_rate": round(r.meals_consumed / max(r.total_meals_delivered, 1) * 100, 1),
                "avg_calories": r.avg_calories_per_day,
                "weight_change": r.weight_change,
                "generated_at": r.generated_at.isoformat()
            }
            for r in reversed(reports)
        ]
    }