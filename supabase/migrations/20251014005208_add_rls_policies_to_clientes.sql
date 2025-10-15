/*
  # Add RLS policies to clientes table

  1. Changes
    - Enable RLS on clientes table
    - Add policies for authenticated users to view all clientes
    - Add policies for superadmins to manage clientes
  
  2. Security
    - RLS enabled to protect data
    - All authenticated users can read clientes (for now - can be restricted later)
    - Only superadmins can modify clientes
*/

-- Enable RLS on clientes table
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view clientes
CREATE POLICY "Authenticated users can view clientes"
  ON clientes
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Superadmins can insert clientes
CREATE POLICY "Superadmins can insert clientes"
  ON clientes
  FOR INSERT
  TO authenticated
  WITH CHECK (is_superadmin());

-- Policy: Superadmins can update clientes
CREATE POLICY "Superadmins can update clientes"
  ON clientes
  FOR UPDATE
  TO authenticated
  USING (is_superadmin())
  WITH CHECK (is_superadmin());

-- Policy: Superadmins can delete clientes
CREATE POLICY "Superadmins can delete clientes"
  ON clientes
  FOR DELETE
  TO authenticated
  USING (is_superadmin());

-- Policy: Service role bypass for system operations
CREATE POLICY "Service role bypass for clientes"
  ON clientes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);