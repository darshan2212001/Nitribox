-- Optional manual fix if `npm run db:migrate` cannot run.
-- Execute against your nutribox MySQL database; ignore "Duplicate column" errors for columns that already exist.
-- Prefer: npm run db:migrate

ALTER TABLE orders ADD COLUMN subscription_id VARCHAR(255) NULL;
ALTER TABLE orders ADD COLUMN daily_meal_schedule_id VARCHAR(255) NULL;
ALTER TABLE orders ADD COLUMN version INT NOT NULL DEFAULT 1;
ALTER TABLE orders ADD COLUMN idempotency_key VARCHAR(255) NULL;
ALTER TABLE orders ADD COLUMN area_id VARCHAR(255) NULL;
ALTER TABLE orders ADD COLUMN batch_id VARCHAR(255) NULL;
ALTER TABLE orders ADD COLUMN timeslot_start DATETIME(6) NULL;
ALTER TABLE orders ADD COLUMN timeslot_end DATETIME(6) NULL;
ALTER TABLE orders ADD COLUMN label_printed TINYINT(1) NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN label_scanned_at DATETIME(6) NULL;
ALTER TABLE orders ADD COLUMN prepared_at DATETIME(6) NULL;
ALTER TABLE orders ADD COLUMN packed_at DATETIME(6) NULL;
ALTER TABLE orders ADD COLUMN assigned_at DATETIME(6) NULL;
ALTER TABLE orders ADD COLUMN picked_up_at DATETIME(6) NULL;
ALTER TABLE orders ADD COLUMN delivered_at DATETIME(6) NULL;
ALTER TABLE orders ADD COLUMN estimated_delivery_time DATETIME(6) NULL;
