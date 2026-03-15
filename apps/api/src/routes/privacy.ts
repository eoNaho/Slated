import { Elysia, t } from "elysia";
import {
  db,
  user,
  reviews,
  lists,
  diary,
  watchlist,
  likes,
  follows,
  activities,
  comments,
  subscriptions,
  eq,
} from "../db";
import { betterAuthPlugin } from "../lib/auth";
import { emailService } from "../services/email";
import { redis, isRedisConfigured } from "../lib/redis";
import crypto from "crypto";

const generateToken = () => crypto.randomBytes(32).toString("hex");

export const privacyRoutes = new Elysia({ prefix: "/privacy", tags: ["Privacy"] })
  .use(betterAuthPlugin)

  // Export all personal data (GDPR/CCPA data portability)
  .get("/export", async (ctx: any) => {
    const { user: authUser } = ctx;

    const [userData] = await db.select().from(user).where(eq(user.id, authUser.id));

    const [userReviews, userLists, userDiary, userWatchlist, userComments, userLikes, userFollowing, userFollowers, userActivities, userSubscriptions] =
      await Promise.all([
        db.select().from(reviews).where(eq(reviews.userId, authUser.id)),
        db.select().from(lists).where(eq(lists.userId, authUser.id)),
        db.select().from(diary).where(eq(diary.userId, authUser.id)),
        db.select().from(watchlist).where(eq(watchlist.userId, authUser.id)),
        db.select().from(comments).where(eq(comments.userId, authUser.id)),
        db.select().from(likes).where(eq(likes.userId, authUser.id)),
        db.select().from(follows).where(eq(follows.followerId, authUser.id)),
        db.select().from(follows).where(eq(follows.followingId, authUser.id)),
        db.select().from(activities).where(eq(activities.userId, authUser.id)),
        db.select().from(subscriptions).where(eq(subscriptions.userId, authUser.id)),
      ]);

    return {
      exportDate: new Date().toISOString(),
      dataController: "PixelReel",
      legalBasis: "GDPR Art. 20 / CCPA - Data Portability",
      user: {
        profile: {
          id: userData.id,
          username: userData.username,
          email: userData.email,
          displayName: userData.displayName,
          bio: userData.bio,
          avatarUrl: userData.avatarUrl,
          coverUrl: userData.coverUrl,
          location: userData.location,
          website: userData.website,
          isVerified: userData.isVerified,
          isPremium: userData.isPremium,
          createdAt: userData.createdAt,
        },
        content: {
          reviews: userReviews,
          lists: userLists,
          diary: userDiary,
          watchlist: userWatchlist,
          comments: userComments,
        },
        social: {
          likes: userLikes,
          following: userFollowing.length,
          followers: userFollowers.length,
        },
        activity: userActivities,
        subscriptions: userSubscriptions,
      },
    };
  }, { requireAuth: true })

  // Request account deletion (sends confirmation email)
  .post("/request-deletion", async (ctx: any) => {
    const { user: authUser, set } = ctx;

    const [userData] = await db.select().from(user).where(eq(user.id, authUser.id));
    if (!userData?.email) {
      set.status = 400;
      return { error: "No email associated with account" };
    }

    const token = generateToken();

    if (isRedisConfigured()) {
      await redis.setex(
        `account_deletion:${token}`,
        86400,
        JSON.stringify({ userId: userData.id })
      );
    }

    await emailService.sendAccountDeletionConfirmation(userData.email, token);

    return {
      success: true,
      message: "Confirmation email sent. Check your inbox to confirm deletion.",
    };
  }, { requireAuth: true })

  // Confirm and execute account deletion (via token from email)
  .delete(
    "/confirm-deletion",
    async ({ query, set }: any) => {
      const { token } = query;

      if (!isRedisConfigured()) {
        set.status = 500;
        return { error: "Service unavailable" };
      }

      const data = await redis.get(`account_deletion:${token}`);
      if (!data) {
        set.status = 400;
        return { error: "Invalid or expired token" };
      }

      const { userId } = JSON.parse(data as string);

      try {
        const [deletedUser] = await db
          .delete(user)
          .where(eq(user.id, userId))
          .returning();

        await redis.del(`account_deletion:${token}`);

        if (!deletedUser) {
          set.status = 404;
          return { error: "User not found" };
        }

        return {
          success: true,
          message: "Account and all associated data permanently deleted.",
          deletedAt: new Date().toISOString(),
        };
      } catch (e: any) {
        set.status = 500;
        return { error: "Failed to delete account", details: e.message };
      }
    },
    { query: t.Object({ token: t.String() }) }
  )

  // Get data processing consent status
  .get("/consent", async (ctx: any) => {
    return {
      dataProcessing: true,
      marketing: false,
      analytics: true,
      thirdParty: false,
      lastUpdated: new Date().toISOString(),
    };
  }, { requireAuth: true });
