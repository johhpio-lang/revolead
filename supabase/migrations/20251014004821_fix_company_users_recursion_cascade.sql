/*
  # Fix infinite recursion in company_users policies

  1. Changes
    - Replace is_company_admin function with proper security context
    - Use CREATE OR REPLACE to update function without dropping policies
  
  2. Security
    - Function is SECURITY DEFINER which means it runs with owner privileges
    - This allows it to bypass RLS policies and avoid recursion
*/

-- Replace function with one that properly handles RLS
CREATE OR REPLACE FUNCTION is_company_admin(check_company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result boolean;
BEGIN
  -- Query directly without triggering RLS recursion
  -- SECURITY DEFINER allows this to work
  SELECT EXISTS (
    SELECT 1 
    FROM company_users 
    WHERE user_id = auth.uid() 
      AND company_id = check_company_id 
      AND role = 'admin'
  ) INTO result;
  
  RETURN COALESCE(result, false);
END;
$$;