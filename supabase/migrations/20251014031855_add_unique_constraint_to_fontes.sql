/*
  # Add unique constraint to Fontes table

  1. Changes
    - Add UNIQUE constraint to `fontes` column in `Fontes` table
    - This prevents multiple companies from registering the same phone number
    
  2. Security
    - Ensures each phone number can only be registered once
    - Prevents companies from accessing other companies' leads by duplicating phone numbers
    
  3. Notes
    - If a phone number is already registered, any attempt to register it again will fail
    - This provides database-level security for multi-tenant data isolation
*/

-- Add unique constraint to fontes column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fontes_fontes_unique'
  ) THEN
    ALTER TABLE "Fontes" ADD CONSTRAINT fontes_fontes_unique UNIQUE (fontes);
  END IF;
END $$;
