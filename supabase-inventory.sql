-- ============================================================
-- People & Attendance App - Stock / POS Module (inventory_items + inventory_logs)
-- Run in: Supabase Dashboard > SQL Editor (after supabase-setup.sql)
-- ============================================================

-- Unit type for items: piece (integer qty) or meter (decimal length)
DO $$ BEGIN
  CREATE TYPE unit_type_enum AS ENUM ('piece', 'meter');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method_enum AS ENUM ('cash', 'upi', 'waived', 'pending');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE issuance_status_enum AS ENUM ('issued', 'undone');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- TABLE: inventory_items
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_name TEXT NOT NULL,
  variant TEXT DEFAULT '',
  current_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  unit_type unit_type_enum NOT NULL DEFAULT 'piece',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: inventory_logs (POS issuance log)
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  volunteer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  issued_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  status issuance_status_enum NOT NULL DEFAULT 'issued',
  quantity_issued NUMERIC(12, 2) NOT NULL CHECK (quantity_issued > 0),
  amount_due NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_method payment_method_enum NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for list / join performance
CREATE INDEX IF NOT EXISTS idx_inventory_logs_volunteer_id ON inventory_logs(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_item_id ON inventory_logs(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_status_created ON inventory_logs(status, created_at DESC);

-- Optional: RLS (enable if you want row-level security)
-- ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- total_received on inventory_items (for audit)
-- ============================================
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS total_received NUMERIC(12, 2) NOT NULL DEFAULT 0;

-- ============================================
-- TABLE: stock_audit_logs (warehouse adjustments)
-- ============================================
CREATE TABLE IF NOT EXISTS stock_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  adjusted_by UUID NOT NULL REFERENCES public.profiles_core(id) ON DELETE SET NULL,
  quantity_added NUMERIC(12, 2) NOT NULL,
  new_total NUMERIC(12, 2) NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Allow negative quantity_added for reductions (run if table was created with CHECK > 0):
ALTER TABLE stock_audit_logs DROP CONSTRAINT IF EXISTS stock_audit_logs_quantity_added_check;
CREATE INDEX IF NOT EXISTS idx_stock_audit_logs_item_id ON stock_audit_logs(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_audit_logs_created_at ON stock_audit_logs(created_at DESC);
