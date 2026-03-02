-- ============================================================
-- Innergy Promotions - Database Schema (Updated)
-- Run in: Supabase Dashboard > SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE sewa_type_enum AS ENUM ('Trainer', 'Promoter', 'Both');
CREATE TYPE sewadar_role_enum AS ENUM ('Admin', 'Standard');
CREATE TYPE app_status_enum AS ENUM ('Already Installed', 'New Installation');
CREATE TYPE module_type_enum AS ENUM ('Module 1', 'Module 2', 'Both');
CREATE TYPE attendance_status_enum AS ENUM ('Present', 'Absent');
CREATE TYPE availability_status_enum AS ENUM ('Available', 'Unavailable', 'Tentative');

-- ============================================================
-- 1. SEWADAR MANAGEMENT
-- ============================================================

CREATE TABLE sewadar_core (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL, -- Replaced member_id with email
  role sewadar_role_enum NOT NULL DEFAULT 'Standard',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sewadar_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sewadar_id UUID REFERENCES sewadar_core(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  sewa_type sewa_type_enum NOT NULL DEFAULT 'Promoter',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sewadar_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sewadar_id UUID REFERENCES sewadar_core(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  time_of_sewa TIME NOT NULL DEFAULT CURRENT_TIME, -- Added
  sewa_area sewa_type_enum NOT NULL DEFAULT 'Promoter', -- Added
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sewadar_id, date)
);

CREATE TABLE sewadar_roster (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sewadar_id UUID REFERENCES sewadar_core(id) ON DELETE CASCADE NOT NULL,
  planned_date DATE NOT NULL,
  event_remarks TEXT DEFAULT '', -- Added
  availability_status availability_status_enum NOT NULL DEFAULT 'Available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sewadar_id, planned_date)
);

-- ============================================================
-- 2. APP PROMOTIONS TRACKING
-- ============================================================

CREATE TABLE promotion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registered_by UUID REFERENCES sewadar_core(id) ON DELETE SET NULL, -- Replaced sewadar_id for clarity
  interaction_type TEXT DEFAULT 'Standard', -- Added to distinguish flow
  citizen_name TEXT DEFAULT '',
  contact_number TEXT DEFAULT '',
  email_used TEXT DEFAULT '',
  app_status app_status_enum,
  tech_issue_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. GOLDEN MEMBERS (CRM)
-- ============================================================

CREATE TABLE golden_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registered_by UUID REFERENCES sewadar_core(id) ON DELETE SET NULL, -- Added for UI filtering
  full_name TEXT NOT NULL DEFAULT '',
  contact_no TEXT DEFAULT '',
  innergy_email TEXT DEFAULT '',
  city_center TEXT DEFAULT '',
  zone TEXT DEFAULT '',
  dob DATE,
  preferred_language TEXT NOT NULL DEFAULT 'Hindi'
    CHECK (preferred_language IN ('Hindi', 'English')),
  remarks TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. TRAINING EVENTS
-- ============================================================

CREATE TABLE training_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  module_type module_type_enum NOT NULL DEFAULT 'Module 1',
  event_date DATE NOT NULL,
  timing TEXT DEFAULT '',
  venue TEXT DEFAULT '',
  trainer_ids UUID[] DEFAULT '{}',
  support_sewadar_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE event_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES training_events(id) ON DELETE CASCADE NOT NULL,
  golden_member_id UUID REFERENCES golden_members(id) ON DELETE CASCADE NOT NULL,
  module_attended module_type_enum,
  status attendance_status_enum NOT NULL DEFAULT 'Absent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, golden_member_id)
);

CREATE TABLE event_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES training_events(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL DEFAULT '',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
