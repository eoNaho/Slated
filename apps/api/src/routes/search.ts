import { Elysia, t } from "elysia";
import { db, user, media, lists, ilike, or, desc, count, and, eq } from "../db";

export const searchRoutes = new Elysia({ prefix: "/search", tags: ["Media"] })

  // Unified search
  .get(
    "/",
    async ({ query }) => {
      const q = query.q || "";
      const type = query.type as
        | "all"
        | "media"
        | "users"
        | "lists"
        | undefined;
      const limit = Math.min(Number(query.limit) || 10, 50);

      const results: any = {};

      // Search media
      if (!type || type === "all" || type === "media") {
        const mediaResults = await db
          .select({
            id: media.id,
            title: media.title,
            type: media.type,
            posterPath: media.posterPath,
            releaseDate: media.releaseDate,
            voteAverage: media.voteAverage,
          })
          .from(media)
          .where(
            or(
              ilike(media.title, `%${q}%`),
              ilike(media.originalTitle, `%${q}%`)
            )
          )
          .orderBy(desc(media.popularity))
          .limit(limit);

        results.media = mediaResults;
      }

      // Search users
      if (!type || type === "all" || type === "users") {
        const userResults = await db
          .select({
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            isVerified: user.isVerified,
          })
          .from(user)
          .where(
            or(
              ilike(user.username, `%${q}%`),
              ilike(user.displayName, `%${q}%`)
            )
          )
          .limit(limit);

        results.users = userResults;
      }

      // Search lists
      if (!type || type === "all" || type === "lists") {
        const listResults = await db
          .select({
            id: lists.id,
            name: lists.name,
            description: lists.description,
            itemsCount: lists.itemsCount,
            userId: lists.userId,
          })
          .from(lists)
          .where(and(ilike(lists.name, `%${q}%`), eq(lists.isPublic, true)))
          .limit(limit);

        results.lists = listResults;
      }

      return { query: q, results };
    },
    {
      query: t.Object({
        q: t.String(),
        type: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  );
