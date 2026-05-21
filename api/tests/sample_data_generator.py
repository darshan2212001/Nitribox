#!/usr/bin/env python3
"""
Comprehensive Sample Data Generator for ZyaeL NutriBox Testing
Creates realistic test data for all components of the nutrition ecosystem
"""

import asyncio
import random
from datetime import datetime, timedelta, date
from typing import List, Dict, Any
import json
import uuid
from sqlalchemy.orm import Session
import sys
import os
from pathlib import Path

# Ensure project root is in path for imports
_project_root = Path(__file__).parent.parent.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

from api.database import SessionLocal
from api import models
from api.simple_auth import get_password_hash

class SampleDataGenerator:
    """Generate comprehensive sample data for testing"""
    
    def __init__(self):
        self.db = SessionLocal()
        self.clients = []
        self.nutritionists = []
        self.delivery_agents = []
        self.subscriptions = []
        self.meal_plans = []
        self.daily_schedules = []
        self.orders = []
        self.delivery_tracking = []
        self.weekly_reports = []
        self.consultations = []
        
    def generate_all_data(self):
        """Generate all sample data"""
        print("🚀 Starting comprehensive sample data generation...")
        
        # Clear existing data
        self.clear_existing_data()
        
        # Generate core data
        self.generate_users()
        self.generate_meal_plans()
        self.generate_nutritionists()
        self.generate_clients()
        self.generate_delivery_agents()
        self.generate_subscriptions()
        self.generate_daily_meal_schedules()
        self.generate_orders()
        self.generate_delivery_tracking()
        self.generate_weekly_reports()
        self.generate_consultations()
        
        # Commit all data
        self.db.commit()
        
        print(f"✅ Generated {len(self.clients)} clients, {len(self.nutritionists)} nutritionists, {len(self.delivery_agents)} delivery agents")
        print(f"✅ Generated {len(self.subscriptions)} subscriptions, {len(self.daily_schedules)} daily schedules")
        print(f"✅ Generated {len(self.orders)} orders, {len(self.delivery_tracking)} delivery tracking records")
        print(f"✅ Generated {len(self.weekly_reports)} weekly reports, {len(self.consultations)} consultations")
        
        return {
            "clients": len(self.clients),
            "nutritionists": len(self.nutritionists),
            "delivery_agents": len(self.delivery_agents),
            "subscriptions": len(self.subscriptions),
            "daily_schedules": len(self.daily_schedules),
            "orders": len(self.orders),
            "delivery_tracking": len(self.delivery_tracking),
            "weekly_reports": len(self.weekly_reports),
            "consultations": len(self.consultations)
        }
    
    def clear_existing_data(self):
        """Clear existing test data"""
        print("🧹 Clearing existing data...")
        
        # Clear in correct order due to foreign key constraints
        self.db.query(models.ProgressLog).delete()
        self.db.query(models.Session).delete()
        self.db.query(models.Consultation).delete()
        self.db.query(models.WeeklyReport).delete()
        self.db.query(models.DeliveryTracking).delete()
        self.db.query(models.Order).delete()
        self.db.query(models.DailyMealSchedule).delete()
        self.db.query(models.Subscription).delete()
        self.db.query(models.Client).delete()
        self.db.query(models.DeliveryAgent).delete()
        self.db.query(models.Nutritionist).delete()
        self.db.query(models.MealPlan).delete()
        self.db.query(models.User).delete()
        
        self.db.commit()
        print("✅ Existing data cleared")
    
    def generate_users(self):
        """Generate test users"""
        print("👥 Generating users...")
        
        users = [
            # Admin users
            models.User(
                id="admin-1",
                username="admin",
                email="admin@zyael.com",
                password=get_password_hash("admin123"),
                name="Admin User",
                phone="+91-9876543210",
                role="admin"
            ),
            
            # Nutritionist users
            models.User(
                id="nutritionist-user-1",
                username="nutritionist1",
                email="nutritionist1@zyael.com",
                password=get_password_hash("nutri123"),
                name="Dr. Meera Sharma",
                phone="+91-9876543211",
                role="nutritionist"
            ),
            models.User(
                id="nutritionist-user-2",
                username="nutritionist2",
                email="nutritionist2@zyael.com",
                password=get_password_hash("nutri123"),
                name="Dr. Rajesh Kumar",
                phone="+91-9876543212",
                role="nutritionist"
            ),
            models.User(
                id="nutritionist-user-3",
                username="nutritionist3",
                email="nutritionist3@zyael.com",
                password=get_password_hash("nutri123"),
                name="Dr. Priya Singh",
                phone="+91-9876543213",
                role="nutritionist"
            ),
            models.User(
                id="nutritionist-user-4",
                username="nutritionist4",
                email="nutritionist4@zyael.com",
                password=get_password_hash("nutri123"),
                name="Dr. Amit Patel",
                phone="+91-9876543214",
                role="nutritionist"
            ),
            models.User(
                id="nutritionist-user-5",
                username="nutritionist5",
                email="nutritionist5@zyael.com",
                password=get_password_hash("nutri123"),
                name="Dr. Sunita Reddy",
                phone="+91-9876543215",
                role="nutritionist"
            ),
            
            # Client users
            models.User(
                id="client-user-1",
                username="client1",
                email="client1@example.com",
                password=get_password_hash("client123"),
                name="Rahul Sharma",
                phone="+91-9876543220",
                role="client"
            ),
            models.User(
                id="client-user-2",
                username="client2",
                email="client2@example.com",
                password=get_password_hash("client123"),
                name="Priya Gupta",
                phone="+91-9876543221",
                role="client"
            ),
            models.User(
                id="client-user-3",
                username="client3",
                email="client3@example.com",
                password=get_password_hash("client123"),
                name="Amit Kumar",
                phone="+91-9876543222",
                role="client"
            ),
            models.User(
                id="client-user-4",
                username="client4",
                email="client4@example.com",
                password=get_password_hash("client123"),
                name="Sunita Singh",
                phone="+91-9876543223",
                role="client"
            ),
            models.User(
                id="client-user-5",
                username="client5",
                email="client5@example.com",
                password=get_password_hash("client123"),
                name="Rajesh Verma",
                phone="+91-9876543224",
                role="client"
            ),
            models.User(
                id="client-user-6",
                username="client6",
                email="client6@example.com",
                password=get_password_hash("client123"),
                name="Neha Agarwal",
                phone="+91-9876543225",
                role="client"
            ),
            models.User(
                id="client-user-7",
                username="client7",
                email="client7@example.com",
                password=get_password_hash("client123"),
                name="Vikram Joshi",
                phone="+91-9876543226",
                role="client"
            ),
            models.User(
                id="client-user-8",
                username="client8",
                email="client8@example.com",
                password=get_password_hash("client123"),
                name="Anita Desai",
                phone="+91-9876543227",
                role="client"
            ),
            models.User(
                id="client-user-9",
                username="client9",
                email="client9@example.com",
                password=get_password_hash("client123"),
                name="Suresh Nair",
                phone="+91-9876543228",
                role="client"
            ),
            models.User(
                id="client-user-10",
                username="client10",
                email="client10@example.com",
                password=get_password_hash("client123"),
                name="Deepa Iyer",
                phone="+91-9876543229",
                role="client"
            ),
            
            # Delivery agent users
            models.User(
                id="delivery-user-1",
                username="delivery1",
                email="delivery1@zyael.com",
                password=get_password_hash("delivery123"),
                name="Ravi Kumar",
                phone="+91-9876543300",
                role="delivery"
            ),
            models.User(
                id="delivery-user-2",
                username="delivery2",
                email="delivery2@zyael.com",
                password=get_password_hash("delivery123"),
                name="Manoj Singh",
                phone="+91-9876543301",
                role="delivery"
            ),
            models.User(
                id="delivery-user-3",
                username="delivery3",
                email="delivery3@zyael.com",
                password=get_password_hash("delivery123"),
                name="Suresh Patel",
                phone="+91-9876543302",
                role="delivery"
            ),
            
            # Kitchen user
            models.User(
                id="kitchen-user-1",
                username="kitchen1",
                email="kitchen1@zyael.com",
                password=get_password_hash("kitchen123"),
                name="Chef Rajesh",
                phone="+91-9876543400",
                role="kitchen"
            )
        ]
        
        for user in users:
            self.db.add(user)
        
        self.db.commit()
        print(f"✅ Generated {len(users)} users")
    
    def generate_meal_plans(self):
        """Generate meal plans"""
        print("🍽️ Generating meal plans...")
        
        meal_plans = [
            models.MealPlan(
                id="weight-loss-plan",
                title="Weight Loss Program",
                description="Comprehensive weight loss program with balanced nutrition",
                category="Weight Management",
                original_price=15000.0,
                current_price=15000.0,
                rating=4.8,
                review_count=150,
                badge="Popular",
                image_url="/images/weight-loss.jpg",
                features="Personalized meal plans, Nutritionist consultation, Progress tracking",
                is_active=True
            ),
            models.MealPlan(
                id="muscle-gain-plan",
                title="Muscle Gain Program",
                description="High protein diet for muscle building",
                category="Muscle Building",
                original_price=18000.0,
                current_price=18000.0,
                rating=4.9,
                review_count=120,
                badge="Trending",
                image_url="/images/muscle-gain.jpg",
                features="High protein meals, Workout guidance, Supplement recommendations",
                is_active=True
            ),
            models.MealPlan(
                id="diabetes-management",
                title="Diabetes Management",
                description="Low glycemic index meals for diabetes control",
                category="Health Management",
                original_price=16000.0,
                current_price=16000.0,
                rating=4.7,
                review_count=200,
                badge="Medical",
                image_url="/images/diabetes.jpg",
                features="Low GI meals, Blood sugar monitoring, Medical consultation",
                is_active=True
            ),
            models.MealPlan(
                id="heart-healthy",
                title="Heart Healthy Diet",
                description="Low sodium, high fiber diet for heart health",
                category="Heart Health",
                original_price=17000.0,
                current_price=17000.0,
                rating=4.8,
                review_count=180,
                badge="Healthy",
                image_url="/images/heart-healthy.jpg",
                features="Low sodium meals, Heart monitoring, Exercise guidance",
                is_active=True
            ),
            models.MealPlan(
                id="pregnancy-nutrition",
                title="Pregnancy Nutrition",
                description="Specialized nutrition for expecting mothers",
                category="Pregnancy",
                original_price=20000.0,
                current_price=20000.0,
                rating=4.9,
                review_count=90,
                badge="Special",
                image_url="/images/pregnancy.jpg",
                features="Prenatal nutrition, Doctor consultation, Baby growth tracking",
                is_active=True
            )
        ]
        
        for plan in meal_plans:
            self.db.add(plan)
            self.meal_plans.append(plan)
        
        self.db.commit()
        print(f"✅ Generated {len(meal_plans)} meal plans")
    
    def generate_nutritionists(self):
        """Generate nutritionists"""
        print("👩‍⚕️ Generating nutritionists...")
        
        nutritionists = [
            models.Nutritionist(
                id="nutritionist-1",
                name="Dr. Meera Sharma",
                email="nutritionist1@zyael.com",
                phone="+91-9876543211",
                specialization="Weight Management",
                experience_years=8,
                qualifications="MSc Nutrition",
                is_available=True,
                rating=4.8,
                consultation_fee=500.0,
                user_id="nutritionist-user-1"
            ),
            models.Nutritionist(
                id="nutritionist-2",
                name="Dr. Rajesh Kumar",
                email="nutritionist2@zyael.com",
                phone="+91-9876543212",
                specialization="Sports Nutrition",
                experience_years=10,
                qualifications="PhD Sports Science",
                is_available=True,
                rating=4.9,
                consultation_fee=600.0,
                user_id="nutritionist-user-2"
            ),
            models.Nutritionist(
                id="nutritionist-3",
                name="Dr. Priya Singh",
                email="nutritionist3@zyael.com",
                phone="+91-9876543213",
                specialization="Diabetes Management",
                experience_years=6,
                qualifications="MD Endocrinology",
                is_available=True,
                rating=4.7,
                consultation_fee=700.0,
                user_id="nutritionist-user-3"
            ),
            models.Nutritionist(
                id="nutritionist-4",
                name="Dr. Amit Patel",
                email="nutritionist4@zyael.com",
                phone="+91-9876543214",
                specialization="Cardiology Nutrition",
                experience_years=12,
                qualifications="MD Cardiology",
                is_available=True,
                rating=4.9,
                consultation_fee=800.0,
                user_id="nutritionist-user-4"
            ),
            models.Nutritionist(
                id="nutritionist-5",
                name="Dr. Sunita Reddy",
                email="nutritionist5@zyael.com",
                phone="+91-9876543215",
                specialization="Maternal Nutrition",
                experience_years=9,
                qualifications="MD Gynecology",
                is_available=True,
                rating=4.8,
                consultation_fee=600.0,
                user_id="nutritionist-user-5"
            )
        ]
        
        for nutritionist in nutritionists:
            self.db.add(nutritionist)
            self.nutritionists.append(nutritionist)
        
        self.db.commit()
        print(f"✅ Generated {len(nutritionists)} nutritionists")
    
    def generate_clients(self):
        """Generate clients"""
        print("👤 Generating clients...")
        
        clients = [
            models.Client(
                id="client-1",
                name="Rahul Sharma",
                email="client1@example.com",
                phone="+91-9876543220",
                age=28,
                gender="Male",
                height_cm=175,
                weight_kg=85,
                medical_conditions="None",
                allergies="None",
                dietary_preferences="Vegetarian",
                fitness_goals="Weight Loss",
                activity_level="Moderate",
                user_id="client-user-1"
            ),
            models.Client(
                id="client-2",
                name="Priya Gupta",
                email="client2@example.com",
                phone="+91-9876543221",
                age=32,
                gender="Female",
                height_cm=160,
                weight_kg=70,
                medical_conditions="PCOS",
                allergies="Lactose Intolerant",
                dietary_preferences="Vegetarian",
                fitness_goals="Weight Loss",
                activity_level="Low",
                user_id="client-user-2"
            ),
            models.Client(
                id="client-3",
                name="Amit Kumar",
                email="client3@example.com",
                phone="+91-9876543222",
                age=35,
                gender="Male",
                height_cm=180,
                weight_kg=95,
                medical_conditions="Type 2 Diabetes",
                allergies="None",
                dietary_preferences="Non-Vegetarian",
                fitness_goals="Muscle Gain",
                activity_level="High",
                user_id="client-user-3"
            ),
            models.Client(
                id="client-4",
                name="Sunita Singh",
                email="client4@example.com",
                phone="+91-9876543223",
                age=45,
                gender="Female",
                height_cm=165,
                weight_kg=75,
                medical_conditions="Hypertension",
                allergies="Nuts",
                dietary_preferences="Vegetarian",
                fitness_goals="Heart Health",
                activity_level="Moderate",
                user_id="client-user-4"
            ),
            models.Client(
                id="client-5",
                name="Rajesh Verma",
                email="client5@example.com",
                phone="+91-9876543224",
                age=29,
                gender="Male",
                height_cm=170,
                weight_kg=80,
                medical_conditions="None",
                allergies="None",
                dietary_preferences="Non-Vegetarian",
                fitness_goals="Muscle Gain",
                activity_level="High",
                user_id="client-user-5"
            ),
            models.Client(
                id="client-6",
                name="Neha Agarwal",
                email="client6@example.com",
                phone="+91-9876543225",
                age=26,
                gender="Female",
                height_cm=155,
                weight_kg=60,
                medical_conditions="Pregnant",
                allergies="None",
                dietary_preferences="Vegetarian",
                fitness_goals="Pregnancy Nutrition",
                activity_level="Low",
                user_id="client-user-6"
            ),
            models.Client(
                id="client-7",
                name="Vikram Joshi",
                email="client7@example.com",
                phone="+91-9876543226",
                age=40,
                gender="Male",
                height_cm=175,
                weight_kg=90,
                medical_conditions="Type 2 Diabetes",
                allergies="None",
                dietary_preferences="Vegetarian",
                fitness_goals="Weight Loss",
                activity_level="Moderate",
                user_id="client-user-7"
            ),
            models.Client(
                id="client-8",
                name="Anita Desai",
                email="client8@example.com",
                phone="+91-9876543227",
                age=38,
                gender="Female",
                height_cm=162,
                weight_kg=68,
                medical_conditions="PCOS",
                allergies="Gluten",
                dietary_preferences="Vegetarian",
                fitness_goals="Weight Loss",
                activity_level="Moderate",
                user_id="client-user-8"
            ),
            models.Client(
                id="client-9",
                name="Suresh Nair",
                email="client9@example.com",
                phone="+91-9876543228",
                age=33,
                gender="Male",
                height_cm=178,
                weight_kg=88,
                medical_conditions="None",
                allergies="None",
                dietary_preferences="Non-Vegetarian",
                fitness_goals="Muscle Gain",
                activity_level="High",
                user_id="client-user-9"
            ),
            models.Client(
                id="client-10",
                name="Deepa Iyer",
                email="client10@example.com",
                phone="+91-9876543229",
                age=31,
                gender="Female",
                height_cm=158,
                weight_kg=65,
                medical_conditions="Hypertension",
                allergies="None",
                dietary_preferences="Vegetarian",
                fitness_goals="Heart Health",
                activity_level="Moderate",
                user_id="client-user-10"
            )
        ]
        
        for client in clients:
            self.db.add(client)
            self.clients.append(client)
        
        self.db.commit()
        print(f"✅ Generated {len(clients)} clients")
    
    def generate_delivery_agents(self):
        """Generate delivery agents"""
        print("🚚 Generating delivery agents...")
        
        delivery_agents = [
            models.DeliveryAgent(
                id="delivery-agent-1",
                name="Ravi Kumar",
                phone="+91-9876543300",
                email="delivery1@zyael.com",
                vehicle_type="Bike",
                license_number="DL01AB1234",
                is_available=True,
                current_location_lat="28.6139",
                current_location_lng="77.2090",
                rating=4.7,
                total_deliveries=150,
                user_id="delivery-user-1"
            ),
            models.DeliveryAgent(
                id="delivery-agent-2",
                name="Manoj Singh",
                phone="+91-9876543301",
                email="delivery2@zyael.com",
                vehicle_type="Scooter",
                license_number="DL02CD5678",
                is_available=True,
                current_location_lat="28.6140",
                current_location_lng="77.2091",
                rating=4.8,
                total_deliveries=200,
                user_id="delivery-user-2"
            ),
            models.DeliveryAgent(
                id="delivery-agent-3",
                name="Suresh Patel",
                phone="+91-9876543302",
                email="delivery3@zyael.com",
                vehicle_type="Bike",
                license_number="DL03EF9012",
                is_available=False,  # One agent unavailable for testing
                current_location_lat="28.6141",
                current_location_lng="77.2092",
                rating=4.6,
                total_deliveries=120,
                user_id="delivery-user-3"
            )
        ]
        
        for agent in delivery_agents:
            self.db.add(agent)
            self.delivery_agents.append(agent)
        
        self.db.commit()
        print(f"✅ Generated {len(delivery_agents)} delivery agents")
    
    def generate_subscriptions(self):
        """Generate subscriptions"""
        print("📋 Generating subscriptions...")
        
        # Assign clients to nutritionists
        nutritionist_assignments = {
            "nutritionist-1": ["client-1", "client-2", "client-7"],
            "nutritionist-2": ["client-3", "client-5", "client-9"],
            "nutritionist-3": ["client-3", "client-7"],  # Diabetes clients
            "nutritionist-4": ["client-4", "client-10"],  # Heart health clients
            "nutritionist-5": ["client-6"]  # Pregnancy client
        }
        
        meal_plan_assignments = {
            "client-1": "weight-loss-plan",
            "client-2": "weight-loss-plan",
            "client-3": "diabetes-management",
            "client-4": "heart-healthy",
            "client-5": "muscle-gain-plan",
            "client-6": "pregnancy-nutrition",
            "client-7": "diabetes-management",
            "client-8": "weight-loss-plan",
            "client-9": "muscle-gain-plan",
            "client-10": "heart-healthy"
        }
        
        subscriptions = []
        for nutritionist_id, client_ids in nutritionist_assignments.items():
            for client_id in client_ids:
                meal_plan_id = meal_plan_assignments[client_id]
                start_date = datetime.now().date()
                end_date = start_date + timedelta(days=30)
                
                subscription = models.Subscription(
                    id=f"sub-{client_id}",
                    client_id=client_id,
                    nutritionist_id=nutritionist_id,
                    meal_plan_id=meal_plan_id,
                    status="active",
                    start_date=start_date,
                    end_date=end_date,
                    price=self.meal_plans[0].price,  # Use first plan's price
                    payment_status="paid",
                    created_at=datetime.now()
                )
                
                self.db.add(subscription)
                subscriptions.append(subscription)
        
        self.subscriptions = subscriptions
        self.db.commit()
        print(f"✅ Generated {len(subscriptions)} subscriptions")
    
    def generate_daily_meal_schedules(self):
        """Generate 30-day meal schedules for each client"""
        print("📅 Generating daily meal schedules...")
        
        # Sample meal items
        breakfast_items = [
            "Oats Bowl with Berries", "Scrambled Eggs & Toast", "Greek Yogurt Parfait",
            "Avocado Toast", "Poha with Vegetables", "Upma with Nuts",
            "Idli with Sambar", "Paratha with Curd", "Cornflakes with Milk",
            "Banana Smoothie Bowl"
        ]
        
        lunch_items = [
            "Quinoa Salad Bowl", "Grilled Chicken Wrap", "Vegetable Stir Fry",
            "Lentil Curry with Rice", "Paneer Tikka", "Fish Curry with Rice",
            "Dal Makhani with Roti", "Vegetable Biryani", "Chicken Curry",
            "Mixed Vegetable Curry"
        ]
        
        dinner_items = [
            "Grilled Salmon", "Vegetable Pasta", "Chicken Tikka",
            "Dal & Rice", "Fish Curry", "Paneer Butter Masala",
            "Chicken Biryani", "Vegetable Soup", "Grilled Fish",
            "Mixed Dal with Roti"
        ]
        
        schedules = []
        for subscription in self.subscriptions:
            for day in range(30):
                schedule_date = datetime.now().date() + timedelta(days=day)
                
                # Random meal items
                breakfast_item = random.choice(breakfast_items)
                lunch_item = random.choice(lunch_items)
                dinner_item = random.choice(dinner_items)
                
                # Random calories (within reasonable range)
                breakfast_calories = random.randint(300, 450)
                lunch_calories = random.randint(400, 600)
                dinner_calories = random.randint(350, 550)
                
                # Status based on day (past days are completed, future are pending)
                if day == 0:  # Today
                    breakfast_status = random.choice(["preparing", "packed", "delivered"])
                    lunch_status = random.choice(["pending", "preparing"])
                    dinner_status = "pending"
                elif day < 0:  # Past days
                    breakfast_status = random.choice(["consumed", "skipped"])
                    lunch_status = random.choice(["consumed", "skipped"])
                    dinner_status = random.choice(["consumed", "skipped"])
                else:  # Future days
                    breakfast_status = "pending"
                    lunch_status = "pending"
                    dinner_status = "pending"
                
                schedule = models.DailyMealSchedule(
                    id=f"schedule-{subscription.client_id}-{day}",
                    subscription_id=subscription.id,
                    client_id=subscription.client_id,
                    date=schedule_date,
                    breakfast_item=breakfast_item,
                    breakfast_calories=breakfast_calories,
                    breakfast_status=breakfast_status,
                    lunch_item=lunch_item,
                    lunch_calories=lunch_calories,
                    lunch_status=lunch_status,
                    dinner_item=dinner_item,
                    dinner_calories=dinner_calories,
                    dinner_status=dinner_status,
                    created_by_nutritionist_id=subscription.nutritionist_id
                )
                
                self.db.add(schedule)
                schedules.append(schedule)
        
        self.daily_schedules = schedules
        self.db.commit()
        print(f"✅ Generated {len(schedules)} daily meal schedules")
    
    def generate_orders(self):
        """Generate orders from daily schedules"""
        print("📦 Generating orders...")
        
        orders = []
        for schedule in self.daily_schedules:
            # Create orders for each meal type
            meal_types = [
                ("breakfast", schedule.breakfast_item, schedule.breakfast_calories, schedule.breakfast_status),
                ("lunch", schedule.lunch_item, schedule.lunch_calories, schedule.lunch_status),
                ("dinner", schedule.dinner_item, schedule.dinner_calories, schedule.dinner_status)
            ]
            
            for meal_type, meal_item, calories, status in meal_types:
                if meal_item:  # Only create order if meal is scheduled
                    # Determine kitchen status based on meal status
                    if status in ["pending"]:
                        kitchen_status = "pending"
                    elif status in ["preparing"]:
                        kitchen_status = "preparing"
                    elif status in ["packed", "assigned", "in_transit", "delivered", "consumed", "skipped"]:
                        kitchen_status = "packed"
                    else:
                        kitchen_status = "pending"
                    
                    # Assign delivery agent for packed meals
                    delivery_agent_id = None
                    delivery_agent_name = None
                    if status in ["assigned", "in_transit", "delivered"]:
                        available_agents = [agent for agent in self.delivery_agents if agent.is_available]
                        if available_agents:
                            agent = random.choice(available_agents)
                            delivery_agent_id = agent.id
                            delivery_agent_name = agent.name
                    
                    order = models.Order(
                        id=f"order-{schedule.id}-{meal_type}",
                        subscription_id=schedule.subscription_id,
                        daily_meal_schedule_id=schedule.id,
                        client_id=schedule.client_id,
                        client_name=next(c.name for c in self.clients if c.id == schedule.client_id),
                        client_email=next(c.email for c in self.clients if c.id == schedule.client_id),
                        client_phone=next(c.phone for c in self.clients if c.id == schedule.client_id),
                        client_address=f"Address for {schedule.client_id}",
                        diet_plan=next(s.meal_plan_id for s in self.subscriptions if s.id == schedule.subscription_id),
                        meal_type=meal_type,
                        meal_item=meal_item,
                        calories=calories,
                        quantity=1,
                        price=0.0,  # Price handled at subscription level
                        status=status,
                        kitchen_status=kitchen_status,
                        delivery_agent_id=delivery_agent_id,
                        delivery_agent_name=delivery_agent_name,
                        created_at=datetime.now()
                    )
                    
                    self.db.add(order)
                    orders.append(order)
        
        self.orders = orders
        self.db.commit()
        print(f"✅ Generated {len(orders)} orders")
    
    def generate_delivery_tracking(self):
        """Generate delivery tracking records"""
        print("📍 Generating delivery tracking records...")
        
        tracking_records = []
        for order in self.orders:
            if order.status in ["assigned", "in_transit", "delivered"] and order.delivery_agent_id:
                # Generate GPS coordinates around Delhi
                base_lat = 28.6139
                base_lng = 77.2090
                
                # Random location within 10km radius
                lat_offset = random.uniform(-0.1, 0.1)
                lng_offset = random.uniform(-0.1, 0.1)
                
                tracking = models.DeliveryTracking(
                    id=f"tracking-{order.id}",
                    order_id=order.id,
                    delivery_agent_id=order.delivery_agent_id,
                    current_latitude=str(base_lat + lat_offset),
                    current_longitude=str(base_lng + lng_offset),
                    status=order.status,
                    estimated_delivery_time=datetime.now() + timedelta(minutes=random.randint(10, 30)),
                    actual_delivery_time=datetime.now() + timedelta(minutes=random.randint(15, 25)) if order.status == "delivered" else None,
                    created_at=datetime.now()
                )
                
                self.db.add(tracking)
                tracking_records.append(tracking)
        
        self.delivery_tracking = tracking_records
        self.db.commit()
        print(f"✅ Generated {len(tracking_records)} delivery tracking records")
    
    def generate_weekly_reports(self):
        """Generate weekly reports"""
        print("📊 Generating weekly reports...")
        
        reports = []
        for subscription in self.subscriptions:
            # Generate reports for past weeks
            for week in range(1, 5):  # 4 weeks of reports
                start_date = datetime.now().date() - timedelta(weeks=week)
                end_date = start_date + timedelta(days=6)
                
                # Calculate statistics
                total_meals = 21  # 3 meals × 7 days
                consumed_meals = random.randint(15, 21)
                skipped_meals = total_meals - consumed_meals
                completion_rate = (consumed_meals / total_meals) * 100
                
                report = models.WeeklyReport(
                    id=f"report-{subscription.client_id}-week-{week}",
                    client_id=subscription.client_id,
                    nutritionist_id=subscription.nutritionist_id,
                    week_number=week,
                    start_date=start_date,
                    end_date=end_date,
                    total_meals=total_meals,
                    consumed_meals=consumed_meals,
                    skipped_meals=skipped_meals,
                    completion_rate=completion_rate,
                    weight_change=random.uniform(-2.0, 1.0),
                    nutritionist_notes=f"Week {week} progress report for {subscription.client_id}",
                    recommendations=[
                        "Continue with current meal plan",
                        "Increase water intake",
                        "Add 10 minutes of daily walking"
                    ],
                    generated_at=datetime.now()
                )
                
                self.db.add(report)
                reports.append(report)
        
        self.weekly_reports = reports
        self.db.commit()
        print(f"✅ Generated {len(reports)} weekly reports")
    
    def generate_consultations(self):
        """Generate consultation sessions"""
        print("💬 Generating consultations...")
        
        consultations = []
        for subscription in self.subscriptions:
            # Generate past consultations
            for i in range(3):  # 3 past consultations
                consultation_date = datetime.now() - timedelta(days=random.randint(7, 30))
                
                consultation = models.Consultation(
                    id=f"consultation-{subscription.client_id}-{i}",
                    client_id=subscription.client_id,
                    nutritionist_id=subscription.nutritionist_id,
                    scheduled_date=consultation_date.date(),
                    scheduled_time=consultation_date.time(),
                    duration_minutes=30,
                    status="completed",
                    notes=f"Consultation {i+1} notes for {subscription.client_id}",
                    created_at=consultation_date
                )
                
                self.db.add(consultation)
                consultations.append(consultation)
            
            # Generate upcoming consultation
            upcoming_date = datetime.now() + timedelta(days=random.randint(1, 7))
            upcoming_consultation = models.Consultation(
                id=f"consultation-{subscription.client_id}-upcoming",
                client_id=subscription.client_id,
                nutritionist_id=subscription.nutritionist_id,
                scheduled_date=upcoming_date.date(),
                scheduled_time=upcoming_date.time(),
                duration_minutes=30,
                status="scheduled",
                notes="Upcoming consultation",
                created_at=datetime.now()
            )
            
            self.db.add(upcoming_consultation)
            consultations.append(upcoming_consultation)
        
        self.consultations = consultations
        self.db.commit()
        print(f"✅ Generated {len(consultations)} consultations")
    
    def close(self):
        """Close database connection"""
        self.db.close()

def main():
    """Main function to generate sample data"""
    generator = SampleDataGenerator()
    try:
        stats = generator.generate_all_data()
        print("\n🎉 Sample data generation completed successfully!")
        print(f"📊 Statistics: {json.dumps(stats, indent=2)}")
        return stats
    except Exception as e:
        print(f"❌ Error generating sample data: {e}")
        raise
    finally:
        generator.close()

if __name__ == "__main__":
    main()
