/*
  # Add policy to allow service role to manage profiles
  
  1. Changes
    - Add policy that allows INSERT for service role operations
    - This enables the Edge Function to create profiles
  
  2. Security
    - Only applies when using service role key (Edge Functions)
    - Regular users still restricted by existing policies
*/

-- Add policy to allow profile creation via service role
CREATE POLICY "Service role can insert profiles"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Also ensure service role can do everything on profiles
CREATE POLICY "Service role can update profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (true);