-- ============================================================
-- People & Attendance App - Supabase Database Setup (v2)
-- Run this ENTIRE script in: Supabase Dashboard > SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create role enum type
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'volunteer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- TABLE: profiles_core
-- ============================================
CREATE TABLE IF NOT EXISTS profiles_core (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  member_id TEXT DEFAULT '',
  full_name TEXT NOT NULL DEFAULT '',
  first_name TEXT DEFAULT '',
  middle_name TEXT DEFAULT '',
  last_name TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  role user_role NOT NULL DEFAULT 'volunteer',
  qr_code_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: profiles_data (maps to Master Data sheet)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- Personal Info
  age TEXT DEFAULT '',
  gender TEXT DEFAULT '',
  date_of_birth TEXT DEFAULT '',
  marital_status TEXT DEFAULT '',
  blood_group TEXT DEFAULT '',
  willing_blood_donation TEXT DEFAULT '',
  image_remarks TEXT DEFAULT '',
  image_saved_as TEXT DEFAULT '',

  -- Contact
  contact_number TEXT DEFAULT '',
  alternate_contact TEXT DEFAULT '',
  whatsapp_number TEXT DEFAULT '',
  emergency_contact TEXT DEFAULT '',
  emergency_relationship TEXT DEFAULT '',
  preferred_communication TEXT DEFAULT '',
  languages_known TEXT DEFAULT '',
  email_id TEXT DEFAULT '',

  -- Permanent Address
  permanent_address TEXT DEFAULT '',
  landmark TEXT DEFAULT '',
  country TEXT DEFAULT '',
  state TEXT DEFAULT '',
  district TEXT DEFAULT '',
  tehsil TEXT DEFAULT '',
  city_town_village TEXT DEFAULT '',
  post_office TEXT DEFAULT '',
  pin_code TEXT DEFAULT '',
  permanent_center TEXT DEFAULT '',
  zone_permanent_center TEXT DEFAULT '',
  permanent_address_remarks TEXT DEFAULT '',

  -- Communication Address
  same_as_permanent TEXT DEFAULT '',
  communication_address TEXT DEFAULT '',
  communication_pincode TEXT DEFAULT '',
  communication_remarks TEXT DEFAULT '',

  -- Department Details
  department TEXT DEFAULT '',
  region TEXT DEFAULT '',
  if_initiated TEXT DEFAULT '',
  initiated_by TEXT DEFAULT '',
  date_of_initiation TEXT DEFAULT '',
  initiation_remarks TEXT DEFAULT '',
  primary_duty_permanent TEXT DEFAULT '',
  secondary_duty_permanent TEXT DEFAULT '',
  other_duty_permanent TEXT DEFAULT '',
  primary_duty_current TEXT DEFAULT '',
  secondary_duty_current TEXT DEFAULT '',
  other_duty_current TEXT DEFAULT '',
  duty_area_local TEXT DEFAULT '',

  -- Education
  highest_qualification TEXT DEFAULT '',
  graduation TEXT DEFAULT '',
  graduation_secondary TEXT DEFAULT '',
  graduation_college TEXT DEFAULT '',
  post_graduation TEXT DEFAULT '',
  post_graduation_secondary TEXT DEFAULT '',
  post_graduation_college TEXT DEFAULT '',
  professional_course TEXT DEFAULT '',

  -- Profession
  occupation_category TEXT DEFAULT '',
  profession TEXT DEFAULT '',
  profession_business_name TEXT DEFAULT '',
  company_name TEXT DEFAULT '',
  job_designation TEXT DEFAULT '',
  special_skills TEXT DEFAULT '',

  -- I-Card & Uniform
  permanent_icard_status TEXT DEFAULT '',
  miscellaneous TEXT DEFAULT '',
  type_of_icard TEXT DEFAULT '',
  icard_remarks TEXT DEFAULT '',
  permanent_icard_request TEXT DEFAULT '',
  uniform TEXT DEFAULT '',

  -- Training / Orientation
  orientation_training TEXT DEFAULT '',
  place_of_orientation TEXT DEFAULT '',
  date_of_joining TEXT DEFAULT '',
  orientation_date_remarks TEXT DEFAULT '',
  years_of_membership TEXT DEFAULT '',

  -- Status & Activity
  active_status TEXT DEFAULT '',
  active_status_updated_on TEXT DEFAULT '',
  remarks TEXT DEFAULT '',
  member_id_remarks TEXT DEFAULT '',
  role_responsibility TEXT DEFAULT '',
  role_updated_on TEXT DEFAULT '',

  -- Digital Presence
  registered_beone TEXT DEFAULT '',
  sos_username TEXT DEFAULT '',
  beone_remarks TEXT DEFAULT '',
  knows_car_driving TEXT DEFAULT '',
  using_event_app TEXT DEFAULT '',
  sat_sandesh TEXT DEFAULT '',
  social_media TEXT DEFAULT '',

  -- Preferences
  frontend_duty_preference TEXT DEFAULT '',
  backend_duty_preference TEXT DEFAULT '',
  availability TEXT DEFAULT '',
  duty_timings TEXT DEFAULT '',

  -- Metadata
  last_updated_sheet TEXT DEFAULT '',
  data_updation_remarks TEXT DEFAULT '',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: profiles_sensitive (Admin-Only)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles_sensitive (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  id_proof_type TEXT DEFAULT '',
  id_proof_remarks TEXT DEFAULT '',
  id_proof_saved_as TEXT DEFAULT '',
  admin_notes TEXT DEFAULT '',
  background_check_status TEXT DEFAULT 'pending',
  flag_status TEXT DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: stock_items (Inventory Catalog)
-- ============================================
CREATE TABLE IF NOT EXISTS stock_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  description TEXT DEFAULT '',
  total_quantity INTEGER DEFAULT 0,
  issued_quantity INTEGER DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  min_stock_level INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: inventory_logs (Issuance Records)
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stock_item_id UUID REFERENCES stock_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL DEFAULT '',
  quantity INTEGER DEFAULT 1,
  year INTEGER,
  issued_by UUID REFERENCES auth.users(id),
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_core_user_id ON profiles_core(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_core_member_id ON profiles_core(member_id);
CREATE INDEX IF NOT EXISTS idx_profiles_core_role ON profiles_core(role);
CREATE INDEX IF NOT EXISTS idx_profiles_core_fullname ON profiles_core(full_name);
CREATE INDEX IF NOT EXISTS idx_profiles_data_user_id ON profiles_data(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_sensitive_user_id ON profiles_sensitive(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_user ON inventory_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_item ON inventory_logs(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_name ON stock_items(name);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- profiles_core RLS
ALTER TABLE profiles_core ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_core_select_own" ON profiles_core FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "profiles_core_select_admin" ON profiles_core FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles_core pc WHERE pc.user_id = auth.uid() AND pc.role = 'admin'));

CREATE POLICY "profiles_core_update_own" ON profiles_core FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_core_update_admin" ON profiles_core FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles_core pc WHERE pc.user_id = auth.uid() AND pc.role = 'admin'));

CREATE POLICY "profiles_core_insert_own" ON profiles_core FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- profiles_data RLS
ALTER TABLE profiles_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_data_select_own" ON profiles_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "profiles_data_select_admin" ON profiles_data FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles_core pc WHERE pc.user_id = auth.uid() AND pc.role = 'admin'));

CREATE POLICY "profiles_data_update_own" ON profiles_data FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_data_update_admin" ON profiles_data FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles_core pc WHERE pc.user_id = auth.uid() AND pc.role = 'admin'));

CREATE POLICY "profiles_data_insert_own" ON profiles_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- profiles_sensitive RLS (ADMIN ONLY)
ALTER TABLE profiles_sensitive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_sensitive_select_admin" ON profiles_sensitive FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles_core pc WHERE pc.user_id = auth.uid() AND pc.role = 'admin'));

CREATE POLICY "profiles_sensitive_update_admin" ON profiles_sensitive FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles_core pc WHERE pc.user_id = auth.uid() AND pc.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles_core pc WHERE pc.user_id = auth.uid() AND pc.role = 'admin'));

CREATE POLICY "profiles_sensitive_insert_admin" ON profiles_sensitive FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles_core pc WHERE pc.user_id = auth.uid() AND pc.role = 'admin'));

-- stock_items RLS (Admin manage, all authenticated can view)
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_items_select_all" ON stock_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "stock_items_insert_admin" ON stock_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles_core pc WHERE pc.user_id = auth.uid() AND pc.role = 'admin'));

CREATE POLICY "stock_items_update_admin" ON stock_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles_core pc WHERE pc.user_id = auth.uid() AND pc.role = 'admin'));

CREATE POLICY "stock_items_delete_admin" ON stock_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles_core pc WHERE pc.user_id = auth.uid() AND pc.role = 'admin'));

-- inventory_logs RLS
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_logs_select_own" ON inventory_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "inventory_logs_select_admin" ON inventory_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles_core pc WHERE pc.user_id = auth.uid() AND pc.role = 'admin'));

CREATE POLICY "inventory_logs_insert_admin" ON inventory_logs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles_core pc WHERE pc.user_id = auth.uid() AND pc.role = 'admin'));

-- NOTE: Profile creation is handled by the app's /api/profile/ensure endpoint
-- No database trigger needed - this avoids "Database error saving new user" issues

-- ============================================
-- DONE!
-- ============================================
