-- Migration: Sync all content table foreign keys to point to the new 'user' table
-- This fixes 'split brain' issues where new users (only in 'user' table) cannot create content

DO $$ 
BEGIN
    -- 1. Lists
    ALTER TABLE IF EXISTS "lists" DROP CONSTRAINT IF EXISTS "lists_user_id_users_id_fk";
    ALTER TABLE "lists" ADD CONSTRAINT "lists_user_id_user_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;

    -- 2. Reviews
    ALTER TABLE IF EXISTS "reviews" DROP CONSTRAINT IF EXISTS "reviews_user_id_users_id_fk";
    ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_user_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;

    -- 3. Watchlist
    ALTER TABLE IF EXISTS "watchlist" DROP CONSTRAINT IF EXISTS "watchlist_user_id_users_id_fk";
    ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_user_id_user_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;

    -- 4. Diary
    ALTER TABLE IF EXISTS "diary" DROP CONSTRAINT IF EXISTS "diary_user_id_users_id_fk";
    ALTER TABLE "diary" ADD CONSTRAINT "diary_user_id_user_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;

    -- 5. Activities
    ALTER TABLE IF EXISTS "activities" DROP CONSTRAINT IF EXISTS "activities_user_id_users_id_fk";
    ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_user_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;

    -- 6. Comments
    ALTER TABLE IF EXISTS "comments" DROP CONSTRAINT IF EXISTS "comments_user_id_users_id_fk";
    ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_user_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;

    -- 7. Follows (Follower)
    ALTER TABLE IF EXISTS "follows" DROP CONSTRAINT IF EXISTS "follows_follower_id_users_id_fk";
    ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_user_id_fk" 
        FOREIGN KEY ("follower_id") REFERENCES "user"("id") ON DELETE CASCADE;

    -- 8. Follows (Following)
    ALTER TABLE IF EXISTS "follows" DROP CONSTRAINT IF EXISTS "follows_following_id_users_id_fk";
    ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_user_id_fk" 
        FOREIGN KEY ("following_id") REFERENCES "user"("id") ON DELETE CASCADE;

    -- 9. Likes
    ALTER TABLE IF EXISTS "likes" DROP CONSTRAINT IF EXISTS "likes_user_id_users_id_fk";
    ALTER TABLE "likes" ADD CONSTRAINT "likes_user_id_user_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;

    -- 10. User Achievements
    ALTER TABLE IF EXISTS "user_achievements" DROP CONSTRAINT IF EXISTS "user_achievements_user_id_users_id_fk";
    ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_user_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;

    -- 11. User Stats
    ALTER TABLE IF EXISTS "user_stats" DROP CONSTRAINT IF EXISTS "user_stats_user_id_users_id_fk";
    ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_user_id_user_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;

    -- 12. XP Activities
    ALTER TABLE IF EXISTS "xp_activities" DROP CONSTRAINT IF EXISTS "xp_activities_user_id_users_id_fk";
    ALTER TABLE "xp_activities" ADD CONSTRAINT "xp_activities_user_id_user_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;

    -- 13. Payments
    ALTER TABLE IF EXISTS "payments" DROP CONSTRAINT IF EXISTS "payments_user_id_users_id_fk";
    ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_user_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;

    -- 14. Reports (Reporter)
    ALTER TABLE IF EXISTS "reports" DROP CONSTRAINT IF EXISTS "reports_reporter_id_users_id_fk";
    ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_user_id_fk" 
        FOREIGN KEY ("reporter_id") REFERENCES "user"("id") ON DELETE SET NULL;

    -- 15. Reports (Assigned To)
    ALTER TABLE IF EXISTS "reports" DROP CONSTRAINT IF EXISTS "reports_assigned_to_users_id_fk";
    ALTER TABLE "reports" ADD CONSTRAINT "reports_assigned_to_user_id_fk" 
        FOREIGN KEY ("assigned_to") REFERENCES "user"("id");

    -- 16. Reports (Resolved By)
    ALTER TABLE IF EXISTS "reports" DROP CONSTRAINT IF EXISTS "reports_resolved_by_users_id_fk";
    ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_user_id_fk" 
        FOREIGN KEY ("resolved_by") REFERENCES "user"("id");

    -- 17. Subscriptions
    ALTER TABLE IF EXISTS "subscriptions" DROP CONSTRAINT IF EXISTS "subscriptions_user_id_users_id_fk";
    ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_user_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;

    -- 18. User Settings
    ALTER TABLE IF EXISTS "user_settings" DROP CONSTRAINT IF EXISTS "user_settings_user_id_users_id_fk";
    ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_user_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;

    -- 19. User Social Links
    ALTER TABLE IF EXISTS "user_social_links" DROP CONSTRAINT IF EXISTS "user_social_links_user_id_users_id_fk";
    ALTER TABLE "user_social_links" ADD CONSTRAINT "user_social_links_user_id_user_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;

    -- 20. Final Cleanup: Drop the legacy 'users' table
    DROP TABLE IF EXISTS "users" CASCADE;

END $$;
