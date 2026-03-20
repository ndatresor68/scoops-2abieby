-- Enable RLS
ALTER TABLE utilisateurs ENABLE ROW LEVEL SECURITY;

-- Allow read users
CREATE POLICY "Users can read users"
ON utilisateurs
FOR SELECT
USING (true);
