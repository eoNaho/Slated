-- ================================================
-- MESSAGING SYSTEM
-- ================================================

CREATE TABLE IF NOT EXISTS conversations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type             TEXT NOT NULL,                          -- 'dm' | 'group'
  name             TEXT,                                   -- NULL for 1:1
  avatar_url       TEXT,
  created_by       UUID REFERENCES "user"(id) ON DELETE SET NULL,
  last_message_at  TIMESTAMPTZ,
  last_message_preview TEXT,                              -- encrypted snippet
  message_count    INTEGER DEFAULT 0,
  is_encrypted     BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations (last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON conversations (created_by);

-- ------------------------------------------------

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role             TEXT DEFAULT 'member',                 -- 'admin' | 'member'
  nickname         TEXT,
  is_muted         BOOLEAN DEFAULT FALSE,
  muted_until      TIMESTAMPTZ,
  last_read_at     TIMESTAMPTZ,
  joined_at        TIMESTAMPTZ DEFAULT NOW(),
  left_at          TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants (user_id, left_at);
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv ON conversation_participants (conversation_id);

-- ------------------------------------------------

CREATE TABLE IF NOT EXISTS messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        UUID NOT NULL REFERENCES "user"(id) ON DELETE SET NULL,
  type             TEXT NOT NULL DEFAULT 'text',          -- 'text' | 'story_reply' | 'image' | 'system'
  content          TEXT NOT NULL,                         -- AES-256-GCM encrypted
  metadata         JSONB,                                 -- { storyId, storyType, storyContent, storyImageUrl, mediaUrl }
  reply_to_id      UUID REFERENCES messages(id) ON DELETE SET NULL,
  is_edited        BOOLEAN DEFAULT FALSE,
  edited_at        TIMESTAMPTZ,
  is_deleted       BOOLEAN DEFAULT FALSE,
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages (sender_id);

-- ------------------------------------------------

CREATE TABLE IF NOT EXISTS message_read_receipts (
  message_id  UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  read_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_read_receipts_message ON message_read_receipts (message_id);

-- ------------------------------------------------

CREATE TABLE IF NOT EXISTS conversation_invites (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  inviter_id       UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  invitee_id       UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  status           TEXT DEFAULT 'pending',                -- 'pending' | 'accepted' | 'declined'
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  responded_at     TIMESTAMPTZ,
  UNIQUE (conversation_id, invitee_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_invites_invitee ON conversation_invites (invitee_id, status);

-- ------------------------------------------------

CREATE TABLE IF NOT EXISTS dm_settings (
  user_id               UUID PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  allow_dms_from        TEXT DEFAULT 'followers',         -- 'everyone' | 'followers' | 'following' | 'mutual' | 'nobody'
  show_read_receipts    BOOLEAN DEFAULT TRUE,
  show_typing_indicator BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- ROW LEVEL SECURITY
-- ================================================

ALTER TABLE conversations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages                ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_invites    ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_settings             ENABLE ROW LEVEL SECURITY;

-- CONVERSATIONS
-- Only participants can see a conversation
CREATE POLICY "Participants can view their conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
        AND cp.left_at IS NULL
    )
  );

CREATE POLICY "Authenticated users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Participants can update group info"
  ON conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
        AND cp.role = 'admin'
        AND cp.left_at IS NULL
    )
  );

-- CONVERSATION PARTICIPANTS
CREATE POLICY "Participants can view conversation members"
  ON conversation_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversation_participants cp2
      WHERE cp2.conversation_id = conversation_participants.conversation_id
        AND cp2.user_id = auth.uid()
        AND cp2.left_at IS NULL
    )
  );

CREATE POLICY "Users can join conversations they are invited to"
  ON conversation_participants FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own participant record"
  ON conversation_participants FOR UPDATE
  USING (user_id = auth.uid());

-- MESSAGES
-- Only participants of the conversation can read messages
CREATE POLICY "Participants can view messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
        AND cp.left_at IS NULL
    )
  );

CREATE POLICY "Participants can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
        AND cp.left_at IS NULL
    )
  );

CREATE POLICY "Senders can edit their own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid());

-- MESSAGE READ RECEIPTS
CREATE POLICY "Participants can view read receipts"
  ON message_read_receipts FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_read_receipts.message_id
        AND cp.user_id = auth.uid()
        AND cp.left_at IS NULL
    )
  );

CREATE POLICY "Users can insert their own read receipts"
  ON message_read_receipts FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- CONVERSATION INVITES
CREATE POLICY "Inviter and invitee can view invites"
  ON conversation_invites FOR SELECT
  USING (inviter_id = auth.uid() OR invitee_id = auth.uid());

CREATE POLICY "Group admins can create invites"
  ON conversation_invites FOR INSERT
  WITH CHECK (
    inviter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_invites.conversation_id
        AND cp.user_id = auth.uid()
        AND cp.role = 'admin'
        AND cp.left_at IS NULL
    )
  );

CREATE POLICY "Invitee can respond to invites"
  ON conversation_invites FOR UPDATE
  USING (invitee_id = auth.uid());

-- DM SETTINGS
CREATE POLICY "Users can view own DM settings"
  ON dm_settings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own DM settings"
  ON dm_settings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own DM settings"
  ON dm_settings FOR UPDATE
  USING (user_id = auth.uid());
