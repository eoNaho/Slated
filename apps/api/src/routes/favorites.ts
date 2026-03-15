import { Elysia, t } from "elysia";
import { db, favorites, media, user as userTable, eq, and, asc, count, sql } from "../db";
import { gt, gte } from "drizzle-orm";
import { betterAuthPlugin } from "../lib/auth";
import { storageService } from "../services/storage";

const MAX_FAVORITES_FREE = 4;
const MAX_FAVORITES_PREMIUM = 10;

function resolveImageUrl(path: string | null): string | null {
  if (!path) return null;
  return storageService.getImageUrl(path);
}

export const favoritesRoutes = new Elysia({ prefix: "/favorites" })
  .use(betterAuthPlugin)

  // Get my favorites
  .get("/", async (ctx: any) => {
    const { user } = ctx;
    const results = await db
      .select({
        favorite: favorites,
        media: {
          id: media.id,
          title: media.title,
          posterPath: media.posterPath,
          releaseDate: media.releaseDate,
          type: media.type,
          voteAverage: media.voteAverage,
        },
      })
      .from(favorites)
      .innerJoin(media, eq(favorites.mediaId, media.id))
      .where(eq(favorites.userId, user.id))
      .orderBy(asc(favorites.position));

    return {
      data: results.map((r) => ({
        ...r.favorite,
        media: {
          ...r.media,
          posterPath: resolveImageUrl(r.media.posterPath),
        },
      })),
    };
  }, { requireAuth: true })

  // Get user's favorites (public)
  .get(
    "/user/:username",
    async ({ params, set }: any) => {
      const [targetUser] = await db
        .select({ id: userTable.id })
        .from(userTable)
        .where(eq(userTable.username, params.username))
        .limit(1);

      if (!targetUser) {
        set.status = 404;
        return { error: "User not found" };
      }

      const results = await db
        .select({
          favorite: favorites,
          media: {
            id: media.id,
            title: media.title,
            posterPath: media.posterPath,
            releaseDate: media.releaseDate,
            type: media.type,
            voteAverage: media.voteAverage,
          },
        })
        .from(favorites)
        .innerJoin(media, eq(favorites.mediaId, media.id))
        .where(eq(favorites.userId, targetUser.id))
        .orderBy(asc(favorites.position));

      return {
        data: results.map((r) => ({
          ...r.favorite,
          media: {
            ...r.media,
            posterPath: resolveImageUrl(r.media.posterPath),
          },
        })),
      };
    },
    { params: t.Object({ username: t.String() }) }
  )

  // Add favorite
  .post(
    "/",
    async (ctx: any) => {
      const { user, body, set } = ctx;
      // Check user premium status
      const [userData] = await db
        .select({ isPremium: userTable.isPremium })
        .from(userTable)
        .where(eq(userTable.id, user.id))
        .limit(1);

      const maxFavorites = userData?.isPremium
        ? MAX_FAVORITES_PREMIUM
        : MAX_FAVORITES_FREE;

      // Check current favorites count
      const [{ total }] = await db
        .select({ total: count() })
        .from(favorites)
        .where(eq(favorites.userId, user.id));

      if (total >= maxFavorites) {
        set.status = 400;
        return {
          error: `Maximum ${maxFavorites} favorites allowed. ${
            !userData?.isPremium ? "Upgrade to Premium for more!" : ""
          }`,
        };
      }

      // Position is next available or specified
      let position = body.position;
      if (!position || position > total + 1) {
        position = total + 1;
      }

      // If position is taken, shift existing items up to make room
      if (position <= total) {
        await db
          .update(favorites)
          .set({ position: sql`${favorites.position} + 1` })
          .where(
            and(
              eq(favorites.userId, user.id),
              gte(favorites.position, position)
            )
          );
      }

      try {
        const [newFavorite] = await db
          .insert(favorites)
          .values({
            userId: user.id,
            mediaId: body.mediaId,
            position,
          })
          .returning();

        return { data: newFavorite };
      } catch (e: any) {
        if (e.code === "23505") {
          set.status = 400;
          return { error: "Already in favorites" };
        }
        throw e;
      }
    },
    {
      requireAuth: true,
      body: t.Object({
        mediaId: t.String(),
        position: t.Optional(t.Number({ minimum: 1, maximum: 10 })),
      }),
    }
  )

  // Reorder favorites
  .put(
    "/reorder",
    async (ctx: any) => {
      const { user, body } = ctx;
      for (const item of body.order) {
        await db
          .update(favorites)
          .set({ position: item.position })
          .where(
            and(
              eq(favorites.userId, user.id),
              eq(favorites.mediaId, item.mediaId)
            )
          );
      }

      return { success: true, message: "Favorites reordered" };
    },
    {
      requireAuth: true,
      body: t.Object({
        order: t.Array(
          t.Object({
            mediaId: t.String(),
            position: t.Number({ minimum: 1 }),
          })
        ),
      }),
    }
  )

  // Remove favorite
  .delete(
    "/:mediaId",
    async (ctx: any) => {
      const { user, params } = ctx;
      const [removed] = await db
        .select({ position: favorites.position })
        .from(favorites)
        .where(
          and(
            eq(favorites.userId, user.id),
            eq(favorites.mediaId, params.mediaId)
          )
        )
        .limit(1);

      if (!removed) {
        return { success: true, message: "Not in favorites" };
      }

      await db
        .delete(favorites)
        .where(
          and(
            eq(favorites.userId, user.id),
            eq(favorites.mediaId, params.mediaId)
          )
        );

      // Shift positions of remaining favorites down
      await db
        .update(favorites)
        .set({ position: sql`${favorites.position} - 1` })
        .where(
          and(
            eq(favorites.userId, user.id),
            gt(favorites.position, removed.position)
          )
        );

      return { success: true, message: "Removed from favorites" };
    },
    {
      requireAuth: true,
      params: t.Object({ mediaId: t.String() }),
    }
  );
