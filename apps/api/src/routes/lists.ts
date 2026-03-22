import { Elysia, t } from "elysia";
import {
  db,
  lists,
  listItems,
  media,
  user as userTable,
  activities,
  eq,
  and,
  desc,
  count,
  sql,
  inArray,
} from "../db";
import { betterAuthPlugin } from "../lib/auth";

export const listsRoutes = new Elysia({ prefix: "/lists", tags: ["Social"] })
  .use(betterAuthPlugin)

  // Get recent public lists
  .get(
    "/",
    async ({ query }) => {
      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = (page - 1) * limit;

      const conditions = [eq(lists.isPublic, true)];
      if (query.user_id) conditions.push(eq(lists.userId, query.user_id));
      const whereClause = and(...conditions);

      const results = await db
        .select({
          list: lists,
          user: {
            id: userTable.id,
            username: userTable.username,
            displayName: userTable.displayName,
            avatarUrl: userTable.avatarUrl,
          },
          isInList: query.membership_media_id
            ? sql<boolean>`EXISTS(SELECT 1 FROM ${listItems} WHERE ${listItems.listId} = ${lists.id} AND ${listItems.mediaId} = ${query.membership_media_id})`
            : sql<boolean>`false`,
        })
        .from(lists)
        .innerJoin(userTable, eq(lists.userId, userTable.id))
        .where(whereClause)
        .orderBy(desc(lists.createdAt))
        .limit(limit)
        .offset(offset);

      // Fetch cover images for all lists in a single batch query
      const listIds = results.map((r) => r.list.id);
      const coverImageRows = listIds.length > 0
        ? await db
            .select({ listId: listItems.listId, posterPath: media.posterPath, position: listItems.position })
            .from(listItems)
            .innerJoin(media, eq(listItems.mediaId, media.id))
            .where(inArray(listItems.listId, listIds))
            .orderBy(listItems.position)
        : [];

      // Group cover images by listId (keep top 5 per list)
      const coversByListId = new Map<string, string[]>();
      for (const row of coverImageRows) {
        if (!row.listId || !row.posterPath) continue;
        const arr = coversByListId.get(row.listId) ?? [];
        if (arr.length < 5) arr.push(row.posterPath);
        coversByListId.set(row.listId, arr);
      }

      const resultsWithImages = results.map((r) => ({
        ...r,
        coverImages: coversByListId.get(r.list.id) ?? [],
      }));

      const [{ total }] = await db
        .select({ total: count() })
        .from(lists)
        .where(whereClause);

      return {
        data: resultsWithImages.map((r) => ({
          ...r.list,
          user: r.user,
          isInList: r.isInList,
          coverImages: r.coverImages,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1,
      };
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        user_id: t.Optional(t.String()),
        membership_media_id: t.Optional(t.String()),
      }),
    },
  )

  // Get single list details
  .get(
    "/:id",
    async ({ params, set }) => {
      const [result] = await db
        .select({
          list: lists,
          user: {
            id: userTable.id,
            username: userTable.username,
            displayName: userTable.displayName,
            avatarUrl: userTable.avatarUrl,
          },
        })
        .from(lists)
        .innerJoin(userTable, eq(lists.userId, userTable.id))
        .where(eq(lists.id, params.id))
        .limit(1);

      if (!result) {
        set.status = 404;
        return { error: "List not found" };
      }

      // Get items
      const items = await db
        .select({
          item: listItems,
          media: {
            id: media.id,
            title: media.title,
            posterPath: media.posterPath,
            releaseDate: media.releaseDate,
            type: media.type,
          },
        })
        .from(listItems)
        .innerJoin(media, eq(listItems.mediaId, media.id))
        .where(eq(listItems.listId, params.id))
        .orderBy(listItems.position);

      return {
        data: {
          ...result.list,
          user: result.user,
          items: items.map((i) => ({ ...i.item, media: i.media })),
        },
      };
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  // Get list by username and slug
  .get(
    "/by-slug/:username/:slug",
    async ({ params, set }) => {
      const { username, slug } = params;

      const result = await db
        .select({
          list: lists,
          user: {
            id: userTable.id,
            username: userTable.username,
            displayName: userTable.displayName,
            avatarUrl: userTable.avatarUrl,
          },
        })
        .from(lists)
        .innerJoin(userTable, eq(lists.userId, userTable.id))
        .where(and(eq(userTable.username, username), eq(lists.slug, slug)))
        .limit(1)
        .then((res) => res[0]);

      if (!result) {
        set.status = 404;
        return { error: "List not found" };
      }

      // Fetch items
      const items = await db
        .select({
          item: listItems,
          media: media,
        })
        .from(listItems)
        .innerJoin(media, eq(listItems.mediaId, media.id))
        .where(eq(listItems.listId, result.list.id))
        .orderBy(listItems.position);

      return {
        data: {
          ...result.list,
          user: result.user,
          items: items.map((i) => ({ ...i.item, media: i.media })),
        },
      };
    },
    {
      params: t.Object({
        username: t.String(),
        slug: t.String(),
      }),
    },
  )

  // Create list
  .post(
    "/",
    async (ctx: any) => {
      const { user, body } = ctx;

      // Generate a URL-friendly slug from the name
      const baseSlug = body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");

      // Append a timestamp or random string to ensure it's unique
      const uniqueSlug = `${baseSlug}-${Date.now()}`;

      const [newList] = await db
        .insert(lists)
        .values({
          userId: user.id,
          name: body.name,
          slug: uniqueSlug,
          description: body.description,
          isPublic: body.is_public ?? true,
          isRanked: body.is_ranked ?? false,
        })
        .returning();

      // If initial items provided, add them
      if (body.item_ids && body.item_ids.length > 0) {
        const itemValues = body.item_ids.map((mediaId: string, index: number) => ({
          listId: newList.id,
          mediaId,
          position: index,
        }));
        await db.insert(listItems).values(itemValues);
        
        // Update items count
        await db
          .update(lists)
          .set({ itemsCount: body.item_ids.length })
          .where(eq(lists.id, newList.id));
      }

      // Create activity
      await db.insert(activities).values({
        userId: user.id,
        type: "list",
        targetType: "list",
        targetId: newList.id,
        metadata: JSON.stringify({ 
          name: newList.name,
          slug: newList.slug,
          username: user.username 
        }),
      });

      return { data: newList };
    },
    {
      requireAuth: true,
      body: t.Object({
        name: t.String({ minLength: 3 }),
        description: t.Optional(t.String()),
        is_public: t.Optional(t.Boolean()),
        is_ranked: t.Optional(t.Boolean()),
        item_ids: t.Optional(t.Array(t.String())),
      }),
    },
  )

  // Update list
  .patch(
    "/:id",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      const [existing] = await db
        .select()
        .from(lists)
        .where(eq(lists.id, params.id))
        .limit(1);

      if (!existing) {
        set.status = 404;
        return { error: "List not found" };
      }

      if (existing.userId !== user.id) {
        set.status = 403;
        return { error: "You can only edit your own lists" };
      }

      const [updated] = await db
        .update(lists)
        .set({
          name: body.name ?? existing.name,
          description: body.description ?? existing.description,
          isPublic: body.is_public ?? existing.isPublic,
          isRanked: body.is_ranked ?? existing.isRanked,
          updatedAt: new Date(),
        })
        .where(eq(lists.id, params.id))
        .returning();

      return { data: updated };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 3 })),
        description: t.Optional(t.String()),
        is_public: t.Optional(t.Boolean()),
        is_ranked: t.Optional(t.Boolean()),
      }),
    },
  )

  // Delete list
  .delete(
    "/:id",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      const [existing] = await db
        .select()
        .from(lists)
        .where(eq(lists.id, params.id))
        .limit(1);

      if (!existing) {
        set.status = 404;
        return { error: "List not found" };
      }

      if (existing.userId !== user.id) {
        set.status = 403;
        return { error: "You can only delete your own lists" };
      }

      await db.delete(lists).where(eq(lists.id, params.id));

      set.status = 204;
      return null;
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
    },
  )

  // Add item to list
  .post(
    "/:id/items",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      // Check ownership
      const [list] = await db
        .select()
        .from(lists)
        .where(eq(lists.id, params.id))
        .limit(1);

      if (!list) {
        set.status = 404;
        return { error: "List not found" };
      }

      if (list.userId !== user.id) {
        set.status = 403;
        return { error: "You can only edit your own lists" };
      }

      // Add item
      try {
        // Get current max position
        const [{ maxPos }] = await db
          .select({
            maxPos: sql<number>`COALESCE(MAX(${listItems.position}), 0)`,
          })
          .from(listItems)
          .where(eq(listItems.listId, params.id));

        const [newItem] = await db
          .insert(listItems)
          .values({
            listId: params.id,
            mediaId: body.media_id,
            position: maxPos + 1,
            note: body.note,
          })
          .returning();

        // Update list items count
        await db
          .update(lists)
          .set({ itemsCount: sql`${lists.itemsCount} + 1` })
          .where(eq(lists.id, params.id));

        return { data: newItem };
      } catch (e: any) {
        if (e.code === "23505") {
          set.status = 400;
          return { error: "Item already in list" };
        }
        throw e;
      }
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        media_id: t.String(),
        note: t.Optional(t.String()),
      }),
    },
  )

  // Remove item from list
  .delete(
    "/:id/items/:mediaId",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      const [list] = await db
        .select()
        .from(lists)
        .where(eq(lists.id, params.id))
        .limit(1);

      if (!list) {
        set.status = 404;
        return { error: "List not found" };
      }

      if (list.userId !== user.id) {
        set.status = 403;
        return { error: "You can only edit your own lists" };
      }

      const deleted = await db
        .delete(listItems)
        .where(
          and(
            eq(listItems.listId, params.id),
            eq(listItems.mediaId, params.mediaId),
          ),
        )
        .returning();

      if (deleted.length === 0) {
        set.status = 404;
        return { error: "Item not found in list" };
      }

      // Decrement items count
      await db
        .update(lists)
        .set({ itemsCount: sql`GREATEST(${lists.itemsCount} - 1, 0)` })
        .where(eq(lists.id, params.id));

      set.status = 204;
      return null;
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String(), mediaId: t.String() }),
    },
  );
