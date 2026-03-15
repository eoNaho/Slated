-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaming_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_streaming ENABLE ROW LEVEL SECURITY;

-- USERS
CREATE POLICY "Users are viewable by everyone" ON users FOR SELECT USING (status = 'active');
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- USER SETTINGS
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- USER SOCIAL LINKS
CREATE POLICY "Social links are viewable by everyone" ON user_social_links FOR SELECT USING (true);
CREATE POLICY "Users can update own social links" ON user_social_links FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own social links" ON user_social_links FOR INSERT WITH CHECK (auth.uid() = user_id);

-- MEDIA (Public read)
CREATE POLICY "Media is viewable by everyone" ON media FOR SELECT USING (true);
-- Generic service role policy for media management (if needed outside of direct DB access)
-- Note: Service Role bypasses RLS, but explicit policy helps documentation

-- GENRES & PEOPLE (Public read)
CREATE POLICY "Genres are viewable by everyone" ON genres FOR SELECT USING (true);
CREATE POLICY "Media genres are viewable by everyone" ON media_genres FOR SELECT USING (true);
CREATE POLICY "People are viewable by everyone" ON people FOR SELECT USING (true);
CREATE POLICY "Credits are viewable by everyone" ON media_credits FOR SELECT USING (true);

-- REVIEWS
CREATE POLICY "Reviews are viewable by everyone" ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can insert own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON reviews FOR DELETE USING (auth.uid() = user_id);

-- LISTS
CREATE POLICY "Public lists are viewable by everyone" ON lists FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users can insert own lists" ON lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lists" ON lists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own lists" ON lists FOR DELETE USING (auth.uid() = user_id);

-- LIST ITEMS
CREATE POLICY "List items follow list visibility" ON list_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM lists WHERE lists.id = list_items.list_id AND (lists.is_public = true OR lists.user_id = auth.uid()))
);
CREATE POLICY "Users can manage own list items" ON list_items FOR ALL USING (
  EXISTS (SELECT 1 FROM lists WHERE lists.id = list_items.list_id AND lists.user_id = auth.uid())
);

-- WATCHLIST
CREATE POLICY "Users can view own watchlist" ON watchlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own watchlist" ON watchlist FOR ALL USING (auth.uid() = user_id);

-- DIARY
CREATE POLICY "Diary entries are viewable by everyone" ON diary FOR SELECT USING (true);
CREATE POLICY "Users can manage own diary" ON diary FOR ALL USING (auth.uid() = user_id);

-- FOLLOWS
CREATE POLICY "Follows are viewable by everyone" ON follows FOR SELECT USING (true);
CREATE POLICY "Users can follow others" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON follows FOR DELETE USING (auth.uid() = follower_id);

-- LIKES
CREATE POLICY "Likes are viewable by everyone" ON likes FOR SELECT USING (true);
CREATE POLICY "Users can manage own likes" ON likes FOR ALL USING (auth.uid() = user_id);

-- COMMENTS
CREATE POLICY "Comments are viewable by everyone" ON comments FOR SELECT USING (true);
CREATE POLICY "Users can insert comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = user_id);

-- ACTIVITIES
CREATE POLICY "Activities are viewable by everyone" ON activities FOR SELECT USING (true);

-- GAMIFICATION
CREATE POLICY "Achievements are viewable by everyone" ON achievements FOR SELECT USING (true);
CREATE POLICY "User achievements are viewable by everyone" ON user_achievements FOR SELECT USING (true);
CREATE POLICY "User stats are viewable by everyone" ON user_stats FOR SELECT USING (true);
CREATE POLICY "XP activities are viewable by owner" ON xp_activities FOR SELECT USING (auth.uid() = user_id);

-- PREMIUM & SUBSCRIPTIONS
CREATE POLICY "Plans are viewable by everyone" ON plans FOR SELECT USING (is_active = true);
CREATE POLICY "Users can view own subscriptions" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own payments" ON payments FOR SELECT USING (auth.uid() = user_id);

-- REPORTS
CREATE POLICY "Users can insert reports" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can view own reports" ON reports FOR SELECT USING (auth.uid() = reporter_id);

-- TAGS & STREAMING
CREATE POLICY "Tags are viewable by everyone" ON tags FOR SELECT USING (true);
CREATE POLICY "Streaming services are viewable by everyone" ON streaming_services FOR SELECT USING (true);
CREATE POLICY "Media streaming is viewable by everyone" ON media_streaming FOR SELECT USING (true);

-- ================================================
-- FUNCTIONS & TRIGGERS
-- ================================================

-- Function to increment likes count
CREATE OR REPLACE FUNCTION increment_likes(table_name text, row_id uuid)
RETURNS void AS $$
BEGIN
  EXECUTE format('UPDATE %I SET likes_count = likes_count + 1 WHERE id = $1', table_name)
  USING row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement likes count
CREATE OR REPLACE FUNCTION decrement_likes(table_name text, row_id uuid)
RETURNS void AS $$
BEGIN
  EXECUTE format('UPDATE %I SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1', table_name)
  USING row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user stats after watching
CREATE OR REPLACE FUNCTION update_user_stats_on_watch()
RETURNS TRIGGER AS $$
DECLARE
  media_type text;
  media_runtime integer;
BEGIN
  SELECT type, runtime INTO media_type, media_runtime FROM media WHERE id = NEW.media_id;
  IF media_type = 'movie' THEN
    UPDATE user_stats SET 
      movies_watched = movies_watched + 1,
      watch_time_mins = watch_time_mins + COALESCE(media_runtime, 0),
      updated_at = now()
    WHERE user_id = NEW.user_id;
  ELSE
    UPDATE user_stats SET 
      series_watched = series_watched + 1,
      updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_stats_on_watch
AFTER INSERT ON diary
FOR EACH ROW EXECUTE FUNCTION update_user_stats_on_watch();

-- Function to update follower counts
CREATE OR REPLACE FUNCTION update_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_stats SET following_count = following_count + 1, updated_at = now() WHERE user_id = NEW.follower_id;
    UPDATE user_stats SET followers_count = followers_count + 1, updated_at = now() WHERE user_id = NEW.following_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_stats SET following_count = GREATEST(following_count - 1, 0), updated_at = now() WHERE user_id = OLD.follower_id;
    UPDATE user_stats SET followers_count = GREATEST(followers_count - 1, 0), updated_at = now() WHERE user_id = OLD.following_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_follower_counts
AFTER INSERT OR DELETE ON follows
FOR EACH ROW EXECUTE FUNCTION update_follower_counts();

-- Function to create user profile and stats on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, username, display_name, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    now()
  );
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id);
  INSERT INTO public.user_stats (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- XP Calculation
CREATE OR REPLACE FUNCTION calculate_level(xp_amount integer)
RETURNS integer AS $$
BEGIN
  RETURN FLOOR(SQRT(xp_amount::float / 100)) + 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION add_user_xp(p_user_id uuid, p_xp_amount integer, p_type text, p_description text DEFAULT NULL)
RETURNS TABLE(new_xp integer, new_level integer, leveled_up boolean) AS $$
DECLARE
  old_level integer;
  updated_xp integer;
  updated_level integer;
BEGIN
  SELECT level INTO old_level FROM user_stats WHERE user_id = p_user_id;

  UPDATE user_stats
  SET xp = xp + p_xp_amount, level = calculate_level(xp + p_xp_amount), updated_at = now()
  WHERE user_id = p_user_id
  RETURNING xp, level INTO updated_xp, updated_level;

  INSERT INTO xp_activities (user_id, type, xp_gained, description)
  VALUES (p_user_id, p_type, p_xp_amount, p_description);

  RETURN QUERY SELECT updated_xp, updated_level, (updated_level > old_level);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- INITIAL DATA
-- ================================================

INSERT INTO plans (name, slug, description, price_monthly, price_yearly, features, limits, is_active)
VALUES 
(
  'Free', 'free', 'Basic features for movie lovers', 0, 0,
  '["Unlimited watchlist", "Track watched movies", "Write reviews", "Create up to 5 lists"]',
  '{"lists": 5, "exports": false, "themes": false}', true
),
(
  'Pro', 'pro', 'For serious cinephiles', 4.99, 49.99,
  '["Unlimited lists", "Advanced statistics", "Export data", "Custom themes", "Priority support", "Early access to features"]',
  '{"lists": -1, "exports": true, "themes": true}', true
)
ON CONFLICT (slug) DO NOTHING;
