/*
  # Add Multi-Tenant Support to Clientes Table

  ## Overview
  This migration adds company_id column to the clientes table to enable proper multi-tenant data isolation.

  ## Changes
  1. Tables Modified
    - `clientes` table:
      - Add `company_id` column (uuid, references companies)
      - Add index on company_id for query performance
      
  2. Security (RLS Policies)
    - Drop existing open policies
    - Add superadmin policy: can view all leads across companies
    - Add company-scoped policy: users can only view leads from their companies
    - Add insert policy: users can only insert leads for their companies
    - Add update policy: users can only update leads from their companies
    - Add delete policy: users can only delete leads from their companies

  ## Important Notes
  - Existing data will have NULL company_id initially
  - You should assign company_id to existing records after migration
  - All new leads MUST have company_id set
  - RLS automatically enforces company isolation
*/

-- Add company_id column to clientes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE clientes ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_clientes_company_id ON clientes(company_id);

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON clientes;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON clientes;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON clientes;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON clientes;

-- Superadmins can view all leads across all companies
CREATE POLICY "Superadmins can view all leads"
  ON clientes FOR SELECT
  TO authenticated
  USING (is_superadmin());

-- Users can only view leads from their assigned companies
CREATE POLICY "Users can view leads from their companies"
  ON clientes FOR SELECT
  TO authenticated
  USING (
    company_id = ANY(get_user_companies())
  );

-- Superadmins can insert leads for any company
CREATE POLICY "Superadmins can insert leads"
  ON clientes FOR INSERT
  TO authenticated
  WITH CHECK (is_superadmin());

-- Users can only insert leads for their assigned companies
CREATE POLICY "Users can insert leads for their companies"
  ON clientes FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = ANY(get_user_companies())
  );

-- Superadmins can update all leads
CREATE POLICY "Superadmins can update all leads"
  ON clientes FOR UPDATE
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Users can only update leads from their companies
CREATE POLICY "Users can update leads from their companies"
  ON clientes FOR UPDATE
  TO authenticated
  USING (company_id = ANY(get_user_companies()))
  WITH CHECK (company_id = ANY(get_user_companies()));

-- Superadmins can delete all leads
CREATE POLICY "Superadmins can delete all leads"
  ON clientes FOR DELETE
  TO authenticated
  USING (is_superadmin());

-- Users can only delete leads from their companies
CREATE POLICY "Users can delete leads from their companies"
  ON clientes FOR DELETE
  TO authenticated
  USING (company_id = ANY(get_user_companies()));