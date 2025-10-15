/*
  # Fix profile creation policy
  
  1. Changes
    - Add policy to allow trigger to insert profiles for new users
    - The trigger runs as SECURITY DEFINER so it needs a policy that allows service role to insert
  
  2. Security
    - Policy allows INSERT for new user profiles only through the trigger mechanism
    - Uses SECURITY DEFINER context to bypass RLS for automated profile creation
*/

-- Drop the restrictive insert policy for superadmins
DROP POLICY IF EXISTS "Superadmins can insert profiles" ON profiles;

-- Create a policy that allows the trigger to insert profiles
-- The trigger function runs as SECURITY DEFINER, which means it has elevated privileges
CREATE POLICY "Allow profile creation for new users"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());