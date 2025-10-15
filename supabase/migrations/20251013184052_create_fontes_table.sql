/*
  # Create Fontes table for source mapping

  1. New Tables
    - `Fontes`
      - `id` (uuid, primary key)
      - `fontes` (text, phone number or source identifier, unique)
      - `nome` (text, custom display name for the source)
      - `created_at` (timestamp with timezone)
      - `updated_at` (timestamp with timezone)

  2. Security
    - Enable RLS on `Fontes` table
    - Add policies for authenticated users to read, insert, update, and delete source mappings

  3. Indexes
    - Unique index on fontes column to prevent duplicate source identifiers

  4. Triggers
    - Trigger to automatically update updated_at timestamp
*/

CREATE TABLE IF NOT EXISTS "Fontes" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fontes text NOT NULL,
  nome text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE "Fontes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read source mappings"
  ON "Fontes"
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert source mappings"
  ON "Fontes"
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update source mappings"
  ON "Fontes"
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete source mappings"
  ON "Fontes"
  FOR DELETE
  TO authenticated
  USING (true);

CREATE UNIQUE INDEX IF NOT EXISTS "Fontes_fontes_unique" ON "Fontes" (fontes);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    CREATE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
        NEW.updated_at = now();
        RETURN NEW;
    END;
    $func$ language 'plpgsql';
  END IF;
END $$;

CREATE TRIGGER update_fontes_updated_at
    BEFORE UPDATE ON "Fontes"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
