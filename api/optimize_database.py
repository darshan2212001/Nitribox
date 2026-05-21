# Database Optimization Script
# This script adds indexes to improve query performance

import sqlite3
import os
from pathlib import Path

def add_database_indexes():
    """Add performance indexes to the database"""
    
    # Get database path
    db_path = Path(__file__).parent / "nutribox.db"
    
    if not db_path.exists():
        print("Database not found. Please run the application first to create the database.")
        return
    
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    # Indexes for Orders table
    indexes = [
        # Orders table indexes
        "CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id)",
        "CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)",
        "CREATE INDEX IF NOT EXISTS idx_orders_kitchen_status ON orders(kitchen_status)",
        "CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)",
        "CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date)",
        "CREATE INDEX IF NOT EXISTS idx_orders_composite_status ON orders(status, kitchen_status)",
        
        # Meal Plans table indexes
        "CREATE INDEX IF NOT EXISTS idx_meal_plans_category ON meal_plans(category)",
        "CREATE INDEX IF NOT EXISTS idx_meal_plans_price ON meal_plans(price)",
        "CREATE INDEX IF NOT EXISTS idx_meal_plans_active ON meal_plans(is_active)",
        "CREATE INDEX IF NOT EXISTS idx_meal_plans_composite ON meal_plans(category, is_active)",
        
        # Nutritionists table indexes
        "CREATE INDEX IF NOT EXISTS idx_nutritionists_specialization ON nutritionists(specialization)",
        "CREATE INDEX IF NOT EXISTS idx_nutritionists_rating ON nutritionists(rating)",
        "CREATE INDEX IF NOT EXISTS idx_nutritionists_available ON nutritionists(is_available)",
        "CREATE INDEX IF NOT EXISTS idx_nutritionists_composite ON nutritionists(specialization, is_available)",
        
        # Clients table indexes
        "CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email)",
        "CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone)",
        "CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at)",
        "CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(is_active)",
        
        # Sessions table indexes
        "CREATE INDEX IF NOT EXISTS idx_sessions_nutritionist_id ON sessions(nutritionist_id)",
        "CREATE INDEX IF NOT EXISTS idx_sessions_client_id ON sessions(client_id)",
        "CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status)",
        "CREATE INDEX IF NOT EXISTS idx_sessions_scheduled_at ON sessions(scheduled_at)",
        "CREATE INDEX IF NOT EXISTS idx_sessions_composite ON sessions(nutritionist_id, status)",
        
        # Delivery Orders table indexes
        "CREATE INDEX IF NOT EXISTS idx_delivery_orders_delivery_person_id ON delivery_orders(delivery_person_id)",
        "CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON delivery_orders(status)",
        "CREATE INDEX IF NOT EXISTS idx_delivery_orders_delivery_date ON delivery_orders(delivery_date)",
        "CREATE INDEX IF NOT EXISTS idx_delivery_orders_composite ON delivery_orders(delivery_person_id, status)",
        
        # Reviews table indexes
        "CREATE INDEX IF NOT EXISTS idx_reviews_meal_plan_id ON reviews(meal_plan_id)",
        "CREATE INDEX IF NOT EXISTS idx_reviews_client_id ON reviews(client_id)",
        "CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating)",
        "CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at)",
        
        # Subscriptions table indexes
        "CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status)",
        "CREATE INDEX IF NOT EXISTS idx_subscriptions_start_date ON subscriptions(start_date)",
        "CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date)",
        "CREATE INDEX IF NOT EXISTS idx_subscriptions_composite ON subscriptions(user_id, status)",
        
        # Payments table indexes
        "CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id)",
        "CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)",
        "CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON payments(payment_method)",
        "CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at)",
        "CREATE INDEX IF NOT EXISTS idx_payments_composite ON payments(order_id, status)",
    ]
    
    print("Adding database indexes...")
    
    for i, index_sql in enumerate(indexes, 1):
        try:
            cursor.execute(index_sql)
            print(f"✓ Index {i}/{len(indexes)} created successfully")
        except sqlite3.Error as e:
            print(f"✗ Error creating index {i}: {e}")
    
    # Analyze the database to update statistics
    print("\nAnalyzing database...")
    cursor.execute("ANALYZE")
    
    # Get index information
    cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'")
    created_indexes = cursor.fetchall()
    
    print(f"\n✓ Database optimization complete!")
    print(f"✓ Created {len(created_indexes)} performance indexes")
    print(f"✓ Database statistics updated")
    
    conn.commit()
    conn.close()

def check_query_performance():
    """Check query performance with EXPLAIN QUERY PLAN"""
    
    db_path = Path(__file__).parent / "nutribox.db"
    
    if not db_path.exists():
        print("Database not found.")
        return
    
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    # Test queries
    test_queries = [
        "SELECT * FROM orders WHERE client_id = 'client-1'",
        "SELECT * FROM orders WHERE status = 'pending' AND kitchen_status = 'pending'",
        "SELECT * FROM meal_plans WHERE category = 'Weight Loss' AND is_active = 1",
        "SELECT * FROM nutritionists WHERE specialization = 'Weight Management' AND is_available = 1",
        "SELECT * FROM sessions WHERE nutritionist_id = 'nutritionist-1' AND status = 'scheduled'",
    ]
    
    print("\nQuery Performance Analysis:")
    print("=" * 50)
    
    for i, query in enumerate(test_queries, 1):
        print(f"\nQuery {i}: {query}")
        cursor.execute(f"EXPLAIN QUERY PLAN {query}")
        plan = cursor.fetchall()
        
        for row in plan:
            print(f"  {row[3]}")
    
    conn.close()

if __name__ == "__main__":
    add_database_indexes()
    check_query_performance()
