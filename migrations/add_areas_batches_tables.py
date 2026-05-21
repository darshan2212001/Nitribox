"""
Migration script to add Area, Batch, and BatchMeal tables
and update Order and DeliveryAgent tables with new fields.

Run this script to update your database schema.
"""

from sqlalchemy import text
from api.database import engine

def run_migration():
    """Run the migration to add new tables and columns"""
    
    with engine.connect() as conn:
        # Start transaction
        trans = conn.begin()
        
        try:
            # Create areas table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS areas (
                    id VARCHAR PRIMARY KEY,
                    name VARCHAR NOT NULL,
                    code VARCHAR UNIQUE,
                    description TEXT,
                    delivery_radius_km FLOAT,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP
                )
            """))
            
            # Create batches table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS batches (
                    id VARCHAR PRIMARY KEY,
                    area_id VARCHAR NOT NULL,
                    meal_type VARCHAR NOT NULL,
                    timeslot_start TIMESTAMP,
                    timeslot_end TIMESTAMP,
                    status VARCHAR DEFAULT 'pending',
                    delivery_agent_id VARCHAR,
                    total_orders INTEGER DEFAULT 0,
                    packed_count INTEGER DEFAULT 0,
                    ready_count INTEGER DEFAULT 0,
                    picked_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP
                )
            """))
            
            # Create batch_meals table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS batch_meals (
                    id VARCHAR PRIMARY KEY,
                    batch_id VARCHAR NOT NULL,
                    order_id VARCHAR NOT NULL,
                    status VARCHAR DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP,
                    UNIQUE(batch_id, order_id)
                )
            """))
            
            # Add indexes for areas
            try:
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_areas_active ON areas(is_active)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_areas_code ON areas(code)"))
            except Exception as e:
                print(f"Note: Some indexes may already exist: {e}")
            
            # Add indexes for batches
            try:
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_batches_area_meal ON batches(area_id, meal_type, timeslot_start)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status, created_at)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_batches_agent ON batches(delivery_agent_id, status)"))
            except Exception as e:
                print(f"Note: Some indexes may already exist: {e}")
            
            # Add indexes for batch_meals
            try:
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_batch_meals_batch ON batch_meals(batch_id, status)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_batch_meals_order ON batch_meals(order_id)"))
            except Exception as e:
                print(f"Note: Some indexes may already exist: {e}")
            
            # Add new columns to orders table (if they don't exist)
            try:
                conn.execute(text("ALTER TABLE orders ADD COLUMN area_id VARCHAR"))
                print("Added area_id column to orders")
            except Exception as e:
                print(f"Note: area_id column may already exist: {e}")
            
            try:
                conn.execute(text("ALTER TABLE orders ADD COLUMN batch_id VARCHAR"))
                print("Added batch_id column to orders")
            except Exception as e:
                print(f"Note: batch_id column may already exist: {e}")
            
            try:
                conn.execute(text("ALTER TABLE orders ADD COLUMN timeslot_start TIMESTAMP"))
                print("Added timeslot_start column to orders")
            except Exception as e:
                print(f"Note: timeslot_start column may already exist: {e}")
            
            try:
                conn.execute(text("ALTER TABLE orders ADD COLUMN timeslot_end TIMESTAMP"))
                print("Added timeslot_end column to orders")
            except Exception as e:
                print(f"Note: timeslot_end column may already exist: {e}")
            
            try:
                conn.execute(text("ALTER TABLE orders ADD COLUMN label_printed BOOLEAN DEFAULT FALSE"))
                print("Added label_printed column to orders")
            except Exception as e:
                print(f"Note: label_printed column may already exist: {e}")
            
            try:
                conn.execute(text("ALTER TABLE orders ADD COLUMN label_scanned_at TIMESTAMP"))
                print("Added label_scanned_at column to orders")
            except Exception as e:
                print(f"Note: label_scanned_at column may already exist: {e}")
            
            # Add indexes for orders
            try:
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_orders_area_batch ON orders(area_id, batch_id, meal_type)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_orders_timeslot ON orders(timeslot_start, timeslot_end)"))
            except Exception as e:
                print(f"Note: Some indexes may already exist: {e}")
            
            # Add new columns to delivery_agents table
            try:
                conn.execute(text("ALTER TABLE delivery_agents ADD COLUMN is_online BOOLEAN DEFAULT FALSE"))
                print("Added is_online column to delivery_agents")
            except Exception as e:
                print(f"Note: is_online column may already exist: {e}")
            
            try:
                conn.execute(text("ALTER TABLE delivery_agents ADD COLUMN areas_served TEXT"))
                print("Added areas_served column to delivery_agents")
            except Exception as e:
                print(f"Note: areas_served column may already exist: {e}")
            
            try:
                conn.execute(text("ALTER TABLE delivery_agents ADD COLUMN current_batch_id VARCHAR"))
                print("Added current_batch_id column to delivery_agents")
            except Exception as e:
                print(f"Note: current_batch_id column may already exist: {e}")
            
            try:
                conn.execute(text("ALTER TABLE delivery_agents ADD COLUMN updated_at TIMESTAMP"))
                print("Added updated_at column to delivery_agents")
            except Exception as e:
                print(f"Note: updated_at column may already exist: {e}")
            
            # Add indexes for delivery_agents
            try:
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_delivery_agents_available ON delivery_agents(is_available, is_online)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_delivery_agents_batch ON delivery_agents(current_batch_id)"))
            except Exception as e:
                print(f"Note: Some indexes may already exist: {e}")
            
            # Commit transaction
            trans.commit()
            print("\n✅ Migration completed successfully!")
            
        except Exception as e:
            trans.rollback()
            print(f"\n❌ Migration failed: {e}")
            raise

if __name__ == "__main__":
    print("Running migration: Add Areas, Batches, and BatchMeals tables...")
    try:
        run_migration()
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Migration script error: {e}")

