/*
  # Disable automatic profile creation trigger
  
  1. Changes
    - Drop the trigger that automatically creates profiles
    - Edge function will handle profile creation manually with proper privileges
  
  2. Security
    - Profiles will be created explicitly by the create-user edge function
    - This gives us full control over the creation process
*/

-- Drop the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function (we'll create profiles manually in edge function)
DROP FUNCTION IF EXISTS public.handle_new_user();