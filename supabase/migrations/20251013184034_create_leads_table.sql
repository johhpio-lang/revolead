/*
  # Create Leads_teste2 table for lead management system

  1. New Tables
    - `Leads_teste2`
      - `id` (uuid, primary key)
      - `nome` (text, name of the lead)
      - `telefone` (text, phone number)
      - `qualificado` (boolean, whether lead is qualified)
      - `botativo` (boolean, whether bot is active)
      - `cliente` (text, client information)
      - `fonte` (text, source of the lead)
      - `created_at` (timestamp with timezone)
      - `updated_at` (timestamp with timezone)

  2. Security
    - Enable RLS on `Leads_teste2` table
    - Add policies for authenticated users to read, insert, update, and delete leads

  3. Indexes
    - Index on created_at for time-based queries
    - Index on qualificado for filtering qualified leads
    - Index on fonte for source-based filtering
*/

CREATE TABLE IF NOT EXISTS "Leads_teste2" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text,
  telefone text,
  qualificado boolean DEFAULT false,
  botativo boolean DEFAULT false,
  cliente text,
  fonte text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE "Leads_teste2" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all leads"
  ON "Leads_teste2"
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert leads"
  ON "Leads_teste2"
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update leads"
  ON "Leads_teste2"
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete leads"
  ON "Leads_teste2"
  FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_leads_teste2_created_at ON "Leads_teste2" (created_at);
CREATE INDEX IF NOT EXISTS idx_leads_teste2_qualificado ON "Leads_teste2" (qualificado);
CREATE INDEX IF NOT EXISTS idx_leads_teste2_fonte ON "Leads_teste2" (fonte);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leads_teste2_updated_at
    BEFORE UPDATE ON "Leads_teste2"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
