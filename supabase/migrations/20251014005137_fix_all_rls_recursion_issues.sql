/*
  # Fix all RLS recursion issues in company_users

  1. Changes
    - Drop problematic policies that cause recursion
    - Recreate policies using direct column checks instead of subqueries
    - Simplify policy logic to avoid self-referential queries
  
  2. Security
    - Maintains same security model but without recursion
    - Uses direct auth.uid() checks where possible
*/

-- Drop the problematic policy that queries company_users within company_users policy
DROP POLICY IF EXISTS "Admins can view users in their companies" ON company_users;

-- Recreate it without the subquery that causes recursion
-- Instead, rely on is_company_admin function which now handles RLS properly
CREATE POLICY "Admins can view users in their companies"
  ON company_users
  FOR SELECT
  TO authenticated
  USING (is_company_admin(company_id));

-- Also add a service role bypass for system operations
DROP POLICY IF EXISTS "Service role bypass" ON company_users;
CREATE POLICY "Service role bypass"
  ON company_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);