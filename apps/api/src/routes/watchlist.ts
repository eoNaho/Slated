import { Elysia } from "elysia";
import { db, watchlist, media, eq, and, desc, count } from "../db";
import { betterAuthPlugin } from "../lib/auth";
import { PaginationQuery, MediaIdParam, AddWatchlistBody } from "@pixelreel/validators";

export const watchlistRoutes = new Elysia({ prefix: "/watchlist", tags: ["Social"] })
  .use(betterAuthPlugin)

  // Get user's watchlist
  .get(
    "/",
    async (ctx: any) => {
      const { user, query } = ctx;

      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 100);
      const offset = (page - 1) * limit;

      const results = await db
        .select({
          item: watchlist,
          media: {
            id: media.id,
            title: media.title,
            posterPath: media.posterPath,
            releaseDate: media.releaseDate,
            type: media.type,
            voteAverage: media.voteAverage,
          },
        })
        .from(watchlist)
        .innerJoin(media, eq(watchlist.mediaId, media.id))
        .where(eq(watchlist.userId, user.id))
        .orderBy(desc(watchlist.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ total }] = await db
        .select({ total: count() })
        .from(watchlist)
        .where(eq(watchlist.userId, user.id));

      return {
        data: results.map((r) => ({ ...r.item, media: r.media })),
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
      query: PaginationQuery,
    }
  )

  // Add to watchlist
  .post(
    "/",
    async (ctx: any) => {
      const { user, body, set } = ctx;

      try {
        const [newItem] = await db
          .insert(watchlist)
          .values({
            userId: user.id,
            mediaId: body.media_id,
            priority: "medium",
          })
          .returning();

        return { data: newItem };
      } catch (e: any) {
        if (e.code === "23505") {
          set.status = 400;
          return { error: "Already in watchlist" };
        }
        throw e;
      }
    },
    {
      requireAuth: true,
      body: AddWatchlistBody,
    }
  )

  // Remove from watchlist
  .delete(
    "/:mediaId",
    async (ctx: any) => {
      const { user, params } = ctx;

      await db
        .delete(watchlist)
        .where(
          and(
            eq(watchlist.userId, user.id),
            eq(watchlist.mediaId, params.mediaId)
          )
        );

      return { success: true, message: "Removed from watchlist" };
    },
    {
      requireAuth: true,
      params: MediaIdParam,
    }
  );
