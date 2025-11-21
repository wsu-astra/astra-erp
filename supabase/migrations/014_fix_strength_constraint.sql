-- Fix the strength constraint issue
-- Change 'strong' to 'shiftleader' and recreate constraint

-- Drop the existing constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_strength_check;

-- Add the correct constraint with 'shiftleader' instead of 'strong'
ALTER TABLE profiles ADD CONSTRAINT profiles_strength_check 
    CHECK (strength IN ('shiftleader', 'normal', 'new') OR strength IS NULL);

-- Update any existing 'strong' or 'manager' values to 'shiftleader'
UPDATE profiles SET strength = 'shiftleader' WHERE strength IN ('strong', 'manager');

-- Update any other invalid values to 'normal'
UPDATE profiles SET strength = 'normal' WHERE strength IS NOT NULL AND strength NOT IN ('shiftleader', 'normal', 'new');