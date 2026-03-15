import { Elysia, t } from "elysia";
import { db, diary, media, eq, and, desc, count } from "../db";
import { betterAuthPlugin } from "../lib/auth";

export const diaryRoutes = new Elysia({ prefix: "/diary", tags: ["Social"] })
  .use(betterAuthPlugin)

  // Get user's diary
  .get(
    "/",
    async (ctx: any) => {
      const { user, query } = ctx;

      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 100);
      const offset = (page - 1) * limit;

      const results = await db
        .select({
          entry: diary,
          media: {
            id: media.id,
            title: media.title,
            posterPath: media.posterPath,
            releaseDate: media.releaseDate,
            type: media.type,
          },
        })
        .from(diary)
        .innerJoin(media, eq(diary.mediaId, media.id))
        .where(eq(diary.userId, user.id))
        .orderBy(desc(diary.watchedAt))
        .limit(limit)
        .offset(offset);

      const [{ total }] = await db
        .select({ total: count() })
        .from(diary)
        .where(eq(diary.userId, user.id));

      return {
        data: results.map((r) => ({ ...r.entry, media: r.media })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1,
      };
    },
    {
      requireAuth: true,
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )

  // Log new entry
  .post(
    "/",
    async (ctx: any) => {
      const { user, body } = ctx;

      const [newEntry] = await db
        .insert(diary)
        .values({
          userId: user.id,
          mediaId: body.media_id,
          watchedAt: body.watched_at || new Date().toISOString().split("T")[0],
          rating: body.rating,
          isRewatch: body.is_rewatch ?? false,
          notes: body.notes,
        })
        .returning();

      // Note: User stats updated by trigger 'update_user_stats_on_watch'

      return { data: newEntry };
    },
    {
      requireAuth: true,
      body: t.Object({
        media_id: t.String(),
        watched_at: t.Optional(t.String()), // YYYY-MM-DD
        rating: t.Optional(t.Number({ minimum: 0.5, maximum: 5 })),
        is_rewatch: t.Optional(t.Boolean()),
        notes: t.Optional(t.String()),
      }),
    }
  );
