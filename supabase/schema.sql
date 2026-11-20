-- TernakIkan PostgreSQL Database Schema
-- Run this script directly in the Supabase SQL Editor if you are creating a new project.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PONDS
CREATE TABLE IF NOT EXISTS ponds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT,
    volume_liters NUMERIC NOT NULL DEFAULT 0 CHECK (volume_liters >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. CULTIVATION BATCHES
CREATE TABLE IF NOT EXISTS cultivation_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pond_id UUID NOT NULL REFERENCES ponds(id) ON DELETE RESTRICT,
    fish_type TEXT NOT NULL,
    initial_quantity INTEGER NOT NULL CHECK (initial_quantity > 0),
    current_quantity INTEGER NOT NULL CHECK (current_quantity >= 0),
    stocking_date DATE NOT NULL,
    harvest_date DATE,
    harvest_quantity INTEGER CHECK (harvest_quantity IS NULL OR harvest_quantity >= 0),
    harvest_weight_kg NUMERIC CHECK (harvest_weight_kg IS NULL OR harvest_weight_kg >= 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'harvested', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_batch_per_pond 
ON cultivation_batches(pond_id) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_batches_pond_id ON cultivation_batches(pond_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON cultivation_batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_stocking_date ON cultivation_batches(stocking_date);

-- 3. FEED LOGS
CREATE TABLE IF NOT EXISTS feed_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES cultivation_batches(id) ON DELETE CASCADE,
    feed_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    unit TEXT NOT NULL CHECK (unit IN ('kg', 'gram')),
    fed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_feed_logs_batch_id ON feed_logs(batch_id);
CREATE INDEX IF NOT EXISTS idx_feed_logs_fed_at ON feed_logs(fed_at DESC);

-- 4. VITAMIN PRODUCTS
CREATE TABLE IF NOT EXISTS vitamin_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    brand TEXT,
    application_method TEXT,
    dosage_basis TEXT NOT NULL CHECK (dosage_basis IN ('water_volume', 'fish_count', 'fish_biomass', 'feed_weight')),
    dosage_value NUMERIC NOT NULL CHECK (dosage_value > 0),
    dosage_unit TEXT NOT NULL,
    reference_quantity NUMERIC NOT NULL CHECK (reference_quantity > 0),
    reference_unit TEXT NOT NULL,
    instructions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. VITAMIN LOGS
CREATE TABLE IF NOT EXISTS vitamin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES cultivation_batches(id) ON DELETE CASCADE,
    vitamin_product_id UUID REFERENCES vitamin_products(id) ON DELETE SET NULL,
    dosage_used NUMERIC NOT NULL CHECK (dosage_used > 0),
    dosage_unit TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_vitamin_logs_batch_id ON vitamin_logs(batch_id);
CREATE INDEX IF NOT EXISTS idx_vitamin_logs_applied_at ON vitamin_logs(applied_at DESC);

-- 6. ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES cultivation_batches(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('feeding', 'vitamin', 'mortality', 'water_change', 'sorting', 'other')),
    description TEXT NOT NULL,
    quantity NUMERIC,
    unit TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_batch_id ON activity_logs(batch_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_recorded_at ON activity_logs(recorded_at DESC);

-- 7. TRIGGERS
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ponds_modtime ON ponds;
CREATE TRIGGER update_ponds_modtime BEFORE UPDATE ON ponds FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS update_cultivation_batches_modtime ON cultivation_batches;
CREATE TRIGGER update_cultivation_batches_modtime BEFORE UPDATE ON cultivation_batches FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS update_vitamin_products_modtime ON vitamin_products;
CREATE TRIGGER update_vitamin_products_modtime BEFORE UPDATE ON vitamin_products FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- Mortality sync
CREATE OR REPLACE FUNCTION handle_fish_mortality_sync()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.activity_type = 'mortality' AND NEW.quantity IS NOT NULL AND NEW.quantity > 0 THEN
        UPDATE cultivation_batches
        SET current_quantity = GREATEST(0, current_quantity - CAST(NEW.quantity AS INTEGER))
        WHERE id = NEW.batch_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fish_mortality_sync ON activity_logs;
CREATE TRIGGER trg_fish_mortality_sync
AFTER INSERT ON activity_logs
FOR EACH ROW
EXECUTE FUNCTION handle_fish_mortality_sync();

-- 8. ROW LEVEL SECURITY
ALTER TABLE ponds ENABLE ROW LEVEL SECURITY;
ALTER TABLE cultivation_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitamin_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitamin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on ponds" ON ponds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on cultivation_batches" ON cultivation_batches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on feed_logs" ON feed_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on vitamin_products" ON vitamin_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on vitamin_logs" ON vitamin_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on activity_logs" ON activity_logs FOR ALL USING (true) WITH CHECK (true);

-- 9. SEED VITAMIN PRODUCTS
INSERT INTO vitamin_products (id, name, brand, application_method, dosage_basis, dosage_value, dosage_unit, reference_quantity, reference_unit, instructions)
VALUES 
    (
        '11111111-1111-1111-1111-111111111111',
        'Inapro-V Vitamin Kompleks',
        'Indovet',
        'Campur Pakan (Bibis)',
        'feed_weight',
        5,
        'gram',
        1,
        'kg',
        'Larutkan 5 gram Inapro-V ke dalam 100-150 ml air bersih, semprotkan merata ke 1 kg pakan pelet, diamkan 10-15 menit sebelum ditebar ke kolam.'
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        'Booster Vitaliquid',
        'Booster Fish Health',
        'Larutkan ke Air Kolam',
        'water_volume',
        10,
        'ml',
        1000,
        'liter',
        'Kocok botol terlebih dahulu. Campurkan 10 ml Vitaliquid ke dalam 1 ember air, lalu siramkan merata ke permukaan air kolam (untuk 1000 liter air). Berikan seminggu sekali atau saat perubahan cuaca ekstrim.'
    ),
    (
        '33333333-3333-3333-3333-333333333333',
        'Vitamin C Murni 50%',
        'Aquavit Pharma',
        'Campur Pakan (Bibis)',
        'fish_biomass',
        2,
        'gram',
        10,
        'kg',
        'Berikan 2 gram per 10 kg total biomassa ikan. Sangat efektif untuk mengatasi stres ikan setelah sortir atau hujan deras malam hari.'
    ),
    (
        '44444444-4444-4444-4444-444444444444',
        'Probiotik EM4 Perikanan',
        'Songgolangit Persada',
        'Larutkan ke Air Kolam',
        'water_volume',
        15,
        'ml',
        1000,
        'liter',
        'Campur 15 ml EM4 dan 15 gram molase/gula pasir ke dalam 1 liter air, fermentasi 2 jam lalu tebarkan ke 1000 liter air kolam untuk menjaga kualitas air dan mengurai kotoran dasar kolam.'
    )
ON CONFLICT (id) DO NOTHING;

