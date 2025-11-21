-- Add strength field to profiles table
-- This allows us to track employee strength levels directly in the user profiles

-- Add strength column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS strength TEXT CHECK (strength IN ('strong','normal','new')) DEFAULT 'normal';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_strength ON profiles(strength);

-- Update existing profiles to have 'normal' strength if null
UPDATE profiles SET strength = 'normal' WHERE strength IS NULL;

COMMENT ON COLUMN profiles.strength IS 'Employee strength level: new = beginner, normal = regular, strong = experienced/skilled';