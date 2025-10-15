/*
  # Update Existing Tables for Multi-Tenant Support

  ## Overview
  This migration updates the existing Leads_teste2 and Fontes tables to support multi-tenancy by adding company_id foreign keys and updating RLS policies.

  ## Changes

  ### 1. Leads_teste2 Table
  - Add `company_id` column (uuid, references companies)
  - Add index on company_id for performance
  - Update RLS policies to enforce company-based access control

  ### 2. Fontes Table
  - Add `company_id` column (uuid, references companies)
  - Add index on company_id for performance
  - Update RLS policies to enforce company-based access control

  ## Security
  - Superadmins can access all data across all companies
  - Admins can manage data only for their assigned companies
  - Users can view data only from their assigned companies
  - All policies enforce company isolation

  ## Important Notes
  - Existing data will have NULL company_id initially
  - You should assign company_id to existing records after migration
  - New records must have company_id set
*/

-- Add company_id to Leads_teste2 table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Leads_teste2' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE "Leads_teste2" ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add company_id to Fontes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Fontes' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE "Fontes" ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON "Leads_teste2"(company_id);
CREATE INDEX IF NOT EXISTS idx_fontes_company_id ON "Fontes"(company_id);

-- Drop existing policies on Leads_teste2
DROP POLICY IF EXISTS "Authenticated users can view all leads" ON "Leads_teste2";
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON "Leads_teste2";
DROP POLICY IF EXISTS "Authenticated users can update leads" ON "Leads_teste2";
DROP POLICY IF EXISTS "Authenticated users can delete leads" ON "Leads_teste2";

-- Drop existing policies on Fontes
DROP POLICY IF EXISTS "Authenticated users can view all fontes" ON "Fontes";
DROP POLICY IF EXISTS "Authenticated users can insert fontes" ON "Fontes";
DROP POLICY IF EXISTS "Authenticated users can update fontes" ON "Fontes";
DROP POLICY IF EXISTS "Authenticated users can delete fontes" ON "Fontes";

-- New RLS Policies for Leads_teste2
CREATE POLICY "Superadmins can view all leads"
  ON "Leads_teste2" FOR SELECT
  TO authenticated
  USING (is_superadmin());

CREATE POLICY "Users can view leads from their companies"
  ON "Leads_teste2" FOR SELECT
  TO authenticated
  USING (
    company_id = ANY(get_user_companies())
  );

CREATE POLICY "Superadmins can insert leads"
  ON "Leads_teste2" FOR INSERT
  TO authenticated
  WITH CHECK (is_superadmin());

CREATE POLICY "Admins can insert leads in their companies"
  ON "Leads_teste2" FOR INSERT
  TO authenticated
  WITH CHECK (
    is_company_admin(company_id)
  );

CREATE POLICY "Superadmins can update all leads"
  ON "Leads_teste2" FOR UPDATE
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Admins can update leads in their companies"
  ON "Leads_teste2" FOR UPDATE
  TO authenticated
  USING (is_company_admin(company_id))
  WITH CHECK (is_company_admin(company_id));

CREATE POLICY "Superadmins can delete all leads"
  ON "Leads_teste2" FOR DELETE
  TO authenticated
  USING (is_superadmin());

CREATE POLICY "Admins can delete leads in their companies"
  ON "Leads_teste2" FOR DELETE
  TO authenticated
  USING (is_company_admin(company_id));

-- New RLS Policies for Fontes
CREATE POLICY "Superadmins can view all fontes"
  ON "Fontes" FOR SELECT
  TO authenticated
  USING (is_superadmin());

CREATE POLICY "Users can view fontes from their companies"
  ON "Fontes" FOR SELECT
  TO authenticated
  USING (
    company_id = ANY(get_user_companies())
  );

CREATE POLICY "Superadmins can insert fontes"
  ON "Fontes" FOR INSERT
  TO authenticated
  WITH CHECK (is_superadmin());

CREATE POLICY "Admins can insert fontes in their companies"
  ON "Fontes" FOR INSERT
  TO authenticated
  WITH CHECK (
    is_company_admin(company_id)
  );

CREATE POLICY "Superadmins can update all fontes"
  ON "Fontes" FOR UPDATE
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

CREATE POLICY "Admins can update fontes in their companies"
  ON "Fontes" FOR UPDATE
  TO authenticated
  USING (is_company_admin(company_id))
  WITH CHECK (is_company_admin(company_id));

CREATE POLICY "Superadmins can delete all fontes"
  ON "Fontes" FOR DELETE
  TO authenticated
  USING (is_superadmin());

CREATE POLICY "Admins can delete fontes in their companies"
  ON "Fontes" FOR DELETE
  TO authenticated
  USING (is_company_admin(company_id));