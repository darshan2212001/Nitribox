from sqlalchemy.orm import Session
from api.database import SessionLocal
from api import models
from api.simple_auth import get_password_hash
from datetime import datetime, timedelta
import hashlib

def seed():
    """CLI / docs alias for seed_database()."""
    return seed_database()


def seed_database():
    db = SessionLocal()
    
    try:
        # Clear existing data (in correct order due to dependencies)
        print("Clearing existing data...")
        # Clear dependent data first
        db.query(models.ProgressLog).delete()
        db.query(models.Session).delete()
        db.query(models.Client).delete()
        db.query(models.Subscription).delete()
        db.query(models.DeliveryTracking).delete()
        db.query(models.KitchenQueue).delete()
        db.query(models.Order).delete()
        db.query(models.DeliveryAgent).delete()
        db.query(models.Nutritionist).delete()
        db.query(models.MealPlan).delete()
        # Don't delete users - they might already exist
        # db.query(models.User).delete()
        db.commit()
        
        # Seed Essential Users Only (skip if bcrypt fails, use simple hash)
        print("\nSeeding Essential Users...")
        try:
            admin_password = get_password_hash("admin123")
        except Exception as e:
            print(f"Warning: bcrypt failed, using SHA256 for admin: {e}")
            admin_password = hashlib.sha256("admin123".encode()).hexdigest()
        
        try:
            nutri_password = get_password_hash("nutri123")
        except Exception as e:
            print(f"Warning: bcrypt failed, using SHA256 for nutritionist: {e}")
            nutri_password = hashlib.sha256("nutri123".encode()).hexdigest()
        
        try:
            client_password = get_password_hash("client123")
        except Exception as e:
            print(f"Warning: bcrypt failed, using SHA256 for client: {e}")
            client_password = hashlib.sha256("client123".encode()).hexdigest()
        
        try:
            kitchen_password = get_password_hash("kitchen123")
        except Exception as e:
            print(f"Warning: bcrypt failed, using SHA256 for kitchen: {e}")
            kitchen_password = hashlib.sha256("kitchen123".encode()).hexdigest()
        
        try:
            delivery_password = get_password_hash("delivery123")
        except Exception as e:
            print(f"Warning: bcrypt failed, using SHA256 for delivery: {e}")
            delivery_password = hashlib.sha256("delivery123".encode()).hexdigest()
        
        # Check if users already exist
        existing_admin = db.query(models.User).filter(models.User.email == "admin@zyael.com").first()
        existing_nutri = db.query(models.User).filter(models.User.email == "nutritionist1@zyael.com").first()
        existing_client = db.query(models.User).filter(models.User.username == "client1").first()
        existing_kitchen = db.query(models.User).filter(models.User.username == "kitchen1").first()
        existing_delivery = db.query(models.User).filter(models.User.username == "delivery1").first()
        
        users = []
        if not existing_admin:
            users.append(models.User(
                id="user-2", 
                username="admin",
                email="admin@zyael.com",
                password=admin_password,
                name="Admin User",
                phone="+91-9876543220",
                role="admin"
            ))
        if not existing_nutri:
            users.append(models.User(
                id="user-3",
                username="nutritionist1",
                email="nutritionist1@zyael.com", 
                password=nutri_password,
                name="Dr. Meera Sharma",
                phone="+91-9876543230",
                role="nutritionist"
            ))
        if not existing_client:
            users.append(models.User(
                id="user-client-1",
                username="client1",
                email="client1@example.com",
                password=client_password,
                name="Test Client",
                phone="+91-9876543240",
                role="client"
            ))
        if not existing_kitchen:
            users.append(models.User(
                id="user-kitchen-1",
                username="kitchen1",
                email="kitchen1@zyael.com",
                password=kitchen_password,
                name="Chef Rajesh",
                phone="+91-9876543400",
                role="kitchen"
            ))
        if not existing_delivery:
            users.append(models.User(
                id="user-delivery-1",
                username="delivery1",
                email="delivery1@zyael.com",
                password=delivery_password,
                name="Ravi Kumar",
                phone="+91-9876543300",
                role="delivery"
            ))
        
        if users:
            db.add_all(users)
            db.commit()
        
        # Seed Meal Plans
        print("\nSeeding Meal Plans...")
        meal_plans = [
            models.MealPlan(
                title="Weight Loss",
                description="Balanced meals to help shed fat effectively",
                category="weight_management",
                original_price=17000,
                current_price=15000,
                rating=4.8,
                review_count=3200,
                badge="Bestseller",
                features="Low calorie, High fiber, Portion controlled",
                image_url="/images/weight-loss-plan.jpg",
                is_active=True
            ),
            models.MealPlan(
                title="Muscle Gain",
                description="Protein-rich meals for lean muscle development",
                category="fitness",
                original_price=18000,
                current_price=15000,
                rating=4.7,
                review_count=2800,
                badge="Popular",
                features="High protein, Balanced macros, Post-workout meals",
                image_url="/images/muscle-gain-plan.jpg",
                is_active=True
            ),
            models.MealPlan(
                title="PCOS Friendly",
                description="Low glycemic meals for health management",
                category="health",
                original_price=16500,
                current_price=15000,
                rating=4.6,
                review_count=2300,
                badge="Recommended",
                features="Low GI, Anti-inflammatory, Hormone balanced",
                image_url="/images/diabetic-plan.jpg",
                is_active=True
            ),
            models.MealPlan(
                title="Vegan / Vegetarian",
                description="Plant-based nourishment for every lifestyle",
                category="dietary_preference",
                original_price=16000,
                current_price=15000,
                rating=4.5,
                review_count=2100,
                badge="Healthy Choice",
                features="100% Plant-based, Protein-rich, Nutrient-dense",
                image_url="/images/pcos-plan.jpg",
                is_active=True
            ),
            models.MealPlan(
                title="Postpartum Moms",
                description="Meals crafted for new mothers' recovery",
                category="special",
                original_price=17000,
                current_price=15000,
                rating=4.8,
                review_count=1800,
                badge="Mom's Magic",
                features="Lactation support, Iron-rich, Energy boosting",
                image_url="/images/senior-plan.jpg",
                is_active=True
            ),
            models.MealPlan(
                title="Senior Citizens",
                description="Gentle, nutritious meals for healthy aging",
                category="age_specific",
                original_price=16500,
                current_price=15000,
                rating=4.9,
                review_count=1500,
                badge="Trusted by Families",
                features="Easy to digest, Heart healthy, Bone strengthening",
                image_url="/images/weight-loss-plan.jpg",
                is_active=True
            ),
            models.MealPlan(
                title="Diabetic Friendly Meals",
                description="Gentle, nutritious meals for health management",
                category="health",
                original_price=16500,
                current_price=15000,
                rating=4.9,
                review_count=1500,
                badge="Trusted by Families",
                features="Low sugar, Controlled carbs, Blood sugar friendly",
                image_url="/images/diabetic-plan.jpg",
                is_active=True
            ),
            models.MealPlan(
                title="Kids Nutrition",
                description="Tasty & healthy meals for growing kids",
                category="age_specific",
                original_price=16000,
                current_price=15000,
                rating=4.6,
                review_count=1200,
                badge="Coming Soon",
                features="Fun & nutritious, Growth focused, Picky-eater approved",
                image_url="/images/diabetic-plan.jpg",
                is_active=True
            ),
            models.MealPlan(
                title="Recovery Meals",
                description="Special diet meals for patients during recovery",
                category="health",
                original_price=16500,
                current_price=15000,
                rating=4.7,
                review_count=1100,
                badge="Doctor Approved",
                features="Nutrient-dense, Immune boosting, Easy digestion",
                image_url="/images/muscle-gain-plan.jpg",
                is_active=True
            )
        ]
        db.add_all(meal_plans)
        db.commit()
        
        # Seed Nutritionists
        print("Seeding Nutritionists...")
        nutritionists = [
            models.Nutritionist(
                name="Dr. Meera Sharma",
                email="meera.sharma@zyael.com",
                phone="+91-9876543210",
                specialization="Weight Loss & Lifestyle Management",
                bio="Dr. Meera Sharma is a certified nutritionist with over 12 years of experience in weight management and lifestyle modification. She specializes in creating sustainable weight loss programs that focus on long-term health and wellness. Her approach combines evidence-based nutrition science with practical lifestyle changes, helping clients achieve their weight goals while maintaining a healthy relationship with food.",
                experience_years=12,
                rating=4.9,
                total_clients=320,
                is_available=True,
                city="Bengaluru",
                tagline="Transform your relationship with food and achieve lasting weight loss",
                qualifications="MSc Nutrition, Certified Diabetes Educator, Sports Nutrition Specialist",
                image_url="/images/nutritionist-1.jpg",
                available_slots='{"monday": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"], "tuesday": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"], "wednesday": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"], "thursday": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"], "friday": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]}'
            ),
            models.Nutritionist(
                name="Dr. Aarav Mehta",
                email="aarav.mehta@zyael.com",
                phone="+91-9876543211",
                specialization="Sports & Muscle Gain Nutrition",
                bio="Dr. Aarav Mehta is a sports nutritionist and former athlete with 15 years of experience in performance nutrition. He specializes in muscle gain programs for athletes, bodybuilders, and fitness enthusiasts. His expertise includes pre/post-workout nutrition, supplementation strategies, and body composition optimization. He has worked with professional athletes and helped hundreds of clients achieve their muscle-building goals.",
                experience_years=15,
                rating=4.8,
                total_clients=280,
                is_available=True,
                city="Mumbai",
                tagline="Fuel your gains with science-backed nutrition strategies",
                qualifications="PhD Sports Nutrition, Certified Strength & Conditioning Specialist, ISSA Certified",
                image_url="/images/nutritionist-2.jpg",
                available_slots='{"monday": ["08:00", "09:00", "10:00", "17:00", "18:00", "19:00"], "tuesday": ["08:00", "09:00", "10:00", "17:00", "18:00", "19:00"], "wednesday": ["08:00", "09:00", "10:00", "17:00", "18:00", "19:00"], "thursday": ["08:00", "09:00", "10:00", "17:00", "18:00", "19:00"], "friday": ["08:00", "09:00", "10:00", "17:00", "18:00", "19:00"]}'
            ),
            models.Nutritionist(
                name="Dr. Sneha Iyer",
                email="sneha.iyer@zyael.com",
                phone="+91-9876543212",
                specialization="PCOS & Women's Health",
                bio="Dr. Sneha Iyer is a women's health nutritionist with 10 years of specialized experience in PCOS management and hormonal health. She focuses on evidence-based dietary interventions for women with PCOS, thyroid disorders, and other hormonal imbalances. Her holistic approach combines nutrition therapy with lifestyle modifications to help women regain hormonal balance and improve their quality of life.",
                experience_years=10,
                rating=4.9,
                total_clients=250,
                is_available=True,
                city="Pune",
                tagline="Empowering women to take control of their hormonal health through nutrition",
                qualifications="MSc Clinical Nutrition, PCOS Specialist Certification, Women's Health Nutrition Expert",
                image_url="/images/nutritionist-3.jpg",
                available_slots='{"monday": ["10:00", "11:00", "12:00", "15:00", "16:00", "17:00"], "tuesday": ["10:00", "11:00", "12:00", "15:00", "16:00", "17:00"], "wednesday": ["10:00", "11:00", "12:00", "15:00", "16:00", "17:00"], "thursday": ["10:00", "11:00", "12:00", "15:00", "16:00", "17:00"], "friday": ["10:00", "11:00", "12:00", "15:00", "16:00", "17:00"]}'
            ),
            models.Nutritionist(
                name="Dr. Karan Bhatia",
                email="karan.bhatia@zyael.com",
                phone="+91-9876543213",
                specialization="Diabetes Management & Metabolic Health",
                bio="Dr. Karan Bhatia is a clinical nutritionist specializing in diabetes management and metabolic health. With 14 years of experience, he has helped hundreds of patients manage their blood sugar levels through personalized nutrition plans. His expertise includes Type 1 and Type 2 diabetes management, prediabetes reversal, and metabolic syndrome treatment. He focuses on sustainable dietary changes that improve long-term health outcomes.",
                experience_years=14,
                rating=4.7,
                total_clients=190,
                is_available=True,
                city="Hyderabad",
                tagline="Take control of your diabetes with personalized nutrition guidance",
                qualifications="MSc Clinical Nutrition, Certified Diabetes Educator, Metabolic Health Specialist",
                image_url="/images/nutritionist-4.jpg",
                available_slots='{"monday": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"], "tuesday": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"], "wednesday": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"], "thursday": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"], "friday": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]}'
            ),
        models.Nutritionist(
            name="Dr. Ananya Rao",
            email="ananya.rao@zyael.com",
            phone="+91-9876543214",
            specialization="Vegan & Plant-Based Nutrition",
            bio="Dr. Ananya Rao is a plant-based nutritionist with 8 years of experience in vegan and vegetarian nutrition. She specializes in creating balanced plant-based meal plans that meet all nutritional requirements. Her expertise includes vegan protein optimization, B12 and iron deficiency prevention, and sustainable nutrition practices. She helps clients transition to plant-based diets while ensuring optimal health and nutrition.",
            experience_years=8,
            rating=4.8,
            total_clients=180,
            is_available=True,
            city="Chennai",
            tagline="Discover the power of plant-based nutrition for optimal health",
            qualifications="MSc Plant-Based Nutrition, Vegan Nutrition Specialist, Sustainable Nutrition Expert",
            image_url="/images/nutritionist-5.jpg",
            available_slots='{"monday": ["10:00", "11:00", "12:00", "15:00", "16:00", "17:00"], "tuesday": ["10:00", "11:00", "12:00", "15:00", "16:00", "17:00"], "wednesday": ["10:00", "11:00", "12:00", "15:00", "16:00", "17:00"], "thursday": ["10:00", "11:00", "12:00", "15:00", "16:00", "17:00"], "friday": ["10:00", "11:00", "12:00", "15:00", "16:00", "17:00"]}'
        ),
        models.Nutritionist(
            name="Mrs. Sarul Jain",
            email="sarul.jain@zyael.com",
            phone="+91-9876543215",
            specialization="Disease Reversal & Health Restoration",
            bio="Mrs. Sarul Jain is an expert nutritionist with 15 years of proven success in reversing diseases and restoring health. She specializes in creating personalized nutrition plans that help clients overcome chronic health conditions through evidence-based dietary interventions. Her holistic approach combines traditional nutrition wisdom with modern scientific research to achieve lasting health transformations.",
            experience_years=15,
            rating=4.9,
            total_clients=500,
            is_available=True,
            city="Bengaluru",
            tagline="Transform your health through personalized nutrition and disease reversal",
            qualifications="MSc Clinical Nutrition, Disease Reversal Specialist, Certified Health Coach, Advanced Diabetes Educator",
            image_url="/images/nutritionist-6.jpg",
            available_slots='{"monday": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"], "tuesday": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"], "wednesday": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"], "thursday": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"], "friday": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]}'
        )
        ]
        db.add_all(nutritionists)
        db.commit()
        
        # Link nutritionist user to first nutritionist (if needed for authentication)
        nutritionist_user = db.query(models.User).filter(models.User.id == "user-3").first()
        if nutritionist_user and nutritionists:
            # Note: This assumes the nutritionist model has a user_id field or similar
            # If not, this can be skipped as the user and nutritionist are separate entities
            pass
        
        print("\n" + "=" * 50)
        print("Database seeded successfully!")
        print(f"   - Users: {db.query(models.User).count()} (Admin, Nutritionist, Client, Kitchen, Delivery)")
        print(f"   - Meal Plans: {db.query(models.MealPlan).count()}")
        print(f"   - Nutritionists: {db.query(models.Nutritionist).count()}")
        print("=" * 50)
        print("\nTest Users Created:")
        print("   - Admin: admin / admin123")
        print("   - Nutritionist: nutritionist1 / nutri123")
        print("   - Client: client1 / client123")
        print("   - Kitchen: kitchen1 / kitchen123")
        print("   - Delivery: delivery1 / delivery123")
        # Seed Products
        print("\nSeeding Products...")
        products_data = [
            {
                "name": "Zyael Plant-Based Protein Blend",
                "description": "A premium plant-based protein powder designed for daily muscle recovery and sustained energy. Made with clean ingredients, perfect for post-workout recovery and maintaining energy levels throughout the day.",
                "short_benefit": "Daily clean protein for muscle recovery and energy.",
                "price": 1299.0,
                "image_url": "https://placehold.co/600x600/1e293b/ffffff?text=Zyael+Protein+Blend",
                "category": "protein_fitness",
                "tags": ["Vegan", "No Added Sugar", "Gluten-Free"],
                "rating": 4.7,
                "review_count": 320,
                "nutritional_highlights": {
                    "protein_per_serving": "24g",
                    "added_sugar": "0g",
                    "calories": "120",
                    "fiber": "3g"
                },
                "key_benefits": [
                    "Supports muscle recovery after workouts",
                    "Provides sustained energy throughout the day",
                    "100% plant-based and vegan-friendly",
                    "No artificial sweeteners or additives"
                ],
                "suitable_for": ["Vegetarians", "Vegans", "Athletes", "Fitness Enthusiasts"],
                "nutritionist_endorsements": [
                    "Dr. Meera Sharma recommends this for clients looking for clean, plant-based protein sources.",
                    "Perfect for post-workout recovery and maintaining daily protein intake."
                ],
                "is_active": True,
                "is_featured": True
            },
            {
                "name": "Omega-3 Deep Sea Softgels",
                "description": "High-quality omega-3 fatty acids sourced from deep sea fish. Supports heart health, brain function, and joint mobility. Easy-to-swallow softgels with no fishy aftertaste.",
                "short_benefit": "Supports heart, brain and joint health.",
                "price": 899.0,
                "image_url": "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop",
                "category": "vitamins_minerals",
                "tags": ["Non-GMO", "Easy to Swallow"],
                "rating": 4.5,
                "review_count": 210,
                "nutritional_highlights": {
                    "omega3_per_serving": "1000mg",
                    "epa": "400mg",
                    "dha": "300mg",
                    "servings_per_bottle": "60"
                },
                "key_benefits": [
                    "Promotes cardiovascular health",
                    "Supports brain function and cognitive health",
                    "Reduces joint inflammation",
                    "Easy to swallow with no aftertaste"
                ],
                "suitable_for": ["Adults", "Seniors", "Heart Health Seekers"],
                "nutritionist_endorsements": [
                    "Essential for maintaining optimal heart and brain health, especially for those with limited fish intake."
                ],
                "is_active": True,
                "is_featured": True
            },
            {
                "name": "Gut Balance Probiotic Complex",
                "description": "Advanced probiotic formula with clinically studied strains to improve digestion, reduce bloating, and support gut health. Dairy-free and suitable for sensitive stomachs.",
                "short_benefit": "Improves digestion, reduces bloating.",
                "price": 1099.0,
                "image_url": "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=600&h=600&fit=crop&auto=format",
                "category": "gut_health",
                "tags": ["Dairy-Free", "Clinically Studied Strains"],
                "rating": 4.6,
                "review_count": 185,
                "nutritional_highlights": {
                    "probiotic_strains": "10 billion CFU",
                    "strains_count": "8",
                    "dairy_free": "Yes",
                    "shelf_stable": "Yes"
                },
                "key_benefits": [
                    "Improves digestive health and regularity",
                    "Reduces bloating and discomfort",
                    "Supports immune system function",
                    "Dairy-free and gentle on sensitive stomachs"
                ],
                "suitable_for": ["Digestive Health Seekers", "Lactose Intolerant", "IBS Sufferers"],
                "nutritionist_endorsements": [
                    "Highly recommended for clients experiencing digestive issues or bloating."
                ],
                "is_active": True,
                "is_featured": True
            },
            {
                "name": "Daily Multivitamin – Women's Essentials",
                "description": "Comprehensive multivitamin specifically formulated for women's health needs. Supports energy levels, hair and skin health, and hormonal balance. Once-a-day formula for convenience.",
                "short_benefit": "Supports energy, hair, skin and hormonal balance.",
                "price": 749.0,
                "image_url": "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=600&h=600&fit=crop&auto=format",
                "category": "womens_health",
                "tags": ["Women's Health", "Once-a-Day"],
                "rating": 4.4,
                "review_count": 260,
                "nutritional_highlights": {
                    "vitamins": "22 essential vitamins and minerals",
                    "iron": "18mg",
                    "folic_acid": "400mcg",
                    "biotin": "300mcg"
                },
                "key_benefits": [
                    "Boosts daily energy levels",
                    "Promotes healthy hair and skin",
                    "Supports hormonal balance",
                    "Convenient once-daily formula"
                ],
                "suitable_for": ["Women", "Pregnant Women (with doctor approval)", "Active Women"],
                "nutritionist_endorsements": [
                    "Perfect for women looking to fill nutritional gaps in their daily diet."
                ],
                "is_active": True,
                "is_featured": True
            },
            {
                "name": "Diabetic-Friendly Breakfast Mix",
                "description": "Low glycemic index breakfast mix designed for blood sugar management. High in fiber, slow-release carbohydrates, and essential nutrients. Perfect for maintaining stable blood sugar levels.",
                "short_benefit": "Slow-release energy, low glycemic.",
                "price": 599.0,
                "image_url": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&h=600&fit=crop&auto=format",
                "category": "diabetic_friendly",
                "tags": ["Diabetic-Friendly", "High Fiber"],
                "rating": 4.3,
                "review_count": 140,
                "nutritional_highlights": {
                    "glycemic_index": "Low (35)",
                    "fiber": "12g per serving",
                    "protein": "8g",
                    "sugar": "3g"
                },
                "key_benefits": [
                    "Helps maintain stable blood sugar levels",
                    "High fiber content for digestive health",
                    "Slow-release energy prevents spikes",
                    "Diabetic-friendly formulation"
                ],
                "suitable_for": ["Diabetics", "Pre-diabetics", "Blood Sugar Management"],
                "nutritionist_endorsements": [
                    "Excellent choice for clients managing diabetes or pre-diabetes."
                ],
                "is_active": True,
                "is_featured": True
            },
            {
                "name": "Protein Crunch Superfood Snack",
                "description": "High-protein, on-the-go snack made with clean ingredients. Baked, not fried, for a healthier alternative to traditional snacks. Perfect for satisfying hunger between meals.",
                "short_benefit": "High-protein, on-the-go clean snack.",
                "price": 299.0,
                "image_url": "https://placehold.co/600x600/1e293b/ffffff?text=Protein+Crunch",
                "category": "healthy_snacks",
                "tags": ["High Protein", "Baked Not Fried"],
                "rating": 4.6,
                "review_count": 110,
                "nutritional_highlights": {
                    "protein": "15g per serving",
                    "calories": "150",
                    "fiber": "4g",
                    "sugar": "2g"
                },
                "key_benefits": [
                    "High protein content for satiety",
                    "Clean, baked preparation method",
                    "Perfect for on-the-go snacking",
                    "Low in sugar and calories"
                ],
                "suitable_for": ["Snackers", "Fitness Enthusiasts", "Weight Management"],
                "nutritionist_endorsements": [
                    "Great alternative to processed snacks for clients looking to maintain healthy eating habits."
                ],
                "is_active": True,
                "is_featured": True
            },
            {
                "name": "Vitamin D3 + K2 Supplement",
                "description": "Essential bone and immune support with the perfect combination of Vitamin D3 and K2. Helps with calcium absorption and supports overall bone health and immune function.",
                "short_benefit": "Supports bone health and immune function.",
                "price": 649.0,
                "image_url": "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=600&h=600&fit=crop&auto=format",
                "category": "vitamins_minerals",
                "tags": ["Bone Health", "Immune Support"],
                "rating": 4.5,
                "review_count": 195,
                "nutritional_highlights": {
                    "vitamin_d3": "2000 IU",
                    "vitamin_k2": "100mcg",
                    "servings": "60 capsules",
                    "form": "Softgel"
                },
                "key_benefits": [
                    "Supports strong bones and teeth",
                    "Enhances immune system function",
                    "Improves calcium absorption",
                    "Essential for overall health"
                ],
                "suitable_for": ["Adults", "Seniors", "Bone Health Seekers"],
                "nutritionist_endorsements": [
                    "Critical supplement for those with limited sun exposure or bone health concerns."
                ],
                "is_active": True,
                "is_featured": True
            },
            {
                "name": "Iron + Vitamin C Complex",
                "description": "Gentle iron supplement with Vitamin C for better absorption. Helps combat fatigue and supports healthy red blood cell production. Non-constipating formula.",
                "short_benefit": "Combat fatigue, support healthy blood cells.",
                "price": 549.0,
                "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&h=600&fit=crop&auto=format",
                "category": "vitamins_minerals",
                "tags": ["Non-Constipating", "Gentle Formula"],
                "rating": 4.4,
                "review_count": 175,
                "nutritional_highlights": {
                    "iron": "18mg",
                    "vitamin_c": "500mg",
                    "form": "Capsule",
                    "servings": "30"
                },
                "key_benefits": [
                    "Reduces fatigue and boosts energy",
                    "Supports healthy red blood cells",
                    "Enhanced absorption with Vitamin C",
                    "Gentle on the stomach"
                ],
                "suitable_for": ["Women", "Anemia Patients", "Low Energy"],
                "nutritionist_endorsements": [
                    "Excellent for clients with iron deficiency or low energy levels."
                ],
                "is_active": True,
                "is_featured": False
            },
            {
                "name": "Prebiotic Fiber Blend",
                "description": "Natural prebiotic fiber blend to support gut health and promote healthy digestion. Feeds beneficial gut bacteria and supports regular bowel movements.",
                "short_benefit": "Feeds good bacteria, supports digestion.",
                "price": 799.0,
                "image_url": "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600&h=600&fit=crop&auto=format",
                "category": "gut_health",
                "tags": ["Prebiotic", "Fiber Rich"],
                "rating": 4.3,
                "review_count": 125,
                "nutritional_highlights": {
                    "fiber": "15g per serving",
                    "prebiotic_fiber": "10g",
                    "calories": "60",
                    "sugar": "0g"
                },
                "key_benefits": [
                    "Feeds beneficial gut bacteria",
                    "Supports healthy digestion",
                    "Promotes regular bowel movements",
                    "Natural and gentle"
                ],
                "suitable_for": ["Digestive Health", "Constipation", "Gut Health"],
                "nutritionist_endorsements": [
                    "Great addition to probiotic supplements for comprehensive gut health support."
                ],
                "is_active": True,
                "is_featured": False
            },
            {
                "name": "Energy Boosting Green Tea Extract",
                "description": "Natural energy boost from green tea extract with L-theanine. Provides sustained energy without jitters, supports focus and mental clarity.",
                "short_benefit": "Natural energy boost without jitters.",
                "price": 699.0,
                "image_url": "https://placehold.co/600x600/1e293b/ffffff?text=Green+Tea+Extract",
                "category": "healthy_snacks",
                "tags": ["Natural Energy", "No Caffeine Crash"],
                "rating": 4.6,
                "review_count": 230,
                "nutritional_highlights": {
                    "green_tea_extract": "500mg",
                    "l_theanine": "200mg",
                    "caffeine": "Natural (from tea)",
                    "servings": "60 capsules"
                },
                "key_benefits": [
                    "Sustained energy without crashes",
                    "Improves focus and mental clarity",
                    "Natural and safe",
                    "No jitters or anxiety"
                ],
                "suitable_for": ["Busy Professionals", "Students", "Energy Seekers"],
                "nutritionist_endorsements": [
                    "Perfect alternative to coffee for sustained, jitter-free energy."
                ],
                "is_active": True,
                "is_featured": True
            }
        ]
        
        for product_data in products_data:
            existing = db.query(models.Product).filter(models.Product.name == product_data["name"]).first()
            if not existing:
                product = models.Product(**product_data)
                db.add(product)
                print(f"  ✓ Created product: {product_data['name']}")
            else:
                print(f"  - Product already exists: {product_data['name']}")
        
        db.commit()
        print(f"  ✓ Seeded {len(products_data)} products")
        
        print("\nNote: Only essential users, nutritionists, meal plans and products are seeded.")
        print("All other data (clients, orders, sessions, etc.) will be created by users.")
        print("=" * 50)
        
    except Exception as e:
        print(f"ERROR: Error seeding database: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
