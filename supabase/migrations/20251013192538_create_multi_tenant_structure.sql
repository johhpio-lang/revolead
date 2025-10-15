/*
  # Multi-Tenant System with Role-Based Access Control

  ## Overview
  This migration creates a complete multi-tenant system with three user roles:
  - **superadmin**: Can create companies and assign admin/user roles
  - **admin**: Can manage their company and create users within their company
  - **user**: Can only access data from their assigned company

  ## New Tables

  ### 1. companies
  Stores company/organization information
  - `id` (uuid, primary key) - Unique company identifier
  - `name` (text, required) - Company name
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. profiles
  Extends auth.users with role and metadata
  - `id` (uuid, primary key, references auth.users) - User ID
  - `role` (text, required) - User role: superadmin, admin, or user
  - `full_name` (text) - User's full name
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. company_users
  Junction table linking users to companies
  - `id` (uuid, primary key) - Unique identifier
  - `company_id` (uuid, required, references companies) - Company reference
  - `user_id` (uuid, required, references auth.users) - User reference
  - `role` (text, required) - Role within this company (admin or user)
  - `created_at` (timestamptz) - Creation timestamp
  - Unique constraint on (company_id, user_id)

  ## Security
  - All tables have RLS enabled
  - Superadmins can access all data
  - Admins can only access their company's data
  - Users can only read their company's data
  - Policies ensure data isolation between companies

  ## Functions
  - `get_user_role()` - Returns the current user's role
  - `get_user_companies()` - Returns array of company IDs user has access to
  - `is_superadmin()` - Checks if current user is superadmin
  - `is_company_admin(company_id)` - Checks if user is admin of specific company
*/

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('superadmin', 'admin', 'user')),
  full_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create company_users junction table
CREATE TABLE IF NOT EXISTS company_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'user')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_company_users_company_id ON company_users(company_id);
CREATE INDEX IF NOT EXISTS idx_company_users_user_id ON company_users(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_users ENABLE ROW LEVEL SECURITY;

-- Helper function: Get user's role from profiles
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Helper function: Check if user is superadmin
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'superadmin'
  );
$$;

-- Helper function: Get companies user has access to
CREATE OR REPLACE FUNCTION get_user_companies()
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT ARRAY_AGG(company_id) 
  FROM company_users 
  WHERE user_id = auth.uid();
$$;

-- Helper function: Check if user is admin of specific company
CREATE OR REPLACE FUNCTION is_company_admin(check_company_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_users 
    WHERE user_id = auth.uid() 
    AND company_id = check_company_id 
    AND role = 'admin'
  );
$$;

-- RLS Policies for companies table
CREATE POLICY "Superadmins can view all companies"
  ON companies FOR SELECT
  TO authenticated
  USING (is_superadmin());

CREATE POLICY "Superadmins can insert companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (is_superadmin());

CREATE POLICY "Superadmins can update companies"
  ON companies FOR UPDATE
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Admins and users can view their companies"
  ON companies FOR SELECT
  TO authenticated
  USING (
    id = ANY(get_user_companies())
  );

-- RLS Policies for profiles table
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Superadmins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_superadmin());

CREATE POLICY "Superadmins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (is_superadmin());

CREATE POLICY "Superadmins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- RLS Policies for company_users table
CREATE POLICY "Superadmins can view all company users"
  ON company_users FOR SELECT
  TO authenticated
  USING (is_superadmin());

CREATE POLICY "Superadmins can insert company users"
  ON company_users FOR INSERT
  TO authenticated
  WITH CHECK (is_superadmin());

CREATE POLICY "Superadmins can update company users"
  ON company_users FOR UPDATE
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Superadmins can delete company users"
  ON company_users FOR DELETE
  TO authenticated
  USING (is_superadmin());

CREATE POLICY "Admins can view users in their companies"
  ON company_users FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM company_users 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert users in their companies"
  ON company_users FOR INSERT
  TO authenticated
  WITH CHECK (
    is_company_admin(company_id) AND role = 'user'
  );

CREATE POLICY "Admins can update users in their companies"
  ON company_users FOR UPDATE
  TO authenticated
  USING (
    is_company_admin(company_id) AND role = 'user'
  )
  WITH CHECK (
    is_company_admin(company_id) AND role = 'user'
  );

CREATE POLICY "Admins can delete users in their companies"
  ON company_users FOR DELETE
  TO authenticated
  USING (
    is_company_admin(company_id)
  );

CREATE POLICY "Users can view their own company memberships"
  ON company_users FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();