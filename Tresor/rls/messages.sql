-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- SELECT messages
CREATE POLICY "Users can read their messages"
ON messages
FOR SELECT
USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);

-- INSERT messages
CREATE POLICY "Users can send messages"
ON messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
);
