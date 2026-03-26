-- Performance indexes for frequently filtered columns
-- HIGH PRIORITY: columns used in admin stats, reports, subscriptions

-- user table: role, created_at, last_active_at (all used in admin stats counts)
CREATE INDEX IF NOT EXISTS idx_user_role ON "user"(role);
CREATE INDEX IF NOT EXISTS idx_user_created_at ON "user"(created_at);
CREATE INDEX IF NOT EXISTS idx_user_last_active_at ON "user"(last_active_at);

-- reports: reporter_id and (target_type, target_id) composite
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);

-- subscriptions: status (used in admin at-risk and stats queries)
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- diary: media_id (used in joins for stats and discover routes)
CREATE INDEX IF NOT EXISTS idx_diary_media_id ON diary(media_id);

-- list_items: media_id (used in media detail "appears in lists" queries)
CREATE INDEX IF NOT EXISTS idx_list_items_media_id ON list_items(media_id);

-- MEDIUM PRIORITY
CREATE INDEX IF NOT EXISTS idx_lists_is_public ON lists(is_public);
CREATE INDEX IF NOT EXISTS idx_club_post_comments_user_id ON club_post_comments(user_id);
