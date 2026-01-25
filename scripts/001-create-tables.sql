-- CV Builder Database Schema
-- Run this migration to set up all required tables
-- Version: 1.0.0 | Production Ready

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  photo_url TEXT,
  preferences JSONB DEFAULT '{}',
  email_verified BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Magic link tokens for passwordless auth
CREATE TABLE IF NOT EXISTS auth_tokens (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(50) DEFAULT 'magic_link', -- magic_link, password_reset, email_verify
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions for authenticated users
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  device_info JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CV TEMPLATES
-- ============================================

-- CV Templates
CREATE TABLE IF NOT EXISTS templates (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  preview_image TEXT,
  latex_template TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'professional',
  is_premium BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CVS & VERSION CONTROL
-- ============================================

-- CVs (resumes) owned by users
CREATE TABLE IF NOT EXISTS cvs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  template_id VARCHAR(50) REFERENCES templates(id) DEFAULT 'classic',
  current_version_id TEXT,
  share_token VARCHAR(255) UNIQUE,
  is_public BOOLEAN DEFAULT FALSE,
  photo_url TEXT,
  ats_score INTEGER,
  last_exported_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CV Versions for history tracking
CREATE TABLE IF NOT EXISTS cv_versions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cv_id TEXT REFERENCES cvs(id) ON DELETE CASCADE NOT NULL,
  version INTEGER NOT NULL,
  data JSONB NOT NULL,
  latex_source TEXT,
  note TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(cv_id, version)
);

-- Add foreign key for current_version_id after cv_versions exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_current_version' AND table_name = 'cvs'
  ) THEN
    ALTER TABLE cvs 
    ADD CONSTRAINT fk_current_version 
    FOREIGN KEY (current_version_id) REFERENCES cv_versions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- SHARING & ANALYTICS
-- ============================================

-- Share links with advanced options
CREATE TABLE IF NOT EXISTS share_links (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cv_id TEXT REFERENCES cvs(id) ON DELETE CASCADE NOT NULL,
  version_id TEXT REFERENCES cv_versions(id) ON DELETE SET NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  expires_at TIMESTAMP WITH TIME ZONE,
  max_views INTEGER,
  current_views INTEGER DEFAULT 0,
  allow_download BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- View analytics for shared CVs
CREATE TABLE IF NOT EXISTS cv_views (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cv_id TEXT REFERENCES cvs(id) ON DELETE CASCADE NOT NULL,
  share_link_id TEXT REFERENCES share_links(id) ON DELETE SET NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  referrer TEXT,
  country VARCHAR(100),
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- JOB MATCHING
-- ============================================

-- Job descriptions for matching
CREATE TABLE IF NOT EXISTS job_descriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  cv_id TEXT REFERENCES cvs(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  description TEXT NOT NULL,
  extracted_keywords JSONB DEFAULT '[]',
  match_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- FILE STORAGE
-- ============================================

-- Uploaded files (photos, PDFs)
CREATE TABLE IF NOT EXISTS uploaded_files (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  file_type VARCHAR(50) NOT NULL, -- photo, pdf, document
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  storage_url TEXT NOT NULL,
  storage_provider VARCHAR(50) DEFAULT 'base64', -- base64, vercel_blob, s3
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_cvs_user_id ON cvs(user_id);
CREATE INDEX IF NOT EXISTS idx_cvs_share_token ON cvs(share_token);
CREATE INDEX IF NOT EXISTS idx_cvs_updated_at ON cvs(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_cv_versions_cv_id ON cv_versions(cv_id);
CREATE INDEX IF NOT EXISTS idx_cv_versions_created_at ON cv_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_token ON auth_tokens(token);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_email ON auth_tokens(email);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires_at ON auth_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
CREATE INDEX IF NOT EXISTS idx_cv_views_cv_id ON cv_views(cv_id);
CREATE INDEX IF NOT EXISTS idx_cv_views_viewed_at ON cv_views(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_descriptions_user_id ON job_descriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id ON uploaded_files(user_id);

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Insert default templates (all 16 templates)
INSERT INTO templates (id, name, description, category, is_default, sort_order, latex_template) VALUES
-- ATS-Friendly
('modern', 'Modern', 'Clean ATS-friendly design with great readability.', 'ats', FALSE, 1, 'modern'),
('classic', 'Classic', 'Traditional professional layout trusted by recruiters.', 'ats', TRUE, 2, 'classic'),
('minimal', 'Minimal', 'Simple and elegant design that lets your content shine.', 'ats', FALSE, 3, 'minimal'),
('compact', 'Compact', 'Ultra space-efficient for experienced professionals.', 'ats', FALSE, 4, 'compact'),
-- Professional
('professional', 'Professional', 'Executive business design with subtle elegance.', 'business', FALSE, 5, 'professional'),
('executive', 'Executive', 'Premium design for C-level and senior management.', 'business', FALSE, 6, 'executive'),
('banking', 'Banking', 'Corporate minimalist for finance professionals.', 'business', FALSE, 7, 'banking'),
('elegant', 'Elegant', 'Premium sidebar design with visual hierarchy.', 'business', FALSE, 8, 'elegant'),
-- Creative
('creative', 'Creative', 'Modern design with visual appeal for creative roles.', 'creative', FALSE, 9, 'creative'),
('fancy', 'Fancy', 'Decorative design with stylish colorful accents.', 'creative', FALSE, 10, 'fancy'),
('bold', 'Bold', 'High contrast statement design that stands out.', 'creative', FALSE, 11, 'bold'),
('infographic', 'Infographic', 'Visual data-driven design with skill bars.', 'creative', FALSE, 12, 'infographic'),
-- Specialized
('tech', 'Tech', 'Developer-focused design optimized for technical roles.', 'tech', FALSE, 13, 'tech'),
('academic', 'Academic', 'Perfect for researchers, professors, and scientists.', 'academic', FALSE, 14, 'academic'),
('casual', 'Casual', 'Friendly approachable design for modern companies.', 'tech', FALSE, 15, 'casual'),
('vintage', 'Vintage', 'Traditional elegant design with classic typography.', 'classic', FALSE, 16, 'vintage')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order;

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for cvs table
DROP TRIGGER IF EXISTS update_cvs_updated_at ON cvs;
CREATE TRIGGER update_cvs_updated_at
  BEFORE UPDATE ON cvs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to increment CV view count
CREATE OR REPLACE FUNCTION increment_cv_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE cvs SET view_count = view_count + 1 WHERE id = NEW.cv_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for cv_views
DROP TRIGGER IF EXISTS increment_view_count_trigger ON cv_views;
CREATE TRIGGER increment_view_count_trigger
  AFTER INSERT ON cv_views
  FOR EACH ROW
  EXECUTE FUNCTION increment_cv_view_count();

-- Function to clean expired tokens (run via cron)
CREATE OR REPLACE FUNCTION clean_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM auth_tokens WHERE expires_at < NOW() - INTERVAL '24 hours';
  DELETE FROM sessions WHERE expires_at < NOW();
END;
$$ language 'plpgsql';
